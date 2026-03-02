import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useRouting,
  useRoutingSteps,
  useUpdateRouting,
  useCreateRoutingStep,
  useUpdateRoutingStep,
  useDeleteRoutingStep,
  useWorkCenters,
  type RoutingStep,
} from '../api';

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

interface StepFormData {
  workCenterId: string;
  name: string;
  sequence: string;
  standardHours: string;
  setupHours: string;
  description: string;
}

function RoutingStepRow({
  step,
  routingId,
  onUpdate,
}: {
  step: RoutingStep;
  routingId: string;
  onUpdate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<StepFormData>({
    workCenterId: step.workCenterId,
    name: step.name,
    sequence: String(step.sequence),
    standardHours: step.standardHours,
    setupHours: step.setupHours,
    description: step.description ?? '',
  });
  const { data: workCentersData } = useWorkCenters();
  const updateStep = useUpdateRoutingStep();
  const deleteStep = useDeleteRoutingStep();

  const workCenters = workCentersData?.data ?? [];

  const handleSave = () => {
    updateStep.mutate(
      {
        routingId,
        stepId: step.id,
        ...formData,
        sequence: parseInt(formData.sequence, 10),
        standardHours: parseFloat(formData.standardHours),
        setupHours: parseFloat(formData.setupHours),
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          onUpdate();
        },
      }
    );
  };

  const handleDelete = () => {
    if (confirm('Delete this routing step?')) {
      deleteStep.mutate(
        { routingId, stepId: step.id },
        { onSuccess: onUpdate }
      );
    }
  };

  if (isEditing) {
    return (
      <tr className="border-b border-gray-100 bg-blue-50">
        <td className="px-3 py-2">
          <input
            type="number"
            min="1"
            value={formData.sequence}
            onChange={(e) =>
              setFormData({ ...formData, sequence: e.target.value })
            }
            className="w-16 rounded border px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={formData.workCenterId}
            onChange={(e) =>
              setFormData({ ...formData, workCenterId: e.target.value })
            }
            className="w-full rounded border px-2 py-1 text-sm"
          >
            {workCenters.map((wc) => (
              <option key={wc.id} value={wc.id}>
                {wc.name}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            step="0.01"
            value={formData.setupHours}
            onChange={(e) =>
              setFormData({ ...formData, setupHours: e.target.value })
            }
            className="w-20 rounded border px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            step="0.01"
            value={formData.standardHours}
            onChange={(e) =>
              setFormData({ ...formData, standardHours: e.target.value })
            }
            className="w-20 rounded border px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">-</td>
        <td className="px-3 py-2">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={updateStep.isPending}
              className="text-green-600 hover:text-green-800 text-xs"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-gray-600 hover:text-gray-800 text-xs"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  const totalHours =
    parseFloat(step.setupHours) + parseFloat(step.standardHours);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-3">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-700">
          {step.sequence}
        </span>
      </td>
      <td className="px-3 py-3 font-medium text-gray-900">{step.name}</td>
      <td className="px-3 py-3 text-gray-600">
        {step.workCenter?.name ?? step.workCenterId.slice(0, 8)}
      </td>
      <td className="px-3 py-3 text-gray-600">
        {parseFloat(step.setupHours).toFixed(2)}h
      </td>
      <td className="px-3 py-3 text-gray-600">
        {parseFloat(step.standardHours).toFixed(2)}h
      </td>
      <td className="px-3 py-3 font-medium text-gray-900">
        {totalHours.toFixed(2)}h
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-800 text-xs"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteStep.isPending}
            className="text-red-600 hover:text-red-800 text-xs"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddRoutingStepForm({
  routingId,
  nextSequence,
  onSuccess,
}: {
  routingId: string;
  nextSequence: number;
  onSuccess: () => void;
}) {
  const [show, setShow] = useState(false);
  const { data: workCentersData } = useWorkCenters();
  const [formData, setFormData] = useState<StepFormData>({
    workCenterId: '',
    name: '',
    sequence: String(nextSequence),
    standardHours: '1',
    setupHours: '0.25',
    description: '',
  });
  const createStep = useCreateRoutingStep();

  const workCenters = workCentersData?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createStep.mutate(
      {
        routingId,
        ...formData,
        sequence: parseInt(formData.sequence, 10),
        standardHours: parseFloat(formData.standardHours),
        setupHours: parseFloat(formData.setupHours),
        description: formData.description || undefined,
      },
      {
        onSuccess: () => {
          setShow(false);
          setFormData({
            workCenterId: '',
            name: '',
            sequence: String(nextSequence + 1),
            standardHours: '1',
            setupHours: '0.25',
            description: '',
          });
          onSuccess();
        },
      }
    );
  };

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="mt-4 rounded bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200"
      >
        Add Step
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded border bg-gray-50 p-4"
    >
      <h4 className="mb-3 font-medium text-gray-900">Add Routing Step</h4>
      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Sequence #
          </label>
          <input
            type="number"
            min="1"
            value={formData.sequence}
            onChange={(e) =>
              setFormData({ ...formData, sequence: e.target.value })
            }
            required
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Step Name
          </label>
          <input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Assembly, Inspection"
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Work Center
          </label>
          <select
            value={formData.workCenterId}
            onChange={(e) =>
              setFormData({ ...formData, workCenterId: e.target.value })
            }
            required
            className="w-full rounded border px-2 py-1 text-sm"
          >
            <option value="">Select...</option>
            {workCenters.map((wc) => (
              <option key={wc.id} value={wc.id}>
                {wc.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Setup Hours
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.setupHours}
            onChange={(e) =>
              setFormData({ ...formData, setupHours: e.target.value })
            }
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Standard Hours
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.standardHours}
            onChange={(e) =>
              setFormData({ ...formData, standardHours: e.target.value })
            }
            required
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Description
          </label>
          <input
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShow(false)}
          className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createStep.isPending}
          className="rounded bg-green-600 px-4 py-1 text-sm text-white hover:bg-green-700"
        >
          {createStep.isPending ? 'Adding...' : 'Add'}
        </button>
      </div>
    </form>
  );
}

export default function RoutingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: routing,
    isLoading,
    isError,
    error,
    refetch,
  } = useRouting(id!);
  const { data: stepsData, refetch: refetchSteps } = useRoutingSteps(id!);
  const updateRouting = useUpdateRouting();

  const steps: RoutingStep[] = stepsData?.data ?? [];
  const sortedSteps = [...steps].sort((a, b) => a.sequence - b.sequence);
  const nextSequence = sortedSteps.length > 0
    ? sortedSteps[sortedSteps.length - 1]!.sequence + 1
    : 1;

  const handleToggleActive = () => {
    if (routing) {
      updateRouting.mutate(
        { id: routing.id, isActive: !routing.isActive },
        { onSuccess: () => refetch() }
      );
    }
  };

  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!routing) return <p className="p-6 text-gray-500">Routing not found.</p>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <button
        onClick={() => navigate('/manufacturing/routings')}
        className="mb-4 text-sm text-blue-600 hover:underline"
      >
        &larr; Back to Routings
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{routing.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Version {routing.routingVersion} | Product:{' '}
            {routing.productId.slice(0, 8)}...
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ActiveBadge isActive={routing.isActive} />
          <button
            onClick={handleToggleActive}
            disabled={updateRouting.isPending}
            className={`rounded px-3 py-1 text-sm font-medium ${
              routing.isActive
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {routing.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">
            Total Hours
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {parseFloat(routing.totalHours).toFixed(2)}h
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Steps</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{steps.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">
            Last Updated
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {new Date(routing.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Routing Steps */}
      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Process Steps
        </h3>

        {sortedSteps.length === 0 ? (
          <p className="text-sm text-gray-500">
            No steps defined for this routing yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-2">Seq</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Work Center</th>
                <th className="px-3 py-2">Setup</th>
                <th className="px-3 py-2">Standard</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedSteps.map((step) => (
                <RoutingStepRow
                  key={step.id}
                  step={step}
                  routingId={id!}
                  onUpdate={() => {
                    void refetch();
                    void refetchSteps();
                  }}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-semibold">
                <td colSpan={5} className="px-3 py-3 text-right">
                  Total:
                </td>
                <td className="px-3 py-3">
                  {parseFloat(routing.totalHours).toFixed(2)}h
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}

        <AddRoutingStepForm
          routingId={id!}
          nextSequence={nextSequence}
          onSuccess={() => {
            void refetch();
            void refetchSteps();
          }}
        />
      </div>
    </div>
  );
}
