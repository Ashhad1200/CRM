import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useWarehouse, useUpdateWarehouse } from '../api';
import type { WarehouseStatus, Address } from '../api';

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: warehouse, isLoading, isError, error } = useWarehouse(id ?? '');
  const updateWarehouse = useUpdateWarehouse();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<WarehouseStatus>('ACTIVE');
  const [isDefault, setIsDefault] = useState(false);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    if (warehouse) {
      setName(warehouse.name);
      setCode(warehouse.code);
      setStatus(warehouse.status);
      setIsDefault(warehouse.isDefault);
      const addr = warehouse.address as Address;
      setStreet(addr?.street ?? '');
      setCity(addr?.city ?? '');
      setState(addr?.state ?? '');
      setPostalCode(addr?.postalCode ?? '');
      setCountry(addr?.country ?? '');
    }
  }, [warehouse]);

  if (!id) return <p className="p-6 text-gray-400">Warehouse not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!warehouse) return <p className="p-6 text-gray-400">Warehouse not found.</p>;

  const handleSave = () => {
    updateWarehouse.mutate({
      id,
      name,
      code,
      status,
      isDefault,
      address: { street, city, state, postalCode, country },
    });
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/warehouse/warehouses')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Warehouses
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{warehouse.name}</h1>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
            warehouse.status === 'ACTIVE'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {warehouse.status}
        </span>
      </div>

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
                Code
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WarehouseStatus)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Default warehouse
              </label>
            </div>
          </div>

          <h3 className="pt-2 text-sm font-semibold text-gray-900">Address</h3>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Street
            </label>
            <input
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Postal Code
              </label>
              <input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Country
            </label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={updateWarehouse.isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updateWarehouse.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>

          {updateWarehouse.isError && (
            <p className="text-sm text-red-600">{updateWarehouse.error.message}</p>
          )}
          {updateWarehouse.isSuccess && (
            <p className="text-sm text-green-600">Warehouse updated.</p>
          )}
        </div>
      </div>
    </div>
  );
}
