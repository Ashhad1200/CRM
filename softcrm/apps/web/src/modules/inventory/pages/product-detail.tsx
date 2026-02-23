import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useProduct, useUpdateProduct } from '../api.js';

const TAX_CLASSES = ['STANDARD', 'REDUCED', 'ZERO', 'EXEMPT'] as const;

type Tab = 'details' | 'stock';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError, error } = useProduct(id ?? '');
  const updateProduct = useUpdateProduct(id ?? '');

  const [tab, setTab] = useState<Tab>('details');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [cost, setCost] = useState('');
  const [taxClass, setTaxClass] = useState('STANDARD');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? '');
      setUnitPrice(product.unitPrice);
      setCost(product.cost);
      setTaxClass(product.taxClass);
      setIsActive(product.isActive);
    }
  }, [product]);

  if (!id) return <p className="p-6 text-gray-400">Product not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading…</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!product) return <p className="p-6 text-gray-400">Product not found.</p>;

  const handleSave = () => {
    updateProduct.mutate({
      version: product.version,
      name,
      description: description || undefined,
      unitPrice,
      cost,
      taxClass,
      isActive,
    });
  };

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
          onClick={() => navigate('/inventory/products')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Products
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
            product.isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {product.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Sub-header info */}
      <div className="mb-6 flex gap-6 text-sm text-gray-600">
        <span>SKU: <span className="font-mono">{product.sku}</span></span>
        <span>Version: {product.version}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 bg-gray-50 px-2 pt-2">
        <button onClick={() => setTab('details')} className={tabClass('details')}>
          Details
        </button>
        <button onClick={() => setTab('stock')} className={tabClass('stock')}>
          Stock
        </button>
      </div>

      <div className="rounded-b border border-t-0 border-gray-200 bg-white p-4">
        {/* Details tab */}
        {tab === 'details' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                SKU (read-only)
              </label>
              <input
                value={product.sku}
                readOnly
                className="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
            </div>

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
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Unit Price
                </label>
                <input
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Cost
                </label>
                <input
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tax Class
                </label>
                <select
                  value={taxClass}
                  onChange={(e) => setTaxClass(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {TAX_CLASSES.map((tc) => (
                    <option key={tc} value={tc}>
                      {tc}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => navigate('/inventory/products')}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={updateProduct.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateProduct.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>

            {updateProduct.isError && (
              <p className="text-sm text-red-600">
                {updateProduct.error.message}
              </p>
            )}
            {updateProduct.isSuccess && (
              <p className="text-sm text-green-600">Product updated.</p>
            )}
          </div>
        )}

        {/* Stock tab */}
        {tab === 'stock' && (
          <p className="py-8 text-center text-gray-400">
            Stock levels per warehouse will appear here.
          </p>
        )}
      </div>
    </div>
  );
}
