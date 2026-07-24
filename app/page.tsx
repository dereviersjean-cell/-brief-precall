import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  ShieldCheck,
  Calendar,
  ClipboardCheck,
  FileText,
  BookOpen,
  CheckCircle2,
  Building2,
  Newspaper,
  Target,
  Video,
  AlertTriangle,
  Quote,
  Zap,
  Globe2,
  BarChart3,
  MessageSquare,
  Clock,
  Play,
  TrendingUp,
  Database,
  Users,
  Settings,
  LayoutDashboard,
  Dumbbell,
} from "lucide-react";

// Refonte juillet 2026 — structure inspirée d'eagr.ai/fr : une promesse
// unique (augmenter le taux de closing), le problème (l'écart top performer),
// trois piliers numérotés calqués sur la structure de l'app (Préparer /
// Débriefer / Progresser), section manager, preuves, FAQ, CTA. Les modules
// masqués (devis, tasks) n'apparaissent plus nulle part.

export const metadata: Metadata = {
  title: "Brief — Augmentez le taux de closing de votre équipe commerciale",
  description:
    "Brief prépare chaque rendez-vous, débriefe chaque call selon votre playbook et fait circuler ce qui gagne dans toute l'équipe. Pour équipes commerciales B2B françaises.",
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
          <a href="#probleme" className="hover:text-ink transition-colors">Le problème</a>
          <a href="#methode" className="hover:text-ink transition-colors">La méthode</a>
          <a href="#manager" className="hover:text-ink transition-colors">Managers</a>
          <a href="#integrations" className="hover:text-ink transition-colors">Intégrations</a>
          <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
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
  // Miroir de la vraie navigation de l'app depuis le recentrage produit.
  const items = ["Brief", "Analyse rendez-vous", "Performance", "Équipe"];
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
          <span className="h-2.5 w-2.5 rounded-full border border-current opacity-60" /> {label}
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
          <Sparkles className="h-3 w-3 text-primary" /> Pour équipes commerciales B2B françaises
        </span>
        <h1 className="mt-6 text-[44px] md:text-[64px] leading-[1.02] font-bold tracking-[-0.03em] text-ink">
          Augmentez votre <span className="italic-serif text-primary">taux de closing</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-ink/80">
          <b className="text-ink">
            Brief prépare chaque rendez-vous, débriefe chaque call selon votre méthode de vente,
            et fait circuler ce qui gagne dans toute l&apos;équipe.
          </b>{" "}
          <span className="text-[15.5px] text-muted-foreground">Un seul objectif : plus de rendez-vous transformés en clients.</span>
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="brand-gradient inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-medium text-white shadow-[var(--shadow-glow)] hover:brightness-110 transition-all"
          >
            Accéder à Brief <ArrowUpRight className="h-4 w-4" />
          </Link>
          <a
            href="#methode"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-5 text-[14px] font-medium text-ink hover:bg-lavender/40 transition-colors"
          >
            Voir la méthode <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Accès sur invitation · hébergement européen · édité par Oliverlist
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl">
          <div className="relative rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(80,60,180,0.25)] border border-border/60 overflow-hidden text-left">
            <WindowChrome path="brief.app / analyse / acme-corp" />
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
              <MiniSidebar active="Analyse rendez-vous" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-full bg-lavender border border-border px-2 py-0.5 text-[10px] font-semibold text-primary">
                        R2 — Présentation
                      </span>
                      <span className="text-[10.5px] font-medium text-muted-foreground">Google Meet</span>
                      <span className="text-[10.5px] font-medium text-muted-foreground/60">·</span>
                      <span className="text-[10.5px] font-medium text-muted-foreground">Enregistré · 42:07 · Transcrit FR</span>
                    </div>
                    <div className="mt-1 text-[18px] font-semibold text-ink">
                      Acme Corp — Marie Lambert, Head of RevOps
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      Jeudi 14:30 · « Présentation Acme &lt;&gt; Brief » · 3 participants
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

                <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    ["Personnalisation de la démo", 4.0],
                    ["Traitement des objections", 3.0],
                    ["Implication des décideurs", 2.5],
                    ["Prochaine étape obtenue", 4.0],
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
                    Marie confirme un projet de refonte RevOps pour Q1. Deux objections : intégration
                    Salesforce et délai de mise en œuvre. Décideur additionnel à embarquer : Julien (CFO),
                    6% du temps de parole — point faible du call.
                  </p>
                </div>

                <div className="mt-3 rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between bg-lavender/30 px-3.5 py-2 border-b border-border">
                    <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink/80">
                      <MessageSquare className="h-3 w-3 text-primary" /> Objection détectée · « une intégration de plus, ça m&apos;inquiète »
                    </div>
                    <span className="text-[10px] text-muted-foreground">12:04</span>
                  </div>
                  <div className="p-3.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Cas similaires déjà traités par l&apos;équipe
                    </div>
                    <ul className="space-y-1.5 text-[12px] text-ink/80">
                      <li className="flex items-center gap-2">
                        <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-px text-[9.5px] font-semibold text-emerald-700">gagné</span>
                        <span className="truncate">« Même crainte chez un SaaS RH — la démo de l&apos;intégration en live a débloqué. »</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-px text-[9.5px] font-semibold text-emerald-700">gagné</span>
                        <span className="truncate">« Proposer un POC borné à 4 semaines a rassuré la DSI. »</span>
                      </li>
                    </ul>
                    <div className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-primary font-medium">
                      Voir la bibliothèque d&apos;objections <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Prochaine étape suggérée : caler un échange avec Julien (CFO) sous 48h
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

function ProblemSection() {
  return (
    <section id="probleme" className="border-y border-border/60 bg-lavender/20">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">Le problème</span>
            <h2 className="mt-3 text-[34px] md:text-[44px] leading-tight font-bold tracking-[-0.03em] text-ink">
              Votre meilleur commercial close <span className="italic-serif text-primary">2 à 3×</span> plus que les autres.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Pas une question de talent : il arrive mieux préparé, il connaît déjà les objections,
              et il ajuste son discours à chaque étape. Ça s&apos;apprend — à condition d&apos;être visible.
            </p>
            <ul className="mt-7 space-y-4">
              {[
                ["Zéro RDV mal préparé", "Un dossier complet sur le prospect, prêt à lire en 3 minutes, avant chaque rendez-vous."],
                ["Zéro call non débriefé", "Chaque visio est analysée et notée selon votre playbook — sans réécouter 40 minutes."],
                ["Zéro leçon perdue", "Les objections gagnées et les motifs de win/loss profitent à toute l'équipe, pas juste à celui qui les a vécus."],
              ].map(([title, body]) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white border border-border text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="font-semibold text-ink text-[15px]">{title}</div>
                    <div className="text-[13.5px] text-muted-foreground leading-relaxed">{body}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Écart de performance — visuel simple, pas un mockup produit */}
          <div className="rounded-3xl border border-border bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)]">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              Taux de closing par commercial — équipe type
            </div>
            <div className="mt-6 space-y-4">
              {[
                ["Top performer", 38, true],
                ["Commercial B", 17, false],
                ["Commercial C", 14, false],
                ["Commercial D", 11, false],
              ].map(([name, pct, top]) => (
                <div key={name as string}>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className={top ? "font-semibold text-ink" : "text-muted-foreground"}>{name}</span>
                    <span className={`tabular-nums font-semibold ${top ? "text-primary" : "text-muted-foreground"}`}>{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-lavender overflow-hidden">
                    <div
                      className={`h-full rounded-full ${top ? "brand-gradient" : "bg-slate-300"}`}
                      style={{ width: `${((pct as number) / 40) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl bg-lavender/40 border border-border p-3.5 text-[12.5px] leading-relaxed text-ink/80">
              <b className="text-ink">L&apos;enjeu n&apos;est pas de recruter plus.</b> Ramener le reste de
              l&apos;équipe à mi-chemin du top performer double le chiffre — avec le même pipeline.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PillarHeading({ n, eyebrow, title, children }: { n: string; eyebrow: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="italic-serif text-[34px] leading-none text-primary/40">{n}</span>
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">{eyebrow}</span>
      </div>
      <h3 className="mt-3 text-[28px] md:text-[36px] leading-tight font-bold tracking-[-0.03em] text-ink">{title}</h3>
      <div className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

function PillarItem({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
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

function MethodIntro() {
  return (
    <div className="mx-auto max-w-6xl px-6 pt-24 text-center" id="methode">
      <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">La méthode</span>
      <h2 className="mt-3 text-[34px] md:text-[44px] leading-tight font-bold tracking-[-0.03em] text-ink">
        Trois moments. Une obsession : <span className="italic-serif text-primary">le closing</span>.
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Brief s&apos;organise exactement comme le travail d&apos;un commercial : préparer le rendez-vous,
        le débriefer, et progresser d&apos;un call à l&apos;autre. Rien d&apos;autre.
      </p>
    </div>
  );
}

function PreparerSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
      <div>
        <PillarHeading n="01" eyebrow="Préparer" title={<>Arrivez en RDV en <span className="italic-serif text-primary">connaissant</span> votre prospect.</>}>
          La veille de chaque rendez-vous, Brief compile un dossier prêt à lire en 3 minutes.
          Fini les 20 minutes éparpillées entre LinkedIn, Pappers et le site du prospect.
        </PillarHeading>
        <ul className="mt-6 space-y-3.5 text-[14px] text-ink/80">
          <PillarItem icon={Building2} title="Fiche entreprise sourcée" body="Effectifs, CA, dirigeants, financement — depuis Pappers, LinkedIn et le web." />
          <PillarItem icon={Newspaper} title="Signaux récents" body="Levées de fonds, recrutements clés, mentions presse des 60 derniers jours." />
          <PillarItem icon={Target} title="La bonne référence client" body="Brief pioche dans vos cas clients celui qui ressemble le plus au prospect." />
        </ul>
      </div>

      <div className="relative">
        <div className="relative rounded-3xl border border-border bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)] overflow-hidden">
          <WindowChrome path="brief.app / brief / acme-corp" />
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
                  <Target className="h-3.5 w-3.5" /> Référence la plus pertinente
                </div>
                <span className="text-[10px] text-primary font-medium">94% match</span>
              </div>
              {/* Exemple illustratif — pas un vrai client */}
              <div className="mt-2 rounded-lg bg-white border border-border p-2.5">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-ink text-background">
                    <Building2 className="h-3 w-3" />
                  </span>
                  <span className="text-[11.5px] font-semibold text-ink">SaaS RH · 220 pers.</span>
                  <span className="text-[10px] text-muted-foreground">Série C · Salesforce</span>
                </div>
                <p className="mt-2 text-[11px] italic leading-snug text-ink/80">
                  « Un de vos pairs avait exactement votre stack et le même sujet d&apos;attribution —
                  on lui a fait gagner un trimestre. »
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DebrieferSection() {
  return (
    <section className="border-y border-border/60 bg-lavender/20">
      <div className="mx-auto max-w-6xl px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <div className="relative order-2 lg:order-1">
          <div className="relative rounded-3xl border border-border bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)] overflow-hidden">
            <WindowChrome path="brief.app / analyse / acme-corp" />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {["R1 — Découverte", "R2 — Présentation", "R3 — Closing"].map((s, i) => (
                  <span
                    key={s}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold border ${
                      i === 1 ? "bg-lavender text-primary border-border" : "bg-white text-muted-foreground border-border/60"
                    }`}
                  >
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-[11.5px] text-muted-foreground leading-snug">
                Détecté depuis le titre du RDV : « Présentation Acme &lt;&gt; Brief » → l&apos;analyse
                évalue ce qui compte à cette étape, pas des critères génériques.
              </p>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                {[
                  ["Personnalisation de la démo", 4.0],
                  ["Traitement des objections", 3.0],
                  ["Implication des décideurs", 2.5],
                  ["Prochaine étape obtenue", 4.0],
                ].map(([label, v]) => (
                  <div key={label as string}>
                    <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
                      <span>{label}</span>
                      <span className="tabular-nums text-ink font-medium">{(v as number).toFixed(1)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-lavender">
                      <div className="h-full rounded-full brand-gradient" style={{ width: `${((v as number) / 5) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> Objection détectée · 21:04
                </div>
                <p className="mt-1 text-[12.5px] text-ink/80">
                  « Notre équipe est déjà surchargée, une nouvelle intégration me fait peur. »
                </p>
                <div className="mt-2 text-[10.5px] text-amber-700/90">
                  → Réponse gagnante disponible dans la bibliothèque de l&apos;équipe
                </div>
              </div>

              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Temps de parole</span>
                  <span className="normal-case tracking-normal font-normal text-muted-foreground/70">Ratio conseillé 40/60</span>
                </div>
                <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-lavender">
                  <div className="brand-gradient" style={{ width: "38%" }} />
                  <div className="bg-slate-300" style={{ width: "56%" }} />
                  <div className="bg-slate-200" style={{ width: "6%" }} />
                </div>
                <div className="mt-2 flex items-center gap-3 text-[10.5px] text-muted-foreground">
                  <span>Vous 38%</span>
                  <span>Marie 56%</span>
                  <span>Julien (CFO) 6% — décideur silencieux</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <PillarHeading n="02" eyebrow="Débriefer" title={<>Chaque call <span className="italic-serif text-primary">noté</span> selon votre méthode — et son étape.</>}>
            Le bot rejoint la visio, transcrit en français, puis l&apos;IA note le call selon votre
            playbook. Un R1 de découverte n&apos;est pas jugé comme un R3 de closing : Brief reconnaît
            l&apos;étape du cycle depuis le titre du rendez-vous et adapte son analyse.
          </PillarHeading>
          <ul className="mt-6 space-y-3.5 text-[14px] text-ink/80">
            <PillarItem icon={BarChart3} title="Scoring sur votre playbook" body="Vos dimensions, vos critères, votre pondération — importés depuis Notion ou un document." />
            <PillarItem icon={ClipboardCheck} title="Analyse par étape R1 / R2 / R3" body="Découverte, présentation, closing : des consignes dédiées à chaque étape du cycle." />
            <PillarItem icon={AlertTriangle} title="Objections & signaux" body="Objections, sentiment, concurrents cités, temps de parole — détectés automatiquement." />
          </ul>
        </div>
      </div>
    </section>
  );
}

function ProgresserSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
      <div>
        <PillarHeading n="03" eyebrow="Progresser" title={<>Ce qui fait gagner un deal profite à <span className="italic-serif text-primary">toute l&apos;équipe</span>.</>}>
          Chaque objection traitée, chaque deal gagné ou perdu nourrit une bibliothèque commune.
          Le commercial junior répond comme s&apos;il avait dix ans de maison — et vous savez enfin
          où les deals se perdent : en R1, R2 ou R3.
        </PillarHeading>
        <ul className="mt-6 space-y-3.5 text-[14px] text-ink/80">
          <PillarItem icon={MessageSquare} title="Bibliothèque d'objections vivante" body="Face à une objection, Brief retrouve les cas similaires déjà traités par l'équipe — et ce qui a marché." />
          <PillarItem icon={TrendingUp} title="Win/loss automatique" body="Chaque réponse est reliée au sort du deal via votre CRM : les réponses qui closent se voient." />
          <PillarItem icon={BookOpen} title="Scores comparés gagné/perdu" body="Les dimensions du playbook qui distinguent les deals gagnés des deals perdus, chiffrées." />
        </ul>
      </div>

      <div className="relative">
        <div className="relative rounded-3xl border border-border bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)] overflow-hidden">
          <WindowChrome path="brief.app / paramètres / objections" />
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-primary">Bibliothèque d&apos;objections · équipe</div>
              <span className="rounded-full bg-lavender px-2.5 py-1 text-[10.5px] font-medium text-primary">128 objections indexées</span>
            </div>
            {[
              { o: "« On est déjà engagés avec un concurrent »", n: 23, win: 61 },
              { o: "« C'est trop cher pour notre taille »", n: 17, win: 47 },
              { o: "« Il faut que j'en parle à mon associé »", n: 14, win: 38 },
            ].map((r) => (
              <div key={r.o} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[12.5px] font-medium text-ink leading-snug">{r.o}</p>
                  <span className="shrink-0 text-[10.5px] text-muted-foreground tabular-nums">×{r.n}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-lavender overflow-hidden">
                    <div className="h-full bg-emerald-500/80 rounded-full" style={{ width: `${r.win}%` }} />
                  </div>
                  <span className="text-[10.5px] tabular-nums font-semibold text-emerald-600">{r.win}% gagnées</span>
                </div>
              </div>
            ))}
            <div className="rounded-xl bg-lavender/40 border border-border p-3">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Insight de la semaine
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink/80">
                L&apos;objection prix est gagnée 2× plus souvent quand une référence client chiffrée
                est citée dans la réponse. Trois deals stagnent en R2 faute de décideur présent.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ManagerSection() {
  return (
    <section id="manager" className="border-y border-border/60 bg-lavender/20">
      <div className="mx-auto max-w-6xl px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <div>
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">Pour les directeurs commerciaux</span>
          <h2 className="mt-3 text-[30px] md:text-[38px] leading-tight font-bold tracking-[-0.03em] text-ink">
            Coachez sur des <span className="italic-serif text-primary">faits</span>, plus sur des impressions.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Vous définissez le playbook et les étapes de votre cycle. Brief les applique à chaque
            call et vous remonte ce qui compte : qui progresse, où les deals se perdent.
          </p>
          <ul className="mt-6 space-y-3 text-[13.5px] text-ink/80">
            {[
              "Playbook de scoring éditable, avec des consignes propres à chaque étape R1/R2/R3.",
              "Objections les plus fréquentes et leur taux de succès, par équipe.",
              "Digest hebdo par IA : forces, axes de progrès, deals à surveiller.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{t}</span>
              </li>
            ))}
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
                  ["Taux de closing", "27%", "+4pt"],
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

              <div className="rounded-xl border border-border p-3">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Où se perdent les deals</div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["R1", "12%", "text-emerald-600"],
                    ["R2", "31%", "text-rose-600"],
                    ["R3", "9%", "text-emerald-600"],
                  ].map(([s, v, c]) => (
                    <div key={s} className="rounded-lg bg-lavender/20 border border-border p-2">
                      <div className="text-[10px] font-semibold text-muted-foreground">{s}</div>
                      <div className={`text-[15px] font-semibold tabular-nums ${c}`}>{v}</div>
                      <div className="text-[9px] text-muted-foreground">deals perdus</div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
                  → Le R2 concentre les pertes : les démos manquent de décideurs. Sujet du prochain point d&apos;équipe.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-lavender/40 p-3">
                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Digest de la semaine
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink/80">
                  Les deals gagnés cette semaine ont tous inclus une démo dans les 5 jours suivant la
                  découverte. L&apos;objection « intégration Salesforce » revient sur 3 deals stagnants.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Mini-aperçus produit dans les cartes du schéma — pur CSS/SVG, pas d'assets.
function MiniBriefPreview() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="h-1.5 w-3/5 rounded-full bg-white/25" />
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/30 border border-primary/40 px-1.5 py-px text-[9px] font-semibold text-white">
          <Sparkles className="h-2.5 w-2.5" /> Prêt
        </span>
      </div>
      <span className="block h-1.5 w-4/5 rounded-full bg-white/15" />
      <span className="block h-1.5 w-2/3 rounded-full bg-white/15" />
      <span className="block h-1.5 w-1/2 rounded-full bg-white/10" />
    </div>
  );
}

function MiniAnalysePreview() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[9.5px] text-white/50">
        <span className="rounded-full bg-white/10 border border-white/15 px-1.5 py-px font-semibold text-white/80">R2</span>
        <span className="tabular-nums font-semibold text-white/90">3.4/5</span>
      </div>
      {[72, 48].map((w, i) => (
        <div key={i} className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full brand-gradient" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

function MiniTrainingPreview() {
  const bars = [5, 9, 14, 8, 16, 11, 6, 13, 17, 9, 5, 12, 7, 15, 10, 6];
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/30 border border-primary/40 text-white">
        <Dumbbell className="h-3 w-3" />
      </span>
      <div className="flex flex-1 items-center gap-[3px] h-7">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`w-[3px] rounded-full ${i % 4 === 0 ? "brand-gradient" : "bg-white/25"}`}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function MiniPerformancePreview() {
  return (
    <div className="relative">
      <svg viewBox="0 0 120 34" className="w-full h-8" aria-hidden>
        <polyline
          points="0,28 20,24 40,26 60,17 80,19 100,9 120,5"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="120" cy="5" r="3" className="fill-white" />
      </svg>
      <span className="absolute -top-1 right-0 inline-flex items-center gap-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/30 px-1.5 py-px text-[9px] font-semibold text-emerald-300">
        <TrendingUp className="h-2.5 w-2.5" /> +0.4
      </span>
    </div>
  );
}

function FlowCard({
  n,
  icon: Icon,
  title,
  subtitle,
  preview,
}: {
  n: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  preview: React.ReactNode;
}) {
  return (
    <div className="group relative flex-1 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-white/[0.07]">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl brand-gradient text-white shadow-[var(--shadow-glow)]">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="italic-serif text-[26px] leading-none text-white/20 group-hover:text-primary/60 transition-colors">{n}</span>
      </div>
      <div className="mt-4 text-[15.5px] font-semibold text-white">{title}</div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">{subtitle}</p>
      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">{preview}</div>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="hidden lg:flex items-center shrink-0 px-0.5" aria-hidden>
      <span className="h-px w-5 brand-gradient" />
      <ArrowRight className="h-3.5 w-3.5 -ml-1 text-primary" />
    </div>
  );
}

function SupportCard({ icon: Icon, title, subtitle, items }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; items: string[] }) {
  return (
    <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 border border-white/10 text-white shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div className="text-[13.5px] font-semibold text-white">{title}</div>
          <div className="text-[11px] text-white/40">{subtitle}</div>
        </div>
      </div>
      <ul className="mt-3.5 flex flex-wrap gap-1.5">
        {items.map((i) => (
          <li key={i} className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-[11.5px] text-white/70">
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Schéma récapitulatif — comment les sections de l'app s'articulent : le fil
// commercial (préparer → débriefer → s'entraîner → suivre) irrigué par deux
// blocs de configuration (Équipe, Paramètres). Reflète la nav réelle de
// l'app ; chaque carte embarque un mini-aperçu du produit (pur CSS/SVG).
function StructureDiagram() {
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-ink">
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 right-1/5 w-[420px] h-[420px] rounded-full bg-primary/15 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">Structure</span>
        <h2 className="mt-3 text-[30px] md:text-[38px] leading-tight font-bold tracking-[-0.03em] text-white">
          Comment Brief <span className="italic-serif text-primary">s&apos;organise</span>.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[14px] text-white/50">
          Le parcours d&apos;un commercial, du rendez-vous suivant à la progression de l&apos;équipe.
        </p>

        <div className="mt-14 flex flex-col lg:flex-row items-stretch gap-3 text-left">
          <FlowCard n="01" icon={FileText} title="Brief" subtitle="Préparer chaque rendez-vous en 3 minutes." preview={<MiniBriefPreview />} />
          <FlowConnector />
          <FlowCard n="02" icon={Video} title="Analyse rendez-vous" subtitle="Débriefer chaque call, noté selon son étape R1/R2/R3." preview={<MiniAnalysePreview />} />
          <FlowConnector />
          <FlowCard n="03" icon={Dumbbell} title="Entraînement" subtitle="Rejouer à la voix les objections mal traitées." preview={<MiniTrainingPreview />} />
          <FlowConnector />
          <FlowCard n="04" icon={LayoutDashboard} title="Performance" subtitle="Suivre la progression — scores, historique, win/loss." preview={<MiniPerformancePreview />} />
        </div>

        <div className="flex justify-center my-5" aria-hidden>
          <div className="flex flex-col items-center">
            <span className="w-px h-6 brand-gradient" />
            <ArrowDown className="h-3.5 w-3.5 -mt-1 text-primary" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 text-left max-w-4xl mx-auto">
          <SupportCard
            icon={Users}
            title="Équipe"
            subtitle="Le manager règle la méthode"
            items={["Playbook + étapes RDV", "Templates emails", "Insights win/loss"]}
          />
          <SupportCard
            icon={Settings}
            title="Paramètres"
            subtitle="Les données qui alimentent le tout"
            items={["Connexions", "CRM", "Références clients", "Objections", "Facturation"]}
          />
        </div>
        <p className="mt-6 text-[12.5px] text-white/40 max-w-lg mx-auto">
          Un seul fil commercial, deux blocs de configuration qui l&apos;alimentent — rien d&apos;autre.
        </p>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center">
      <Quote className="mx-auto h-8 w-8 text-primary" />
      <blockquote className="mt-6 text-[24px] md:text-[30px] leading-tight italic-serif text-ink/90">
        « On sait enfin pourquoi on gagne un deal — et pourquoi on en perd. Nos commerciaux
        arrivent préparés, et les objections ne prennent plus personne de court. »
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
    { title: "Agenda & mail", items: ["Google Workspace", "Gmail", "Google Calendar"], icon: Calendar },
    { title: "CRM", items: ["HubSpot", "Pipedrive", "Sellsy (bientôt)"], icon: Database },
    { title: "Playbook & équipe", items: ["Notion", "Slack", "Import Word / PDF"], icon: MessageSquare },
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
            Briefs et analyses arrivent là où vos commerciaux travaillent déjà — CRM, agenda, email.
            Pas un nouvel outil quotidien à imposer.
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
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> RGPD by design</span>
          <span className="inline-flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> Enregistrements hébergés en Europe</span>
          <span className="inline-flex items-center gap-1.5"><Play className="h-3.5 w-3.5" /> Consentement à l&apos;enregistrement</span>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const qas = [
    { q: "Comment Brief augmente concrètement le taux de closing ?", a: "En travaillant trois leviers : arriver préparé, savoir ce qui a marché ou pas (débrief noté, adapté à l'étape R1/R2/R3), et capitaliser en équipe (bibliothèque d'objections reliée au sort réel des deals)." },
    { q: "Comment Brief rejoint mes rendez-vous ?", a: "Vous connectez votre agenda Google. Brief détecte les visios (Meet, Teams, Zoom) et envoie un bot pour enregistrer et transcrire. Vous pouvez exclure des rendez-vous manuellement." },
    { q: "Comment fonctionne l'analyse par étape R1/R2/R3 ?", a: "Le manager configure une fois les motifs de titre de RDV (« Rencontre X » = découverte, « Présentation X » = démo…) et les consignes propres à chaque étape. Brief évalue ensuite chaque call selon les critères de son étape, entièrement éditables — un R1 n'est pas jugé comme un R3." },
    { q: "Que deviennent les enregistrements ?", a: "Hébergement européen, chiffrement au repos et en transit, suppression sur demande. Chaque participant est informé de l'enregistrement, conformément au RGPD." },
    { q: "Puis-je tester Brief ?", a: "L'accès est sur invitation. Écrivez-nous pour une démonstration adaptée à votre équipe et un accès d'essai encadré." },
  ];
  return (
    <section id="faq" className="mx-auto max-w-4xl px-6 py-24">
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
            Prêt à closer <span className="italic-serif text-primary">plus</span> ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-background/70">
            Rejoignez les équipes commerciales françaises qui utilisent Brief pour préparer mieux,
            débriefer chaque call et transformer plus de rendez-vous en clients.
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
        <ProblemSection />
        <MethodIntro />
        <PreparerSection />
        <DebrieferSection />
        <ProgresserSection />
        <ManagerSection />
        <StructureDiagram />
        <Testimonial />
        <Integrations />
        <Faq />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
