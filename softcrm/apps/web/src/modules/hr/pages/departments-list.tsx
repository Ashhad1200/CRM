import { useState } from 'react';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  usePositions,
  useCreatePosition,
  useUpdatePosition,
  useDeletePosition,
} from '../api';
import type { Department, Position } from '../api';

type Tab = 'departments' | 'positions';

function CreateDepartmentDialog({
  departments,
  onClose,
}: {
  departments: Department[];
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [parentDepartmentId, setParentDepartmentId] = useState('');
  const createDepartment = useCreateDepartment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDepartment.mutate(
      {
        name,
        parentDepartmentId: parentDepartmentId || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          New Department
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Name *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Parent Department
        </label>
        <select
          value={parentDepartmentId}
          onChange={(e) => setParentDepartmentId(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">None (Top Level)</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createDepartment.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createDepartment.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createDepartment.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createDepartment.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

function CreatePositionDialog({
  departments,
  onClose,
}: {
  departments: Department[];
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const createPosition = useCreatePosition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPosition.mutate(
      {
        name,
        departmentId: departmentId || undefined,
        minSalary: minSalary || undefined,
        maxSalary: maxSalary || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          New Position
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Name *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Department
        </label>
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">No Department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Min Salary
            </label>
            <input
              type="number"
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Max Salary
            </label>
            <input
              type="number"
              value={maxSalary}
              onChange={(e) => setMaxSalary(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createPosition.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createPosition.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createPosition.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createPosition.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function DepartmentsListPage() {
  const [tab, setTab] = useState<Tab>('departments');
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [showCreatePos, setShowCreatePos] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingPos, setEditingPos] = useState<Position | null>(null);

  const { data: deptData, isLoading: deptLoading } = useDepartments();
  const { data: posData, isLoading: posLoading } = usePositions();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const updatePosition = useUpdatePosition();
  const deletePosition = useDeletePosition();

  const departments: Department[] = deptData?.data ?? [];
  const positions: Position[] = posData?.data ?? [];

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium ${
      tab === t
        ? 'border-b-2 border-blue-600 text-blue-600'
        : 'text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Organization Structure</h1>
        <div className="flex gap-2">
          {tab === 'departments' && (
            <button
              onClick={() => setShowCreateDept(true)}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              New Department
            </button>
          )}
          {tab === 'positions' && (
            <button
              onClick={() => setShowCreatePos(true)}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              New Position
            </button>
          )}
        </div>
      </div>

      {showCreateDept && (
        <CreateDepartmentDialog
          departments={departments}
          onClose={() => setShowCreateDept(false)}
        />
      )}

      {showCreatePos && (
        <CreatePositionDialog
          departments={departments}
          onClose={() => setShowCreatePos(false)}
        />
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-gray-200">
        <button onClick={() => setTab('departments')} className={tabClass('departments')}>
          Departments
        </button>
        <button onClick={() => setTab('positions')} className={tabClass('positions')}>
          Positions
        </button>
      </div>

      {/* Departments Tab */}
      {tab === 'departments' && (
        <>
          {deptLoading && <p className="text-gray-500">Loading...</p>}
          {!deptLoading && departments.length === 0 && (
            <p className="py-8 text-center text-gray-400">No departments found.</p>
          )}
          {!deptLoading && departments.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Parent</th>
                  <th className="px-3 py-3">Employees</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100">
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {editingDept?.id === d.id ? (
                        <input
                          value={editingDept.name}
                          onChange={(e) =>
                            setEditingDept({ ...editingDept, name: e.target.value })
                          }
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        d.name
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {d.parentDepartment?.name ?? '-'}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {d.employeeCount ?? 0}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        {editingDept?.id === d.id ? (
                          <>
                            <button
                              onClick={() => {
                                updateDepartment.mutate(
                                  { id: d.id, name: editingDept.name },
                                  { onSuccess: () => setEditingDept(null) }
                                );
                              }}
                              className="text-sm text-green-600 hover:text-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingDept(null)}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingDept(d)}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this department?')) {
                                  deleteDepartment.mutate(d.id);
                                }
                              }}
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Positions Tab */}
      {tab === 'positions' && (
        <>
          {posLoading && <p className="text-gray-500">Loading...</p>}
          {!posLoading && positions.length === 0 && (
            <p className="py-8 text-center text-gray-400">No positions found.</p>
          )}
          {!posLoading && positions.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Department</th>
                  <th className="px-3 py-3">Salary Range</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {editingPos?.id === p.id ? (
                        <input
                          value={editingPos.name}
                          onChange={(e) =>
                            setEditingPos({ ...editingPos, name: e.target.value })
                          }
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        p.name
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {p.department?.name ?? '-'}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {p.minSalary && p.maxSalary
                        ? `$${parseFloat(p.minSalary).toLocaleString()} - $${parseFloat(p.maxSalary).toLocaleString()}`
                        : p.minSalary
                        ? `From $${parseFloat(p.minSalary).toLocaleString()}`
                        : p.maxSalary
                        ? `Up to $${parseFloat(p.maxSalary).toLocaleString()}`
                        : '-'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        {editingPos?.id === p.id ? (
                          <>
                            <button
                              onClick={() => {
                                updatePosition.mutate(
                                  { id: p.id, name: editingPos.name },
                                  { onSuccess: () => setEditingPos(null) }
                                );
                              }}
                              className="text-sm text-green-600 hover:text-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingPos(null)}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingPos(p)}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this position?')) {
                                  deletePosition.mutate(p.id);
                                }
                              }}
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
