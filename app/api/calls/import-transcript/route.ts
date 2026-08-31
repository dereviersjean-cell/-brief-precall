import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { enforceAiGenerationLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import {
  getUserRole,
  getUserOrganizationId,
  getCommercialsForManager,
  getUserProfile,
  getUserName,
  getPlaybookSnapshotForUser,
  getMeetingStageConfigForOrganization,
  createCall,
  saveCallAnalysis,
  updateCallAnalysisKeyPoints,
  saveCallAnalytics,
} from "@/lib/db";
import { analyzeCall } from "@/lib/call-analysis";
import { indexCallObjections } from "@/lib/objections";
import { generateKeyPoints } from "@/lib/key-points";
import { computeCallInteractionMetrics } from "@/lib/call-analytics";
import { detectMeetingStage, MEETING_STAGE_LABELS } from "@/lib/meeting-stage";
import { parseTranscript } from "@/lib/transcript-import";

// Banc d'essai : rejoue le pipeline complet d'analyse (scores playbook,
// extraction des objections, classification + évaluation, points clés,
// métriques d'interaction) sur un transcript fourni à la main, sans passer
// par un bot Recall. Sert à valider la qualité de la notation et de la
// détection d'objections sur de vrais calls, avant/après un changement de
// playbook ou de bibliothèque d'objections.
//
// Le call créé est un call NORMAL (décision produit du 29/07/2026, pas de
// mode bac à sable) : il apparaît dans les statistiques, la bibliothèque
// d'objections et les analytics comme n'importe quel autre. Pour le retirer,
// supprimer le call depuis son détail.
//
// Le pipeline enchaîne plusieurs appels Claude : la fonction a besoin de plus
// que les 10 s par défaut de Vercel.
export const maxDuration = 300;

const MAX_TRANSCRIPT_CHARS = 400_000;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const rl = await enforceAiGenerationLimit(requestIp(request), auth.userId);
  if (!rl.allowed) {
    const minutes = retryAfterMinutes(rl.retryAfterMs);
    return NextResponse.json(
      { error: `Limite de génération IA atteinte. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`, retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  // Rôle relu en base, pas depuis le JWT (bug #22).
  const role = await getUserRole(auth.userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const organizationId = await getUserOrganizationId(auth.userId);
  if (!organizationId) {
    return NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let content = "";
  let fileName: string | undefined;
  let companyName: string | null = null;
  let contactEmail: string | null = null;
  let meetingTitle: string | null = null;
  let targetUserId = auth.userId;

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
      }
      content = await file.text();
      fileName = file.name;
      companyName = (formData.get("companyName") as string | null)?.trim() || null;
      contactEmail = (formData.get("contactEmail") as string | null)?.trim() || null;
      meetingTitle = (formData.get("meetingTitle") as string | null)?.trim() || null;
      targetUserId = (formData.get("userId") as string | null)?.trim() || auth.userId;
    } else {
      const body = (await request.json()) as {
        transcript?: string;
        companyName?: string;
        contactEmail?: string;
        meetingTitle?: string;
        userId?: string;
      };
      content = body.transcript ?? "";
      companyName = body.companyName?.trim() || null;
      contactEmail = body.contactEmail?.trim() || null;
      meetingTitle = body.meetingTitle?.trim() || null;
      targetUserId = body.userId?.trim() || auth.userId;
    }
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!content.trim()) {
    return NextResponse.json({ error: "Transcript vide." }, { status: 400 });
  }
  if (content.length > MAX_TRANSCRIPT_CHARS) {
    return NextResponse.json(
      { error: "Transcript trop long (400 000 caractères maximum, soit environ 8 heures de call)." },
      { status: 400 }
    );
  }

  // Attribution du call : soit le manager lui-même, soit un de SES
  // commerciaux liés — jamais un id arbitraire, qui permettrait d'écrire dans
  // les données d'un utilisateur d'une autre organisation.
  if (targetUserId !== auth.userId) {
    const commercials = await getCommercialsForManager(auth.userId);
    if (!commercials.some((c) => c.id === targetUserId)) {
      return NextResponse.json({ error: "Commercial inconnu." }, { status: 403 });
    }
  }

  const parsed = parseTranscript(content, fileName);
  if (!parsed.text.trim()) {
    return NextResponse.json({ error: "Aucun texte exploitable dans ce transcript." }, { status: 400 });
  }

  const stageConfig = await getMeetingStageConfigForOrganization(organizationId);
  const meetingStage = detectMeetingStage(meetingTitle, stageConfig);

  const now = new Date();
  const startedAt = parsed.durationSeconds
    ? new Date(now.getTime() - parsed.durationSeconds * 1000).toISOString()
    : now.toISOString();

  let call: { id: string };
  try {
    call = await createCall({
      user_id: targetUserId,
      calendar_event_id: null,
      contact_email: contactEmail,
      company_name: companyName,
      meeting_title: meetingTitle,
      meeting_stage: meetingStage,
      transcript: parsed.text,
      status: "done",
      duration_seconds: parsed.durationSeconds,
      started_at: startedAt,
      ended_at: now.toISOString(),
      participant_count: Object.keys(parsed.speakerNames).length || null,
      recall_bot_id: null,
      recording_id: null,
      transcript_id: null,
      transcript_json: parsed.transcriptJson,
      speaker_names_override: parsed.speakerNames,
    });
  } catch (err) {
    console.error("[import-transcript] createCall failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Impossible de créer le call." }, { status: 500 });
  }

  // À partir d'ici on renvoie toujours le callId : le call existe, chaque
  // étape suivante est un enrichissement dont l'échec est rapporté à
  // l'appelant sans faire échouer l'import (même philosophie que les étapes
  // non bloquantes du bot-webhook).
  const warnings: string[] = [];

  const [profile, playbookSnapshot, commercialName] = await Promise.all([
    getUserProfile(targetUserId),
    getPlaybookSnapshotForUser(targetUserId),
    getUserName(targetUserId),
  ]);

  let objectionsCount = 0;
  let globalScore: number | null = null;

  try {
    const analysis = await analyzeCall(
      parsed.text,
      {
        clientName: profile?.company_name ?? "",
        clientWebsite: "",
        prospectName: companyName ?? "",
        prospectWebsite: contactEmail ? contactEmail.split("@")[1] ?? "" : "",
        meetingDate: startedAt.split("T")[0] ?? "",
        meetingStage: meetingStage
          ? { label: MEETING_STAGE_LABELS[meetingStage], guidance: stageConfig[meetingStage].guidance }
          : null,
      },
      playbookSnapshot
    );
    const { id: analysisId } = await saveCallAnalysis(call.id, analysis, playbookSnapshot);
    globalScore = analysis.scores.global_score;
    objectionsCount = analysis.objections.length;

    if (analysis.objections.length > 0) {
      // indexCallObjections classe et évalue au passage (lib/objections.ts).
      await indexCallObjections(organizationId, call.id, contactEmail, analysis.objections, parsed.text, parsed.transcriptJson?.turns ?? null).catch((err) => {
        console.warn("[import-transcript] indexCallObjections failed:", err instanceof Error ? err.message : String(err));
        warnings.push("Les objections n'ont pas pu être indexées ni classées.");
      });
    }

    try {
      const keyPoints = await generateKeyPoints(parsed.text);
      if (keyPoints) await updateCallAnalysisKeyPoints(analysisId, call.id, keyPoints);
    } catch (err) {
      console.warn("[import-transcript] generateKeyPoints failed:", err instanceof Error ? err.message : String(err));
    }
  } catch (err) {
    console.error("[import-transcript] analyzeCall failed:", err instanceof Error ? err.message : String(err));
    warnings.push("L'analyse du call a échoué — le transcript est enregistré, relancez depuis le détail du call.");
  }

  // Métriques d'interaction : uniquement si le transcript portait des
  // horodatages (cf. lib/transcript-import.ts — pas de durées inventées).
  if (parsed.transcriptJson) {
    try {
      const metrics = computeCallInteractionMetrics(parsed.transcriptJson, parsed.speakerNames, commercialName, {
        measurePatience: parsed.timingPrecision === "exact",
      });
      if (metrics) {
        await saveCallAnalytics({
          callId: call.id,
          userId: targetUserId,
          organizationId,
          occurredAt: startedAt,
          ...metrics,
        });
        if (parsed.timingPrecision === "coarse") {
          warnings.push(
            "Le transcript ne donne que l'heure de début de chaque prise de parole : ratio de parole, monologues, interactivité et taux de questions sont calculés, mais pas la patience (elle demande de savoir quand chacun s'arrête de parler)."
          );
        }
      } else {
        // Le cas de loin le plus fréquent : le nom du commercial dans Brief
        // ne correspond à aucun nom de locuteur du transcript. On le dit
        // explicitement, sinon l'onglet Analytics reste muet sans raison
        // visible.
        warnings.push(
          `Aucun locuteur du transcript ne correspond à « ${commercialName ?? "le commercial sélectionné"} » : les métriques d'interaction ne sont pas calculées. Vérifiez que le nom du commercial dans Brief est écrit comme dans le transcript (${Object.keys(parsed.speakerNames).join(", ")}).`
        );
      }
    } catch (err) {
      console.warn("[import-transcript] saveCallAnalytics failed:", err instanceof Error ? err.message : String(err));
    }
  } else {
    warnings.push(
      "Transcript sans horodatage : les métriques d'interaction (ratio de parole, monologues, patience) ne sont pas calculées. Un export avec les heures de passage (« 00:45 Nom : … »), un .vtt, un .srt ou un JSON les débloque."
    );
  }

  return NextResponse.json({
    callId: call.id,
    format: parsed.format,
    speakers: Object.keys(parsed.speakerNames),
    globalScore,
    objectionsCount,
    warnings,
  });
}
