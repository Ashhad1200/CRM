import { useState } from 'react';
import { GlassCard, Badge } from '@softcrm/ui';
import { useSerials, useRegisterSerial } from '../api-enhanced';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'outline'> = {
  AVAILABLE: 'success',
  RESERVED: 'warning',
  QUARANTINE: 'danger',
  EXPIRED: 'outline',
};

export default function SerialTrackingPage() {
  const [filterProduct, setFilterProduct] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const { data: serials = [], isLoading, isError, error } = useSerials(
    filterProduct || undefined,
    filterWarehouse || undefined,
  );

  const [showForm, setShowForm] = useState(false);
  const [productId, setProductId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const register = useRegisterSerial();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(
      {
        productId,
        serialNumber,
        warehouseId,
        locationId: locationId || undefined,
      },
      {
        onSuccess: () => {
          setProductId('');
          setSerialNumber('');
          setWarehouseId('');
          setLocationId('');
          setShowForm(false);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Serial Tracking</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track serial numbers across warehouses and locations
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Register Serial
        </button>
      </div>

      {/* Register form */}
      {showForm && (
        <GlassCard tier="medium" padding="lg">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Register New Serial Number
          </h2>
          <form onSubmit={handleRegister} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Product ID *
              </label>
              <input
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Serial Number *
              </label>
              <input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Warehouse ID *
              </label>
              <input
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Location ID
              </label>
              <input
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={register.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {register.isPending ? 'Registering...' : 'Register'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              {register.isError && (
                <p className="text-sm text-red-600">{register.error.message}</p>
              )}
            </div>
          </form>
        </GlassCard>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <input
          placeholder="Filter by Product ID"
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <input
          placeholder="Filter by Warehouse ID"
          value={filterWarehouse}
          onChange={(e) => setFilterWarehouse(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {/* Serials Table */}
      <GlassCard tier="subtle" padding="none">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <th className="px-4 py-3">Serial Number</th>
              <th className="px-4 py-3">Product ID</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Shipped</th>
            </tr>
          </thead>
          <tbody>
            {serials.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No serial numbers found.
                </td>
              </tr>
            ) : (
              serials.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-gray-100 hover:bg-white/5 dark:border-gray-800"
                >
                  <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                    {s.serialNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {s.productId.slice(-8)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {s.warehouseId.slice(-8)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {s.locationId?.slice(-8) ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[s.status] ?? 'default'}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(s.receivedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {s.shippedAt ? new Date(s.shippedAt).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
