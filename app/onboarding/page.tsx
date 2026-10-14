"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import BriefPreview from "./BriefPreview";
import WelcomeStep from "./WelcomeStep";
import CompanyStep, { type CompanyRole, type PrefillResult } from "./CompanyStep";
import { companyDomainFromEmail } from "@/lib/company-domain";
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

// Chaque étape dit d'abord POURQUOI Brief demande l'information, puis la
// demande. L'onboarding d'origine enchaînait quatre questions sans dire à quoi
// elles servaient : on y répondait vite pour passer à la suite, et on arrivait
// sur un tableau de bord vide sans comprendre. Textes et mise en page refaits
// le 14/10/2026 (« professionnel, bon wording, moderne », Jean) : une frise
// nommée, une question nette, la raison en une ligne, des exemples cliquables.
const STEPS = [
  {
    step: 1,
    label: "Votre offre",
    title: "Que vendez-vous ?",
    subtitle: "En une ou deux phrases, comme vous le présenteriez à un prospect.",
    why: "Chaque brief relie l'actualité et les enjeux du prospect à ce que vous vendez.",
  },
  {
    step: 2,
    label: "Votre cible",
    title: "Qui est votre client idéal ?",
    subtitle: "Fonction, taille d'entreprise, secteur : le profil des clients que vous voulez signer.",
    why: "Brief vous signale si un prospect correspond à votre cible, et sur quoi.",
  },
  {
    step: 3,
    label: "Votre entreprise",
    title: "Comment vous présentez-vous ?",
    subtitle: "Le nom sous lequel vos prospects vous connaissent, et ce qui vous distingue.",
    why: "Vos briefs s'appuient sur votre promesse pour proposer l'accroche et les arguments.",
  },
  {
    step: 4,
    label: "Agenda",
    title: "Reliez votre agenda",
    subtitle: "Brief repère vos rendez-vous à venir et prépare leur brief sans que vous ayez à le demander.",
    why: "Un assistant rejoint aussi vos visios, prend des notes et vous envoie le compte-rendu.",
  },
  {
    step: 5,
    label: "Références",
    title: "Vos références clients",
    subtitle: "Vos cas clients deviennent des arguments : Brief cite ceux qui ressemblent le plus au prospect.",
    why: "Un fichier ou un simple copier-coller suffit ; vous pourrez compléter plus tard.",
  },
];

const EXAMPLES: Record<number, string[]> = {
  1: [
    "Un logiciel de devis pour les artisans du bâtiment",
    "Du conseil en recrutement de profils commerciaux",
    "Des emballages durables pour l'agroalimentaire",
  ],
  2: [
    "Directeurs commerciaux de PME de 20 à 200 salariés",
    "DAF d'ETI industrielles",
    "Dirigeants de réseaux d'agences",
  ],
};

// La raison affichée sous la question. Celles des étapes 3 et 4 citaient les
// emails de suivi et les objections, qu'un client en début de parcours n'a pas
// encore : elles ne les nomment que si le module est ouvert.
function whyFor(step: number, followUp: boolean, objections: boolean): string {
  if (step === 3 && followUp) {
    return "Vos briefs et vos emails de suivi s'appuient sur votre promesse pour proposer l'accroche et les arguments.";
  }
  if (step === 4) {
    const extras = [objections ? "les objections" : null, followUp ? "un email de suivi prêt à relire" : null].filter(Boolean);
    return `Un assistant rejoint aussi vos visios, prend des notes et vous envoie le compte-rendu${
      extras.length ? `, ${extras.join(" et ")}` : ""
    }.`;
  }
  return STEPS[step - 1]?.why ?? "";
}

const FIELD =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-[border-color,box-shadow] focus:border-[color:var(--violet)] focus:ring-4 focus:ring-[color:var(--violet)]/10";

// Frise nommée des étapes : on sait où l'on est et ce qui reste.
function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <ol className="mb-6 flex items-center gap-2 sm:gap-3">
      {STEPS.slice(0, total).map((s, i) => {
        const done = s.step < current;
        const active = s.step === current;
        return (
          <li key={s.step} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold transition-colors ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-gradient-to-br from-[#2A5CE0] to-[#6A4BE8] text-white shadow-[0_6px_14px_-6px_rgba(76,63,214,0.8)]"
                    : "bg-white text-slate-400 ring-1 ring-slate-200"
              }`}
            >
              {done ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                s.step
              )}
            </span>
            <span className={`hidden truncate text-[13px] font-medium sm:block ${active ? "text-slate-900" : "text-slate-400"}`}>
              {s.label}
            </span>
            {i < total - 1 && <span className={`h-px flex-1 ${done ? "bg-emerald-300" : "bg-slate-200"}`} />}
          </li>
        );
      })}
    </ol>
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
  // Puis « Présentez votre entreprise » : nom, site, rôle, et la proposition
  // de profil par Brief (CompanyStep).
  const [companyDone, setCompanyDone] = useState(false);
  const showCompany = account.needsCompany && welcomeDone && !companyDone && step === 1;
  const [role, setRole] = useState<CompanyRole>("commercial");
  // Ce que Brief a proposé, pour signaler les champs pré-remplis tant qu'ils
  // n'ont pas été modifiés.
  const [prefill, setPrefill] = useState<PrefillState | null>(null);

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

  // Rien trouvé : l'utilisateur ajoute son site et relance, sans revenir en
  // arrière. Les réponses déjà saisies ne sont pas écrasées.
  async function retryPrefill(website: string): Promise<void> {
    const res = await fetch("/api/onboarding/prefill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, website }),
    }).catch(() => null);
    const result = res?.ok ? ((await res.json()) as PrefillResult) : null;
    if (!result) return;
    if (result.found) {
      if (!whatYouSell.trim()) setWhatYouSell(result.whatYouSell);
      if (!icp.trim()) setIcp(result.icp);
      if (!sector.trim()) setSector(result.sector);
      if (!valueProposition.trim()) setValueProposition(result.valueProposition);
    }
    setPrefill({ ...result, source: website || companyName, origin: result.source ?? null });
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
        body: JSON.stringify(skip ? {} : { ...filledProfile(), role }),
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
        body: JSON.stringify({ ...filledProfile(), role }),
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

  const { title, subtitle, label } = STEPS[step - 1];
  const why = whyFor(step, isEnabled("follow_up"), isEnabled("objections"));

  return (
    // Fond teinté en haut de page, comme le reste de l'app.
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(180deg, oklch(0.965 0.022 270) 0px, var(--background) 520px)" }}
    >
      {/* Header */}
      <header>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[color:var(--primary)] text-[13px] font-semibold text-white">
              B
            </span>
            <span className="text-[16px] font-semibold tracking-tight text-slate-900">Brief</span>
          </div>
          {!account.needsCompany && (
            <button
              onClick={() => handleFinish(true)}
              className="text-[13px] text-slate-500 hover:text-slate-900 transition-colors"
            >
              Ignorer l&apos;onboarding
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        {!accountLoaded ? null : showWelcome ? (
          <WelcomeStep firstName={firstName} onStart={() => setWelcomeDone(true)} />
        ) : showCompany ? (
          <CompanyStep
            initialCompany={companyName}
            initialWebsite={companyDomainFromEmail(session?.user?.email) ?? ""}
            onDone={(r) => {
              setCompanyName(r.companyName);
              setRole(r.role);
              if (r.prefill?.found) {
                setWhatYouSell(r.prefill.whatYouSell);
                setIcp(r.prefill.icp);
                setSector(r.prefill.sector);
                setValueProposition(r.prefill.valueProposition);
              }
              setPrefill(r.prefill ? { ...r.prefill, source: r.website || r.companyName, origin: r.prefill.source ?? null } : null);
              setCompanyDone(true);
            }}
          />
        ) : (
        <div className="w-full max-w-5xl">
          <Stepper current={step} total={totalSteps} />

          <div className={showPreview ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start" : ""}>
          <div className="rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(42,92,224,0.06),0_24px_60px_-30px_rgba(42,92,224,0.45)] ring-1 ring-[color:var(--lavender-strong)] sm:p-10">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[color:var(--violet)]">
              Étape {step} sur {totalSteps} · {label}
            </p>
            <h1 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.035em] text-slate-900 sm:text-[34px]">{title}</h1>
            <p className="mt-2 text-[15.5px] leading-relaxed text-slate-500">{subtitle}</p>
            <PrefillNotice
              step={step}
              prefill={prefill}
              values={{ whatYouSell, icp, sector, valueProposition }}
              onRetry={retryPrefill}
            />

            <div
              className="mt-7"
              // Entrée passe à l'étape suivante dans un champ d'une ligne.
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && !isLast && !companyMissing) {
                  e.preventDefault();
                  advance();
                }
              }}
            >
            {/* ── Étape 1 — l'offre ── */}
            {step === 1 && (
              <div>
                <textarea
                  value={whatYouSell}
                  onChange={(e) => setWhatYouSell(e.target.value)}
                  autoFocus
                  rows={3}
                  placeholder="Ex. : un logiciel de devis pour les artisans du bâtiment, qui divise par trois le temps de chiffrage."
                  className={`${FIELD} resize-none py-3.5 leading-relaxed`}
                />
                <Examples items={EXAMPLES[1]} onPick={setWhatYouSell} />
              </div>
            )}

            {/* ── Étape 2 — la cible ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-[13.5px] font-medium text-slate-700">Profil de votre client idéal</label>
                  <input
                    type="text"
                    value={icp}
                    onChange={(e) => setIcp(e.target.value)}
                    autoFocus
                    placeholder="Ex. : directeurs commerciaux de PME industrielles de 20 à 200 salariés"
                    className={`${FIELD} h-12`}
                  />
                  <Examples items={EXAMPLES[2]} onPick={setIcp} />
                </div>
                <div>
                  <label className="mb-2.5 block text-[13.5px] font-medium text-slate-700">Secteur principal</label>
                  <div className="flex flex-wrap gap-2">
                    {SECTOR_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSector(s === sector ? "" : s)}
                        className={`h-10 rounded-full px-4 text-[14px] font-medium transition ${
                          sector === s
                            ? "bg-gradient-to-r from-[#2A5CE0] to-[#6A4BE8] text-white shadow-[0_8px_18px_-10px_rgba(76,63,214,0.8)]"
                            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900 hover:ring-slate-300"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Étape 3 — l'entreprise ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-[13.5px] font-medium text-slate-700">
                    {account.needsCompany ? "Nom de votre entreprise" : "Nom commercial"}
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    autoFocus
                    required={account.needsCompany}
                    maxLength={200}
                    placeholder="Ex. : Acme Solutions"
                    className={`${FIELD} h-12`}
                  />
                  {account.needsCompany && (
                    <p className="mt-2 text-[12.5px] text-slate-500">Obligatoire : votre compte Brief est rattaché à cette entreprise.</p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-[13.5px] font-medium text-slate-700">Votre promesse, en une phrase</label>
                  <input
                    type="text"
                    value={valueProposition}
                    onChange={(e) => setValueProposition(e.target.value)}
                    placeholder="Ex. : des devis professionnels en 2 minutes, depuis le chantier."
                    className={`${FIELD} h-12`}
                  />
                </div>
              </div>
            )}

            {/* ── Étape 4 — connexion agenda ── */}
            {step === 4 && (
              <div className="space-y-4">
                {calendarConnected ? (
                  <p className="rounded-2xl bg-[color:var(--success-soft)] px-4 py-3.5 text-[14px] leading-relaxed text-emerald-800">
                    Agenda relié. Vos prochains rendez-vous en visio seront enregistrés et analysés automatiquement.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* Le profil est enregistré AVANT de partir chez Google ou Microsoft :
                          l'OAuth quitte la page, et sans ça les trois premières
                          étapes seraient perdues. Le `return` ramène ici plutôt
                          que dans les paramètres. */}
                      <a
                        href="/api/recall/google-oauth/start?return=/onboarding%3Fstep%3D4"
                        onClick={connectCalendar}
                        className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-white text-[15px] font-medium text-slate-900 ring-1 ring-slate-200 transition hover:ring-slate-400"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#EAF1FE] text-[13px] font-bold text-[#1A73E8]">G</span>
                        Google Agenda
                      </a>
                      <a
                        href="/api/recall/microsoft-oauth/start?return=/onboarding%3Fstep%3D4"
                        onClick={connectCalendar}
                        className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-white text-[15px] font-medium text-slate-900 ring-1 ring-slate-200 transition hover:ring-slate-400"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#E6F2FB] text-[13px] font-bold text-[#0F6CBD]">O</span>
                        Outlook
                      </a>
                    </div>
                    <p className="text-[13px] leading-relaxed text-slate-500">
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
                  {(
                    [
                      ["upload", "Importer un fichier", "PDF, Word, Excel"],
                      ["text", "Copier-coller", "Un texte libre suffit"],
                    ] as const
                  ).map(([mode, title, hint]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => { setRefMode(mode); setRefFile(null); }}
                      className={`rounded-2xl p-4 text-left transition ${
                        refMode === mode
                          ? "bg-[color:var(--lavender)] ring-2 ring-[color:var(--violet)]"
                          : "bg-white ring-1 ring-slate-200 hover:ring-slate-300"
                      }`}
                    >
                      <p className="text-[14px] font-semibold text-slate-900">{title}</p>
                      <p className="mt-0.5 text-[12.5px] text-slate-500">{hint}</p>
                    </button>
                  ))}
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
                      <div className="flex items-center gap-3 rounded-2xl bg-[color:var(--lavender)] px-4 py-3">
                        <p className="flex-1 truncate text-[14px] font-medium text-[color:var(--violet)]">{refFile.name}</p>
                        <button type="button" onClick={() => setRefFile(null)} className="text-[13px] font-medium text-[color:var(--violet)] hover:underline">
                          Changer
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full flex-col items-center gap-1 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-[14px] text-slate-500 transition-colors hover:border-[color:var(--violet)] hover:bg-[color:var(--lavender)]"
                      >
                        <span className="font-medium text-slate-700">Choisir un fichier</span>
                        <span className="text-[12.5px]">PDF, Word ou Excel</span>
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
                    placeholder="Pour chaque client : son nom, son secteur, le problème résolu, les résultats obtenus."
                    className={`${FIELD} resize-none py-3.5 leading-relaxed`}
                  />
                )}
              </div>
            )}
            </div>

            {/* Pourquoi on le demande : une ligne, sous la question. */}
            <p className="mt-6 flex items-start gap-2 text-[13.5px] leading-relaxed text-slate-500">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span>{why}</span>
            </p>

            {/* ── Navigation ── */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-4">
                {step > 1 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="inline-flex h-11 items-center gap-1.5 rounded-full px-1 text-[14px] font-medium text-slate-600 transition-colors hover:text-slate-900"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour
                  </button>
                )}
                {!isLast && !companyMissing && (
                  <button onClick={advance} className="text-[14px] text-slate-400 transition-colors hover:text-slate-700">
                    Passer
                  </button>
                )}
                {/* Dernière étape. Références : « Terminer » tant que rien
                    n'est choisi, « Importer et terminer » dès qu'un fichier ou
                    un texte est là. */}
                {isLast && step === 5 && hasRefContent && (
                  <button
                    onClick={() => handleFinish(false)}
                    disabled={saving || refLoading}
                    className="text-[14px] text-slate-400 transition-colors hover:text-slate-700 disabled:opacity-50"
                  >
                    Passer cette étape
                  </button>
                )}
              </div>
              <button
                onClick={!isLast ? advance : step === 5 && hasRefContent ? handleImport : () => handleFinish(false)}
                disabled={companyMissing || (isLast && (saving || refLoading))}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#2A5CE0] to-[#6A4BE8] px-6 text-[15px] font-semibold text-white shadow-[0_12px_28px_-12px_rgba(76,63,214,0.85)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {!isLast
                  ? "Continuer"
                  : refLoading
                    ? "Import en cours…"
                    : saving
                      ? "Enregistrement…"
                      : step === 5 && hasRefContent
                        ? "Importer et terminer"
                        : "Accéder à Brief"}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            {saveError && <p className="mt-3 text-[13px] text-rose-700">{saveError}</p>}
          </div>

          {/* L'aperçu n'accompagne que les étapes de profil : sur l'agenda et
              les références, il n'apporterait rien et détournerait de l'action
              attendue. Masqué en mobile, où il pousserait le formulaire hors
              de l'écran. */}
          {showPreview && (
            <div className="hidden lg:block lg:sticky lg:top-8">
              <BriefPreview
                step={step}
                whatYouSell={whatYouSell}
                icp={icp}
                sector={sector}
                companyName={companyName}
                valueProposition={valueProposition}
              />
            </div>
          )}
          </div>
        </div>
        )}
      </main>
    </div>
  );
}

// Exemples cliquables sous un champ : on voit le niveau de détail attendu, et
// un clic remplit le champ pour l'ajuster.
function Examples({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-[12.5px] text-slate-400">Exemples :</span>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className="rounded-full bg-slate-50 px-3 py-1 text-[12.5px] text-slate-600 ring-1 ring-slate-200 transition hover:bg-[color:var(--lavender)] hover:text-[color:var(--violet)] hover:ring-[color:var(--lavender-strong)]"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

// Ce que Brief a proposé, et d'où : `source` est ce qu'on affiche (le site ou
// le nom saisi), `origin` dit si la proposition vient du web ou seulement des
// registres officiels.
type PrefillState = Omit<PrefillResult, "source"> & { source: string; origin: "web" | "registre" | null };

// Bandeau des étapes pré-remplies : Brief dit d'où vient la proposition et
// invite à la corriger. Il disparaît dès que la réponse a été modifiée — elle
// n'est plus la sienne. Rien de trouvé : l'étape 1 le dit, et propose
// d'ajouter le site pour relancer.
function PrefillNotice({
  step,
  prefill,
  values,
  onRetry,
}: {
  step: number;
  prefill: PrefillState | null;
  values: { whatYouSell: string; icp: string; sector: string; valueProposition: string };
  onRetry: (website: string) => Promise<void>;
}) {
  const [website, setWebsite] = useState("");
  const [retrying, setRetrying] = useState(false);
  if (!prefill || step > 3) return null;
  if (!prefill.found) {
    if (step !== 1) return null;
    return (
      <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3.5 ring-1 ring-slate-100">
        <p className="text-[13.5px] leading-relaxed text-slate-600">
          Nous n&apos;avons pas trouvé assez d&apos;informations publiques sur {prefill.source}. Indiquez votre site pour
          que Brief réessaie, ou décrivez votre offre en quelques mots.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="votre-site.fr"
            inputMode="url"
            className="h-10 min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 text-[14px] outline-none focus:border-[color:var(--violet)]"
          />
          <button
            type="button"
            disabled={!website.trim() || retrying}
            onClick={async () => {
              setRetrying(true);
              await onRetry(website.trim());
              setRetrying(false);
            }}
            className="h-10 shrink-0 rounded-full bg-white px-4 text-[13.5px] font-semibold text-[color:var(--violet)] ring-1 ring-[color:var(--lavender-strong)] transition hover:bg-[color:var(--lavender)] disabled:opacity-50"
          >
            {retrying ? "Recherche…" : "Réessayer"}
          </button>
        </div>
      </div>
    );
  }
  const unchanged =
    (step === 1 && values.whatYouSell && values.whatYouSell === prefill.whatYouSell) ||
    (step === 2 && values.icp && values.icp === prefill.icp) ||
    (step === 3 && values.valueProposition && values.valueProposition === prefill.valueProposition);
  if (!unchanged) return null;
  return (
    <p className="mt-5 flex items-start gap-2.5 rounded-2xl bg-[color:var(--lavender)] px-4 py-3 text-[13.5px] leading-relaxed text-slate-700 ring-1 ring-[color:var(--lavender-strong)]">
      <span aria-hidden className="mt-px">✨</span>
      {prefill.origin === "registre" ? (
        <span>
          <span className="font-semibold text-slate-900">Proposé par Brief</span> d&apos;après l&apos;activité déclarée au
          registre des entreprises. Précisez-la avec vos mots : vos briefs n&apos;en seront que meilleurs.
        </span>
      ) : (
        <span>
          <span className="font-semibold text-slate-900">Proposé par Brief</span> d&apos;après {prefill.source}. Vérifiez,
          ajustez si besoin, puis continuez.
        </span>
      )}
    </p>
  );
}
