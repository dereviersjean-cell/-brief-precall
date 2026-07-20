import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Bot,
  ClipboardCheck,
  FileText,
  History,
  FileCheck,
  ListChecks,
  Share2,
  Mail,
  BookOpen,
  Users2,
  CheckCircle2,
  Circle,
  Building2,
  Newspaper,
  Target,
  Mic,
  Video,
  AlertTriangle,
  Quote,
  Zap,
  Lock,
  Database,
  Globe2,
  BarChart3,
  MessageSquare,
  PenLine,
  Clock,
  Play,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Brief — Le copilote IA des rendez-vous commerciaux B2B",
  description:
    "Brief prépare, analyse et distribue chaque rendez-vous commercial. Briefs pré-call sourcés, analyse automatique des visios, coaching, tâches et devis auto-générés. Pour équipes B2B françaises.",
};

function BrandMark() {
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-xl brand-gradient text-white text-[13px] font-semibold shadow-[var(--shadow-glow)]">
        B
      </span>
      <span className="text-[15.5px] font-semibold tracking-tight text-ink">Brief</span>
    </Link>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <BrandMark />
        <nav className="hidden md:flex items-center gap-8 text-[13.5px] text-muted-foreground">
          <a href="#pipeline" className="hover:text-ink transition-colors">Pipeline</a>
          <a href="#precall" className="hover:text-ink transition-colors">Pré-call</a>
          <a href="#references" className="hover:text-ink transition-colors">Références</a>
          <a href="#analyse" className="hover:text-ink transition-colors">Analyse</a>
          <a href="#coaching" className="hover:text-ink transition-colors">Coaching</a>
          <a href="#features" className="hover:text-ink transition-colors">Fonctionnalités</a>
          <a href="#integrations" className="hover:text-ink transition-colors">Intégrations</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:inline-flex text-[13.5px] font-medium text-muted-foreground hover:text-ink transition-colors">
            Se connecter
          </Link>
          <Link
            href="/login"
            className="brand-gradient inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-medium text-white shadow-[var(--shadow-glow)] hover:brightness-110 transition-all"
          >
            Accéder à Brief <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function WindowChrome({ path }: { path: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
      <div className="mx-auto text-[11.5px] text-muted-foreground tabular-nums font-mono">{path}</div>
    </div>
  );
}

function MiniSidebar({ active }: { active: string }) {
  const items = ["Dashboard", "Rendez-vous", "Analyses", "Historique", "Devis", "Équipe"];
  return (
    <div className="hidden md:block border-r border-border p-4 space-y-1 bg-lavender/30">
      <div className="mb-3 flex items-center gap-2 px-2">
        <span className="grid h-6 w-6 place-items-center rounded-md brand-gradient text-white text-[10px] font-semibold">B</span>
        <span className="text-[12.5px] font-semibold text-ink">Brief</span>
      </div>
      {items.map((label) => (
        <div
          key={label}
          className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] ${
            label === active ? "bg-lavender text-primary font-medium" : "text-muted-foreground"
          }`}
        >
          <Circle className="h-2.5 w-2.5" /> {label}
        </div>
      ))}
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-[520px]">
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] rounded-full bg-lavender-deep/40 blur-3xl animate-blob" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-20 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 backdrop-blur px-3 py-1 text-[11.5px] font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Copilote IA pour équipes commerciales B2B
        </span>
        <h1 className="mt-6 text-[44px] md:text-[64px] leading-[1.02] font-bold tracking-[-0.03em] text-ink">
          Arrivez préparé. <span className="italic-serif text-primary">Repartez</span> avec le suivi déjà fait.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-ink/80">
          <b className="text-ink">Le copilote qui prépare vos rendez-vous, écoute vos calls et écrit le suivi à votre place.</b>
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground">
          Brief livre un dossier complet avant chaque RDV, rejoint votre visio pour l&apos;enregistrer,
          la transcrire et la scorer, puis génère les tâches, les emails de relance et les devis —
          en moins de 2 minutes après la fin du call. Vos commerciaux ne repartent jamais les mains vides.
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground/80">
          Côté management, votre directeur commercial pilote sur des faits :
          scoring homogène, tendances par commercial, objections récurrentes, motifs de win/loss
          et bonnes pratiques des top performers — extraites automatiquement et prêtes à partager en 1:1.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="brand-gradient inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-medium text-white shadow-[var(--shadow-glow)] hover:brightness-110 transition-all"
          >
            Se connecter <ArrowUpRight className="h-4 w-4" />
          </Link>
          <a
            href="#pipeline"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-5 text-[14px] font-medium text-ink hover:bg-lavender/40 transition-colors"
          >
            Voir comment ça marche <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Accès sur invitation · hébergement européen · édité par Oliverlist
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl">
          <div className="relative rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(80,60,180,0.25)] border border-border/60 overflow-hidden text-left">
            <WindowChrome path="brief.app / analyses / acme-corp" />
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
              <MiniSidebar active="Analyses" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-600">
                        <span className="relative inline-flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60 animate-ping" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                        </span>
                        Enregistré · 42:07
                      </span>
                      <span className="text-[10.5px] font-medium text-muted-foreground">Google Meet</span>
                      <span className="text-[10.5px] font-medium text-muted-foreground/60">·</span>
                      <span className="text-[10.5px] font-medium text-muted-foreground">Transcrit · FR</span>
                    </div>
                    <div className="mt-1 text-[18px] font-semibold text-ink">
                      Acme Corp — Marie Lambert, Head of RevOps
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      Jeudi 14:30 · Découverte · 3 participants
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {[
                        ["Stage", "Découverte → Démo"],
                        ["ARR estimé", "48 k€"],
                        ["Source", "Outbound · LinkedIn"],
                        ["Cycle", "J+12"],
                      ].map(([k, v]) => (
                        <span key={k} className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-1.5 py-[2px] text-[10px]">
                          <span className="text-muted-foreground">{k}</span>
                          <span className="text-ink font-medium">{v}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[34px] font-semibold tracking-tight text-primary leading-none tabular-nums">
                      3.4<span className="text-[16px] text-muted-foreground">/5</span>
                    </div>
                    <div className="text-[10.5px] text-muted-foreground uppercase tracking-wider mt-1">
                      Score global
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                      <ArrowUpRight className="h-3 w-3" /> +0.4 vs moyenne équipe
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-[180px_1fr] gap-3">
                  <div
                    className="relative aspect-[4/5] rounded-xl overflow-hidden border border-slate-800"
                    style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#334155 100%)" }}
                  >
                    <div className="absolute inset-0 grid grid-rows-3 gap-[3px] p-[3px]">
                      {[
                        { n: "Marie L.", init: "M", speaking: true, tone: "from-rose-400/40 to-rose-600/30" },
                        { n: "Vous", init: "V", speaking: false, tone: "from-sky-400/40 to-primary/30" },
                        { n: "Julien C.", init: "J", speaking: false, tone: "from-emerald-400/30 to-teal-600/20" },
                      ].map((p) => (
                        <div key={p.n} className={`relative rounded-md bg-gradient-to-br ${p.tone} overflow-hidden ${p.speaking ? "ring-1 ring-emerald-400/80" : "ring-1 ring-white/10"}`}>
                          <div className="absolute inset-0 grid place-items-center">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15 backdrop-blur text-white text-[9px] font-semibold">{p.init}</span>
                          </div>
                          <div className="absolute bottom-[3px] left-[3px] right-[3px] flex items-center justify-between text-[8px] text-white">
                            <span className="rounded bg-black/50 px-1 py-[1px] font-medium truncate">{p.n}</span>
                            {p.speaking && (
                              <span className="flex items-end gap-[1px] rounded bg-emerald-500/90 px-[3px] py-[1px]">
                                {[2, 4, 3, 5, 2].map((h, i) => (
                                  <span key={i} className="w-[1px] bg-white rounded-full" style={{ height: `${h}px` }} />
                                ))}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur px-1.5 py-[1px] text-[8.5px] font-medium text-white">
                      <span className="relative inline-flex h-1 w-1">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-70 animate-ping" />
                        <span className="relative inline-flex h-1 w-1 rounded-full bg-rose-500" />
                      </span>
                      REC 18:24
                    </div>
                    <button className="absolute bottom-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/95 text-ink shadow">
                      <Play className="h-3 w-3 fill-current" />
                    </button>
                  </div>

                  <div className="rounded-xl border border-border bg-white p-3">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-primary">
                        <Sparkles className="h-3 w-3" /> Analyse IA du call
                      </div>
                      <span className="text-[9.5px] text-muted-foreground">mise à jour en direct</span>
                    </div>
                    <ul className="mt-2 space-y-1.5 text-[11.5px] leading-snug">
                      <li className="flex items-start gap-1.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        <span className="text-ink/80"><b className="text-ink">Objection budget</b> à 12:04 — « on est déjà engagés avec HubSpot ». <span className="text-primary font-medium">Réponse playbook §3.2</span></span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span className="text-ink/80"><b className="text-ink">Signal d&apos;achat</b> — Marie demande le pricing 3 sièges à 21:47.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                        <span className="text-ink/80"><b className="text-ink">Risque</b> — CFO (Julien) parle 6% : décideur pas engagé, prévoir un 1:1.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                        <span className="text-ink/80"><b className="text-ink">Concurrent cité</b> — Modjo (28:03). Comparatif dispo dans le kit vente.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-border p-3.5">
                  <div className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Temps de parole</span>
                    <span className="text-muted-foreground/70 normal-case tracking-normal font-normal">Ratio conseillé : 40 / 60</span>
                  </div>
                  <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-lavender">
                    <div className="brand-gradient" style={{ width: "38%" }} />
                    <div className="bg-slate-300" style={{ width: "56%" }} />
                    <div className="bg-slate-200" style={{ width: "6%" }} />
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11.5px]">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full brand-gradient" />
                      <span className="text-ink font-medium">Vous</span>
                      <span className="text-muted-foreground tabular-nums">15:58 · 38%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      <span className="text-ink font-medium">Marie L.</span>
                      <span className="text-muted-foreground tabular-nums">23:35 · 56%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                      <span className="text-ink font-medium">Julien C.</span>
                      <span className="text-muted-foreground tabular-nums">2:34 · 6%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    ["Ouverture", 3.0],
                    ["Découverte besoin", 4.0],
                    ["Pitch / démo", 3.0],
                    ["Prochaine étape", 4.0],
                  ].map(([label, v]) => (
                    <div key={label as string}>
                      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                        <span>{label}</span>
                        <span className="tabular-nums text-ink font-medium">{(v as number).toFixed(1)}/5</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-lavender">
                        <div className="h-full rounded-full brand-gradient" style={{ width: `${((v as number) / 5) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl bg-lavender/40 border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Résumé exécutif</div>
                    <span className="text-[10.5px] text-primary font-medium">Généré par IA</span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink/80">
                    Marie confirme un projet de refonte RevOps pour Q1. Deux objections : intégration Salesforce et
                    délai de mise en œuvre. Budget évoqué : 40–60k€. Décideur additionnel à embarquer : Julien (CFO).
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Prochaine étape suggérée : envoyer étude de cas + caler démo avec Julien sous 48h
                </div>

                <div className="mt-5 rounded-2xl border border-border p-3.5">
                  <div className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Chapitres · générés automatiquement</span>
                    <span className="text-muted-foreground/70 normal-case tracking-normal font-normal">42:07 · 8 moments clés</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    {[
                      ["00:00", "Intro & contexte", "bg-slate-400"],
                      ["04:12", "Découverte besoin", "bg-emerald-500"],
                      ["12:04", "Objection budget", "bg-amber-500"],
                      ["18:24", "Démo produit", "bg-sky-500"],
                      ["21:47", "Signal d'achat", "bg-emerald-500"],
                      ["28:03", "Concurrent cité", "bg-rose-500"],
                      ["33:11", "Cadre décisionnel", "bg-slate-400"],
                      ["38:50", "Next step", "bg-primary"],
                    ].map(([t, l, c]) => (
                      <button key={t} className="group text-left rounded-lg border border-border bg-white px-2 py-1.5 hover:border-primary/50 hover:shadow-sm transition">
                        <div className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground tabular-nums">
                          <span className={`h-1.5 w-1.5 rounded-full ${c}`} /> {t}
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-ink/90 leading-tight truncate">{l}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between bg-lavender/30 px-3.5 py-2 border-b border-border">
                    <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink/80">
                      <Sparkles className="h-3 w-3 text-primary" /> Suivi généré · prêt à envoyer
                    </div>
                    <span className="text-[10px] text-muted-foreground">3 tâches · 2 emails · 1 devis</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                    <div className="p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email de suivi</div>
                      <div className="text-[12px] font-medium text-ink">Compte-rendu + étude de cas</div>
                      <p className="mt-1 text-[11px] text-muted-foreground leading-snug line-clamp-2">
                        « Bonjour Marie, merci pour l&apos;échange. Comme évoqué, je vous partage l&apos;étude sur l&apos;attribution Salesforce… »
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-primary font-medium">
                        Ouvrir le brouillon <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Tâches CRM</div>
                      <ul className="space-y-1 text-[11.5px] text-ink/80">
                        <li className="flex items-center gap-1.5"><Circle className="h-2.5 w-2.5 text-slate-300" /> Caler démo avec Julien (CFO) <span className="ml-auto text-[10px] text-rose-500 font-medium">48h</span></li>
                        <li className="flex items-center gap-1.5"><Circle className="h-2.5 w-2.5 text-slate-300" /> Partager comparatif vs Modjo <span className="ml-auto text-[10px] text-muted-foreground">J+3</span></li>
                        <li className="flex items-center gap-1.5"><Circle className="h-2.5 w-2.5 text-slate-300" /> Créer opportunité Salesforce <span className="ml-auto text-[10px] text-muted-foreground">Auto</span></li>
                      </ul>
                    </div>
                    <div className="p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Devis pré-rempli</div>
                      <div className="text-[12px] font-medium text-ink">Brief Team · 3 sièges</div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-[18px] font-semibold text-ink tabular-nums">48 k€</span>
                        <span className="text-[10.5px] text-muted-foreground">/ an · engagement 12 mois</span>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-primary font-medium">
                        Prévisualiser <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Conçu pour les équipes commerciales de PME &amp; ETI françaises
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[13px] font-medium text-muted-foreground">
            <span>Éditeurs SaaS</span>
            <span className="text-border">·</span>
            <span>Cabinets de conseil</span>
            <span className="text-border">·</span>
            <span>Agences B2B</span>
            <span className="text-border">·</span>
            <span>Industrie &amp; services</span>
            <span className="text-border">·</span>
            <span>Recrutement spécialisé</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pipeline() {
  const steps = [
    {
      n: "01",
      title: "Avant le RDV",
      icon: FileText,
      body: "Brief génère automatiquement un dossier complet sur l'entreprise et le contact : actualités, levées, effectifs, signaux d'intention, références clients similaires dans votre portefeuille.",
    },
    {
      n: "02",
      title: "Pendant le RDV",
      icon: Bot,
      body: "Un bot rejoint votre Google Meet, Teams ou Zoom. Il enregistre, transcrit en français et identifie les intervenants — sans que vous ayez à y penser.",
    },
    {
      n: "03",
      title: "Après le RDV",
      icon: ClipboardCheck,
      body: "Score, résumé, objections, prochaines étapes. Tout est poussé dans votre CRM et Slack, avec les tâches créées, les brouillons d'emails écrits et le devis pré-rempli prêt à envoyer.",
    },
  ];
  return (
    <section id="pipeline" className="mx-auto max-w-6xl px-6 py-24">
      <div className="text-center">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">Comment ça marche</span>
        <h2 className="mt-3 text-[34px] md:text-[44px] leading-tight font-bold tracking-[-0.03em] text-ink">
          Un cycle commercial complet, <span className="italic-serif text-primary">automatisé</span>.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Brief couvre les trois moments où un commercial perd le plus de temps : la préparation,
          la prise de notes et le suivi. Vos commerciaux gardent la main sur la relation, l&apos;IA
          fait le reste.
        </p>
      </div>
      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.n} className="group relative rounded-2xl border border-border/60 bg-white p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl brand-gradient text-white shadow-[var(--shadow-glow)]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="italic-serif text-[28px] text-primary/40 leading-none">{s.n}</span>
              </div>
              <h3 className="mt-5 text-[19px] font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PreCallItem({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white border border-border text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="font-medium text-ink">{title}</div>
        <div className="text-[13px] text-muted-foreground leading-relaxed">{body}</div>
      </div>
    </li>
  );
}

function PreCallSection() {
  return (
    <section id="precall" className="border-y border-border/60 bg-lavender/20">
      <div className="mx-auto max-w-6xl px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <div>
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">Brief pré-call</span>
          <h2 className="mt-3 text-[30px] md:text-[38px] leading-tight font-bold tracking-[-0.03em] text-ink">
            Toutes vos infos. <span className="italic-serif text-primary">Sans les chercher.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            La veille de chaque rendez-vous, Brief compile un dossier prêt à lire en 3 minutes. Fini
            les 20 minutes passées entre LinkedIn, Pappers et le site du prospect avant chaque call.
          </p>
          <ul className="mt-6 space-y-3.5 text-[14px] text-ink/80">
            <PreCallItem icon={Building2} title="Fiche entreprise sourcée" body="Effectifs, CA, dirigeants, financement — depuis Pappers, LinkedIn et le web." />
            <PreCallItem icon={Newspaper} title="Signaux récents" body="Levées de fonds, recrutements clés, communiqués, mentions presse des 60 derniers jours." />
            <PreCallItem icon={Target} title="Références clients pertinentes" body="Brief pioche dans vos cas clients ceux qui ressemblent le plus au prospect (secteur, taille, use case)." />
            <PreCallItem icon={MessageSquare} title="Questions de découverte suggérées" body="Basées sur votre playbook et le contexte spécifique du compte." />
          </ul>
        </div>

        <div className="relative">
          <div className="relative rounded-3xl border border-border bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)] overflow-hidden">
            <WindowChrome path="brief.app / rdv / acme-corp" />
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-wider text-primary">Brief pré-call</div>
                  <div className="mt-1 text-[17px] font-semibold text-ink">Acme Corp</div>
                  <div className="text-[12px] text-muted-foreground">Jeudi 14:30 · Marie Lambert, Head of RevOps</div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-lavender px-2.5 py-1 text-[10.5px] font-medium text-primary">
                  <Sparkles className="h-3 w-3" /> Prêt
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Effectifs", "120"],
                  ["CA 2024", "18 M€"],
                  ["Financement", "Série B"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-border bg-lavender/20 p-2.5 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                    <div className="mt-0.5 text-[14px] font-semibold text-ink tabular-nums">{v}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Newspaper className="h-3.5 w-3.5" /> Actualités
                </div>
                <ul className="mt-2 space-y-1.5 text-[12.5px] text-ink/80">
                  <li>• Levée de 12 M€ (Série B) annoncée le 3 octobre</li>
                  <li>• Recrutement d&apos;un VP Sales</li>
                  <li>• Ouverture de bureaux à Barcelone</li>
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-lavender/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-primary">
                    <Target className="h-3.5 w-3.5" /> Références similaires
                  </div>
                  <span className="text-[10px] text-primary font-medium">Cross-référencé</span>
                </div>
                {/* Exemple illustratif — pas un vrai client */}
                <div className="mt-2 rounded-lg bg-white border border-border p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-ink text-background">
                      <Building2 className="h-3 w-3" />
                    </span>
                    <span className="text-[11.5px] font-semibold text-ink">SaaS RH · 220 pers.</span>
                    <span className="text-[10px] text-muted-foreground">Série C · Salesforce</span>
                    <span className="ml-auto text-[10.5px] tabular-nums font-semibold text-primary">94% match</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10.5px]">
                    <div className="rounded-md bg-emerald-50 border border-emerald-100 p-1.5">
                      <div className="text-[9.5px] font-semibold uppercase tracking-wider text-emerald-700">Ce qu&apos;on a fait</div>
                      <ul className="mt-0.5 space-y-0.5 text-ink/80">
                        <li>• Attribution multi-touch en 6 sem.</li>
                        <li>• Onboarding RevOps + 3 AE</li>
                        <li>• +32% de leads sourcés</li>
                      </ul>
                    </div>
                    <div className="rounded-md bg-lavender/60 border border-border p-1.5">
                      <div className="text-[9.5px] font-semibold uppercase tracking-wider text-primary">Ce qu&apos;on peut faire chez Acme</div>
                      <ul className="mt-0.5 space-y-0.5 text-ink/80">
                        <li>• Même schéma Salesforce → 4 sem.</li>
                        <li>• POC Q1 aligné refonte RevOps</li>
                        <li>• Cible : +25% pipeline sourcé</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-2 rounded-md bg-lavender/20 border border-border p-1.5">
                    <div className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">Accroche suggérée</div>
                    <p className="mt-0.5 text-[11px] italic leading-snug text-ink/80">
                      « Un de vos pairs avait exactement votre stack Salesforce et le même sujet d&apos;attribution — on lui a fait gagner un trimestre. Je peux vous montrer comment on transposerait ça chez Acme sur Q1. »
                    </p>
                  </div>
                </div>
                {/* Autres refs — compact, exemples génériques */}
                <ul className="mt-2 space-y-1">
                  {[
                    { name: "Fintech B2B", why: "Série B · même use case attribution", match: 89 },
                    { name: "Scale-up FR", why: "A remplacé HubSpot", match: 82 },
                  ].map((r) => (
                    <li key={r.name} className="flex items-center gap-2 rounded-md bg-white border border-border px-2 py-1">
                      <span className="text-[11px] font-semibold text-ink/90 w-24 shrink-0">{r.name}</span>
                      <span className="flex-1 text-[10.5px] text-muted-foreground truncate">{r.why}</span>
                      <span className="text-[10px] tabular-nums font-semibold text-primary">{r.match}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReferencesSection() {
  const refs = [
    {
      name: "SaaS RH",
      sector: "220 pers. · Série C",
      match: 94,
      matches: ["Même stack Salesforce", "Même problème attribution", "Taille comparable"],
      outcome: "Cycle de vente : 47j · Gain +32% attribution",
      verbatim: "« On avait exactement la même problématique — l'équipe Brief nous a fait gagner un trimestre. »",
      author: "Responsable RevOps, cas client SaaS RH",
    },
    {
      name: "Fintech B2B",
      sector: "400 pers. · Série B",
      match: 89,
      matches: ["Série B récente", "Même use case attribution", "Décideur RevOps"],
      outcome: "Signature 30j après démo · ROI 4 mois",
      verbatim: "« Le cross-référencement fait sur notre call a été un déclencheur : on a vu qu'un pair avait résolu ça. »",
      author: "Direction financière, cas client Fintech B2B",
    },
  ];
  return (
    <section id="references" className="border-b border-border/60 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">Cross-référencement de vos clients</span>
          <h2 className="mt-3 text-[34px] md:text-[44px] leading-tight font-bold tracking-[-0.03em] text-ink">
            La bonne <span className="italic-serif text-primary">référence client</span>, au bon moment.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Brief vectorise votre catalogue de cas clients (études, verbatims, secteurs, use cases,
            outils remplacés, gains chiffrés) et le croise avec le contexte de chaque prospect.
            Résultat : à chaque rendez-vous, vos commerciaux savent exactement quelle preuve sociale
            avancer — et pourquoi elle va résonner.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-8 items-start">
          <div className="relative">
            <div className="relative rounded-3xl border border-border bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)] overflow-hidden">
              <WindowChrome path="brief.app / références / acme-corp" />
              <div className="p-5">
                <div className="rounded-2xl bg-lavender/20 border border-border p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl brand-gradient text-white text-[13px] font-semibold">A</span>
                    <div className="flex-1">
                      <div className="text-[13.5px] font-semibold text-ink">Acme Corp</div>
                      <div className="text-[11.5px] text-muted-foreground">SaaS RH · 120p · Série B · Paris</div>
                    </div>
                    <span className="rounded-full bg-lavender px-2.5 py-1 text-[10.5px] font-medium text-primary">
                      {refs.length} refs trouvées
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["Salesforce", "Attribution multi-touch", "RevOps", "Q1 refonte"].map((t) => (
                      <span key={t} className="rounded-md border border-border bg-white px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {refs.map((r) => (
                    <div key={r.name} className="rounded-2xl border border-border p-4 hover:border-primary/30 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-background">
                            <Building2 className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <div className="text-[13px] font-semibold text-ink">{r.name}</div>
                            <div className="text-[11px] text-muted-foreground">{r.sector}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[16px] font-semibold text-primary tabular-nums leading-none">{r.match}%</div>
                          <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground mt-0.5">match</div>
                        </div>
                      </div>
                      <div className="mt-3 h-1 rounded-full bg-lavender overflow-hidden">
                        <div className="h-full brand-gradient" style={{ width: `${r.match}%` }} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {r.matches.map((m) => (
                          <span key={m} className="inline-flex items-center gap-1 rounded-md bg-lavender/60 border border-border px-1.5 py-0.5 text-[10.5px] font-medium text-primary">
                            <CheckCircle2 className="h-3 w-3" /> {m}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 rounded-lg bg-lavender/20 border border-border p-2.5">
                        <p className="text-[11.5px] italic text-ink/80 leading-relaxed">{r.verbatim}</p>
                        <div className="mt-1.5 text-[10.5px] text-muted-foreground">— {r.author}</div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[10.5px]">
                        <span className="text-emerald-700 font-medium">{r.outcome}</span>
                        <span className="text-primary font-medium">Insérer dans email ↗</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-lavender/10 p-5">
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-primary">Ce que Brief croise</div>
              <ul className="mt-3 space-y-2.5 text-[13px] text-ink/80">
                <li className="flex items-start gap-2.5">
                  <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span><b className="text-ink">Vos cas clients</b> — études, one-pagers, verbatims, chiffres clés, secteurs, outils remplacés, gains obtenus.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span><b className="text-ink">Le contexte du prospect</b> — secteur, taille, financement, stack technique, personas, signaux d&apos;intention.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span><b className="text-ink">Ce qui a été dit en RDV</b> — objections, priorités, décideurs, concurrents cités — pour affiner à chaque call.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border p-5">
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-primary">Pourquoi c&apos;est puissant</div>
              <ul className="mt-3 space-y-2.5 text-[13px] text-ink/80">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Le commercial junior <b className="text-ink">connaît immédiatement</b> la référence la plus pertinente à sortir, comme s&apos;il avait 10 ans de maison.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Les études clients <b className="text-ink">redeviennent vivantes</b> — plus jamais oubliées dans un Drive.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Les objections récurrentes trouvent la <b className="text-ink">preuve sociale exacte</b> qui les désamorce.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl brand-gradient text-white p-5 shadow-[var(--shadow-glow)]">
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-white/80">Ingestion continue</div>
              <p className="mt-2 text-[13px] leading-relaxed text-white/90">
                Ajoutez un cas client depuis Notion, un PDF ou un Google Doc : Brief l&apos;ingère,
                l&apos;indexe et le rend disponible pour tous les prochains rendez-vous en moins de 5 minutes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TranscriptLine({ who, me, ts, text }: { who: string; me: boolean; ts: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${me ? "brand-gradient text-white" : "bg-lavender text-ink/80"}`}>
        {who[0]}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-ink/80">{who}</span>
          <span className="tabular-nums">{ts}</span>
        </div>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink/80">{text}</p>
      </div>
    </div>
  );
}

function AnalyseCard({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3.5">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-lavender text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-[13.5px] font-semibold text-ink">{title}</div>
      <div className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{body}</div>
    </div>
  );
}

function AnalyseSection() {
  return (
    <section id="analyse" className="mx-auto max-w-6xl px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
      <div className="relative order-2 lg:order-1">
        <div className="relative rounded-3xl border border-border bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)] overflow-hidden">
          <WindowChrome path="brief.app / analyses / acme-corp / transcript" />
          <div className="p-5 space-y-4">
            <div className="relative rounded-2xl bg-slate-900 text-white p-4 overflow-hidden">
              <div
                className="relative aspect-[16/7] rounded-xl overflow-hidden mb-3 border border-white/10"
                style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#334155 100%)" }}
              >
                <div className="absolute inset-0 grid grid-cols-3 gap-1 p-1">
                  {[
                    { n: "Marie L.", init: "M", speaking: true, tone: "from-rose-400/40 to-rose-600/30" },
                    { n: "Vous", init: "V", speaking: false, tone: "from-sky-400/40 to-primary/30" },
                    { n: "Julien C.", init: "J", speaking: false, tone: "from-emerald-400/30 to-teal-600/20" },
                  ].map((p) => (
                    <div key={p.n} className={`relative rounded-lg bg-gradient-to-br ${p.tone} overflow-hidden ${p.speaking ? "ring-2 ring-emerald-400/80" : "ring-1 ring-white/10"}`}>
                      <div className="absolute inset-0 grid place-items-center">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 backdrop-blur text-[13px] font-semibold">{p.init}</span>
                      </div>
                      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-[9.5px]">
                        <span className="rounded bg-black/50 px-1.5 py-0.5 font-medium truncate">{p.n}</span>
                        {p.speaking && (
                          <span className="flex items-end gap-[1.5px] rounded bg-emerald-500/90 px-1 py-0.5">
                            {[3, 5, 4, 6, 3].map((h, i) => (
                              <span key={i} className="w-[1.5px] bg-white rounded-full" style={{ height: `${h}px` }} />
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] font-medium">
                  <span className="relative inline-flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-70 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                  </span>
                  REC · 18:24
                </div>
                <div className="absolute top-2 right-2 rounded-md bg-black/50 backdrop-blur px-1.5 py-0.5 text-[9.5px] text-white/80">Google Meet · HD</div>
                <button className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-ink shadow-lg hover:scale-105 transition">
                  <Play className="h-3.5 w-3.5 fill-current" />
                </button>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/60">
                  <span>Temps de parole</span>
                  <span className="normal-case text-white/50">Ratio conseillé 40/60</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full overflow-hidden flex bg-white/10">
                  <div className="h-full bg-rose-400/80" style={{ width: "56%" }} />
                  <div className="h-full bg-sky-400/80" style={{ width: "38%" }} />
                  <div className="h-full bg-emerald-400/70" style={{ width: "6%" }} />
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-white/70">
                  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" />Marie 56%</span>
                  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" />Vous 38%</span>
                  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Julien 6%</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="grid h-9 w-9 place-items-center rounded-full bg-white/10 backdrop-blur">
                  <Play className="h-4 w-4 fill-white" />
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-wider text-white/60">Lecture · chapitre Découverte</div>
                  <div className="text-[13px] font-medium">Acme Corp — Découverte</div>
                </div>
                <div className="text-[11.5px] tabular-nums text-white/70">18:24 / 42:07</div>
              </div>
              <div className="mt-3 flex items-end gap-[2px] h-10">
                {Array.from({ length: 64 }).map((_, i) => {
                  const played = i / 64 < 0.44;
                  const h = 12 + Math.abs(Math.sin(i * 0.9) * 22) + (i % 5 === 0 ? 6 : 0);
                  return <span key={i} className={`w-[3px] rounded-full ${played ? "bg-white/90" : "bg-white/25"}`} style={{ height: `${Math.min(h, 40)}px` }} />;
                })}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-white/60">
                <span className="rounded bg-white/10 px-1.5 py-0.5">00:00 Intro</span>
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-white">05:12 Découverte</span>
                <span className="rounded bg-white/10 px-1.5 py-0.5">22:40 Démo</span>
                <span className="rounded bg-white/10 px-1.5 py-0.5">36:10 Next steps</span>
              </div>
            </div>

            <div className="space-y-3">
              <TranscriptLine who="Marie" me={false} ts="18:12" text="Aujourd'hui on gère tout ça sous Salesforce, mais l'attribution multi-touch, on n'y arrive pas." />
              <TranscriptLine who="Vous" me ts="18:28" text="C'est justement là où on intervient. Vous êtes combien à toucher au CRM au quotidien ?" />
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> Objection détectée
                </div>
                <p className="mt-1 text-[12.5px] text-ink/80">
                  « Notre équipe est déjà surchargée, une nouvelle intégration me fait peur. »
                </p>
                <div className="mt-2 flex items-center gap-2 text-[10.5px] text-amber-700/90">
                  <span className="rounded-md bg-white px-1.5 py-0.5 font-medium border border-amber-200">21:04</span>
                  <span>· Réponse-type dispo dans le playbook</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Mots-clés</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[["attribution", 7], ["Salesforce", 5], ["Q1", 4], ["RevOps", 3], ["budget", 2]].map(([w, n]) => (
                      <span key={w} className="inline-flex items-center gap-1 rounded-md bg-lavender/20 border border-border px-1.5 py-0.5 text-[11px] text-ink/80">
                        {w} <span className="text-muted-foreground tabular-nums">×{n}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Concurrents cités</div>
                  <ul className="mt-2 space-y-1 text-[11.5px] text-ink/80">
                    <li className="flex items-center justify-between"><span>HubSpot</span><span className="text-muted-foreground tabular-nums">12:41</span></li>
                    <li className="flex items-center justify-between"><span>Modjo</span><span className="text-muted-foreground tabular-nums">28:03</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="order-1 lg:order-2">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">Analyse post-call</span>
        <h2 className="mt-3 text-[30px] md:text-[38px] leading-tight font-bold tracking-[-0.03em] text-ink">
          Chaque call <span className="italic-serif text-primary">décortiqué</span>, sans écouter 40 minutes.
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          Le bot rejoint votre visio, transcrit en français, identifie les intervenants, puis
          l&apos;IA analyse le call selon votre propre playbook. Vous récupérez en 2 minutes ce qui
          demandait une heure de réécoute.
        </p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnalyseCard icon={Mic} title="Transcription précise" body="Français natif, identification des locuteurs, timecodes cliquables." />
          <AnalyseCard icon={BarChart3} title="Scoring par dimension" body="Ouverture, découverte, pitch, next step — calé sur votre playbook." />
          <AnalyseCard icon={AlertTriangle} title="Objections & signaux" body="Détection automatique des objections, du sentiment et des concurrents cités." />
          <AnalyseCard icon={PenLine} title="Résumé & next steps" body="Résumé exécutif, décisions, action items — prêts à copier-coller dans le CRM." />
        </div>
      </div>
    </section>
  );
}

function CoachItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}

function CoachingSection() {
  return (
    <section id="coaching" className="border-y border-border/60 bg-lavender/20">
      <div className="mx-auto max-w-6xl px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <div>
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">Pour les managers</span>
          <h2 className="mt-3 text-[30px] md:text-[38px] leading-tight font-bold tracking-[-0.03em] text-ink">
            Coachez sur des <span className="italic-serif text-primary">faits</span>, plus sur des impressions.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Vous définissez le playbook. Brief l&apos;applique à chaque call de l&apos;équipe et vous remonte
            ce qui compte : les tendances par commercial, les motifs de win/loss, les objections
            récurrentes, les moments à réécouter en 1:1.
          </p>
          <ul className="mt-6 space-y-3 text-[13.5px] text-ink/80">
            <CoachItem>Playbook de scoring éditable — importable depuis Notion ou un doc.</CoachItem>
            <CoachItem>Insights win/loss croisés : ce qui distingue les deals gagnés des perdus.</CoachItem>
            <CoachItem>Digest hebdo par IA : forces, axes d&apos;amélioration, deals à surveiller.</CoachItem>
            <CoachItem>Extraits de calls partageables en un clic pour les 1:1.</CoachItem>
          </ul>
        </div>

        <div className="relative">
          <div className="relative rounded-3xl border border-border bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)] overflow-hidden">
            <WindowChrome path="brief.app / équipe / insights" />
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Calls / sem.", "84", "+12%"],
                  ["Score moyen", "3.6", "+0.2"],
                  ["Win rate", "27%", "+4pt"],
                ].map(([k, v, d]) => (
                  <div key={k} className="rounded-xl border border-border bg-lavender/20 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-[18px] font-semibold text-ink tabular-nums">{v}</span>
                      <span className="text-[10.5px] font-medium text-emerald-600">{d}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border p-3">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Performance équipe</div>
                <div className="mt-3 space-y-2.5">
                  {[
                    ["Commercial A", 4.2, "emerald"],
                    ["Commercial B", 3.6, "emerald"],
                    ["Commercial C", 3.2, "amber"],
                    ["Commercial D", 2.7, "rose"],
                  ].map(([name, score, color]) => (
                    <div key={name as string} className="flex items-center gap-3">
                      <span className="w-24 text-[12px] text-ink/80">{name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-lavender">
                        <div className="h-full rounded-full brand-gradient" style={{ width: `${((score as number) / 5) * 100}%` }} />
                      </div>
                      <span className={`text-[11.5px] font-semibold tabular-nums ${color === "emerald" ? "text-emerald-600" : color === "amber" ? "text-amber-600" : "text-rose-600"}`}>
                        {(score as number).toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-lavender/40 p-3">
                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Digest de la semaine
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink/80">
                  Les deals gagnés cette semaine ont tous inclus une démo dans les 5 jours suivant la découverte.
                  À l&apos;inverse, l&apos;objection « intégration Salesforce » revient sur 3 deals stagnants.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    { icon: Calendar, title: "Briefs pré-call intelligents", body: "Fiche entreprise sourcée (Pappers, LinkedIn, web), actualités des 60 derniers jours, contacts clés, cas clients similaires — générés la veille de chaque RDV." },
    { icon: Video, title: "Bot d'enregistrement multi-plateforme", body: "Google Meet, Microsoft Teams, Zoom. Le bot rejoint automatiquement les rendez-vous synchronisés dans votre calendrier — visible ou discret." },
    { icon: Bot, title: "Analyse automatique des calls", body: "Transcription française, identification des locuteurs, score par dimension calé sur votre playbook, sentiment, objections, concurrents cités." },
    { icon: History, title: "Historique complet par contact", body: "Tous les touchpoints agrégés au niveau du contact et de l'entreprise : briefs, calls, emails, devis, tâches." },
    { icon: FileCheck, title: "Devis en un clic", body: "Devis pré-remplis à partir de ce qui a été dit en rendez-vous, envoyés par email avec signature en ligne et suivi d'ouverture." },
    { icon: ListChecks, title: "Tâches de suivi automatiques", body: "Brief crée les tâches à partir des next steps du call, les priorise, et rédige les brouillons d'emails de relance au bon moment." },
    { icon: Share2, title: "Distribution automatique", body: "Briefs et analyses poussés dans HubSpot, Pipedrive ou en DM Slack — les commerciaux n'ont pas besoin de revenir sur Brief." },
    { icon: Mail, title: "Digest hebdomadaire par IA", body: "Chaque lundi, un résumé personnalisé — pour le commercial (ses points forts, ses axes) et pour le manager (santé du pipe, deals à réactiver)." },
    { icon: BookOpen, title: "Playbook coaching sur-mesure", body: "Définissez vos propres critères d'évaluation par équipe. Importables depuis un document Word, PDF ou directement depuis Notion." },
    { icon: Users2, title: "Pilotage d'équipe", body: "Vue manager : performance par commercial, insights win/loss, motifs d'objection récurrents, extraits de calls à travailler en 1:1." },
    { icon: Database, title: "Synchro CRM bidirectionnelle", body: "HubSpot et Pipedrive : les deals, contacts et notes remontent vers Brief, et les analyses redescendent dans les bonnes fiches." },
    { icon: Lock, title: "Sécurité & conformité", body: "Hébergement européen, chiffrement au repos et en transit, consentement à l'enregistrement, suppression sur demande. RGPD by design." },
  ];
  return (
    <section id="features" className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">Fonctionnalités</span>
          <h2 className="mt-3 text-[34px] md:text-[44px] leading-tight font-bold tracking-[-0.03em] text-ink">
            Tout ce dont un commercial B2B a <span className="italic-serif text-primary">réellement</span> besoin.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Pas 40 features gadgets. Les fonctionnalités qui font gagner du temps sur les trois
            moments qui comptent : préparer, mener, suivre.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {feats.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="group rounded-2xl border border-border/60 bg-white p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-primary/30 transition">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-lavender text-primary group-hover:brand-gradient group-hover:text-white transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RoiStrip() {
  const stats = [
    { v: "20 min", k: "économisées avant chaque RDV" },
    { v: "100%", k: "des calls analysés automatiquement" },
    { v: "48h", k: "de délai moyen sur les relances (vs 5 jours)" },
    { v: "1 clic", k: "pour générer un devis à partir d'un call" },
  ];
  return (
    <section className="border-y border-border/60 bg-ink text-background">
      <div className="mx-auto max-w-6xl px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s) => (
          <div key={s.k} className="text-center">
            <div className="text-[30px] md:text-[36px] font-bold tracking-[-0.02em] text-background tabular-nums">{s.v}</div>
            <div className="mt-1.5 text-[12.5px] text-background/60 leading-snug">{s.k}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center">
      <Quote className="mx-auto h-8 w-8 text-primary" />
      <blockquote className="mt-6 text-[24px] md:text-[30px] leading-tight italic-serif text-ink/90">
        « On a arrêté de perdre 30 minutes à préparer chaque call et une heure à écrire le
        compte-rendu. Nos commerciaux passent enfin leur temps à parler à des clients. »
      </blockquote>
      <div className="mt-6 inline-flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full brand-gradient text-white text-[13px] font-semibold">CD</span>
        <div className="text-left">
          <div className="text-[13.5px] font-semibold text-ink">Camille Duval</div>
          <div className="text-[12px] text-muted-foreground">Head of Sales · éditeur SaaS B2B</div>
        </div>
      </div>
    </section>
  );
}

function Integrations() {
  const groups = [
    { title: "Visio", items: ["Google Meet", "Microsoft Teams", "Zoom"], icon: Video },
    { title: "Agenda & mail", items: ["Google Workspace", "Microsoft 365", "Gmail", "Outlook"], icon: Calendar },
    { title: "CRM", items: ["HubSpot", "Pipedrive", "Sellsy (bientôt)", "Salesforce (bientôt)"], icon: Database },
    { title: "Collaboration", items: ["Slack", "Notion"], icon: MessageSquare },
  ];
  return (
    <section id="integrations" className="border-y border-border/60 bg-lavender/20">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">Intégrations</span>
          <h2 className="mt-3 text-[34px] md:text-[44px] leading-tight font-bold tracking-[-0.03em] text-ink">
            Se branche sur <span className="italic-serif text-primary">votre stack</span>.
          </h2>
          <p className="mt-3 text-[14.5px] text-muted-foreground">
            Brief s&apos;intègre à votre stack existante — sans changer les habitudes de vos commerciaux
            ni imposer un nouvel outil quotidien.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {groups.map((g) => {
            const Icon = g.icon;
            return (
              <div key={g.title} className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-sm)]">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-lavender text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-3 text-[13px] font-semibold text-ink">{g.title}</div>
                <ul className="mt-2 space-y-1 text-[12.5px] text-muted-foreground">
                  {g.items.map((i) => <li key={i}>{i}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const qas = [
    { q: "Comment Brief rejoint mes rendez-vous ?", a: "Vous connectez votre agenda Google ou Microsoft. Brief détecte automatiquement les visios (Meet, Teams, Zoom) et envoie un bot pour enregistrer — visible ou discret, selon votre réglage. Vous pouvez exclure des RDV manuellement." },
    { q: "L'IA est-elle vraiment fiable en français ?", a: "Oui. Brief utilise des modèles de transcription et d'analyse optimisés pour le français commercial, avec identification des locuteurs et prise en compte des tournures propres à la vente B2B." },
    { q: "Puis-je adapter le scoring à mon équipe ?", a: "Le playbook est entièrement éditable. Vous définissez vos propres dimensions, leur pondération et vos critères. Vous pouvez aussi l'importer depuis un document Notion ou Word existant." },
    { q: "Que devient l'enregistrement ?", a: "Hébergement européen, chiffrement au repos et en transit, durée de rétention configurable, suppression sur demande. Chaque participant reçoit une information de consentement conforme RGPD." },
    { q: "Comment ça marche avec mon CRM ?", a: "Brief se synchronise avec HubSpot et Pipedrive (Sellsy et Salesforce prochainement). Les analyses et notes sont poussées automatiquement sur la bonne fiche deal et le bon contact." },
    { q: "Puis-je tester Brief ?", a: "L'accès est sur invitation. Écrivez-nous pour obtenir une démonstration adaptée à votre équipe et un accès d'essai encadré." },
  ];
  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <div className="text-center">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">Questions fréquentes</span>
        <h2 className="mt-3 text-[30px] md:text-[34px] leading-tight font-bold tracking-[-0.03em] text-ink">
          Les questions que <span className="italic-serif text-primary">tout le monde</span> nous pose.
        </h2>
      </div>
      <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-white shadow-[var(--shadow-sm)]">
        {qas.map((qa) => (
          <details key={qa.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer items-center justify-between text-[14.5px] font-medium text-ink">
              {qa.q}
              <span className="ml-4 text-muted-foreground group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{qa.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="px-6 py-24">
      <div className="max-w-6xl mx-auto relative rounded-[2rem] bg-ink text-background p-12 md:p-20 overflow-hidden text-center">
        <div aria-hidden className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full bg-primary/40 blur-3xl" />
        <div className="relative mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11.5px] font-medium text-background">
            <Zap className="h-3 w-3" /> Accès sur invitation
          </span>
          <h2 className="mt-5 text-[34px] md:text-[46px] leading-tight font-bold tracking-[-0.03em]">
            Prêt à transformer vos <span className="italic-serif text-primary">rendez-vous</span> ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-background/70">
            Rejoignez les équipes commerciales françaises qui utilisent Brief pour préparer mieux,
            suivre plus vite et vendre davantage.
          </p>
          <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 bg-background text-ink rounded-full px-6 py-3.5 font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Accéder à Brief
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
            <a
              href="mailto:hello@oliverlist.com"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 text-[14px] font-medium text-background hover:bg-white/10 transition-colors"
            >
              Demander une invitation
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11.5px] text-background/60">
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> RGPD</span>
            <span className="inline-flex items-center gap-1"><Globe2 className="h-3.5 w-3.5" /> Hébergement européen</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Setup en 15 minutes</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 px-6 py-10">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-[12px] text-muted-foreground">
        <BrandMark />
        <div>© {new Date().getFullYear()} Brief · édité par Oliverlist</div>
        <div className="flex items-center gap-5">
          <a href="#" className="hover:text-ink transition-colors">Mentions légales</a>
          <a href="#" className="hover:text-ink transition-colors">Confidentialité</a>
          <a href="mailto:hello@oliverlist.com" className="hover:text-ink transition-colors">Nous contacter</a>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="brief-ui min-h-screen bg-white text-ink">
      <Nav />
      <main>
        <Hero />
        <Pipeline />
        <PreCallSection />
        <ReferencesSection />
        <AnalyseSection />
        <CoachingSection />
        <Features />
        <RoiStrip />
        <Testimonial />
        <Integrations />
        <Faq />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
