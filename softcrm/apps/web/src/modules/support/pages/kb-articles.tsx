import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useArticles, useCreateArticle, useCategories } from '../api.js';
import type { KBArticle, KBCategory } from '../api.js';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-orange-100 text-orange-700',
};

const STATUSES = ['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors}`}>
      {status}
    </span>
  );
}

function CreateArticleDialog({
  categories,
  onClose,
}: {
  categories: KBCategory[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const createArticle = useCreateArticle();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createArticle.mutate(
      {
        title,
        body,
        categoryId: categoryId || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">New Article</h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <label className="mb-1 block text-sm font-medium text-gray-700">Body</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
          <option value="">— None —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button type="submit" disabled={createArticle.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {createArticle.isPending ? 'Creating…' : 'Create Article'}
          </button>
        </div>

        {createArticle.isError && (
          <p className="mt-2 text-sm text-red-600">{createArticle.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function KBArticlesPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);

  const filters: Record<string, string> = {};
  if (statusFilter !== 'ALL') filters['status'] = statusFilter;

  const { data, isLoading, isError, error } = useArticles(
    Object.keys(filters).length > 0 ? filters : undefined,
  );
  const categoriesQuery = useCategories();

  const articles: KBArticle[] = data?.data ?? [];
  const categories: KBCategory[] = categoriesQuery.data?.data ?? [];

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
        <button onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          New Article
        </button>
      </div>

      {showCreate && <CreateArticleDialog categories={categories} onClose={() => setShowCreate(false)} />}

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Views</th>
                <th className="px-4 py-3 text-right">Helpful</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {articles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No articles found.</td>
                </tr>
              )}
              {articles.map((a) => (
                <tr key={a.id} onClick={() => navigate(`/support/kb/${a.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.title}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 text-gray-500">
                    {a.categoryId ? categoryMap.get(a.categoryId) ?? a.categoryId : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{a.viewCount}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{a.helpfulCount}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
