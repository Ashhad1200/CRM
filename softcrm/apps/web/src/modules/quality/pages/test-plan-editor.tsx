import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTestPlan, useCreateTestPlan, useUpdateTestPlan } from '../api';
import type { TestPlanStep } from '../api';

function generateId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function TestPlanEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const { data: existingPlan, isLoading } = useTestPlan(id ?? '');
  const createTestPlan = useCreateTestPlan();
  const updateTestPlan = useUpdateTestPlan();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<TestPlanStep[]>([]);

  useEffect(() => {
    if (existingPlan) {
      setName(existingPlan.name);
      setDescription(existingPlan.description ?? '');
      setProductId(existingPlan.productId ?? '');
      setIsActive(existingPlan.isActive);
      setSteps(existingPlan.steps);
    }
  }, [existingPlan]);

  const addStep = () => {
    const newStep: TestPlanStep = {
      id: generateId(),
      description: '',
      expectedResult: '',
      order: steps.length,
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (index: number, updates: Partial<TestPlanStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index]!, ...updates } as TestPlanStep;
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex]!, newSteps[index]!];
    setSteps(newSteps.map((step, i) => ({ ...step, order: i })));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      description: description || undefined,
      productId: productId || undefined,
      isActive,
      steps: steps.map((step, index) => ({ ...step, order: index })),
    };

    if (isNew) {
      createTestPlan.mutate(payload, {
        onSuccess: () => navigate('/quality/test-plans'),
      });
    } else {
      updateTestPlan.mutate(
        { id: id!, ...payload },
        { onSuccess: () => navigate('/quality/test-plans') },
      );
    }
  };

  const isPending = createTestPlan.isPending || updateTestPlan.isPending;
  const mutationError = createTestPlan.error ?? updateTestPlan.error;

  if (!isNew && isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/quality/test-plans')}
          className="mb-2 text-sm text-blue-600 hover:underline"
        >
          Back to Test Plans
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? 'New Test Plan' : 'Edit Test Plan'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Basic Information</h2>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Plan Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="e.g., Widget Assembly Test"
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Product ID
              </label>
              <input
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Optional product reference"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Optional description..."
            />
          </div>
        </div>

        {/* Test Steps */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Test Steps</h2>
            <button
              type="button"
              onClick={addStep}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Step
            </button>
          </div>

          {steps.length === 0 ? (
            <p className="py-8 text-center text-gray-400">
              No steps yet. Click "Add Step" to define test procedures.
            </p>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Step {index + 1}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveStep(index, 'up')}
                        disabled={index === 0}
                        className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 disabled:opacity-30"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(index, 'down')}
                        disabled={index === steps.length - 1}
                        className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 disabled:opacity-30"
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Description *
                    </label>
                    <textarea
                      value={step.description}
                      onChange={(e) => updateStep(index, { description: e.target.value })}
                      required
                      rows={2}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="What action should be performed..."
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Expected Result *
                    </label>
                    <textarea
                      value={step.expectedResult}
                      onChange={(e) => updateStep(index, { expectedResult: e.target.value })}
                      required
                      rows={2}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="What result indicates success..."
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/quality/test-plans')}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isNew ? 'Create Test Plan' : 'Save Changes'}
          </button>
        </div>

        {mutationError && (
          <p className="text-sm text-red-600">{mutationError.message}</p>
        )}
      </form>
    </div>
  );
}
