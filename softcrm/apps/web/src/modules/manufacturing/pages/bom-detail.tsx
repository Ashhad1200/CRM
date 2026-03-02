import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useBom,
  useBomLines,
  useUpdateBom,
  useCreateBomLine,
  useUpdateBomLine,
  useDeleteBomLine,
  type BomLine,
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

interface BomLineFormData {
  componentProductId: string;
  description: string;
  quantity: string;
  unit: string;
  unitCost: string;
}

function BomLineRow({
  line,
  bomId,
  onUpdate,
}: {
  line: BomLine;
  bomId: string;
  onUpdate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<BomLineFormData>({
    componentProductId: line.componentProductId,
    description: line.description ?? '',
    quantity: line.quantity,
    unit: line.unit,
    unitCost: line.unitCost,
  });
  const updateLine = useUpdateBomLine();
  const deleteLine = useDeleteBomLine();

  const handleSave = () => {
    updateLine.mutate(
      {
        bomId,
        lineId: line.id,
        ...formData,
        quantity: parseFloat(formData.quantity),
        unitCost: parseFloat(formData.unitCost),
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
    if (confirm('Delete this BOM line?')) {
      deleteLine.mutate({ bomId, lineId: line.id }, { onSuccess: onUpdate });
    }
  };

  if (isEditing) {
    return (
      <tr className="border-b border-gray-100 bg-blue-50">
        <td className="px-3 py-2">
          <input
            value={formData.componentProductId}
            onChange={(e) =>
              setFormData({ ...formData, componentProductId: e.target.value })
            }
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <input
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            step="0.0001"
            value={formData.quantity}
            onChange={(e) =>
              setFormData({ ...formData, quantity: e.target.value })
            }
            className="w-20 rounded border px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <input
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-16 rounded border px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            step="0.01"
            value={formData.unitCost}
            onChange={(e) =>
              setFormData({ ...formData, unitCost: e.target.value })
            }
            className="w-20 rounded border px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">-</td>
        <td className="px-3 py-2">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={updateLine.isPending}
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

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-3 text-gray-600">
        {line.componentProductId.slice(0, 8)}...
      </td>
      <td className="px-3 py-3 text-gray-900">{line.description ?? '-'}</td>
      <td className="px-3 py-3 text-gray-600">{line.quantity}</td>
      <td className="px-3 py-3 text-gray-600">{line.unit}</td>
      <td className="px-3 py-3 text-gray-600">
        ${parseFloat(line.unitCost).toFixed(4)}
      </td>
      <td className="px-3 py-3 font-medium text-gray-900">
        ${parseFloat(line.lineTotal).toFixed(4)}
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
            disabled={deleteLine.isPending}
            className="text-red-600 hover:text-red-800 text-xs"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddBomLineForm({
  bomId,
  onSuccess,
}: {
  bomId: string;
  onSuccess: () => void;
}) {
  const [show, setShow] = useState(false);
  const [formData, setFormData] = useState<BomLineFormData>({
    componentProductId: '',
    description: '',
    quantity: '1',
    unit: 'EA',
    unitCost: '0',
  });
  const createLine = useCreateBomLine();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLine.mutate(
      {
        bomId,
        ...formData,
        quantity: parseFloat(formData.quantity),
        unitCost: parseFloat(formData.unitCost),
      },
      {
        onSuccess: () => {
          setShow(false);
          setFormData({
            componentProductId: '',
            description: '',
            quantity: '1',
            unit: 'EA',
            unitCost: '0',
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
        Add Component
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded border bg-gray-50 p-4"
    >
      <h4 className="mb-3 font-medium text-gray-900">Add Component</h4>
      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Component Product ID
          </label>
          <input
            value={formData.componentProductId}
            onChange={(e) =>
              setFormData({ ...formData, componentProductId: e.target.value })
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
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Quantity
          </label>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={formData.quantity}
            onChange={(e) =>
              setFormData({ ...formData, quantity: e.target.value })
            }
            required
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Unit
          </label>
          <input
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            required
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Unit Cost
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.unitCost}
            onChange={(e) =>
              setFormData({ ...formData, unitCost: e.target.value })
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
          disabled={createLine.isPending}
          className="rounded bg-green-600 px-4 py-1 text-sm text-white hover:bg-green-700"
        >
          {createLine.isPending ? 'Adding...' : 'Add'}
        </button>
      </div>
    </form>
  );
}

export default function BomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: bom, isLoading, isError, error, refetch } = useBom(id!);
  const { data: linesData, refetch: refetchLines } = useBomLines(id!);
  const updateBom = useUpdateBom();

  const lines: BomLine[] = linesData?.data ?? [];

  const handleToggleActive = () => {
    if (bom) {
      updateBom.mutate(
        { id: bom.id, isActive: !bom.isActive },
        { onSuccess: () => refetch() }
      );
    }
  };

  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!bom) return <p className="p-6 text-gray-500">BOM not found.</p>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <button
        onClick={() => navigate('/manufacturing/boms')}
        className="mb-4 text-sm text-blue-600 hover:underline"
      >
        &larr; Back to BOMs
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{bom.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Version {bom.bomVersion} | Product: {bom.productId.slice(0, 8)}...
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ActiveBadge isActive={bom.isActive} />
          <button
            onClick={handleToggleActive}
            disabled={updateBom.isPending}
            className={`rounded px-3 py-1 text-sm font-medium ${
              bom.isActive
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {bom.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">
            Total Cost
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            ${parseFloat(bom.totalCost).toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">
            Components
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900">{lines.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">
            Last Updated
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {new Date(bom.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* BOM Lines / Tree View */}
      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Components</h3>

        {lines.length === 0 ? (
          <p className="text-sm text-gray-500">
            No components added to this BOM yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-2">Component</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Unit Cost</th>
                <th className="px-3 py-2">Line Total</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <BomLineRow
                  key={line.id}
                  line={line}
                  bomId={id!}
                  onUpdate={() => {
                    void refetch();
                    void refetchLines();
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
                  ${parseFloat(bom.totalCost).toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}

        <AddBomLineForm
          bomId={id!}
          onSuccess={() => {
            void refetch();
            void refetchLines();
          }}
        />
      </div>
    </div>
  );
}
