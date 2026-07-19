import Anthropic from "@anthropic-ai/sdk";
import { inngest } from "./inngest";
import { generateEmbeddingsBatch } from "./embeddings";
import {
  saveClientReferences,
  updateImportJob,
  getAllUsersWithRecallCalendar,
  generateTasksFromTemplates,
  getCallsWithUnansweredFollowUps,
  getQuotesAwaitingAcceptance,
  getUsersForDigestTiming,
  getOpenTasksWithHubSpotLink,
  getUsersImportingHubSpotTasks,
  createTaskFromHubSpot,
  completeTask,
  dismissTask,
  getOrganizationsForUsageBilling,
  getOrganizationsInExpiredGracePeriod,
  updateOrganizationBilling,
  getUserOrganizationId,
  getUserIdsConnectedToCrm,
  getContactEmailsNeedingDealOutcomeSync,
  upsertDealOutcome,
  type UnansweredFollowUpCall,
  type UnansweredQuote,
  type DigestRecipient,
} from "./db";
import { syncAndScheduleForUser } from "./recall";
import { sendWeeklyDigestForUser } from "./digest";
import { pushNewTasksToHubSpot } from "./tasks-hubspot-sync";
import { batchGetHubSpotTaskStatuses, getHubSpotOwnerId, findNewHubSpotTasksForOwner, findClosedDealsForEmail as findClosedHubspotDealForEmail } from "./crm/hubspot";
import { findClosedDealsForEmail as findClosedPipedriveDealForEmail } from "./crm/pipedrive";
import { reportMonthlyUsageForOrganization } from "./stripe";

// ─── Text extraction ──────────────────────────────────────────────────────────

async function extractTextFromFile(base64: string, fileType: string): Promise<string> {
  const buffer = Buffer.from(base64, "base64");

  if (fileType.includes("pdf")) {
    // pdf-parse v2 dropped the v1 callable-function export in favor of a
    // PDFParse class (new PDFParse({ data }).getText()) — do not revert to
    // require("pdf-parse")(buffer), it throws "pdfParse is not a function".
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text ?? "";
    } finally {
      await parser.destroy();
    }
  }

  if (
    fileType.includes("word") ||
    fileType.includes("docx") ||
    fileType.includes("officedocument.wordprocessing")
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return (result.value as string) ?? "";
  }

  if (
    fileType.includes("excel") ||
    fileType.includes("xlsx") ||
    fileType.includes("spreadsheetml") ||
    fileType.includes("xls")
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const lines: string[] = [];
    for (const name of workbook.SheetNames as string[]) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
        defval: "",
      }) as Record<string, unknown>[];
      for (const row of rows) {
        const line = Object.entries(row)
          .filter(([, v]) => String(v).trim() !== "")
          .map(([k, v]) => `${k}: ${v}`)
          .join(" | ");
        if (line.trim()) lines.push(line);
      }
    }
    return lines.join("\n");
  }

  throw new Error(`Type de fichier non supporté : ${fileType}`);
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

function extractJSON(raw: string): Record<string, unknown>[] {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>[];
  } catch (err) {
    console.error(
      "[inngest] extractRefsFromChunk JSON parse failed:",
      err instanceof Error ? err.message : err,
      `\nRaw Claude response:\n${raw}`
    );
    return [];
  }
}

// ─── Single-chunk Claude extraction ──────────────────────────────────────────

type ParsedReference = {
  client_name: string | null;
  sector: string | null;
  company_size: string | null;
  problem: string | null;
  solution: string | null;
  result: string | null;
};

async function extractRefsFromChunk(
  chunkText: string,
  chunkIdx: number,
  totalChunks: number
): Promise<ParsedReference[]> {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content:
          "Extrait toutes les références clients de ce texte. Pour chaque référence retourne un JSON avec : client_name, sector, company_size, problem, solution, result. Réponds uniquement en JSON valide, tableau d'objets.\n\nTexte :\n" +
          chunkText,
      },
    ],
  });
  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock?.type === "text" ? textBlock.text : "";
  const parsed = extractJSON(raw);
  console.log(`[inngest] chunk ${chunkIdx + 1}/${totalChunks} — parsed count: ${parsed.length}`);
  return parsed.map((r) => ({
    client_name: (r.client_name as string) ?? null,
    sector: (r.sector as string) ?? null,
    company_size: (r.company_size as string) ?? null,
    problem: (r.problem as string) ?? null,
    solution: (r.solution as string) ?? null,
    result: (r.result as string) ?? null,
  }));
}

// ─── Chunking helper ──────────────────────────────────────────────────────────

const CHUNK_SIZE = 30;

function splitIntoChunks(rawText: string): string[] {
  const lines = rawText.split("\n").filter((l) => l.trim());
  const header = lines[0] ?? "";
  const dataLines = lines.slice(1);
  if (dataLines.length <= CHUNK_SIZE) return [rawText];
  return Array.from({ length: Math.ceil(dataLines.length / CHUNK_SIZE) }, (_, i) =>
    [header, ...dataLines.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)].join("\n")
  );
}

// ─── Inngest function ─────────────────────────────────────────────────────────

const EMBED_BATCH = 20;

export const processReferencesImport = inngest.createFunction(
  {
    id: "process-references-import",
    triggers: [{ event: "references/import.requested" }],
  },
  async ({ event, step }) => {
    const { userId, jobId, source, file, fileType, text } = event.data as {
      userId: string;
      jobId: string;
      source: string;
      file?: string;
      fileType?: string;
      text?: string;
    };

    await step.run("update-status-processing", async () => {
      await updateImportJob(jobId, { status: "processing" });
    });

    // Step 1 — extract raw text only
    const rawText = (await step.run("extract-text", async () => {
      try {
        if (file && fileType) {
          const extracted = await extractTextFromFile(file, fileType);
          console.log("[inngest] extracted text (first 500 chars):", extracted.slice(0, 500));
          return extracted;
        }
        if (text) return text.trim();
        return "";
      } catch (err) {
        console.error("[inngest] extract-text error:", JSON.stringify(err));
        throw err;
      }
    })) as string;

    if (!rawText) {
      await step.run("update-status-done-empty", async () => {
        await updateImportJob(jobId, { status: "done", processed: 0 });
      });
      return;
    }

    // Deterministic chunking from step result (outside steps — pure function of rawText)
    const chunks = splitIntoChunks(rawText);

    await step.run("init-chunk-progress", async () => {
      await updateImportJob(jobId, { chunks_total: chunks.length, chunks_done: 0 });
    });

    // Step per chunk — each calls Claude + updates progress
    const allRefs: ParsedReference[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkRefs = (await step.run(`extract-chunk-${i}`, async () => {
        const refs = await extractRefsFromChunk(chunks[i], i, chunks.length);
        await updateImportJob(jobId, { chunks_done: i + 1 });
        return refs;
      })) as ParsedReference[];
      allRefs.push(...chunkRefs);
    }

    await step.run("update-job-total", async () => {
      await updateImportJob(jobId, { total: allRefs.length });
    });

    for (let i = 0; i < allRefs.length; i += EMBED_BATCH) {
      const batchIdx = Math.floor(i / EMBED_BATCH);
      const batch = allRefs.slice(i, i + EMBED_BATCH);

      await step.run(`embed-save-batch-${batchIdx}`, async () => {
        const texts = batch.map((r) =>
          [r.sector, r.problem, r.solution, r.result, r.client_name]
            .filter(Boolean)
            .join(" ")
        );
        const embeddings = await generateEmbeddingsBatch(texts);
        await saveClientReferences(
          userId,
          batch.map((r, idx) => ({ ...r, source, embedding: embeddings[idx] }))
        );
        await updateImportJob(jobId, { processed: i + batch.length });
      });
    }

    await step.run("update-status-done", async () => {
      await updateImportJob(jobId, { status: "done", processed: allRefs.length });
    });
  }
);

export const syncRecallCalendars = inngest.createFunction(
  {
    id: "sync-recall-calendars",
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async ({ step }) => {
    const users = (await step.run("get-users-with-recall", async () => {
      return getAllUsersWithRecallCalendar();
    })) as { id: string; email: string; recall_calendar_id: string }[];

    console.log("[sync-recall-calendars] users with calendar:", users.length);

    let totalChecked = 0;
    let totalScheduled = 0;
    let totalSkipped = 0;

    for (const user of users) {
      const result = (await step.run(`sync-user-${user.id}`, async () => {
        return syncAndScheduleForUser(user.id, user.email);
      })) as { checked: number; scheduled: number; skipped: number };

      totalChecked += result.checked;
      totalScheduled += result.scheduled;
      totalSkipped += result.skipped;
    }

    const summary = { users: users.length, checked: totalChecked, scheduled: totalScheduled, skipped: totalSkipped };
    console.log("[sync-recall-calendars] done —", JSON.stringify(summary));
    return summary;
  }
);

export const checkEmailsWithoutReply = inngest.createFunction(
  {
    id: "check-emails-without-reply",
    triggers: [{ cron: "*/30 * * * *" }],
  },
  async ({ step }) => {
    const calls = (await step.run("get-unanswered-followups", async () => {
      return getCallsWithUnansweredFollowUps();
    })) as UnansweredFollowUpCall[];

    console.log("[check-emails-without-reply] candidate calls:", calls.length);

    let totalCreated = 0;
    for (const call of calls) {
      const { createdCount } = await step.run(`generate-tasks-call-${call.id}`, async () => {
        const result = await generateTasksFromTemplates(call.user_id, "email", call.id, {
          contact_id: null,
          contact_email: call.contact_email,
          contact_name: null,
        });
        await pushNewTasksToHubSpot(call.user_id, result.toPushToHubSpot, call.contact_email);
        return result;
      });
      totalCreated += createdCount;
    }

    const summary = { checked: calls.length, created: totalCreated };
    console.log("[check-emails-without-reply] done —", JSON.stringify(summary));
    return summary;
  }
);

export const checkQuotesWithoutAcceptance = inngest.createFunction(
  {
    id: "check-quotes-without-acceptance",
    triggers: [{ cron: "*/30 * * * *" }],
  },
  async ({ step }) => {
    const quotes = (await step.run("get-quotes-awaiting-acceptance", async () => {
      return getQuotesAwaitingAcceptance();
    })) as UnansweredQuote[];

    console.log("[check-quotes-without-acceptance] candidate quotes:", quotes.length);

    let totalCreated = 0;
    for (const quote of quotes) {
      const { createdCount } = await step.run(`generate-tasks-quote-${quote.id}`, async () => {
        const result = await generateTasksFromTemplates(quote.user_id, "quote", quote.id, {
          contact_id: quote.contact_id,
          contact_email: quote.client_email,
          contact_name: quote.client_name,
        });
        await pushNewTasksToHubSpot(quote.user_id, result.toPushToHubSpot, quote.client_email);
        return result;
      });
      totalCreated += createdCount;
    }

    const summary = { checked: quotes.length, created: totalCreated };
    console.log("[check-quotes-without-acceptance] done —", JSON.stringify(summary));
    return summary;
  }
);

// ─── Sync statut tasks HubSpot (module HubSpot tasks) ──────────────────────
//
// HubSpot's Webhooks API doesn't support subscribing to engagement objects
// (notes, meetings, calls, emails, tasks — confirmed against HubSpot's own
// docs/community answers), so there's no way to be notified in real time
// when a rep completes or deletes a task on the HubSpot side. This cron is
// the only way to reconcile: for every Brief task still open locally with a
// linked hubspot_task_id, check its current HubSpot status. A task missing
// from the batch/read response was deleted on the HubSpot side (HubSpot
// silently omits unknown ids rather than erroring) and is dismissed here;
// hs_task_status === "COMPLETED" is completed here. Same 30-minute cadence
// as the other "not urgent" task crons above.
export const syncHubSpotTaskStatuses = inngest.createFunction(
  {
    id: "sync-hubspot-task-statuses",
    triggers: [{ cron: "*/30 * * * *" }],
  },
  async ({ step }) => {
    const openTasks = await step.run("get-open-hubspot-linked-tasks", async () => {
      return getOpenTasksWithHubSpotLink();
    });

    const byUser = new Map<string, typeof openTasks>();
    for (const task of openTasks) {
      const list = byUser.get(task.user_id) ?? [];
      list.push(task);
      byUser.set(task.user_id, list);
    }

    let totalCompleted = 0;
    let totalDismissed = 0;

    for (const [userId, tasks] of byUser) {
      await step.run(`sync-hubspot-tasks-user-${userId}`, async () => {
        const statuses = await batchGetHubSpotTaskStatuses(
          userId,
          tasks.map((t) => t.hubspot_task_id)
        ).catch((err) => {
          console.warn(
            `[sync-hubspot-task-statuses] batchGetHubSpotTaskStatuses failed for user ${userId} (non-blocking):`,
            err instanceof Error ? err.message : String(err)
          );
          return new Map<string, string | null>();
        });

        for (const task of tasks) {
          const status = statuses.get(task.hubspot_task_id);
          if (status === undefined) {
            // Missing from the response — deleted on the HubSpot side.
            await dismissTask(task.id, userId).catch((err) =>
              console.warn(`[sync-hubspot-task-statuses] dismissTask failed for ${task.id}:`, err)
            );
            totalDismissed += 1;
          } else if (status === "COMPLETED") {
            await completeTask(task.id, userId).catch((err) =>
              console.warn(`[sync-hubspot-task-statuses] completeTask failed for ${task.id}:`, err)
            );
            totalCompleted += 1;
          }
        }
      });
    }

    const importUsers = await step.run("get-users-importing-hubspot-tasks", async () => {
      return getUsersImportingHubSpotTasks();
    });

    let totalImported = 0;

    for (const { id: userId } of importUsers) {
      await step.run(`import-hubspot-tasks-user-${userId}`, async () => {
        const ownerId = await getHubSpotOwnerId(userId).catch((err) => {
          console.warn(
            `[sync-hubspot-task-statuses] getHubSpotOwnerId failed for user ${userId} (non-blocking):`,
            err instanceof Error ? err.message : String(err)
          );
          return null;
        });
        if (!ownerId) return;

        const sinceIso = new Date(Date.now() - 35 * 60 * 1000).toISOString();
        const nativeTasks = await findNewHubSpotTasksForOwner(userId, ownerId, sinceIso).catch((err) => {
          console.warn(
            `[sync-hubspot-task-statuses] findNewHubSpotTasksForOwner failed for user ${userId} (non-blocking):`,
            err instanceof Error ? err.message : String(err)
          );
          return [];
        });

        for (const t of nativeTasks) {
          if (!t.contactEmail) continue;
          const created = await createTaskFromHubSpot(userId, {
            hubspotTaskId: t.id,
            title: t.title ?? "Task HubSpot",
            description: t.description,
            dueAt: t.dueAt ?? new Date().toISOString(),
            contactEmail: t.contactEmail,
          }).catch((err) => {
            console.warn(`[sync-hubspot-task-statuses] createTaskFromHubSpot failed for ${t.id}:`, err);
            return false;
          });
          if (created) totalImported += 1;
        }
      });
    }

    const summary = {
      checked: openTasks.length,
      completed: totalCompleted,
      dismissed: totalDismissed,
      imported: totalImported,
    };
    console.log("[sync-hubspot-task-statuses] done —", JSON.stringify(summary));
    return summary;
  }
);

// ─── Sync des issues de deals CRM (module Bibliothèque d'objections / win-loss) ─
//
// Complète le signal "quote" (écrit de façon synchrone, sans cron, dans
// acceptQuoteByPublicToken/rejectQuoteByPublicToken — lib/db.ts) avec le
// statut closedwon/closedlost réel des CRM connectés, pour les deals qui ne
// passent jamais par un devis Brief. Un step.run par user connecté (même
// granularité que syncHubSpotTaskStatuses ci-dessus) : un échec sur un user
// (token expiré, rate limit) n'affecte pas les autres. Ne réinterroge que les
// contacts sans résultat connu pour cette source (getContactEmailsNeedingDealOutcomeSync)
// — pas tout l'historique à chaque run.
export const syncDealOutcomes = inngest.createFunction(
  {
    id: "sync-deal-outcomes",
    triggers: [{ cron: "*/30 * * * *" }],
  },
  async ({ step }) => {
    const sinceISO = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    let totalSynced = 0;

    const providers: Array<{
      name: "hubspot" | "pipedrive";
      findClosedDeal: (userId: string, contactEmail: string) => Promise<{ outcome: "won" | "lost"; amount: number | null; closedAt: string | null } | null>;
    }> = [
      { name: "hubspot", findClosedDeal: findClosedHubspotDealForEmail },
      { name: "pipedrive", findClosedDeal: findClosedPipedriveDealForEmail },
    ];

    for (const provider of providers) {
      const userIds = await step.run(`get-users-connected-${provider.name}`, async () => {
        return getUserIdsConnectedToCrm(provider.name);
      });

      for (const userId of userIds) {
        totalSynced += await step.run(`sync-deal-outcomes-${provider.name}-${userId}`, async () => {
          const organizationId = await getUserOrganizationId(userId).catch(() => null);
          if (!organizationId) return 0;

          const emails = await getContactEmailsNeedingDealOutcomeSync(userId, organizationId, provider.name, sinceISO).catch((err) => {
            console.warn(`[sync-deal-outcomes] getContactEmailsNeedingDealOutcomeSync failed for user ${userId} (non-blocking):`, err instanceof Error ? err.message : String(err));
            return [] as string[];
          });

          let synced = 0;
          for (const email of emails) {
            const closed = await provider.findClosedDeal(userId, email).catch((err) => {
              console.warn(`[sync-deal-outcomes] ${provider.name} lookup failed for ${email} (non-blocking):`, err instanceof Error ? err.message : String(err));
              return null;
            });
            if (!closed) continue;

            await upsertDealOutcome({
              organizationId,
              contactEmail: email,
              source: provider.name,
              outcome: closed.outcome,
              amount: closed.amount,
              closedAt: closed.closedAt,
            }).catch((err) => console.warn(`[sync-deal-outcomes] upsertDealOutcome failed for ${email} (non-blocking):`, err instanceof Error ? err.message : String(err)));
            synced += 1;
          }
          return synced;
        });
      }
    }

    console.log(`[sync-deal-outcomes] done — ${totalSynced} deal outcome(s) synced`);
    return { totalSynced };
  }
);

// ─── Digest hebdomadaire (module Distribution Flexible, sous-étape 3) ─────
//
// Two crons, one per opt-in timing — each only processes the users who
// chose that slot (getUsersForDigestTiming), so a user who picked Monday
// morning never gets a Friday cron run for them at all, not just a
// no-op. TZ=Europe/Paris since Inngest cron is UTC by default otherwise
// (unlike every other cron in this file, which doesn't care about wall-clock
// time) — verified against Inngest's docs for the "TZ=<IANA name> <cron>"
// prefix syntax.

export const sendFridayEveningDigests = inngest.createFunction(
  {
    id: "send-friday-evening-digests",
    triggers: [{ cron: "TZ=Europe/Paris 0 18 * * 5" }],
  },
  async ({ step }) => {
    const users = (await step.run("get-digest-users", async () => {
      return getUsersForDigestTiming("friday_evening");
    })) as DigestRecipient[];

    console.log("[send-friday-evening-digests] users opted in:", users.length);

    const now = new Date();
    let sent = 0;
    let failed = 0;
    for (const user of users) {
      const result = await step.run(`send-digest-${user.id}`, async () => {
        return sendWeeklyDigestForUser(user, "friday_evening", now);
      });
      if (result.outcome === "sent") sent++;
      else {
        failed++;
        console.error("[send-friday-evening-digests] digest failed for user", user.id, ":", result.detail);
      }
    }

    const summary = { users: users.length, sent, failed };
    console.log("[send-friday-evening-digests] done —", JSON.stringify(summary));
    return summary;
  }
);

export const sendMondayMorningDigests = inngest.createFunction(
  {
    id: "send-monday-morning-digests",
    triggers: [{ cron: "TZ=Europe/Paris 0 8 * * 1" }],
  },
  async ({ step }) => {
    const users = (await step.run("get-digest-users", async () => {
      return getUsersForDigestTiming("monday_morning");
    })) as DigestRecipient[];

    console.log("[send-monday-morning-digests] users opted in:", users.length);

    const now = new Date();
    let sent = 0;
    let failed = 0;
    for (const user of users) {
      const result = await step.run(`send-digest-${user.id}`, async () => {
        return sendWeeklyDigestForUser(user, "monday_morning", now);
      });
      if (result.outcome === "sent") sent++;
      else {
        failed++;
        console.error("[send-monday-morning-digests] digest failed for user", user.id, ":", result.detail);
      }
    }

    const summary = { users: users.length, sent, failed };
    console.log("[send-monday-morning-digests] done —", JSON.stringify(summary));
    return summary;
  }
);

// ─── Facturation Stripe (module Facturation, Phase 3) ──────────────────────
//
// Deux crons séparés plutôt qu'un seul : le report d'usage est mensuel (le
// 1er du mois), la vérification de fin de fenêtre de grâce doit être bien
// plus fréquente (une org bloquée en retard d'une heure n'est pas grave, en
// retard d'un jour l'est) — même logique de séparation que les deux crons du
// digest hebdo, un par timing.

export const reportBillingUsage = inngest.createFunction(
  { id: "report-billing-usage", triggers: [{ cron: "0 3 1 * *" }] },
  async ({ step }) => {
    const orgs = await step.run("get-orgs-for-usage-billing", getOrganizationsForUsageBilling);

    let reported = 0;
    for (const org of orgs) {
      await step.run(`report-usage-${org.id}`, async () => {
        try {
          const { amountCents } = await reportMonthlyUsageForOrganization(org.id);
          if (amountCents > 0) reported++;
        } catch (err) {
          console.warn(`[report-billing-usage] failed for org ${org.id}:`, err);
        }
      });
    }

    const summary = { checked: orgs.length, reported };
    console.log("[report-billing-usage] done —", JSON.stringify(summary));
    return summary;
  }
);

export const checkBillingGracePeriods = inngest.createFunction(
  { id: "check-billing-grace-periods", triggers: [{ cron: "0 * * * *" }] },
  async ({ step }) => {
    const orgs = await step.run("get-expired-grace-periods", getOrganizationsInExpiredGracePeriod);

    let blocked = 0;
    for (const org of orgs) {
      await step.run(`block-org-${org.id}`, async () => {
        try {
          await updateOrganizationBilling(org.id, { billing_status: "blocked" });
          blocked++;
        } catch (err) {
          console.warn(`[check-billing-grace-periods] failed to block org ${org.id}:`, err);
        }
      });
    }

    const summary = { checked: orgs.length, blocked };
    console.log("[check-billing-grace-periods] done —", JSON.stringify(summary));
    return summary;
  }
);
