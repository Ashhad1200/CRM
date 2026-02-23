import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useRole, useUpdateRole } from '../api';
import type { RoleDetail } from '../api';

type Tab = 'module' | 'entity' | 'field';

const ACCESS_LEVELS = ['NONE', 'READ', 'WRITE', 'ADMIN'] as const;
const SCOPES = ['OWN', 'TEAM', 'ALL'] as const;

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: role, isLoading, isError, error } = useRole(id ?? '');
  const updateRole = useUpdateRole(id ?? '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tab, setTab] = useState<Tab>('module');

  const [modulePerms, setModulePerms] = useState<
    { id: string; module: string; accessLevel: string }[]
  >([]);
  const [entityPerms, setEntityPerms] = useState<
    RoleDetail['entityPermissions']
  >([]);
  const [fieldPerms, setFieldPerms] = useState<
    RoleDetail['fieldPermissions']
  >([]);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description ?? '');
      setModulePerms(role.modulePermissions.map((p) => ({ ...p })));
      setEntityPerms(role.entityPermissions.map((p) => ({ ...p })));
      setFieldPerms(role.fieldPermissions.map((p) => ({ ...p })));
    }
  }, [role]);

  const handleSave = () => {
    updateRole.mutate({
      name,
      description: description || null,
      modulePermissions: modulePerms,
      entityPermissions: entityPerms,
      fieldPermissions: fieldPerms,
    });
  };

  if (isLoading) return <p className="p-6 text-gray-500">Loading…</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!role) return <p className="p-6 text-gray-400">Role not found.</p>;

  /* ── helpers for grouped views ── */
  const entityByModule = entityPerms.reduce<
    Record<string, typeof entityPerms>
  >((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});

  const fieldByEntity = fieldPerms.reduce<
    Record<string, typeof fieldPerms>
  >((acc, p) => {
    const key = `${p.module}.${p.entity}`;
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t ${
      tab === t
        ? 'bg-white text-blue-600 border border-b-0 border-gray-200'
        : 'text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/roles')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Roles
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Role</h1>
        {role.isSystem && (
          <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
            System
          </span>
        )}
      </div>

      {/* Basic info */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 bg-gray-50 px-2 pt-2">
        <button onClick={() => setTab('module')} className={tabClass('module')}>
          Module Permissions
        </button>
        <button onClick={() => setTab('entity')} className={tabClass('entity')}>
          Entity Permissions
        </button>
        <button onClick={() => setTab('field')} className={tabClass('field')}>
          Field Permissions
        </button>
      </div>

      <div className="rounded-b border border-t-0 border-gray-200 bg-white p-4">
        {/* ── Module Permissions ── */}
        {tab === 'module' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-2 text-left">Module</th>
                <th className="px-3 py-2 text-left">Access Level</th>
              </tr>
            </thead>
            <tbody>
              {modulePerms.map((p, idx) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="px-3 py-2 text-gray-700">{p.module}</td>
                  <td className="px-3 py-2">
                    <select
                      value={p.accessLevel}
                      onChange={(e) => {
                        const next = [...modulePerms];
                        next[idx] = { ...p, accessLevel: e.target.value };
                        setModulePerms(next);
                      }}
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      {ACCESS_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {modulePerms.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-gray-400">
                    No module permissions configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* ── Entity Permissions ── */}
        {tab === 'entity' && (
          <div className="space-y-6">
            {Object.entries(entityByModule).map(([mod, perms]) => (
              <div key={mod}>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">
                  {mod}
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs font-semibold uppercase text-gray-500">
                      <th className="px-3 py-2 text-left">Entity</th>
                      <th className="px-3 py-2 text-left">Scope</th>
                      <th className="px-3 py-2 text-center">Create</th>
                      <th className="px-3 py-2 text-center">Read</th>
                      <th className="px-3 py-2 text-center">Update</th>
                      <th className="px-3 py-2 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perms.map((p) => {
                      const idx = entityPerms.findIndex((e) => e.id === p.id);
                      return (
                        <tr key={p.id} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-gray-700">{p.entity}</td>
                          <td className="px-3 py-2">
                            <select
                              value={p.scope}
                              onChange={(e) => {
                                const next = [...entityPerms];
                                next[idx] = { ...p, scope: e.target.value };
                                setEntityPerms(next);
                              }}
                              className="rounded border border-gray-300 px-2 py-1 text-sm"
                            >
                              {SCOPES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          {(
                            ['canCreate', 'canRead', 'canUpdate', 'canDelete'] as const
                          ).map((field) => (
                            <td key={field} className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={p[field]}
                                onChange={(e) => {
                                  const next = [...entityPerms];
                                  next[idx] = {
                                    ...p,
                                    [field]: e.target.checked,
                                  };
                                  setEntityPerms(next);
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
            {entityPerms.length === 0 && (
              <p className="py-4 text-center text-gray-400">
                No entity permissions configured.
              </p>
            )}
          </div>
        )}

        {/* ── Field Permissions ── */}
        {tab === 'field' && (
          <div className="space-y-6">
            {Object.entries(fieldByEntity).map(([key, perms]) => (
              <div key={key}>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">{key}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs font-semibold uppercase text-gray-500">
                      <th className="px-3 py-2 text-left">Field</th>
                      <th className="px-3 py-2 text-center">Visible</th>
                      <th className="px-3 py-2 text-center">Editable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perms.map((p) => {
                      const idx = fieldPerms.findIndex((f) => f.id === p.id);
                      return (
                        <tr key={p.id} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-gray-700">{p.field}</td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={p.visible}
                              onChange={(e) => {
                                const next = [...fieldPerms];
                                next[idx] = { ...p, visible: e.target.checked };
                                setFieldPerms(next);
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={p.editable}
                              onChange={(e) => {
                                const next = [...fieldPerms];
                                next[idx] = { ...p, editable: e.target.checked };
                                setFieldPerms(next);
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
            {fieldPerms.length === 0 && (
              <p className="py-4 text-center text-gray-400">
                No field permissions configured.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Assigned users */}
      {role.userRoles.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            Assigned Users ({role.userRoles.length})
          </h2>
          <ul className="divide-y divide-gray-100 rounded border border-gray-200 bg-white text-sm">
            {role.userRoles.map((ur) => (
              <li key={ur.id} className="px-3 py-2 text-gray-700">
                {ur.user.firstName} {ur.user.lastName}{' '}
                <span className="text-gray-400">({ur.user.email})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Save */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={updateRole.isPending}
          className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {updateRole.isPending ? 'Saving…' : 'Save Changes'}
        </button>
        {updateRole.isSuccess && (
          <span className="text-sm text-green-600">Saved!</span>
        )}
        {updateRole.isError && (
          <span className="text-sm text-red-600">{updateRole.error.message}</span>
        )}
      </div>
    </div>
  );
}
