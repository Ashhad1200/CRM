import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useStockLots, useStockMoves } from '../api';
import type { WHStockLot, WHStockMove, StockLotStatus, StockMoveType } from '../api';

const LOT_STATUS_COLORS: Record<StockLotStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  RESERVED: 'bg-yellow-100 text-yellow-700',
  QUARANTINE: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-600',
};

const MOVE_TYPE_COLORS: Record<StockMoveType, string> = {
  RECEIPT: 'bg-blue-100 text-blue-700',
  DELIVERY: 'bg-purple-100 text-purple-700',
  INTERNAL: 'bg-gray-100 text-gray-700',
  ADJUSTMENT: 'bg-yellow-100 text-yellow-700',
  RETURN: 'bg-orange-100 text-orange-700',
};

type TabType = 'lots' | 'moves';

export default function StockPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('lots');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [moveTypeFilter, setMoveTypeFilter] = useState<string>('');

  const lotsFilters: Record<string, string> = {};
  if (statusFilter) lotsFilters['status'] = statusFilter;

  const movesFilters: Record<string, string> = {};
  if (moveTypeFilter) movesFilters['moveType'] = moveTypeFilter;

  const { data: lotsData, isLoading: loadingLots } = useStockLots(lotsFilters);
  const { data: movesData, isLoading: loadingMoves } = useStockMoves(movesFilters);

  const lots: WHStockLot[] = lotsData?.data ?? [];
  const moves: WHStockMove[] = movesData?.data ?? [];

  const calculateAvailable = (lot: WHStockLot) => {
    const qty = parseFloat(lot.quantity);
    const reserved = parseFloat(lot.reservedQty);
    return (qty - reserved).toFixed(3);
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
        <button
          onClick={() => navigate('/warehouse/stock/receive')}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Receive Stock
        </button>
      </div>

      {/* Tab navigation */}
      <div className="mb-4 flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('lots')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'lots'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Stock Lots
        </button>
        <button
          onClick={() => setActiveTab('moves')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'moves'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Stock Moves
        </button>
      </div>

      {/* Stock Lots Tab */}
      {activeTab === 'lots' && (
        <>
          <div className="mb-4 flex items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="RESERVED">Reserved</option>
              <option value="QUARANTINE">Quarantine</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          {loadingLots ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-3 py-3">Lot Number</th>
                  <th className="px-3 py-3">Product ID</th>
                  <th className="px-3 py-3">Location</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="px-3 py-3 text-right">Reserved</th>
                  <th className="px-3 py-3 text-right">Available</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {lots.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                      No stock lots found.
                    </td>
                  </tr>
                ) : (
                  lots.map((lot) => (
                    <tr
                      key={lot.id}
                      onClick={() => navigate(`/warehouse/stock/${lot.id}`)}
                      className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {lot.lotNumber}
                      </td>
                      <td className="px-3 py-3 text-gray-600">{lot.productId}</td>
                      <td className="px-3 py-3 text-gray-600">
                        {lot.location?.code ?? '-'}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-900">
                        {parseFloat(lot.quantity).toFixed(3)}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-600">
                        {parseFloat(lot.reservedQty).toFixed(3)}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-gray-900">
                        {calculateAvailable(lot)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            LOT_STATUS_COLORS[lot.status]
                          }`}
                        >
                          {lot.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-500">
                        {lot.expiryDate
                          ? new Date(lot.expiryDate).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Stock Moves Tab */}
      {activeTab === 'moves' && (
        <>
          <div className="mb-4 flex items-center gap-4">
            <select
              value={moveTypeFilter}
              onChange={(e) => setMoveTypeFilter(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="RECEIPT">Receipt</option>
              <option value="DELIVERY">Delivery</option>
              <option value="INTERNAL">Internal</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="RETURN">Return</option>
            </select>
          </div>

          {loadingMoves ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-3 py-3">Reference</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Product ID</th>
                  <th className="px-3 py-3">From</th>
                  <th className="px-3 py-3">To</th>
                  <th className="px-3 py-3 text-right">Planned</th>
                  <th className="px-3 py-3 text-right">Done</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {moves.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                      No stock moves found.
                    </td>
                  </tr>
                ) : (
                  moves.map((move) => (
                    <tr
                      key={move.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {move.reference}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            MOVE_TYPE_COLORS[move.moveType]
                          }`}
                        >
                          {move.moveType}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{move.productId}</td>
                      <td className="px-3 py-3 text-gray-600">
                        {move.fromLocation?.code ?? '-'}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {move.toLocation?.code ?? '-'}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-900">
                        {parseFloat(move.plannedQty).toFixed(3)}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-900">
                        {parseFloat(move.doneQty).toFixed(3)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            move.status === 'DONE'
                              ? 'bg-green-100 text-green-700'
                              : move.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-700'
                              : move.status === 'CONFIRMED'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {move.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-500">
                        {new Date(move.scheduledDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
