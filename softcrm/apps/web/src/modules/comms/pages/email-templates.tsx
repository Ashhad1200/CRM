import { useState } from 'react';
import {
  useEmailTemplates,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
} from '../api.js';
import type { EmailTemplate } from '../api.js';

/* ───────── Form state ───────── */

interface TemplateForm {
  name: string;
  subject: string;
  bodyHtml: string;
  mergeFields: string;
  isActive: boolean;
}

const EMPTY_FORM: TemplateForm = {
  name: '',
  subject: '',
  bodyHtml: '',
  mergeFields: '',
  isActive: true,
};

/* ───────── Component ───────── */

export default function EmailTemplatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<number>(0);
  const [form, setForm] = useState<TemplateForm>({ ...EMPTY_FORM });

  const { data, isLoading, isError, error } = useEmailTemplates({
    search: search || undefined,
    page,
    pageSize: 20,
  });
  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();

  const templates = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  /* ───────── Handlers ───────── */

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setEditingVersion(0);
    setShowForm(false);
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (tpl: EmailTemplate) => {
    setForm({
      name: tpl.name,
      subject: tpl.subject,
      bodyHtml: tpl.bodyHtml,
      mergeFields: tpl.mergeFields.join(', '),
      isActive: tpl.isActive,
    });
    setEditingId(tpl.id);
    setEditingVersion(tpl.version);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mergeFieldsParsed = form.mergeFields
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    if (editingId) {
      updateTemplate.mutate(
        {
          id: editingId,
          name: form.name,
          subject: form.subject,
          bodyHtml: form.bodyHtml,
          mergeFields: mergeFieldsParsed,
          isActive: form.isActive,
          version: editingVersion,
        },
        { onSuccess: resetForm },
      );
    } else {
      createTemplate.mutate(
        {
          name: form.name,
          subject: form.subject,
          bodyHtml: form.bodyHtml,
          mergeFields: mergeFieldsParsed,
          isActive: form.isActive,
        },
        { onSuccess: resetForm },
      );
    }
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  /* ───────── Field helper ───────── */

  const setField = <K extends keyof TemplateForm>(
    key: K,
    value: TemplateForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  /* ───────── Render ───────── */

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          + New Template
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search templates…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Inline Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-5"
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            {editingId ? 'Edit Template' : 'New Template'}
          </h2>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Subject
            </label>
            <input
              type="text"
              required
              value={form.subject}
              onChange={(e) => setField('subject', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Body HTML
            </label>
            <textarea
              required
              rows={8}
              value={form.bodyHtml}
              onChange={(e) => setField('bodyHtml', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Merge Fields{' '}
              <span className="font-normal text-gray-400">(comma-separated)</span>
            </label>
            <input
              type="text"
              placeholder="firstName, lastName, company"
              value={form.mergeFields}
              onChange={(e) => setField('mergeFields', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-4 flex items-center gap-2">
            <input
              id="tpl-active"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setField('isActive', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="tpl-active" className="text-sm text-gray-700">
              Active
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : editingId ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Loading / Error states */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load templates: {(error as Error).message}
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <>
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <span className="mb-2 text-4xl">📄</span>
              <p className="text-sm">No email templates found</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      Merge Fields
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      Version
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {templates.map((tpl) => (
                    <tr
                      key={tpl.id}
                      onClick={() => openEdit(tpl)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        {tpl.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {tpl.subject}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">
                        {tpl.mergeFields.length}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            tpl.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tpl.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">
                        v{tpl.version}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
