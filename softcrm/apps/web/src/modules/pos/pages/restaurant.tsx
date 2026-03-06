import { useState, useEffect } from 'react';
import { Button, Badge } from '@softcrm/ui';
import {
  useTables,
  useKitchenOrders,
  useOpenTableSession,
  useCloseTableSession,
  useUpdateKitchenOrderStatus,
  type RestaurantTable,
  type RestaurantTableStatus,
  type KitchenOrder,
  type KitchenOrderStatus,
} from '../api';

/* ── Constants ─────────────────────────────────────────────────────────── */

const TABLE_COLORS: Record<RestaurantTableStatus, string> = {
  AVAILABLE: 'bg-green-500/80 border-green-400 hover:bg-green-500',
  OCCUPIED: 'bg-orange-500/80 border-orange-400 hover:bg-orange-500',
  RESERVED: 'bg-blue-500/80 border-blue-400 hover:bg-blue-500',
  CLEANING: 'bg-gray-400/80 border-gray-300 hover:bg-gray-400',
};

const STATUS_BADGE: Record<RestaurantTableStatus, 'success' | 'warning' | 'primary' | 'default'> = {
  AVAILABLE: 'success',
  OCCUPIED: 'warning',
  RESERVED: 'primary',
  CLEANING: 'default',
};

const KITCHEN_BADGE: Record<KitchenOrderStatus, 'default' | 'warning' | 'success' | 'primary'> = {
  PENDING: 'default',
  IN_PROGRESS: 'warning',
  READY: 'success',
  SERVED: 'primary',
};

/* ── Table Order Modal ─────────────────────────────────────────────────── */

function TableOrderModal({
  table,
  onClose,
}: {
  table: RestaurantTable;
  onClose: () => void;
}) {
  const [guestCount, setGuestCount] = useState(2);
  const openSession = useOpenTableSession();
  const closeSession = useCloseTableSession();

  const handleOpen = () => {
    openSession.mutate({ tableId: table.id, guestCount }, { onSuccess: onClose });
  };

  const handleClose = () => {
    closeSession.mutate(table.id, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="backdrop-blur-xl bg-white/90 border border-white/20 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Table {table.tableNumber}</h2>
          <Badge variant={STATUS_BADGE[table.status]}>{table.status}</Badge>
        </div>

        {table.section && (
          <p className="text-sm text-gray-500 mb-4">Section: {table.section}</p>
        )}
        <p className="text-sm text-gray-500 mb-4">Capacity: {table.capacity} seats</p>

        {table.status === 'AVAILABLE' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Guests</label>
            <input
              type="number"
              min={1}
              max={table.capacity}
              value={guestCount}
              onChange={(e) => setGuestCount(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Close</Button>
          {table.status === 'AVAILABLE' && (
            <Button className="flex-1" onClick={handleOpen}>Seat Guests</Button>
          )}
          {table.status === 'OCCUPIED' && (
            <Button variant="destructive" className="flex-1" onClick={handleClose}>
              Close Table
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Kitchen Display Panel ─────────────────────────────────────────────── */

function KitchenPanel({ orders }: { orders: KitchenOrder[] }) {
  const updateStatus = useUpdateKitchenOrderStatus();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = (createdAt: string) => {
    const diff = Math.floor((now - new Date(createdAt).getTime()) / 1000);
    const min = Math.floor(diff / 60);
    const sec = diff % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const activeOrders = orders.filter((o) => o.status !== 'SERVED');

  return (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
      <h3 className="text-lg font-bold mb-3">Kitchen Display</h3>
      {activeOrders.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No active orders</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto">
          {activeOrders.map((order) => (
            <div
              key={order.id}
              className={`rounded-lg p-3 border ${
                order.status === 'READY'
                  ? 'bg-green-50 border-green-200'
                  : order.status === 'IN_PROGRESS'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">#{order.ticketNumber}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500">{elapsed(order.createdAt)}</span>
                  <Badge variant={KITCHEN_BADGE[order.status]}>{order.status}</Badge>
                </div>
              </div>

              {order.table && (
                <p className="text-xs text-gray-500 mb-2">Table {order.table.tableNumber}</p>
              )}
              {order.notes && (
                <p className="text-xs text-gray-600 italic mb-2">{order.notes}</p>
              )}

              <div className="flex gap-2">
                {order.status === 'PENDING' && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus.mutate({ id: order.id, status: 'IN_PROGRESS' })}
                  >
                    Start
                  </Button>
                )}
                {order.status === 'IN_PROGRESS' && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus.mutate({ id: order.id, status: 'READY' })}
                  >
                    Ready
                  </Button>
                )}
                {order.status === 'READY' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateStatus.mutate({ id: order.id, status: 'SERVED' })}
                  >
                    Served
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Restaurant Page ───────────────────────────────────────────────────── */

export default function RestaurantPage() {
  const { data: tablesData, isLoading: loadingTables } = useTables();
  const { data: kitchenData } = useKitchenOrders();
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  const tables: RestaurantTable[] = tablesData?.data ?? [];
  const kitchenOrders: KitchenOrder[] = kitchenData?.data ?? [];

  const sections = [...new Set(tables.map((t) => t.section ?? 'Main'))];

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* ── Left: Table Map (65%) ───────────────────────────────────── */}
      <div className="w-[65%] flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Floor</h1>
          <div className="flex gap-3 text-xs">
            {Object.entries(TABLE_COLORS).map(([status]) => (
              <div key={status} className="flex items-center gap-1">
                <span className={`inline-block h-3 w-3 rounded-full ${TABLE_COLORS[status as RestaurantTableStatus]}`} />
                <span className="text-gray-600">{status}</span>
              </div>
            ))}
          </div>
        </div>

        {loadingTables && <p className="text-gray-500">Loading tables…</p>}

        <div className="flex-1 overflow-y-auto space-y-6">
          {sections.map((section) => (
            <div key={section}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">{section}</h3>
              <div className="grid grid-cols-4 gap-4">
                {tables
                  .filter((t) => (t.section ?? 'Main') === section)
                  .map((table) => (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTable(table)}
                      className={`relative rounded-2xl border-2 p-4 text-white transition shadow-lg ${TABLE_COLORS[table.status]}`}
                    >
                      <div className="text-2xl font-bold">{table.tableNumber}</div>
                      <div className="text-xs mt-1 opacity-80">{table.capacity} seats</div>
                      {table.status === 'OCCUPIED' && (
                        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-white animate-pulse" />
                      )}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Kitchen Display (35%) ────────────────────────────── */}
      <div className="w-[35%]">
        <KitchenPanel orders={kitchenOrders} />
      </div>

      {/* ── Table Modal ─────────────────────────────────────────────── */}
      {selectedTable && (
        <TableOrderModal
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
        />
      )}
    </div>
  );
}
