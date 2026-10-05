"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import BriefPreview from "./BriefPreview";
import WelcomeStep from "./WelcomeStep";
import { useSession } from "next-auth/react";
import { useModules } from "@/app/components/ModulesProvider";

const SECTOR_SUGGESTIONS = [
  "SaaS B2B",
  "Industrie",
  "BTP",
  "Finance",
  "RH",
  "Marketing",
  "Autre",
];

// Chaque étape annonce d'abord CE QUE FAIT Brief, puis demande ce dont il a
// besoin pour le faire. L'onboarding précédent enchaînait quatre questions
// sans jamais dire à quoi elles servaient : on y répondait vite pour passer à
// la suite, et on arrivait sur un tableau de bord vide sans comprendre.
// Les trois piliers sont ceux de la landing (Préparer / Débriefer /
// Progresser) — mêmes mots, mêmes repères.
const STEPS = [
  {
    step: 1,
    pillar: "Préparer",
    promise: "Avant chaque rendez-vous, Brief prépare un dossier sur le prospect.",
    title: "Qu'est-ce que vous vendez ?",
    subtitle: "Pour que vos briefs parlent de votre offre, et pas d'une offre générique.",
  },
  {
    step: 2,
    pillar: "Préparer",
    promise: "Brief compare chaque prospect à votre cible pour vous dire s'il y ressemble.",
    title: "À qui vous le vendez ?",
    subtitle: "Décrivez votre client idéal et choisissez votre secteur.",
  },
  {
    step: 3,
    pillar: "Préparer",
    promise: "Ces éléments alimentent vos briefs et vos emails de suivi.",
    title: "Comment vous présentez-vous ?",
    subtitle: "Le nom sous lequel vos prospects vous connaissent, et votre promesse.",
  },
  {
    step: 4,
    pillar: "Débriefer",
    promise:
      "Un assistant rejoint vos visios, prend des notes, et vous envoie le compte-rendu, les objections et un email de suivi prêt à relire.",
    title: "Connectez votre agenda",
    subtitle: "C'est l'étape qui déclenche tout : sans elle, aucun rendez-vous n'est repéré.",
  },
  {
    step: 5,
    pillar: "Progresser",
    promise: "Vos cas clients enrichissent vos briefs : Brief cite ceux qui ressemblent le plus au prospect.",
    title: "Vos références clients",
    subtitle: "Importez vos cas clients : ils deviennent des arguments dans vos briefs.",
  },
];

// Promesse affichée au-dessus de chaque étape. Celles des étapes 3 et 4
// citaient les emails de suivi et les objections, qu'un client en début de
// parcours n'a pas encore : elles ne les nomment que si le module est ouvert.
function promiseFor(step: number, followUp: boolean, objections: boolean): string {
  if (step === 3) {
    return followUp ? "Ces éléments alimentent vos briefs et vos emails de suivi." : "Ces éléments alimentent vos briefs.";
  }
  if (step === 4) {
    const extras = [objections ? "les objections" : null, followUp ? "un email de suivi prêt à relire" : null].filter(Boolean);
    return `Un assistant rejoint vos visios, prend des notes, et vous envoie le compte-rendu${
      extras.length ? `, ${extras.join(" et ")}` : ""
    }.`;
  }
  return STEPS[step - 1]?.promise ?? "";
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i < current ? "brand-gradient" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  // Le retour d'OAuth ramène sur ?step=4 : sans ça l'utilisateur repartirait
  // de l'étape 1 après avoir connecté son agenda.
  const [step, setStep] = useState(() => {
    if (typeof window === "undefined") return 1;
    const requested = Number(new URLSearchParams(window.location.search).get("step"));
    return Number.isInteger(requested) && requested >= 1 && requested <= 5 ? requested : 1;
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Inscription libre (lib/modules.ts) : `needsCompany` tant que le compte
  // n'est rattaché à aucune entreprise — le nom devient obligatoire et
  // l'onboarding ne se saute pas. `briefsOnly` : ni agenda à brancher (pas
  // d'enregistrement), ni références — trois étapes.
  const [account, setAccount] = useState<{ needsCompany: boolean; briefsOnly: boolean }>({
    needsCompany: false,
    briefsOnly: false,
  });
  // Rien n'est affiché avant de savoir à quel compte on parle : sans ça, une
  // inscription libre verrait l'étape 1 s'afficher puis céder la place à
  // l'écran de bienvenue.
  const [accountLoaded, setAccountLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/onboarding")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { needsCompany?: boolean; briefsOnly?: boolean } | null) => {
        if (data) setAccount({ needsCompany: data.needsCompany === true, briefsOnly: data.briefsOnly === true });
      })
      .catch(() => {})
      .finally(() => setAccountLoaded(true));
  }, []);

  // Inscription libre : un écran de bienvenue avant la première question.
  const { data: session } = useSession();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? null;
  const [welcomeDone, setWelcomeDone] = useState(false);
  const showWelcome = account.needsCompany && !welcomeDone && step === 1;

  const [whatYouSell, setWhatYouSell] = useState("");
  const [icp, setIcp] = useState("");
  const [sector, setSector] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [refMode, setRefMode] = useState<"upload" | "text" | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refText, setRefText] = useState("");
  const [refLoading, setRefLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reprise après le retour d'OAuth : /api/recall/google-oauth/start ramène
  // sur ?step=4&recall=connected. Lu depuis window plutôt qu'avec
  // useSearchParams, qui impose une frontière Suspense au prérendu et fait
  // échouer le build de cette page.
  const [calendarConnected] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("recall") === "connected"
  );

  // Enregistre le profil sans quitter le flux — appelé avant toute
  // redirection OAuth, qui ferait sinon perdre les étapes déjà remplies.
  // Seuls les champs RENSEIGNÉS partent. Le retour de l'OAuth agenda recharge
  // la page sur ?step=4 avec des champs vides : envoyer `null` pour chacun
  // effaçait, à la dernière étape, le profil enregistré juste avant de partir
  // chez Google/Microsoft (constaté le 28/09/2026 sur un compte Outlook,
  // profil entièrement vide en base). Un champ omis n'est pas touché par
  // upsertUserProfile. Paramètres > Général garde, lui, le droit de vider un
  // champ : la règle vit ici, pas dans la route.
  function filledProfile(): Record<string, string> {
    const profile: Record<string, string> = {};
    const productDescription = (valueProposition || whatYouSell).trim();
    if (companyName.trim()) profile.company_name = companyName.trim();
    if (productDescription) profile.product_description = productDescription;
    if (icp.trim()) profile.icp = icp.trim();
    if (sector.trim()) profile.sector = sector.trim();
    return profile;
  }

  async function persistProfile() {
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filledProfile()),
        // Survit au changement de page qui suit (départ vers l'OAuth).
        keepalive: true,
      });
    } catch {
      // Best-effort : la connexion agenda prime, le profil se resaisit.
    }
  }

  // Le profil est enregistré AVANT de quitter la page, et on attend la
  // réponse : lancée sans attendre, la requête pouvait être coupée par la
  // navigation vers Google/Microsoft.
  function connectCalendar(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const href = event.currentTarget.href;
    void persistProfile().finally(() => {
      window.location.href = href;
    });
  }

  // Parcours client (lib/modules.ts) : l'étape Références n'existe que si le
  // module est ouvert, et les promesses ne citent que ce que le client a.
  // Avant le 29/09/2026, un nouveau client voyait l'étape 5 alors que le
  // module lui était fermé.
  const { isEnabled } = useModules();
  const referencesEnabled = isEnabled("references");
  const totalSteps = account.briefsOnly ? 3 : referencesEnabled ? STEPS.length : STEPS.length - 1;
  const companyMissing = account.needsCompany && step === 3 && !companyName.trim();
  const hasRefContent = !!refFile || refText.trim().length > 0;
  const showPreview = step <= 3;
  const isLast = step === totalSteps;

  function advance() {
    if (!isLast) {
      setStep((s) => s + 1);
    }
  }

  // Accès « briefs » : pas de /bienvenue, qui présente l'accès complet.
  const afterOnboarding = account.briefsOnly ? "/brief" : "/bienvenue";

  async function handleFinish(skip = false) {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // « Passer » envoie un profil vide : la ligne est créée (sinon /brief
        // renverrait ici), sans rien effacer de ce qui existe déjà.
        body: JSON.stringify(skip ? {} : filledProfile()),
      });
      // Sans entreprise enregistrée, le middleware ramènerait ici : on reste
      // et on dit pourquoi. Sinon best-effort, comme avant.
      if (!res.ok && account.needsCompany) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveError(data.error ?? "Erreur lors de la sauvegarde. Réessayez.");
        return;
      }
    } catch {
      if (account.needsCompany) {
        setSaveError("Impossible de contacter le serveur. Vérifiez votre connexion.");
        return;
      }
    } finally {
      setSaving(false);
    }
    router.push(afterOnboarding);
  }

  async function handleImport() {
    if (!refFile && !refText.trim()) return;
    setRefLoading(true);
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filledProfile()),
      });

      const payload: Record<string, string> = {
        source: refFile ? "upload" : "manual",
      };
      if (refFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(refFile!);
        });
        payload.file = base64;
        payload.fileType = refFile.type;
      } else {
        payload.text = refText;
      }
      await fetch("/api/onboarding/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Best-effort
    } finally {
      setRefLoading(false);
      setSaving(false);
      router.push("/bienvenue");
    }
  }

  const { title, subtitle, pillar } = STEPS[step - 1];
  const promise = promiseFor(step, isEnabled("follow_up"), isEnabled("objections"));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 brand-gradient rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <span className="font-semibold text-slate-900">Brief</span>
          </div>
          {!account.needsCompany && (
            <button
              onClick={() => handleFinish(true)}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Ignorer l&apos;onboarding
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {!accountLoaded ? null : showWelcome ? (
          <WelcomeStep firstName={firstName} onStart={() => setWelcomeDone(true)} />
        ) : (
        <div className="w-full max-w-4xl">
          {/* Progress */}
          <ProgressBar current={step} total={totalSteps} />

          {/* Step indicator */}
          <p className="text-xs font-semibold text-[color:var(--violet)] uppercase tracking-wider mb-2">
            {pillar} · étape {step} sur {totalSteps}
          </p>

          <div className={showPreview ? "grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start" : ""}>
          {/* Card */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
            {/* La promesse AVANT la question : on explique ce que Brief fera,
                puis on demande ce dont il a besoin pour le faire. */}
            <p className="mb-5 rounded-xl bg-[color:var(--lavender)] px-4 py-3 text-[13px] leading-relaxed text-slate-700">
              {promise}
            </p>
            <h1 className="text-xl font-bold text-slate-900 mb-1">{title}</h1>
            <p className="text-sm text-slate-500 mb-6">{subtitle}</p>

            {/* ── Step 1 ── */}
            {step === 1 && (
              <textarea
                value={whatYouSell}
                onChange={(e) => setWhatYouSell(e.target.value)}
                autoFocus
                rows={4}
                placeholder="Ex : Un logiciel de gestion de devis pour les artisans du bâtiment"
                className="w-full px-3.5 py-3 border border-border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] resize-none leading-relaxed"
              />
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Votre client idéal
                  </label>
                  <input
                    type="text"
                    value={icp}
                    onChange={(e) => setIcp(e.target.value)}
                    autoFocus
                    placeholder="Ex : Directeurs commerciaux de PME de 10 à 50 personnes dans l'industrie"
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Secteur
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SECTOR_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSector(s === sector ? "" : s)}
                        className={`text-sm px-3.5 py-1.5 rounded-full border font-medium transition-all ${
                          sector === s
                            ? "brand-gradient text-white border-[color:var(--violet)]"
                            : "bg-white text-slate-600 border-border hover:border-[color:var(--lavender-strong)] hover:text-[color:var(--violet)]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {account.needsCompany ? "Nom de votre entreprise" : "Nom commercial"}
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    autoFocus
                    required={account.needsCompany}
                    maxLength={200}
                    placeholder="Ex : Acme Solutions"
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
                  />
                  {account.needsCompany && (
                    <p className="mt-1.5 text-xs text-slate-400">Obligatoire : votre compte Brief est rattaché à cette entreprise.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Votre proposition de valeur en une phrase
                  </label>
                  <input
                    type="text"
                    value={valueProposition}
                    onChange={(e) => setValueProposition(e.target.value)}
                    placeholder="Ex : Nous aidons les artisans à créer des devis professionnels en 2 minutes"
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
                  />
                </div>
              </div>
            )}

            {/* ── Étape 4 — connexion agenda ── */}
            {step === 4 && (
              <div className="space-y-4">
                {calendarConnected ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Agenda connecté. Vos prochains rendez-vous en visio seront enregistrés et analysés
                    automatiquement.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-3">
                      {/* Le profil est enregistré AVANT de partir chez Google ou Microsoft :
                          l'OAuth quitte la page, et sans ça les trois premières
                          étapes seraient perdues. Le `return` ramène ici plutôt
                          que dans les paramètres. */}
                      <a
                        href="/api/recall/google-oauth/start?return=/onboarding%3Fstep%3D4"
                        onClick={connectCalendar}
                        className="inline-flex items-center gap-2 brand-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:brightness-110 transition-all"
                      >
                        Connecter Google Agenda
                      </a>
                      <a
                        href="/api/recall/microsoft-oauth/start?return=/onboarding%3Fstep%3D4"
                        onClick={connectCalendar}
                        className="inline-flex items-center gap-2 bg-slate-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        Connecter Outlook
                      </a>
                    </div>
                    <p className="text-xs text-slate-400">
                      Brief lit uniquement vos rendez-vous à venir pour savoir quand se joindre. Vous pourrez le
                      déconnecter à tout moment.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* ── Étape 5 — références clients ── */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setRefMode("upload"); setRefFile(null); }}
                    className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                      refMode === "upload"
                        ? "border-[color:var(--violet)] bg-[color:var(--lavender)]"
                        : "border-border hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">Importer un fichier</p>
                    <p className="text-xs text-slate-400">PDF, Word, Excel</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setRefMode("text"); setRefFile(null); }}
                    className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                      refMode === "text"
                        ? "border-[color:var(--violet)] bg-[color:var(--lavender)]"
                        : "border-border hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">Saisie libre</p>
                    <p className="text-xs text-slate-400">Copier-coller du texte</p>
                  </button>
                </div>

                {refMode === "upload" && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                      onChange={(e) => setRefFile(e.target.files?.[0] ?? null)}
                    />
                    {refFile ? (
                      <div className="flex items-center gap-3 px-4 py-3 bg-[color:var(--lavender)] border border-[color:var(--lavender-strong)] rounded-lg">
                        <svg className="w-4 h-4 text-[color:var(--violet)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-[color:var(--violet)] font-medium flex-1 truncate">{refFile.name}</p>
                        <button
                          type="button"
                          onClick={() => setRefFile(null)}
                          className="text-xs text-[color:var(--violet)] hover:text-[color:var(--violet)]"
                        >
                          Changer
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-border rounded-xl hover:border-[color:var(--lavender-strong)] hover:bg-[color:var(--lavender)] transition-all text-slate-500 text-sm"
                      >
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        Cliquez pour sélectionner un fichier
                      </button>
                    )}
                  </div>
                )}

                {refMode === "text" && (
                  <textarea
                    value={refText}
                    onChange={(e) => setRefText(e.target.value)}
                    autoFocus
                    rows={5}
                    placeholder="Collez ici vos références clients : nom du client, secteur, problème résolu, résultats obtenus..."
                    className="w-full px-3.5 py-3 border border-border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] resize-none leading-relaxed"
                  />
                )}
              </div>
            )}

            {/* ── Navigation ── */}
            <div className="flex items-center justify-between mt-8">
              {!isLast ? (
                <>
                  {companyMissing ? (
                    <span />
                  ) : (
                    <button
                      onClick={advance}
                      className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Passer
                    </button>
                  )}
                  <button
                    onClick={advance}
                    disabled={companyMissing}
                    className="flex items-center gap-2 brand-gradient text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continuer
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-between w-full">
                  {/* Dernière étape. Références : « Terminer » tant que rien
                      n'est choisi — le bouton n'est plus grisé sans raison
                      apparente —, « Importer et terminer » dès qu'un fichier
                      ou un texte est là. Sans le module Références, la
                      dernière étape est l'agenda : « Terminer ». */}
                  {step === 5 && hasRefContent ? (
                    <button
                      onClick={() => handleFinish(false)}
                      disabled={saving || refLoading}
                      className="text-sm text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                    >
                      Passer cette étape
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={step === 5 && hasRefContent ? handleImport : () => handleFinish(false)}
                    disabled={saving || refLoading || companyMissing}
                    className="flex items-center gap-2 brand-gradient text-white text-sm font-semibold px-7 py-2.5 rounded-lg hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {refLoading ? "Import en cours…" : step === 5 && hasRefContent ? "Importer et terminer →" : "Terminer →"}
                  </button>
                </div>
              )}
            </div>
            {saveError && <p className="mt-3 text-sm text-red-600">{saveError}</p>}
          </div>

          {/* L'aperçu n'accompagne que les étapes de profil : sur l'agenda et
              les références, il n'apporterait rien et détournerait de l'action
              attendue. Masqué en mobile, où il pousserait le formulaire hors
              de l'écran. */}
          {showPreview && (
            <div className="hidden lg:block">
              <BriefPreview
                whatYouSell={whatYouSell}
                icp={icp}
                sector={sector}
                companyName={companyName}
                valueProposition={valueProposition}
              />
            </div>
          )}
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {STEPS.slice(0, totalSteps).map((s) => (
              <div
                key={s.step}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  s.step === step ? "brand-gradient w-4" : "bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
