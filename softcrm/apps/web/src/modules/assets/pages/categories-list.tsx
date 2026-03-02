import { useState } from 'react';
import {
  useAssetCategories,
  useCreateAssetCategory,
  useUpdateAssetCategory,
  useDeleteAssetCategory,
  type AssetCategory,
  type DepreciationMethod,
} from '../api';

function CategoryDialog({
  category,
  onClose,
}: {
  category?: AssetCategory;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [usefulLifeYears, setUsefulLifeYears] = useState(
    String(category?.usefulLifeYears ?? 5),
  );
  const [salvageValuePercent, setSalvageValuePercent] = useState(
    category?.salvageValuePercent ?? '10',
  );
  const [depreciationMethod, setDepreciationMethod] = useState<DepreciationMethod>(
    category?.depreciationMethod ?? 'STRAIGHT_LINE',
  );

  const createCategory = useCreateAssetCategory();
  const updateCategory = useUpdateAssetCategory();

  const isEditing = !!category;
  const mutation = isEditing ? updateCategory : createCategory;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      description: description || undefined,
      usefulLifeYears: parseInt(usefulLifeYears, 10),
      salvageValuePercent,
      depreciationMethod,
    };

    if (isEditing) {
      updateCategory.mutate({ id: category.id, ...payload }, { onSuccess: () => onClose() });
    } else {
      createCategory.mutate(payload, { onSuccess: () => onClose() });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {isEditing ? 'Edit Category' : 'New Category'}
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Useful Life (Years) *
            </label>
            <input
              type="number"
              value={usefulLifeYears}
              onChange={(e) => setUsefulLifeYears(e.target.value)}
              min="1"
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Salvage Value (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={salvageValuePercent}
              onChange={(e) => setSalvageValuePercent(e.target.value)}
              min="0"
              max="100"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Depreciation Method *
        </label>
        <select
          value={depreciationMethod}
          onChange={(e) => setDepreciationMethod(e.target.value as DepreciationMethod)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="STRAIGHT_LINE">Straight Line</option>
          <option value="DECLINING_BALANCE">Declining Balance</option>
          <option value="UNITS_OF_PRODUCTION">Units of Production</option>
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
            disabled={mutation.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </button>
        </div>

        {mutation.isError && (
          <p className="mt-2 text-sm text-red-600">{mutation.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function CategoriesListPage() {
  const { data, isLoading, isError, error } = useAssetCategories();
  const deleteCategory = useDeleteAssetCategory();
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategory | undefined>();

  const categories: AssetCategory[] = data?.data ?? [];

  const handleEdit = (cat: AssetCategory) => {
    setEditingCategory(cat);
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      deleteCategory.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingCategory(undefined);
  };

  const getMethodLabel = (method: DepreciationMethod) => {
    const labels: Record<DepreciationMethod, string> = {
      STRAIGHT_LINE: 'Straight Line',
      DECLINING_BALANCE: 'Declining Balance',
      UNITS_OF_PRODUCTION: 'Units of Production',
    };
    return labels[method];
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Asset Categories</h1>
        <button
          onClick={() => setShowDialog(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Category
        </button>
      </div>

      {showDialog && (
        <CategoryDialog category={editingCategory} onClose={handleCloseDialog} />
      )}

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <div className="grid gap-4">
          {categories.length === 0 ? (
            <p className="py-8 text-center text-gray-400">No categories found.</p>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{cat.name}</h3>
                    {cat.description && (
                      <p className="mt-1 text-sm text-gray-600">{cat.description}</p>
                    )}
                    <div className="mt-2 flex gap-4 text-sm text-gray-500">
                      <span>
                        <strong>Useful Life:</strong> {cat.usefulLifeYears} years
                      </span>
                      <span>
                        <strong>Salvage:</strong> {cat.salvageValuePercent}%
                      </span>
                      <span>
                        <strong>Method:</strong> {getMethodLabel(cat.depreciationMethod)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="rounded px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      disabled={deleteCategory.isPending}
                      className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
