import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useSupplier, useUpdateSupplier, useSupplierProducts } from '../api';
import type { SupplierStatus } from '../api';

const STATUS_COLORS: Record<SupplierStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
  BLACKLISTED: 'bg-red-100 text-red-700',
};

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: supplier, isLoading, isError, error } = useSupplier(id ?? '');
  const { data: productsData } = useSupplierProducts(id ?? '');
  const updateSupplier = useUpdateSupplier();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [status, setStatus] = useState<SupplierStatus>('ACTIVE');

  useEffect(() => {
    if (supplier) {
      setName(supplier.name);
      setCode(supplier.code);
      setContactName(supplier.contactName ?? '');
      setEmail(supplier.email ?? '');
      setPhone(supplier.phone ?? '');
      setWebsite(supplier.website ?? '');
      setPaymentTerms(supplier.paymentTerms ?? '');
      setStatus(supplier.status);
    }
  }, [supplier]);

  if (!id) return <p className="p-6 text-gray-400">Vendor not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!supplier) return <p className="p-6 text-gray-400">Vendor not found.</p>;

  const handleSave = () => {
    updateSupplier.mutate({
      id,
      version: supplier.version,
      name,
      code,
      contactName: contactName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      website: website || undefined,
      paymentTerms: paymentTerms || undefined,
      status,
    });
  };

  const products = productsData?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/procurement/vendors')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Vendors
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
        <span className="font-mono text-sm text-gray-500">{supplier.code}</span>
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[supplier.status]}`}
        >
          {supplier.status}
        </span>
      </div>

      {/* Form */}
      <div className="rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Vendor Details</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                Code
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Contact Name
              </label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Website
              </label>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Payment Terms
              </label>
              <input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SupplierStatus)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLACKLISTED">Blacklisted</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={updateSupplier.isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updateSupplier.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>

          {updateSupplier.isError && (
            <p className="text-sm text-red-600">{updateSupplier.error.message}</p>
          )}
          {updateSupplier.isSuccess && (
            <p className="text-sm text-green-600">Vendor updated.</p>
          )}
        </div>
      </div>

      {/* Supplier Products */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Products from this Vendor
        </h2>
        {products.length === 0 ? (
          <p className="text-gray-400">No products linked to this vendor.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-3">Product ID</th>
                <th className="px-3 py-3">Supplier SKU</th>
                <th className="px-3 py-3">Unit Price</th>
                <th className="px-3 py-3">Min Order Qty</th>
                <th className="px-3 py-3">Lead Time</th>
                <th className="px-3 py-3">Preferred</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="px-3 py-3 font-mono text-sm text-gray-600">
                    {p.productId.slice(0, 8)}...
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {p.supplierSku ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-900">
                    ${parseFloat(p.unitPrice).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {parseFloat(p.minOrderQty).toFixed(0)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {p.leadTimeDays} days
                  </td>
                  <td className="px-3 py-3">
                    {p.isPreferred ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
