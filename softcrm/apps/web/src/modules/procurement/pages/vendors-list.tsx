import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSuppliers, useCreateSupplier } from '../api';
import type { Supplier, SupplierStatus } from '../api';

const STATUS_COLORS: Record<SupplierStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
  BLACKLISTED: 'bg-red-100 text-red-700',
};

function CreateVendorDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const createSupplier = useCreateSupplier();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSupplier.mutate(
      {
        name,
        code,
        contactName: contactName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        paymentTerms: paymentTerms || undefined,
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
        <h2 className="mb-4 text-lg font-semibold text-gray-900">New Vendor</h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Vendor Name *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Vendor Code *
        </label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          placeholder="e.g. SUP-001"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Contact Name
        </label>
        <input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Phone
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Payment Terms
        </label>
        <input
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          placeholder="e.g. Net 30"
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

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
            disabled={createSupplier.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createSupplier.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createSupplier.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createSupplier.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function VendorsListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading, isError, error } = useSuppliers(
    statusFilter ? { status: statusFilter } : undefined
  );
  const [showCreate, setShowCreate] = useState(false);

  const suppliers: Supplier[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLACKLISTED">Blacklisted</option>
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Vendor
          </button>
        </div>
      </div>

      {showCreate && <CreateVendorDialog onClose={() => setShowCreate(false)} />}

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Code</th>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Contact</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Rating</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No vendors found.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/procurement/vendors/${s.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-mono text-sm text-gray-600">
                    {s.code}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {s.name}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {s.contactName ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {s.email ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {s.phone ?? '-'}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status]}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {s.rating ? `${parseFloat(s.rating).toFixed(1)}/5` : '-'}
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
