import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getEffectiveUserId } from "@/lib/session-user";
import { getEnabledModulesForUser, getUserRole, getHelpArticlesForRole, type HelpArticle } from "@/lib/db";
import { markdownComponents } from "@/lib/markdown-components";
import FadeIn from "@/app/dashboard/FadeIn";
import { PageHeader } from "@/app/components/ui/PageHeader";

// Same normalization as lib/db.ts's dimension slugify (playbook) — strip
// combining diacritics after NFD decomposition, not a literal accented-char
// blocklist.
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function HelpPage() {
  const userId = await getEffectiveUserId();
  // Fresh from DB, not the JWT — session.role can be stale until re-login
  // (same pattern as dashboard/page.tsx). Falls back to the more
  // restrictive "commercial" scope if a role can't be resolved, rather than
  // risk showing manager-only content.
  const [role, modules] = await Promise.all([
    userId ? getUserRole(userId) : Promise.resolve(null),
    userId ? getEnabledModulesForUser(userId) : Promise.resolve(null),
  ]);
  // Un article rattaché à un module fermé n'existe pas pour ce client
  // (parcours client, lib/modules.ts) : l'aide ne décrit que ce qu'il a.
  const articles = (await getHelpArticlesForRole(role === "manager" ? "manager" : "commercial")).filter(
    (a) => !a.module || (modules?.includes(a.module) ?? false)
  );

  const byCategory = new Map<string, HelpArticle[]>();
  for (const a of articles) {
    const list = byCategory.get(a.category) ?? [];
    list.push(a);
    byCategory.set(a.category, list);
  }
  const categories = Array.from(byCategory.keys());

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <FadeIn>
        <div className="mb-8">
          <PageHeader
            eyebrow="Base de connaissance"
            title="Comment ça marche ?"
            subtitle="À quoi sert Brief, et comment faire telle ou telle action sur la plateforme."
          />
          {/* La présentation n'est vue qu'une fois, à la sortie de
              l'onboarding. On revient chercher « comment ça marche déjà ? »
              une semaine plus tard, pas le premier jour — et c'est ici
              qu'on le cherche. */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/bienvenue"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--violet)] hover:underline"
            >
              Revoir la présentation de Brief <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/demo/dashboard?tour=1"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--violet)] hover:underline"
            >
              Refaire la visite guidée <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {categories.length > 1 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {categories.map((category) => (
                <a
                  key={category}
                  href={`#${slugify(category)}`}
                  className="inline-flex h-8 items-center rounded-full border border-border bg-white px-3 text-[12.5px] font-medium text-slate-600 transition-colors hover:text-slate-900"
                >
                  {category}
                </a>
              ))}
            </div>
          )}
        </div>
      </FadeIn>

      {articles.length === 0 && (
        <FadeIn delay={0.1}>
          <div className="rounded-2xl border border-border bg-white p-6">
            <p className="text-[13.5px] italic text-slate-400">
              Aucun article disponible pour l&apos;instant.
            </p>
          </div>
        </FadeIn>
      )}

      <div className="space-y-8">
        {Array.from(byCategory.entries()).map(([category, categoryArticles], i) => (
          <FadeIn key={category} delay={0.05 * (i + 1)}>
            {/* scroll-mt : l'ancre ne doit pas tomber sous la TopBar collante (h-14). */}
            <div id={slugify(category)} className="scroll-mt-20">
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">{category}</h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-3">
                {categoryArticles.map((article) => (
                  <div key={article.id} className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                    <h3 className="mb-2 text-[16px] font-semibold tracking-[-0.01em] text-slate-900">{article.title}</h3>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {article.content}
                    </ReactMarkdown>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
