import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useShipments, useWarehouses, useCreateShipment } from '../api';
import type { WHShipment, ShipmentStatus } from '../api';

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  SHIPPED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-yellow-100 text-yellow-700',
  DELIVERED: 'bg-green-100 text-green-700',
  RETURNED: 'bg-red-100 text-red-700',
};

function CreateShipmentDialog({ onClose }: { onClose: () => void }) {
  const { data: warehousesData } = useWarehouses();
  const [warehouseId, setWarehouseId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  const createShipment = useCreateShipment();
  const warehouses = warehousesData?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createShipment.mutate(
      {
        warehouseId,
        recipientName,
        recipientAddress: { street, city, state, postalCode, country },
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          New Shipment
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Warehouse
        </label>
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select warehouse...</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.code})
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Recipient Name
        </label>
        <input
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          Shipping Address
        </h3>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Street
        </label>
        <input
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
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
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
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
        </div>

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
            disabled={createShipment.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createShipment.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createShipment.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createShipment.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function ShipmentsListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);

  const filters: Record<string, string> = {};
  if (statusFilter) filters['status'] = statusFilter;

  const { data, isLoading, isError, error } = useShipments(filters);

  const shipments: WHShipment[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Shipment
        </button>
      </div>

      {showCreate && (
        <CreateShipmentDialog onClose={() => setShowCreate(false)} />
      )}

      <div className="mb-4 flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SHIPPED">Shipped</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="DELIVERED">Delivered</option>
          <option value="RETURNED">Returned</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Recipient</th>
              <th className="px-3 py-3">Carrier</th>
              <th className="px-3 py-3">Tracking</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Shipped</th>
              <th className="px-3 py-3">Est. Delivery</th>
            </tr>
          </thead>
          <tbody>
            {shipments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No shipments found.
                </td>
              </tr>
            ) : (
              shipments.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/warehouse/shipments/${s.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {s.id.slice(-8)}
                  </td>
                  <td className="px-3 py-3 text-gray-900">{s.recipientName}</td>
                  <td className="px-3 py-3 text-gray-600">{s.carrier ?? '-'}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {s.trackingNumber ?? '-'}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[s.status]
                      }`}
                    >
                      {s.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {s.shippedAt
                      ? new Date(s.shippedAt).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {s.estimatedDelivery
                      ? new Date(s.estimatedDelivery).toLocaleDateString()
                      : '-'}
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
