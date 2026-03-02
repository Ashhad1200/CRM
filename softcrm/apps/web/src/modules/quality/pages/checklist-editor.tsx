import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useChecklist,
  useCreateChecklist,
  useUpdateChecklist,
} from '../api';
import type { ChecklistItem, InspectionType, ChecklistItemType } from '../api';

const TYPE_LABELS: Record<InspectionType, string> = {
  INCOMING: 'Incoming',
  IN_PROCESS: 'In-Process',
  FINAL: 'Final',
  SUPPLIER: 'Supplier',
};

const ITEM_TYPE_LABELS: Record<ChecklistItemType, string> = {
  PASS_FAIL: 'Pass/Fail',
  NUMERIC: 'Numeric',
  TEXT: 'Text',
};

function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ChecklistEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const { data: existingChecklist, isLoading } = useChecklist(id ?? '');
  const createChecklist = useCreateChecklist();
  const updateChecklist = useUpdateChecklist();

  const [name, setName] = useState('');
  const [type, setType] = useState<InspectionType>('INCOMING');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (existingChecklist) {
      setName(existingChecklist.name);
      setType(existingChecklist.type);
      setDescription(existingChecklist.description ?? '');
      setIsActive(existingChecklist.isActive);
      setItems(existingChecklist.checklistItems);
    }
  }, [existingChecklist]);

  const addItem = () => {
    const newItem: ChecklistItem = {
      id: generateId(),
      question: '',
      type: 'PASS_FAIL',
      required: true,
      order: items.length,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, updates: Partial<ChecklistItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index]!, ...updates } as ChecklistItem;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex]!, newItems[index]!];
    setItems(newItems.map((item, i) => ({ ...item, order: i })));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      type,
      description: description || undefined,
      isActive,
      checklistItems: items.map((item, index) => ({ ...item, order: index })),
    };

    if (isNew) {
      createChecklist.mutate(payload, {
        onSuccess: () => navigate('/quality/checklists'),
      });
    } else {
      updateChecklist.mutate(
        { id: id!, ...payload },
        { onSuccess: () => navigate('/quality/checklists') },
      );
    }
  };

  const isPending = createChecklist.isPending || updateChecklist.isPending;
  const mutationError = createChecklist.error ?? updateChecklist.error;

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
          onClick={() => navigate('/quality/checklists')}
          className="mb-2 text-sm text-blue-600 hover:underline"
        >
          Back to Templates
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? 'New Checklist Template' : 'Edit Checklist Template'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Basic Information</h2>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Template Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="e.g., Incoming Material Inspection"
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Inspection Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as InspectionType)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
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
              placeholder="Optional description of this template..."
            />
          </div>
        </div>

        {/* Checklist Items */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Checklist Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Item
            </button>
          </div>

          {items.length === 0 ? (
            <p className="py-8 text-center text-gray-400">
              No items yet. Click "Add Item" to create checklist questions.
            </p>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      Item {index + 1}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 disabled:opacity-30"
                      >
                        <span className="text-sm">Arrow Up</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === items.length - 1}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 disabled:opacity-30"
                      >
                        <span className="text-sm">Arrow Down</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="rounded p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
                      >
                        <span className="text-sm">Remove</span>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Question *
                    </label>
                    <input
                      value={item.question}
                      onChange={(e) => updateItem(index, { question: e.target.value })}
                      required
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="e.g., Is the material free of visible defects?"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Type
                      </label>
                      <select
                        value={item.type}
                        onChange={(e) =>
                          updateItem(index, { type: e.target.value as ChecklistItemType })
                        }
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        {Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.required}
                          onChange={(e) => updateItem(index, { required: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm text-gray-700">Required</span>
                      </label>
                    </div>
                  </div>

                  {item.type === 'NUMERIC' && (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Min Value
                        </label>
                        <input
                          type="number"
                          value={item.minValue ?? ''}
                          onChange={(e) =>
                            updateItem(index, {
                              minValue: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Max Value
                        </label>
                        <input
                          type="number"
                          value={item.maxValue ?? ''}
                          onChange={(e) =>
                            updateItem(index, {
                              maxValue: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Unit
                        </label>
                        <input
                          value={item.unit ?? ''}
                          onChange={(e) =>
                            updateItem(index, { unit: e.target.value || undefined })
                          }
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="e.g., mm, kg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/quality/checklists')}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isNew ? 'Create Template' : 'Save Changes'}
          </button>
        </div>

        {mutationError && (
          <p className="text-sm text-red-600">{mutationError.message}</p>
        )}
      </form>
    </div>
  );
}
