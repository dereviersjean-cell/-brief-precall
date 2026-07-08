import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Calendar,
  Mic,
  FileText,
  Video,
  History,
  FileCheck,
  CheckSquare,
  CheckCircle2,
  BarChart3,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Brief — Le copilote IA de vos rendez-vous commerciaux",
  description:
    "Brief prépare vos rendez-vous, les analyse en temps réel, et automatise vos suivis. Pour équipes commerciales B2B.",
};

function Nav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-ink text-background grid place-items-center font-bold text-sm">
            B
          </div>
          <span className="font-semibold tracking-tight text-ink">Brief</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#pipeline" className="hover:text-ink transition-colors">
            Pipeline
          </a>
          <a href="#coaching" className="hover:text-ink transition-colors">
            Coaching
          </a>
          <a href="#integrations" className="hover:text-ink transition-colors">
            Intégrations
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="/login"
            className="hidden sm:inline text-sm text-muted-foreground hover:text-ink transition-colors px-3 py-2"
          >
            Se connecter
          </a>
          <a
            href="/login"
            className="group inline-flex items-center gap-1.5 bg-ink text-background rounded-full px-4 py-2 text-sm font-medium hover:bg-primary transition-colors"
          >
            Se connecter
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-28">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] rounded-full bg-lavender-deep/40 blur-3xl animate-blob" />
        <div className="absolute top-72 right-10 w-[400px] h-[400px] rounded-full bg-primary/15 blur-3xl animate-blob" />
      </div>

      <div className="max-w-5xl mx-auto px-6 text-center animate-rise">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground mb-8">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Pour équipes commerciales B2B
        </div>

        <h1 className="text-ink text-5xl sm:text-6xl md:text-7xl lg:text-[88px] leading-[0.95] font-bold tracking-[-0.04em]">
          Le copilote IA de vos<br />
          <span className="italic-serif text-primary">rendez-vous commerciaux</span>.
        </h1>

        <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Brief prépare vos rendez-vous, les analyse en temps réel, et automatise vos suivis. Concentrez-vous sur
          la vente, on s&apos;occupe du reste.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/login"
            className="group inline-flex items-center gap-2 bg-ink text-background rounded-full px-6 py-3.5 font-medium hover:bg-primary transition-colors"
          >
            Se connecter
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
          <a href="#pipeline" className="group inline-flex items-center gap-2 text-ink font-medium px-6 py-3.5">
            Voir comment ça marche
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Accès sur invitation uniquement</p>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 mt-20">
        <ProductMockup />
      </div>
    </section>
  );
}

function ProductMockup() {
  return (
    <div className="relative">
      <div className="relative rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(80,60,180,0.25)] border border-border/60 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-lavender/60">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <div className="mx-auto text-xs text-muted-foreground font-mono">brief.app / analyse</div>
        </div>

        <div className="grid grid-cols-12 min-h-[520px]">
          <aside className="hidden md:flex col-span-3 flex-col gap-1 p-4 border-r border-border/60 bg-lavender/30">
            <SidebarItem icon={<Calendar className="w-4 h-4" />} label="Rendez-vous" active />
            <SidebarItem icon={<Mic className="w-4 h-4" />} label="Enregistrements" />
            <SidebarItem icon={<FileText className="w-4 h-4" />} label="Briefs" />
            <SidebarItem icon={<BarChart3 className="w-4 h-4" />} label="Performance" />
            <SidebarItem icon={<Users className="w-4 h-4" />} label="Contacts" />
            <div className="mt-auto rounded-xl bg-white border border-border p-3">
              <div className="text-xs text-muted-foreground">Prochain call</div>
              <div className="text-sm font-semibold text-ink mt-1">Acme Corp</div>
              <div className="text-xs text-muted-foreground">dans 14 min</div>
            </div>
          </aside>

          <div className="col-span-12 md:col-span-9 p-6 md:p-8">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Analyse du call</div>
                <div className="text-2xl font-bold text-ink mt-1">Acme Corp — Marie Lambert</div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-primary tabular-nums">
                  3.4<span className="text-lg text-muted-foreground">/5</span>
                </div>
                <div className="text-xs text-muted-foreground">Score global</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <Metric label="Ouverture" value={3.0} />
              <Metric label="Découverte besoin" value={4.0} />
              <Metric label="Pitch / démo" value={3.0} />
              <Metric label="Prochaine étape" value={4.0} />
            </div>

            <div className="mt-6 rounded-2xl bg-lavender/50 p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Résumé</div>
              <div className="h-2 rounded-full bg-white" />
              <div className="h-2 rounded-full bg-white w-11/12" />
              <div className="h-2 rounded-full bg-white w-9/12" />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block absolute -left-8 top-24 w-72 rounded-2xl bg-white shadow-xl border border-border/60 p-4 animate-float-slow">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <Sparkles className="w-4 h-4" /> Brief pré-call
        </div>
        <div className="mt-2 text-sm font-semibold text-ink">Acme Corp lève 12M€</div>
        <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Série B annoncée hier. Priorité : structurer la stack RevOps avant Q1.
        </div>
      </div>

      <div className="hidden lg:block absolute -right-6 bottom-16 w-80 rounded-2xl bg-white shadow-xl border border-border/60 p-4 animate-float-slower">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
          <CheckCircle2 className="w-4 h-4" /> Prochaines étapes
        </div>
        <ul className="mt-3 space-y-2 text-sm text-ink">
          <li className="flex items-start gap-2">
            <div className="w-4 h-4 mt-0.5 rounded border border-border shrink-0" /> Envoyer projection ROI
            personnalisée
          </li>
          <li className="flex items-start gap-2">
            <div className="w-4 h-4 mt-0.5 rounded border border-border shrink-0" /> Relancer sous 48h si pas de
            retour
          </li>
        </ul>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active }: { icon: ReactNode; label: string; active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
        active ? "bg-white text-ink font-medium shadow-sm" : "text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-ink tabular-nums">{value.toFixed(1)}/5</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-lavender overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Workflow() {
  const steps = [
    {
      n: "01",
      title: "Avant le RDV",
      desc: "Brief génère un brief personnalisé sur l'entreprise et le contact, sourcé sur le web et Pappers.",
    },
    {
      n: "02",
      title: "Pendant le RDV",
      desc: "Le bot rejoint votre visio et enregistre tout ce qui se dit.",
    },
    {
      n: "03",
      title: "Après le RDV",
      desc: "Analyse détaillée, tâches de suivi créées, brouillons emails prêts, devis pré-remplis à envoyer.",
    },
  ];
  return (
    <section id="pipeline" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-widest text-primary font-semibold">Comment ça marche</div>
          <h2 className="mt-3 text-4xl md:text-6xl font-bold text-ink tracking-[-0.03em]">
            Un cycle commercial complet, <span className="italic-serif">automatisé</span>.
          </h2>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="group rounded-3xl bg-white border border-border/60 p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="italic-serif text-6xl text-primary/70">{s.n}</div>
              <h3 className="mt-6 text-2xl font-semibold text-ink">{s.title}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    {
      icon: FileText,
      title: "Briefs pré-call intelligents",
      desc: "Contexte entreprise, actualités, contacts clés générés automatiquement avant chaque RDV.",
    },
    {
      icon: Video,
      title: "Analyse automatique des calls",
      desc: "Score de qualité par dimension, sentiment, points forts et axes d'amélioration.",
    },
    {
      icon: History,
      title: "Historique complet par contact",
      desc: "Toutes vos interactions centralisées : briefs, appels, emails, devis.",
    },
    {
      icon: FileCheck,
      title: "Devis en un clic",
      desc: "Pré-remplis à partir de vos échanges, envoyés par email avec signature en ligne.",
    },
    {
      icon: CheckSquare,
      title: "Tâches de suivi automatiques",
      desc: "Brief crée vos relances et brouillons emails au bon moment.",
    },
    {
      icon: Users,
      title: "Pilotage d'équipe",
      desc: "Managers : tableau de bord de performance, coaching sur les enregistrements.",
    },
  ];
  return (
    <section id="coaching" className="py-32 px-6 bg-lavender/40 border-y border-border/60">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-widest text-primary font-semibold">Fonctionnalités</div>
          <h2 className="mt-3 text-4xl md:text-6xl font-bold text-ink tracking-[-0.03em]">
            Tout ce dont un commercial B2B <span className="italic-serif">a besoin</span>.
          </h2>
        </div>

        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 rounded-3xl overflow-hidden border border-border/60">
          {feats.map((f) => (
            <div key={f.title} className="bg-background p-8 hover:bg-white transition-colors">
              <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center mb-4 border border-border/60">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-ink tracking-tight">{f.title}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Integrations() {
  const tools = [
    "Google Workspace",
    "Microsoft 365",
    "HubSpot",
    "Pipedrive",
    "Gmail",
    "Outlook",
    "Google Meet",
    "Microsoft Teams",
    "Zoom",
  ];
  return (
    <section id="integrations" className="py-32 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <div className="text-xs uppercase tracking-widest text-primary font-semibold">Intégrations</div>
        <h2 className="mt-3 text-4xl md:text-6xl font-bold text-ink tracking-[-0.03em]">
          Se branche sur <span className="italic-serif">votre stack</span>.
        </h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Brief s&apos;intègre à votre stack existante.
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {tools.map((t) => (
            <div key={t} className="rounded-full bg-white border border-border/60 px-5 py-2.5 text-sm font-medium text-ink">
              {t}
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground italic-serif">Sellsy et Salesforce prochainement</p>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="px-6 pb-24">
      <div className="max-w-6xl mx-auto relative rounded-[2rem] bg-ink text-background p-12 md:p-20 overflow-hidden">
        <div aria-hidden className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full bg-primary/40 blur-3xl" />
        <div className="relative max-w-2xl">
          <h2 className="text-4xl md:text-6xl font-bold tracking-[-0.03em]">
            Prêt à transformer <span className="italic-serif text-primary">vos rendez-vous</span> ?
          </h2>
          <p className="mt-6 text-lg text-background/70 leading-relaxed">
            Rejoignez les commerciaux qui utilisent Brief pour gagner en efficacité et fermer plus de deals.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="/login"
              className="group inline-flex items-center gap-2 bg-background text-ink rounded-full px-6 py-3.5 font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Se connecter
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <span className="text-sm text-background/60">Accès sur invitation</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 px-6 py-10">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-ink text-background grid place-items-center font-bold text-xs">
            B
          </div>
          <span className="font-semibold text-ink">Brief</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-ink transition-colors">
            Mentions légales
          </a>
          <a href="#" className="hover:text-ink transition-colors">
            Confidentialité
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="marketing-page min-h-screen bg-background text-ink">
      <Nav />
      <main>
        <Hero />
        <Workflow />
        <Features />
        <Integrations />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
