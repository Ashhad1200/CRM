import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useStockLot,
  useLocations,
  useMoveStock,
  useAdjustStock,
  useReserveStock,
  useReleaseStock,
} from '../api';
import type { StockLotStatus } from '../api';

const LOT_STATUS_COLORS: Record<StockLotStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  RESERVED: 'bg-yellow-100 text-yellow-700',
  QUARANTINE: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-600',
};

type ActionType = 'move' | 'adjust' | 'reserve' | 'release' | null;

export default function StockLotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lot, isLoading, isError, error } = useStockLot(id ?? '');
  const { data: locationsData } = useLocations();

  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const moveStock = useMoveStock();
  const adjustStock = useAdjustStock();
  const reserveStock = useReserveStock();
  const releaseStock = useReleaseStock();

  const locations = locationsData?.data ?? [];

  if (!id) return <p className="p-6 text-gray-400">Stock lot not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!lot) return <p className="p-6 text-gray-400">Stock lot not found.</p>;

  const availableQty = parseFloat(lot.quantity) - parseFloat(lot.reservedQty);

  const handleMove = () => {
    if (!toLocationId || !quantity) return;
    moveStock.mutate(
      { id, toLocationId, quantity },
      {
        onSuccess: () => {
          setActiveAction(null);
          setToLocationId('');
          setQuantity('');
        },
      },
    );
  };

  const handleAdjust = () => {
    if (!quantity) return;
    adjustStock.mutate(
      { id, quantity, reason: reason || undefined },
      {
        onSuccess: () => {
          setActiveAction(null);
          setQuantity('');
          setReason('');
        },
      },
    );
  };

  const handleReserve = () => {
    if (!quantity) return;
    reserveStock.mutate(
      { id, quantity },
      {
        onSuccess: () => {
          setActiveAction(null);
          setQuantity('');
        },
      },
    );
  };

  const handleRelease = () => {
    if (!quantity) return;
    releaseStock.mutate(
      { id, quantity },
      {
        onSuccess: () => {
          setActiveAction(null);
          setQuantity('');
        },
      },
    );
  };

  const isPending =
    moveStock.isPending ||
    adjustStock.isPending ||
    reserveStock.isPending ||
    releaseStock.isPending;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/warehouse/stock')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Stock
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{lot.lotNumber}</h1>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
            LOT_STATUS_COLORS[lot.status]
          }`}
        >
          {lot.status}
        </span>
      </div>

      {/* Lot Details */}
      <div className="mb-6 rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Product ID:</span>
            <span className="ml-2 font-medium text-gray-900">{lot.productId}</span>
          </div>
          <div>
            <span className="text-gray-500">Serial Number:</span>
            <span className="ml-2 font-medium text-gray-900">
              {lot.serialNumber ?? '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Location:</span>
            <span className="ml-2 font-medium text-gray-900">
              {lot.location?.code ?? '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Warehouse:</span>
            <span className="ml-2 font-medium text-gray-900">
              {lot.warehouse?.name ?? '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Received At:</span>
            <span className="ml-2 font-medium text-gray-900">
              {new Date(lot.receivedAt).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Expiry Date:</span>
            <span className="ml-2 font-medium text-gray-900">
              {lot.expiryDate ? new Date(lot.expiryDate).toLocaleDateString() : '-'}
            </span>
          </div>
        </div>

        {/* Quantities */}
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-200 pt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {parseFloat(lot.quantity).toFixed(3)}
            </div>
            <div className="text-xs text-gray-500">Total Qty</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {parseFloat(lot.reservedQty).toFixed(3)}
            </div>
            <div className="text-xs text-gray-500">Reserved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {availableQty.toFixed(3)}
            </div>
            <div className="text-xs text-gray-500">Available</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveAction('move')}
            disabled={availableQty <= 0}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Move Stock
          </button>
          <button
            onClick={() => setActiveAction('adjust')}
            className="rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Adjust
          </button>
          <button
            onClick={() => setActiveAction('reserve')}
            disabled={availableQty <= 0}
            className="rounded bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
          >
            Reserve
          </button>
          <button
            onClick={() => setActiveAction('release')}
            disabled={parseFloat(lot.reservedQty) <= 0}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Release
          </button>
        </div>

        {/* Move Form */}
        {activeAction === 'move' && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h3 className="mb-3 font-medium text-gray-900">Move Stock</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  To Location
                </label>
                <select
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select location...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Quantity (max: {availableQty.toFixed(3)})
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  max={availableQty}
                  step="0.001"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleMove}
                disabled={isPending || !toLocationId || !quantity}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {moveStock.isPending ? 'Moving...' : 'Confirm Move'}
              </button>
              <button
                onClick={() => setActiveAction(null)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Adjust Form */}
        {activeAction === 'adjust' && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h3 className="mb-3 font-medium text-gray-900">Adjust Quantity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  New Quantity
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  step="0.001"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Reason
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Damaged, Cycle count"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAdjust}
                disabled={isPending || !quantity}
                className="rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {adjustStock.isPending ? 'Adjusting...' : 'Confirm Adjustment'}
              </button>
              <button
                onClick={() => setActiveAction(null)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Reserve Form */}
        {activeAction === 'reserve' && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h3 className="mb-3 font-medium text-gray-900">Reserve Stock</h3>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Quantity to Reserve (max: {availableQty.toFixed(3)})
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                max={availableQty}
                step="0.001"
                className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleReserve}
                disabled={isPending || !quantity}
                className="rounded bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
              >
                {reserveStock.isPending ? 'Reserving...' : 'Confirm Reserve'}
              </button>
              <button
                onClick={() => setActiveAction(null)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Release Form */}
        {activeAction === 'release' && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h3 className="mb-3 font-medium text-gray-900">Release Reserved Stock</h3>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Quantity to Release (max: {parseFloat(lot.reservedQty).toFixed(3)})
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                max={parseFloat(lot.reservedQty)}
                step="0.001"
                className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleRelease}
                disabled={isPending || !quantity}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {releaseStock.isPending ? 'Releasing...' : 'Confirm Release'}
              </button>
              <button
                onClick={() => setActiveAction(null)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error messages */}
        {(moveStock.isError ||
          adjustStock.isError ||
          reserveStock.isError ||
          releaseStock.isError) && (
          <p className="mt-2 text-sm text-red-600">
            {moveStock.error?.message ||
              adjustStock.error?.message ||
              reserveStock.error?.message ||
              releaseStock.error?.message}
          </p>
        )}
      </div>
    </div>
  );
}
