import { useParams, useNavigate } from 'react-router';
import { useArticle, usePublishArticle, useArchiveArticle, useMarkArticleHelpful } from '../api.js';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-orange-100 text-orange-700',
};

export default function KBArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const articleQuery = useArticle(id!);
  const publishArticle = usePublishArticle();
  const archiveArticle = useArchiveArticle();
  const markHelpful = useMarkArticleHelpful();

  if (articleQuery.isLoading) return <div className="p-6 text-gray-500">Loading…</div>;
  if (articleQuery.isError) return <div className="p-6 text-red-600">{articleQuery.error.message}</div>;

  const article = articleQuery.data;
  if (!article) return <div className="p-6 text-gray-500">Article not found.</div>;

  const statusColor = STATUS_COLORS[article.status] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="mx-auto max-w-4xl p-6">
      <button onClick={() => navigate('/support/kb')}
        className="mb-4 text-sm text-blue-600 hover:underline">&larr; Back to Knowledge Base</button>

      {/* Article card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                {article.status}
              </span>
              {article.category && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{article.category.name}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {article.status === 'DRAFT' && (
              <button onClick={() => publishArticle.mutate({ id: article.id })} disabled={publishArticle.isPending}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                {publishArticle.isPending ? 'Publishing…' : 'Publish'}
              </button>
            )}
            {article.status === 'PUBLISHED' && (
              <button onClick={() => archiveArticle.mutate({ id: article.id })} disabled={archiveArticle.isPending}
                className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
                {archiveArticle.isPending ? 'Archiving…' : 'Archive'}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-gray-500">Views</p>
            <p className="text-lg font-semibold text-gray-900">{article.viewCount}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Helpful</p>
            <p className="text-lg font-semibold text-gray-900">{article.helpfulCount}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Author</p>
            <p className="text-sm text-gray-900">{article.authorId}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Published</p>
            <p className="text-sm text-gray-900">
              {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{article.body}</div>
        </div>

        {/* Mark helpful */}
        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="mb-2 text-sm text-gray-600">Was this article helpful?</p>
          <button
            onClick={() => markHelpful.mutate({ id: article.id })}
            disabled={markHelpful.isPending}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {markHelpful.isPending ? 'Submitting…' : '👍 Yes, it was helpful'}
          </button>
          {markHelpful.isSuccess && (
            <p className="mt-2 text-sm text-green-600">Thank you for your feedback!</p>
          )}
        </div>

        {/* Meta */}
        <div className="mt-4 border-t border-gray-200 pt-3 text-xs text-gray-400">
          Created {new Date(article.createdAt).toLocaleString()} · Updated {new Date(article.updatedAt).toLocaleString()} · v{article.version}
        </div>
      </div>
    </div>
  );
}
