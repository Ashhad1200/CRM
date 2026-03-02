import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useShipment, useDispatchShipment, useUpdateShipmentStatus } from '../api';
import type { ShipmentStatus, Address } from '../api';

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  SHIPPED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-yellow-100 text-yellow-700',
  DELIVERED: 'bg-green-100 text-green-700',
  RETURNED: 'bg-red-100 text-red-700',
};

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: shipment, isLoading, isError, error } = useShipment(id ?? '');

  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [showDispatch, setShowDispatch] = useState(false);

  const dispatchShipment = useDispatchShipment();
  const updateStatus = useUpdateShipmentStatus();

  if (!id) return <p className="p-6 text-gray-400">Shipment not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!shipment) return <p className="p-6 text-gray-400">Shipment not found.</p>;

  const handleDispatch = () => {
    dispatchShipment.mutate(
      { id, carrier: carrier || undefined, trackingNumber: trackingNumber || undefined },
      {
        onSuccess: () => {
          setShowDispatch(false);
          setCarrier('');
          setTrackingNumber('');
        },
      },
    );
  };

  const handleStatusUpdate = (status: ShipmentStatus) => {
    updateStatus.mutate({ id, status });
  };

  const address = shipment.recipientAddress as Address;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/warehouse/shipments')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Shipments
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Shipment #{shipment.id.slice(-8)}
        </h1>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
            STATUS_COLORS[shipment.status]
          }`}
        >
          {shipment.status.replace('_', ' ')}
        </span>
      </div>

      {/* Details */}
      <div className="mb-6 rounded border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Shipment Details
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Warehouse:</dt>
                <dd className="font-medium text-gray-900">
                  {shipment.warehouse?.name ?? '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Carrier:</dt>
                <dd className="font-medium text-gray-900">{shipment.carrier ?? '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Tracking Number:</dt>
                <dd className="font-medium text-gray-900">
                  {shipment.trackingNumber ?? '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Weight:</dt>
                <dd className="font-medium text-gray-900">
                  {shipment.weight ? `${shipment.weight} kg` : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Shipped At:</dt>
                <dd className="font-medium text-gray-900">
                  {shipment.shippedAt
                    ? new Date(shipment.shippedAt).toLocaleString()
                    : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Est. Delivery:</dt>
                <dd className="font-medium text-gray-900">
                  {shipment.estimatedDelivery
                    ? new Date(shipment.estimatedDelivery).toLocaleDateString()
                    : '-'}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Recipient
            </h2>
            <div className="text-sm">
              <p className="font-medium text-gray-900">{shipment.recipientName}</p>
              {address && (
                <div className="mt-1 text-gray-600">
                  {address.street && <p>{address.street}</p>}
                  <p>
                    {[address.city, address.state, address.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {address.country && <p>{address.country}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-2 border-t border-gray-200 pt-4">
          {shipment.status === 'PENDING' && (
            <button
              onClick={() => setShowDispatch(true)}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Dispatch
            </button>
          )}
          {shipment.status === 'SHIPPED' && (
            <button
              onClick={() => handleStatusUpdate('IN_TRANSIT')}
              disabled={updateStatus.isPending}
              className="rounded bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              Mark In Transit
            </button>
          )}
          {shipment.status === 'IN_TRANSIT' && (
            <>
              <button
                onClick={() => handleStatusUpdate('DELIVERED')}
                disabled={updateStatus.isPending}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Mark Delivered
              </button>
              <button
                onClick={() => handleStatusUpdate('RETURNED')}
                disabled={updateStatus.isPending}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Mark Returned
              </button>
            </>
          )}
        </div>

        {/* Dispatch form */}
        {showDispatch && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h3 className="mb-3 font-medium text-gray-900">Dispatch Shipment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Carrier
                </label>
                <input
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="e.g. FedEx, UPS, DHL"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tracking Number
                </label>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleDispatch}
                disabled={dispatchShipment.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {dispatchShipment.isPending ? 'Dispatching...' : 'Confirm Dispatch'}
              </button>
              <button
                onClick={() => setShowDispatch(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error messages */}
        {(dispatchShipment.isError || updateStatus.isError) && (
          <p className="mt-2 text-sm text-red-600">
            {dispatchShipment.error?.message || updateStatus.error?.message}
          </p>
        )}
      </div>

      {/* Pick List reference */}
      {shipment.pickListId && (
        <div className="rounded border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Associated Pick List
          </h2>
          <button
            onClick={() => navigate(`/warehouse/pick-lists/${shipment.pickListId}`)}
            className="text-blue-600 hover:underline"
          >
            View Pick List #{shipment.pickListId.slice(-8)}
          </button>
        </div>
      )}
    </div>
  );
}
