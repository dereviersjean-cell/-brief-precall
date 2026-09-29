import { supabaseAdmin } from "./supabase";
import { resolveEnabledModules, type ModuleKey } from "./modules";
import { computeParcours, type ParcoursState } from "./parcours";

// Espace « Suivi clients » de l'admin : un client = une organisation, vue
// comme l'account manager la suit — parcours, prochain point, équipe,
// activité et alertes. Toutes les organisations en quatre requêtes, quel que
// soit leur nombre.
//
// Organisations lues en `*` : les champs de suivi (migration 020) et les
// modules (migration 019) n'existent qu'une fois les migrations passées, et
// une colonne nommée absente ferait échouer toute la liste.

export type ClientAlert = {
  kind:
    | "agenda_disconnected"
    | "agenda_missing"
    | "pending_invites"
    | "inactive_members"
    | "billing"
    | "module_late"
    | "review_overdue"
    | "review_missing";
  severity: "danger" | "warning";
  label: string;
};

export type ClientOverview = {
  id: string;
  name: string;
  accountManager: string | null;
  nextReviewAt: string | null;
  parcoursStartedAt: string | null;
  // Modules réglés par l'account manager (liste explicite) = client dans le
  // parcours ; sinon client antérieur, tous modules ouverts.
  inParcours: boolean;
  modules: ModuleKey[];
  parcours: ParcoursState;
  billingStatus: string;
  members: {
    total: number;
    pendingInvites: number;
    agendaDisconnected: number;
    agendaMissing: number;
    inactive: number;
  };
  activity7d: { calls: number; briefs: number };
  alerts: ClientAlert[];
};

type OrgRow = {
  id: string;
  name: string;
  billing_status?: string | null;
  enabled_modules?: string[] | null;
  training_enabled?: boolean | null;
  account_manager?: string | null;
  next_review_at?: string | null;
  parcours_started_at?: string | null;
};

type UserRow = {
  id: string;
  organization_id: string;
  invited_at: string | null;
  google_id: string | null;
  microsoft_id: string | null;
  disabled_at: string | null;
  recall_calendar_id: string | null;
  recall_calendar_status: string | null;
  last_seen_at: string | null;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}

export async function getClientsOverview(now: Date = new Date()): Promise<ClientOverview[]> {
  const since = new Date(now.getTime() - WEEK_MS).toISOString();

  const [orgsRes, usersRes, callsRes, briefsRes] = await Promise.all([
    supabaseAdmin.from("organizations").select("*").order("name", { ascending: true }),
    supabaseAdmin
      .from("users")
      .select(
        "id, organization_id, invited_at, google_id, microsoft_id, disabled_at, recall_calendar_id, recall_calendar_status, last_seen_at"
      )
      .not("organization_id", "is", null),
    supabaseAdmin.from("calls").select("user_id").gte("created_at", since),
    supabaseAdmin.from("briefs").select("user_id").gte("created_at", since),
  ]);
  if (orgsRes.error) throw orgsRes.error;
  if (usersRes.error) throw usersRes.error;

  const users = (usersRes.data ?? []) as UserRow[];
  const callsByUser = countByUser((callsRes.data ?? []) as { user_id: string }[]);
  const briefsByUser = countByUser((briefsRes.data ?? []) as { user_id: string }[]);

  return ((orgsRes.data ?? []) as OrgRow[]).map((org) => {
    const members = users.filter((u) => u.organization_id === org.id && u.disabled_at == null);
    const pending = members.filter((u) => u.invited_at != null && u.google_id == null && u.microsoft_id == null);
    const active = members.filter((u) => !pending.includes(u));

    const agendaDisconnected = active.filter((u) => u.recall_calendar_id != null && u.recall_calendar_status === "disconnected");
    const agendaMissing = active.filter((u) => u.recall_calendar_id == null);
    const inactive = active.filter((u) => {
      const seenRecently = u.last_seen_at != null && now.getTime() - new Date(u.last_seen_at).getTime() < WEEK_MS;
      const workedRecently = (callsByUser.get(u.id) ?? 0) + (briefsByUser.get(u.id) ?? 0) > 0;
      return !seenRecently && !workedRecently;
    });

    const inParcours = Array.isArray(org.enabled_modules);
    const modules = resolveEnabledModules(org);
    const parcours = computeParcours(org.parcours_started_at ?? null, modules, now);
    const billingStatus = org.billing_status ?? "none";

    const alerts: ClientAlert[] = [];
    if (agendaDisconnected.length > 0) {
      alerts.push({ kind: "agenda_disconnected", severity: "danger", label: plural(agendaDisconnected.length, "agenda coupé", "agendas coupés") });
    }
    if (billingStatus === "blocked" || billingStatus === "canceled") {
      alerts.push({ kind: "billing", severity: "danger", label: billingStatus === "blocked" ? "Accès suspendu" : "Abonnement résilié" });
    } else if (billingStatus === "grace_period") {
      alerts.push({ kind: "billing", severity: "warning", label: "Paiement en échec" });
    }
    if (inParcours && parcours.late && parcours.nextModule) {
      alerts.push({ kind: "module_late", severity: "danger", label: `${parcours.nextModule.label} en retard` });
    }
    if (inParcours && !parcours.finished) {
      if (!org.next_review_at) {
        alerts.push({ kind: "review_missing", severity: "warning", label: "Point non planifié" });
      } else if (new Date(org.next_review_at).getTime() < now.getTime()) {
        alerts.push({ kind: "review_overdue", severity: "warning", label: "Point à replanifier" });
      }
    }
    if (pending.length > 0) {
      alerts.push({ kind: "pending_invites", severity: "warning", label: plural(pending.length, "invitation en attente", "invitations en attente") });
    }
    if (agendaMissing.length > 0) {
      alerts.push({ kind: "agenda_missing", severity: "warning", label: plural(agendaMissing.length, "agenda non branché", "agendas non branchés") });
    }
    if (inactive.length > 0) {
      alerts.push({ kind: "inactive_members", severity: "warning", label: plural(inactive.length, "membre inactif", "membres inactifs") });
    }

    return {
      id: org.id,
      name: org.name,
      accountManager: org.account_manager ?? null,
      nextReviewAt: org.next_review_at ?? null,
      parcoursStartedAt: org.parcours_started_at ?? null,
      inParcours,
      modules,
      parcours,
      billingStatus,
      members: {
        total: members.length,
        pendingInvites: pending.length,
        agendaDisconnected: agendaDisconnected.length,
        agendaMissing: agendaMissing.length,
        inactive: inactive.length,
      },
      activity7d: {
        calls: active.reduce((sum, u) => sum + (callsByUser.get(u.id) ?? 0), 0),
        briefs: active.reduce((sum, u) => sum + (briefsByUser.get(u.id) ?? 0), 0),
      },
      alerts,
    };
  });
}

function countByUser(rows: { user_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  return counts;
}

// Un client créé depuis l'espace « Suivi clients » démarre dans le parcours :
// tous ses modules fermés, semaine 0 aujourd'hui. Sans ça, il naîtrait comme
// un client antérieur (enabled_modules NULL = tout ouvert) et verrait dès sa
// première connexion ce qu'on doit lui présenter semaine après semaine.
// Deux écritures : la date de début (migration 020) peut manquer sans
// empêcher la fermeture des modules (migration 019).
export async function startParcoursForNewClient(organizationId: string, today: Date = new Date()): Promise<void> {
  const { error } = await supabaseAdmin
    .from("organizations")
    .update({ enabled_modules: [], training_enabled: false })
    .eq("id", organizationId);
  if (error) throw error;
  await supabaseAdmin
    .from("organizations")
    .update({ parcours_started_at: today.toISOString().slice(0, 10) })
    .eq("id", organizationId);
}

export type ClientFollowUpPatch = {
  account_manager?: string | null;
  next_review_at?: string | null;
  parcours_started_at?: string | null;
};

// Champs de suivi réglés par l'account manager (migration 020).
export async function updateClientFollowUp(organizationId: string, patch: ClientFollowUpPatch): Promise<void> {
  const { error } = await supabaseAdmin.from("organizations").update(patch).eq("id", organizationId);
  if (error) throw error;
}
