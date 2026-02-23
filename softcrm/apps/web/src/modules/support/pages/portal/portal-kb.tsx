import { useState } from 'react';
import { useArticles, useMarkArticleHelpful, type KBArticle } from '../../api.js';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function snippet(body: string, maxLen = 160): string {
  if (body.length <= maxLen) return body;
  return body.slice(0, maxLen).trimEnd() + '…';
}

export default function PortalKB() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useArticles({ status: 'PUBLISHED' });
  const markHelpful = useMarkArticleHelpful();

  const articles: KBArticle[] = data?.data ?? [];

  const filtered = search.trim()
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.body.toLowerCase().includes(search.toLowerCase()),
      )
    : articles;

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Knowledge Base</h1>

      {/* ── Search ── */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles…"
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* ── States ── */}
      {isLoading && (
        <div className="text-center text-gray-500 text-sm py-12">Loading articles…</div>
      )}

      {isError && (
        <div className="text-center text-red-600 text-sm py-12">
          Failed to load articles. Please try again later.
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center text-gray-500 text-sm py-12">
          {search.trim() ? 'No articles match your search.' : 'No articles available.'}
        </div>
      )}

      {/* ── Article list ── */}
      <div className="space-y-3">
        {filtered.map((article) => {
          const isExpanded = expandedId === article.id;

          return (
            <div
              key={article.id}
              className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Collapsed header */}
              <button
                type="button"
                onClick={() => toggle(article.id)}
                className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-gray-900 truncate">
                      {article.title}
                    </h2>
                    {!isExpanded && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {snippet(article.body)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {article.category && (
                      <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                        {article.category.name}
                      </span>
                    )}
                    <svg
                      className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="prose prose-sm max-w-none text-gray-700 mt-4 whitespace-pre-wrap">
                    {article.body}
                  </div>

                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      Published {article.publishedAt ? fmtDate(article.publishedAt) : fmtDate(article.createdAt)}
                      {' · '}{article.helpfulCount} found this helpful
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markHelpful.mutate({ id: article.id });
                      }}
                      disabled={markHelpful.isPending}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21H7a2 2 0 01-2-2v-7a2 2 0 012-2h1.5l2.5-5V3a1 1 0 011-1h.5a2 2 0 012 2v6z"
                        />
                      </svg>
                      Was this helpful?
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
