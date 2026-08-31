import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { checkAiGenerationRateLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { getCallWithAnalysis, getCallWithAnalysisForManager, getUserRole, updateCallFollowUp } from "@/lib/db";
import { generateFollowUpEmail } from "@/lib/email-followup";
import { isValidEmail } from "@/lib/email-address";

// Génération à la demande de l'email de suivi.
//
// À l'ingestion, le bot-webhook saute cette étape quand le call n'a pas de
// `contact_email` — et il n'en a pas dès que l'invitation de l'agenda ne
// contient aucun participant externe (réunion créée sans inviter le prospect,
// invitation acceptée depuis une autre adresse, RDV posé à la main). L'écran
// affichait alors « en cours de génération… » indéfiniment : rien ne tournait,
// et rien ne permettait de rattraper.
//
// Ici le transcript et l'analyse existent déjà : il ne manque que le
// destinataire, que l'utilisateur peut fournir.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const rl = checkAiGenerationRateLimit(requestIp(request), auth.userId);
  if (!rl.allowed) {
    const minutes = retryAfterMinutes(rl.retryAfterMs);
    return NextResponse.json(
      { error: `Limite de génération IA atteinte. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.` },
      { status: 429 }
    );
  }

  const { id: callId } = await params;

  // Même résolution propriétaire-puis-manager que /feedback/[id]/key-points.
  let call = await getCallWithAnalysis(callId, auth.userId);
  if (!call) {
    const role = await getUserRole(auth.userId);
    if (role === "manager") call = await getCallWithAnalysisForManager(callId, auth.userId);
  }
  if (!call) return NextResponse.json({ error: "Call introuvable." }, { status: 404 });

  if (!call.transcript?.trim()) {
    return NextResponse.json({ error: "Ce call n'a pas de transcript exploitable." }, { status: 400 });
  }

  let body: { contactEmail?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Le destinataire fourni prime sur celui du call : c'est précisément le cas
  // où le call n'en a pas.
  const contactEmail = body.contactEmail?.trim() || call.contact_email || "";
  if (!contactEmail) {
    return NextResponse.json({ error: "Indiquez l'email du destinataire." }, { status: 400 });
  }
  if (!isValidEmail(contactEmail)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }

  // L'adresse n'est PAS enregistrée ici, seulement à l'envoi (cf.
  // send-follow-up) : une adresse qui n'a jamais servi à envoyer quoi que ce
  // soit ne doit pas devenir le contact du rendez-vous. La page laisse la
  // saisir à nouveau au moment d'envoyer, y compris après un rechargement.

  const nextSteps = call.analysis?.next_steps ?? [];
  const followUp = await generateFollowUpEmail(call.transcript, nextSteps, contactEmail);

  // null = réponse hors contrat, déjà tracée et remontée par validateAiShape.
  // On le dit à l'utilisateur au lieu d'enregistrer un email vide.
  if (!followUp) {
    return NextResponse.json(
      { error: "La génération a échoué. Réessayez — si cela persiste, le prompt d'email de suivi est à vérifier." },
      { status: 502 }
    );
  }

  await updateCallFollowUp(callId, followUp);
  return NextResponse.json({ followUp });
}
