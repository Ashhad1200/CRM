import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAccount, useUpdateAccount } from '../api';

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: account, isLoading, isError, error } = useAccount(id ?? '');
  const updateAccount = useUpdateAccount();

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [annualRevenue, setAnnualRevenue] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');

  useEffect(() => {
    if (account) {
      setName(account.name);
      setIndustry(account.industry ?? '');
      setSize(account.size ?? '');
      setWebsite(account.website ?? '');
      setPhone(account.phone ?? '');
      setAddress('');
      setAnnualRevenue('');
      setEmployeeCount('');
    }
  }, [account]);

  if (!id) return <p className="p-6 text-gray-400">Account not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading…</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!account) return <p className="p-6 text-gray-400">Account not found.</p>;

  const handleSave = () => {
    updateAccount.mutate({
      id,
      version: account.version,
      name,
      industry: industry || undefined,
      size: size || undefined,
      website: website || undefined,
      phone: phone || undefined,
      address: address || undefined,
      annualRevenue: annualRevenue || undefined,
      employeeCount: employeeCount ? Number(employeeCount) : undefined,
    });
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/sales/accounts')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Accounts
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
        {account.industry && (
          <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            {account.industry}
          </span>
        )}
      </div>

      {/* Form */}
      <div className="rounded border border-gray-200 bg-white p-4">
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
                Industry
              </label>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Size
              </label>
              <input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. SMALL, MEDIUM, ENTERPRISE"
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
                Address
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Annual Revenue
              </label>
              <input
                value={annualRevenue}
                onChange={(e) => setAnnualRevenue(e.target.value)}
                placeholder="e.g. 1000000"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Employee Count
              </label>
              <input
                type="number"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={updateAccount.isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updateAccount.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>

          {updateAccount.isError && (
            <p className="text-sm text-red-600">
              {updateAccount.error.message}
            </p>
          )}
          {updateAccount.isSuccess && (
            <p className="text-sm text-green-600">Account updated.</p>
          )}
        </div>
      </div>

      {/* Associated Contacts */}
      {account.contacts && account.contacts.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Associated Contacts
          </h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Job Title</th>
              </tr>
            </thead>
            <tbody>
              {account.contacts.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {c.emails[0] ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {c.phones[0] ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {c.jobTitle ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
