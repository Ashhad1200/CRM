import { useState } from 'react';
import { useParams } from 'react-router';
import { useProject, useProjectProgress, useMilestones, type Milestone } from '../api.js';

export default function PortalProjectPage() {
  const { id = '' } = useParams();
  const { data: projectData, isLoading } = useProject(id);
  const project = projectData?.data;
  const { data: progressData } = useProjectProgress(id);
  const progress = progressData?.data;
  const { data: msData } = useMilestones(id);
  const milestones = msData?.data ?? [];

  if (isLoading) return <div className="p-6 text-gray-400">Loading…</div>;
  if (!project) return <div className="p-6 text-red-600">Project not found.</div>;

  const pct = progress?.percentComplete ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Project status: {project.status.replace(/_/g, ' ')}</p>
      </div>

      {/* Progress */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Overall Progress</h2>
        <div className="mb-2 text-3xl font-bold text-blue-600">{pct}%</div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        {progress && (
          <p className="mt-2 text-sm text-gray-500">{progress.completedTasks} of {progress.totalTasks} tasks completed</p>
        )}
      </div>

      {/* Milestones */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Milestones</h2>
        {milestones.length === 0 && <p className="text-sm text-gray-400">No milestones defined.</p>}
        <div className="space-y-3">
          {milestones.map((m: Milestone) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div>
                <span className="font-medium text-gray-900">{m.name}</span>
                {m.dueDate && <span className="ml-2 text-sm text-gray-500">Due {new Date(m.dueDate).toLocaleDateString()}</span>}
              </div>
              {m.completedAt ? (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">✓ Done</span>
              ) : (
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">Pending</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Timeline</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Start Date</span>
            <div className="font-medium text-gray-900">{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}</div>
          </div>
          <div>
            <span className="text-gray-500">End Date</span>
            <div className="font-medium text-gray-900">{project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
