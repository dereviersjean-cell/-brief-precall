import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { getEffectiveUserId } from "@/lib/session-user";
import { getUserRole, getHelpArticlesForRole, type HelpArticle } from "@/lib/db";
import { markdownComponents } from "@/lib/markdown-components";
import FadeIn from "@/app/dashboard/FadeIn";

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
  const role = userId ? await getUserRole(userId) : null;
  const articles = await getHelpArticlesForRole(role === "manager" ? "manager" : "commercial");

  const byCategory = new Map<string, HelpArticle[]>();
  for (const a of articles) {
    const list = byCategory.get(a.category) ?? [];
    list.push(a);
    byCategory.set(a.category, list);
  }
  const categories = Array.from(byCategory.keys());

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-white p-8 mb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-[color:var(--lavender-strong)]/60 via-[color:var(--lavender)]/40 to-transparent blur-3xl"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--violet)] bg-[color:var(--lavender)] px-2.5 py-1 rounded-full mb-3">
              <HelpCircle className="w-3 h-3" />
              Base de connaissance
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Comment ça marche ?</h1>
            <p className="text-slate-500 text-sm mt-1">À quoi sert Brief, et comment faire telle ou telle action sur la plateforme.</p>
            {/* La présentation n'est vue qu'une fois, à la sortie de
                l'onboarding. On revient chercher « comment ça marche déjà ? »
                une semaine plus tard, pas le premier jour — et c'est ici
                qu'on le cherche. */}
            <Link
              href="/bienvenue"
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--violet)] hover:underline"
            >
              Revoir la présentation de Brief <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/demo/dashboard?tour=1"
              className="mt-2 ml-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--violet)] hover:underline"
            >
              Refaire la visite guidée <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {categories.length > 1 && (
            <div className="relative flex flex-wrap gap-2 mt-5">
              {categories.map((category) => (
                <a
                  key={category}
                  href={`#${slugify(category)}`}
                  className="text-xs font-medium text-slate-600 bg-slate-50 border border-border rounded-full px-3 py-1.5 hover:bg-slate-100 transition-colors duration-200"
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
          <div className="bg-white rounded-2xl border border-border p-6">
            <p className="text-slate-400 text-sm italic">
              Aucun article disponible pour l&apos;instant.
            </p>
          </div>
        </FadeIn>
      )}

      <div className="space-y-8">
        {Array.from(byCategory.entries()).map(([category, categoryArticles], i) => (
          <FadeIn key={category} delay={0.05 * (i + 1)}>
            <div id={slugify(category)} className="scroll-mt-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{category}</h2>
              <div className="space-y-4">
                {categoryArticles.map((article) => (
                  <div key={article.id} className="bg-white rounded-2xl border border-border p-6">
                    <h3 className="text-base font-semibold text-slate-900 mb-2">{article.title}</h3>
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
