"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, ArrowDown, Plus, Trash2, BookOpen, Eye, Pencil } from "lucide-react";
import type { HelpArticle, HelpArticleVisibility } from "@/lib/db";
import { AdminPageShell, AdminPageHeader } from "@/app/admin/AdminShell";
import { markdownComponents } from "@/lib/markdown-components";
import FadeIn from "@/app/dashboard/FadeIn";

const VISIBILITY_LABELS: Record<HelpArticleVisibility, string> = {
  both: "Manager + Commercial",
  manager: "Manager uniquement",
  commercial: "Commercial uniquement",
};

function InlineText({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (next: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`w-full border border-slate-300 rounded-lg px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${className ?? ""}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`text-left hover:bg-slate-50 rounded-lg px-1.5 -mx-1.5 py-0.5 transition-colors duration-200 ${className ?? ""}`}
    >
      {value}
    </button>
  );
}

function ArticleCard({
  article,
  index,
  total,
  onUpdate,
  onDelete,
  onMove,
}: {
  article: HelpArticle;
  index: number;
  total: number;
  onUpdate: (patch: Partial<Pick<HelpArticle, "title" | "content" | "visible_to">>) => Promise<void>;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const [contentDraft, setContentDraft] = useState(article.content);
  const [savingContent, setSavingContent] = useState(false);
  const [preview, setPreview] = useState(false);
  const contentDirty = contentDraft !== article.content;

  async function handleSaveContent() {
    setSavingContent(true);
    await onUpdate({ content: contentDraft });
    setSavingContent(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <InlineText value={article.title} onSave={(v) => onUpdate({ title: v })} className="font-semibold text-slate-900 block" />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onMove("up")}
            disabled={index === 0}
            className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
            aria-label="Monter"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={index === total - 1}
            className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
            aria-label="Descendre"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="h-7 px-2.5 flex items-center gap-1 rounded-lg border border-slate-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors duration-200 ml-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </button>
        </div>
      </div>

      <div className="mt-2">
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Visible par</label>
        <select
          value={article.visible_to}
          onChange={(e) => onUpdate({ visible_to: e.target.value as HelpArticleVisibility })}
          className="h-8 px-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {(Object.keys(VISIBILITY_LABELS) as HelpArticleVisibility[]).map((v) => (
            <option key={v} value={v}>
              {VISIBILITY_LABELS[v]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Contenu (markdown)</label>
          <button
            onClick={() => setPreview((p) => !p)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            {preview ? <Pencil className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {preview ? "Éditer" : "Aperçu"}
          </button>
        </div>
        {preview ? (
          <div className="border border-slate-200 rounded-lg px-3.5 py-3 min-h-[200px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {contentDraft}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={contentDraft}
            onChange={(e) => setContentDraft(e.target.value)}
            rows={10}
            className="w-full px-3.5 py-3 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        )}
        <div className="flex items-center justify-end gap-2 mt-2">
          {contentDirty && <span className="text-xs text-amber-600 mr-auto">Modifications non enregistrées</span>}
          <button
            onClick={() => setContentDraft(article.content)}
            disabled={!contentDirty}
            className="h-8 px-3 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors duration-200 disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            onClick={handleSaveContent}
            disabled={!contentDirty || savingContent}
            className="h-8 px-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50"
          >
            {savingContent ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddArticleModal({
  categories,
  defaultCategory,
  onClose,
  onCreate,
}: {
  categories: string[];
  defaultCategory: string;
  onClose: () => void;
  onCreate: (data: { category: string; title: string; content: string; visible_to: HelpArticleVisibility }) => Promise<void>;
}) {
  const [category, setCategory] = useState(defaultCategory);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibleTo, setVisibleTo] = useState<HelpArticleVisibility>("both");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const trimmedCategory = category.trim();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedCategory || !trimmedTitle || !trimmedContent) return;
    setLoading(true);
    await onCreate({ category: trimmedCategory, title: trimmedTitle, content: trimmedContent, visible_to: visibleTo });
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-slate-900 mb-4">Ajouter un article</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Catégorie</label>
            <input
              autoFocus
              list="help-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="ex. Général, Devis, Facturation…"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <datalist id="help-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Titre</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex. Créer et envoyer un devis"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Visible par</label>
            <select
              value={visibleTo}
              onChange={(e) => setVisibleTo(e.target.value as HelpArticleVisibility)}
              className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {(Object.keys(VISIBILITY_LABELS) as HelpArticleVisibility[]).map((v) => (
                <option key={v} value={v}>
                  {VISIBILITY_LABELS[v]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Contenu (markdown)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="## Sous-titre&#10;&#10;Texte de l'article…"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="h-8 px-4 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!category.trim() || !title.trim() || !content.trim() || loading}
            className="h-8 px-4 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? "Création…" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HelpAdminClient({ articles: initialArticles }: { articles: HelpArticle[] }) {
  const [articles, setArticles] = useState(initialArticles);
  const [showAddModal, setShowAddModal] = useState(false);

  const categories = useMemo(() => Array.from(new Set(articles.map((a) => a.category))), [articles]);
  const byCategory = useMemo(() => {
    const map = new Map<string, HelpArticle[]>();
    for (const a of articles) {
      const list = map.get(a.category) ?? [];
      list.push(a);
      map.set(a.category, list);
    }
    return map;
  }, [articles]);

  async function handleUpdateArticle(articleId: string, patch: Partial<Pick<HelpArticle, "title" | "content" | "visible_to">>) {
    const prev = articles;
    setArticles((as) => as.map((a) => (a.id === articleId ? { ...a, ...patch } : a)));
    try {
      const res = await fetch(`/api/admin/help/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
    } catch {
      setArticles(prev);
    }
  }

  async function handleDeleteArticle(articleId: string) {
    if (!window.confirm("Supprimer cet article ?")) return;
    const prev = articles;
    setArticles((as) => as.filter((a) => a.id !== articleId));
    try {
      const res = await fetch(`/api/admin/help/${articleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setArticles(prev);
    }
  }

  async function handleMoveArticle(category: string, articleId: string, direction: "up" | "down") {
    const categoryArticles = byCategory.get(category) ?? [];
    const index = categoryArticles.findIndex((a) => a.id === articleId);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= categoryArticles.length) return;

    const prev = articles;
    const nextCategoryOrder = [...categoryArticles];
    [nextCategoryOrder[index], nextCategoryOrder[swapWith]] = [nextCategoryOrder[swapWith], nextCategoryOrder[index]];
    const orderedIds = nextCategoryOrder.map((a) => a.id);

    setArticles((as) => {
      const other = as.filter((a) => a.category !== category);
      return [...other, ...nextCategoryOrder].sort((a, b) => a.category.localeCompare(b.category));
    });

    try {
      const res = await fetch("/api/admin/help/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, orderedIds }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setArticles(prev);
    }
  }

  async function handleAddArticle(data: { category: string; title: string; content: string; visible_to: HelpArticleVisibility }) {
    try {
      const res = await fetch("/api/admin/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const { id } = (await res.json()) as { id: string };
      setArticles((as) => [
        ...as,
        {
          id,
          category: data.category,
          title: data.title,
          content: data.content,
          visible_to: data.visible_to,
          sort_order: (byCategory.get(data.category)?.length ?? 0),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      setShowAddModal(false);
    } catch {
      window.alert("Erreur lors de la création de l'article.");
    }
  }

  return (
    <AdminPageShell>
      <FadeIn>
        <AdminPageHeader
          icon={BookOpen}
          eyebrow="Base de connaissance"
          title="Aide"
          subtitle={`${articles.length} article${articles.length > 1 ? "s" : ""} — contenu affiché sur /help selon le rôle (manager, commercial, ou les deux).`}
        />
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="space-y-8">
          {Array.from(byCategory.entries()).map(([category, categoryArticles]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-slate-900 mb-3">{category}</h2>
              <div className="space-y-4">
                {categoryArticles.map((article, index) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    index={index}
                    total={categoryArticles.length}
                    onUpdate={(patch) => handleUpdateArticle(article.id, patch)}
                    onDelete={() => handleDeleteArticle(article.id)}
                    onMove={(direction) => handleMoveArticle(category, article.id, direction)}
                  />
                ))}
              </div>
            </div>
          ))}

          {articles.length === 0 && (
            <p className="text-slate-400 text-sm italic">Aucun article pour l&apos;instant.</p>
          )}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="mt-6 h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          Ajouter un article
        </button>
      </FadeIn>

      {showAddModal && (
        <AddArticleModal
          categories={categories}
          defaultCategory={categories[0] ?? ""}
          onClose={() => setShowAddModal(false)}
          onCreate={handleAddArticle}
        />
      )}
    </AdminPageShell>
  );
}
