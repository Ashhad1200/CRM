import { useState } from 'react';
import { useCustomFieldDefs, useCreateFieldDef, useDeleteFieldDef } from '../api';
import type { FieldDef } from '../api';

const MODULES = ['SALES', 'ACCOUNTING', 'SUPPORT', 'MARKETING', 'INVENTORY', 'PROJECTS'] as const;
const ENTITIES_BY_MODULE: Record<string, string[]> = {
  SALES: ['Lead', 'Opportunity', 'Contact', 'Account'],
  ACCOUNTING: ['Invoice', 'Payment', 'Expense'],
  SUPPORT: ['Ticket', 'Article'],
  MARKETING: ['Campaign', 'List'],
  INVENTORY: ['Product', 'Warehouse'],
  PROJECTS: ['Project', 'Task'],
};
const FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'URL', 'EMAIL'] as const;

interface NewFieldForm {
  fieldName: string;
  fieldType: string;
  label: string;
  required: boolean;
  options: string;
}

const EMPTY_FORM: NewFieldForm = {
  fieldName: '',
  fieldType: 'TEXT',
  label: '',
  required: false,
  options: '',
};

export default function CustomFieldsPage() {
  const [module, setModule] = useState('');
  const [entity, setEntity] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewFieldForm>({ ...EMPTY_FORM });

  const { data: defs, isLoading, isError, error } = useCustomFieldDefs(module, entity);
  const createDef = useCreateFieldDef();
  const deleteDef = useDeleteFieldDef();

  const entities = module ? ENTITIES_BY_MODULE[module] ?? [] : [];

  const handleModuleChange = (val: string) => {
    setModule(val);
    setEntity('');
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const optionsParsed =
      form.fieldType === 'SELECT' || form.fieldType === 'MULTISELECT'
        ? form.options.split(',').map((o) => o.trim()).filter(Boolean)
        : null;

    createDef.mutate(
      {
        module,
        entity,
        fieldName: form.fieldName,
        fieldType: form.fieldType,
        label: form.label,
        required: form.required,
        options: optionsParsed,
        sortOrder: (defs?.length ?? 0) + 1,
      },
      {
        onSuccess: () => {
          setForm({ ...EMPTY_FORM });
          setShowForm(false);
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Custom Fields</h1>

      {/* Module / Entity selectors */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Module</label>
          <select
            value={module}
            onChange={(e) => handleModuleChange(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select module…</option>
            {MODULES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Entity</label>
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            disabled={!module}
            className="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">Select entity…</option>
            {entities.map((en) => (
              <option key={en} value={en}>
                {en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Field list */}
      {module && entity && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Fields for {module} / {entity}
            </h2>
            <button
              onClick={() => setShowForm(true)}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Field
            </button>
          </div>

          {isLoading && <p className="text-gray-500">Loading…</p>}
          {isError && <p className="text-red-600">{error.message}</p>}

          {defs && (
            <table className="mb-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Label</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-center">Required</th>
                  <th className="px-3 py-2">Options</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {defs.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {d.fieldName}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{d.label}</td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {d.fieldType}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {d.required ? '✓' : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {d.options ? JSON.stringify(d.options) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() =>
                          deleteDef.mutate({ id: d.id, module, entity })
                        }
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {defs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                      No custom fields defined yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Inline add form */}
          {showForm && (
            <form
              onSubmit={handleAdd}
              className="rounded border border-gray-200 bg-gray-50 p-4"
            >
              <h3 className="mb-3 text-sm font-semibold text-gray-700">
                New Field Definition
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Field Name
                  </label>
                  <input
                    value={form.fieldName}
                    onChange={(e) =>
                      setForm({ ...form, fieldName: e.target.value })
                    }
                    required
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Label
                  </label>
                  <input
                    value={form.label}
                    onChange={(e) =>
                      setForm({ ...form, label: e.target.value })
                    }
                    required
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Type
                  </label>
                  <select
                    value={form.fieldType}
                    onChange={(e) =>
                      setForm({ ...form, fieldType: e.target.value })
                    }
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.required}
                      onChange={(e) =>
                        setForm({ ...form, required: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Required
                  </label>
                </div>
              </div>

              {(form.fieldType === 'SELECT' || form.fieldType === 'MULTISELECT') && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Options (comma-separated)
                  </label>
                  <input
                    value={form.options}
                    onChange={(e) =>
                      setForm({ ...form, options: e.target.value })
                    }
                    placeholder="Option A, Option B, Option C"
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={createDef.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {createDef.isPending ? 'Adding…' : 'Add Field'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm({ ...EMPTY_FORM });
                  }}
                  className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>

              {createDef.isError && (
                <p className="mt-2 text-sm text-red-600">
                  {createDef.error.message}
                </p>
              )}
            </form>
          )}
        </>
      )}

      {!module && (
        <p className="text-gray-400">
          Select a module and entity to manage custom fields.
        </p>
      )}
    </div>
  );
}
