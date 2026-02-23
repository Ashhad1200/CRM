import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useProject,
  useTasks,
  useCreateTask,
  useMoveTask,
  useDeleteTask,
  useMilestones,
  useTimeEntries,
  useLogTime,
  useProjectProgress,
  useUpdateProject,
  type Task,
  type Milestone,
  type TimeEntry,
} from '../api.js';

const COLUMNS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
const COL_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  DONE: 'Done',
};
const COL_COLORS: Record<string, string> = {
  TODO: 'bg-gray-100',
  IN_PROGRESS: 'bg-blue-50',
  REVIEW: 'bg-yellow-50',
  DONE: 'bg-green-50',
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600',
};

type Tab = 'board' | 'milestones' | 'time' | 'settings';

export default function ProjectDetailPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('board');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [showLogTime, setShowLogTime] = useState(false);
  const [timeTaskId, setTimeTaskId] = useState('');
  const [timeHours, setTimeHours] = useState('');
  const [timeDate, setTimeDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [timeDesc, setTimeDesc] = useState('');

  const { data: projectData, isLoading } = useProject(id);
  const project = projectData?.data;
  const { data: tasksData } = useTasks(id);
  const tasks = tasksData?.data ?? [];
  const { data: milestonesData } = useMilestones(id);
  const milestones = milestonesData?.data ?? [];
  const { data: timeData } = useTimeEntries(id);
  const timeEntries = timeData?.data ?? [];
  const { data: progressData } = useProjectProgress(id);
  const progress = progressData?.data;

  const createTaskMut = useCreateTask(id);
  const moveTaskMut = useMoveTask(id);
  const deleteTaskMut = useDeleteTask(id);
  const logTimeMut = useLogTime(id);
  const updateProjectMut = useUpdateProject(id);

  function handleAddTask() {
    if (!newTitle.trim()) return;
    createTaskMut.mutate({ title: newTitle.trim(), priority: newPriority }, {
      onSuccess: () => { setShowAddTask(false); setNewTitle(''); },
    });
  }

  function handleMove(taskId: string, status: string) {
    moveTaskMut.mutate({ taskId, status });
  }

  function handleLogTime() {
    if (!timeTaskId || !timeHours) return;
    logTimeMut.mutate({ taskId: timeTaskId, hours: Number(timeHours), date: timeDate, description: timeDesc || undefined }, {
      onSuccess: () => { setShowLogTime(false); setTimeHours(''); setTimeDesc(''); },
    });
  }

  if (isLoading) return <div className="p-6 text-gray-400">Loading…</div>;
  if (!project) return <div className="p-6 text-red-600">Project not found.</div>;

  const pct = progress?.percentComplete ?? 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => nav('/projects')} className="mb-1 text-sm text-blue-600 hover:underline">← Projects</button>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <span className="text-sm text-gray-500">{project.status.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-48">
            <div className="mb-1 text-xs text-gray-500">{pct}% complete</div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['board', 'milestones', 'time', 'settings'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Board tab */}
      {tab === 'board' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setShowAddTask(true)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">+ Task</button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {COLUMNS.map((col) => {
              const colTasks = tasks.filter((t: Task) => t.status === col);
              return (
                <div key={col} className={`rounded-lg p-3 ${COL_COLORS[col] ?? 'bg-gray-50'}`}>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">{COL_LABELS[col] ?? col} ({colTasks.length})</h3>
                  <div className="space-y-2">
                    {colTasks.map((t: Task) => (
                      <div key={t.id} className="rounded-lg border bg-white p-3 shadow-sm">
                        <div className="mb-1 text-sm font-medium text-gray-900">{t.title}</div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className={`text-xs font-medium ${PRIORITY_COLORS[t.priority] ?? ''}`}>{t.priority}</span>
                          {t.dueDate && <span className="text-xs text-gray-400">{new Date(t.dueDate).toLocaleDateString()}</span>}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {COLUMNS.filter((c) => c !== col).map((target) => (
                            <button key={target} onClick={() => handleMove(t.id, target)} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200">
                              → {COL_LABELS[target] ?? target}
                            </button>
                          ))}
                          <button onClick={() => deleteTaskMut.mutate(t.id)} className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-600 hover:bg-red-100">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Add task modal */}
          {showAddTask && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h2 className="mb-4 text-lg font-semibold">Add Task</h2>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title" className="mb-3 w-full rounded-lg border px-3 py-2 text-sm" autoFocus />
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="mb-4 w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddTask(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
                  <button onClick={handleAddTask} disabled={createTaskMut.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                    {createTaskMut.isPending ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Milestones tab */}
      {tab === 'milestones' && (
        <div className="space-y-3">
          {milestones.length === 0 && <p className="text-sm text-gray-400">No milestones.</p>}
          {milestones.map((m: Milestone) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
              <div>
                <span className="font-medium text-gray-900">{m.name}</span>
                {m.dueDate && <span className="ml-3 text-sm text-gray-500">Due {new Date(m.dueDate).toLocaleDateString()}</span>}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${m.completedAt ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {m.completedAt ? '✓ Completed' : 'In Progress'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Time log tab */}
      {tab === 'time' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setShowLogTime(true)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">+ Log Time</button>
          </div>
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Billable</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {timeEntries.map((te: TimeEntry) => (
                  <tr key={te.id}>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(te.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{te.hours}h</td>
                    <td className="px-4 py-3 text-sm">{te.isBillable ? <span className="text-green-600">Yes</span> : <span className="text-gray-400">No</span>}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{te.description ?? '—'}</td>
                  </tr>
                ))}
                {timeEntries.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No time entries.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Log time modal */}
          {showLogTime && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h2 className="mb-4 text-lg font-semibold">Log Time</h2>
                <select value={timeTaskId} onChange={(e) => setTimeTaskId(e.target.value)} className="mb-3 w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="">Select task…</option>
                  {tasks.map((t: Task) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <input type="number" step="0.25" value={timeHours} onChange={(e) => setTimeHours(e.target.value)} placeholder="Hours" className="mb-3 w-full rounded-lg border px-3 py-2 text-sm" />
                <input type="date" value={timeDate} onChange={(e) => setTimeDate(e.target.value)} className="mb-3 w-full rounded-lg border px-3 py-2 text-sm" />
                <input value={timeDesc} onChange={(e) => setTimeDesc(e.target.value)} placeholder="Description (optional)" className="mb-4 w-full rounded-lg border px-3 py-2 text-sm" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowLogTime(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
                  <button onClick={handleLogTime} disabled={logTimeMut.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                    {logTimeMut.isPending ? 'Logging…' : 'Log'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings tab */}
      {tab === 'settings' && (
        <div className="max-w-md space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select value={project.status} onChange={(e) => updateProjectMut.mutate({ status: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
