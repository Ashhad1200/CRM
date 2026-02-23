import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useProducts, useCreateProduct } from '../api.js';
import type { Product } from '../api.js';

const TAX_CLASSES = ['STANDARD', 'REDUCED', 'ZERO', 'EXEMPT'] as const;

function CreateProductDialog({ onClose }: { onClose: () => void }) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [cost, setCost] = useState('');
  const [taxClass, setTaxClass] = useState('STANDARD');
  const createProduct = useCreateProduct();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct.mutate(
      {
        sku,
        name,
        description: description || undefined,
        unitPrice,
        cost,
        taxClass,
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
          New Product
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          SKU
        </label>
        <input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Unit Price
        </label>
        <input
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          required
          placeholder="0.00"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Cost
        </label>
        <input
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          required
          placeholder="0.00"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Tax Class
        </label>
        <select
          value={taxClass}
          onChange={(e) => setTaxClass(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {TAX_CLASSES.map((tc) => (
            <option key={tc} value={tc}>
              {tc}
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
            disabled={createProduct.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createProduct.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>

        {createProduct.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createProduct.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function ProductListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useProducts();
  const [showCreate, setShowCreate] = useState(false);

  const products: Product[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Product
        </button>
      </div>

      {showCreate && (
        <CreateProductDialog onClose={() => setShowCreate(false)} />
      )}

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Unit Price</th>
              <th className="px-3 py-3">Cost</th>
              <th className="px-3 py-3">Tax Class</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/inventory/products/${p.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-mono text-xs text-gray-700">
                    {p.sku}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {p.name}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    ${Number(p.unitPrice).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    ${Number(p.cost).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{p.taxClass}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        p.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
