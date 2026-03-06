import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button, Badge, StatCard } from '@softcrm/ui';
import {
  useOrders,
  useCreateOrder,
  useAddOrderLine,
  useAddPayment,
  type POSOrderLine,
  type POSPaymentMethod,
} from '../api';

/* ── Mock product catalogue (replace with real product API) ─────────────── */

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  sku: string;
}

const SAMPLE_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Espresso', price: 3.5, category: 'Beverages', sku: 'BEV-001' },
  { id: 'p2', name: 'Latte', price: 4.5, category: 'Beverages', sku: 'BEV-002' },
  { id: 'p3', name: 'Cappuccino', price: 4.0, category: 'Beverages', sku: 'BEV-003' },
  { id: 'p4', name: 'Croissant', price: 3.0, category: 'Food', sku: 'FOD-001' },
  { id: 'p5', name: 'Sandwich', price: 7.5, category: 'Food', sku: 'FOD-002' },
  { id: 'p6', name: 'Muffin', price: 3.5, category: 'Food', sku: 'FOD-003' },
  { id: 'p7', name: 'Orange Juice', price: 4.0, category: 'Beverages', sku: 'BEV-004' },
  { id: 'p8', name: 'Cookie', price: 2.5, category: 'Food', sku: 'FOD-004' },
];

const CATEGORIES = ['All', ...new Set(SAMPLE_PRODUCTS.map((p) => p.category))];

/* ── Cart item type ────────────────────────────────────────────────────── */

interface CartItem {
  product: Product;
  quantity: number;
}

const fmt = (n: number) => n.toFixed(2);

/* ── Payment Modal ─────────────────────────────────────────────────────── */

function PaymentModal({
  total,
  onPay,
  onClose,
}: {
  total: number;
  onPay: (method: POSPaymentMethod, amount: string) => void;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<POSPaymentMethod>('CASH');
  const [tendered, setTendered] = useState(String(total));

  const changeDue = Math.max(0, parseFloat(tendered || '0') - total);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-label="Payment">
      <div className="backdrop-blur-xl bg-white/90 border border-white/20 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-4" id="payment-dialog-title">Payment</h2>

        <div className="text-3xl font-bold text-center mb-6">${fmt(total)}</div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['CASH', 'CARD', 'MOBILE', 'SPLIT'] as POSPaymentMethod[]).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                method === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {method === 'CASH' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Tendered</label>
            <input
              type="number"
              step="0.01"
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg"
            />
            <p className="mt-2 text-sm text-gray-500">Change Due: <span className="font-bold text-green-600">${fmt(changeDue)}</span></p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={() => onPay(method, String(total))}>
            Complete Payment
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Terminal Page ──────────────────────────────────────────────────────── */

export default function TerminalPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [sessionId] = useState('current'); // Placeholder — real session from context

  const createOrder = useCreateOrder();
  const addLine = useAddOrderLine();
  const addPayment = useAddPayment();

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const filteredProducts = useMemo(() => {
    return SAMPLE_PRODUCTS.filter((p) => {
      const matchCat = category === 'All' || p.category === category;
      const matchSearch =
        !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, category]);

  // Keyboard shortcuts for POS operations
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    // Enter to open payment (when not in an input)
    if (e.key === 'Enter' && !isInput && cart.length > 0 && !showPayment) {
      e.preventDefault();
      setShowPayment(true);
      return;
    }

    // Escape to close payment modal
    if (e.key === 'Escape' && showPayment) {
      e.preventDefault();
      setShowPayment(false);
      return;
    }

    // +/- to adjust quantity of last cart item (when not in an input)
    if (!isInput && cart.length > 0) {
      const lastItem = cart[cart.length - 1]!;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        updateQty(lastItem.product.id, 1);
      } else if (e.key === '-') {
        e.preventDefault();
        updateQty(lastItem.product.id, -1);
      }
    }
  }, [cart, showPayment, updateQty]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const handlePay = async (method: POSPaymentMethod, amount: string) => {
    try {
      const order = await createOrder.mutateAsync({ sessionId });
      const orderData = order.data;
      for (const item of cart) {
        await addLine.mutateAsync({
          orderId: orderData.id,
          productId: item.product.id,
          description: item.product.name,
          quantity: String(item.quantity),
          unitPrice: String(item.product.price),
        });
      }
      await addPayment.mutateAsync({ orderId: orderData.id, method, amount });
      setCart([]);
      setShowPayment(false);
    } catch {
      // Error handled by TanStack Query
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* ── Left: Product grid (70%) ────────────────────────────────── */}
      <div className="flex w-[70%] flex-col">
        {/* Search & category filter */}
        <div className="mb-4 flex gap-3">
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="flex gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                  category === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-4 gap-3">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                aria-label={`Add ${p.name} - $${fmt(p.price)}`}
                className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 text-left transition hover:bg-white/20 hover:shadow-lg"
              >
                <div className="mb-1 text-xs text-gray-400">{p.sku}</div>
                <div className="font-medium text-gray-900">{p.name}</div>
                <div className="mt-1 text-lg font-bold text-blue-600">${fmt(p.price)}</div>
                <Badge variant="outline" className="mt-2">{p.category}</Badge>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Cart sidebar (30%) ───────────────────────────────── */}
      <div className="flex w-[30%] flex-col backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Current Order</h2>

        <div className="flex-1 overflow-y-auto space-y-2">
          {cart.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Cart is empty</p>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between rounded-lg bg-white/60 p-3"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.product.name}</div>
                  <div className="text-xs text-gray-500">${fmt(item.product.price)} ea</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.product.id, -1)}
                    aria-label={`Decrease ${item.product.name} quantity`}
                    className="h-7 w-7 rounded bg-gray-200 text-sm font-bold hover:bg-gray-300"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium" aria-label={`Quantity: ${item.quantity}`}>{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.product.id, 1)}
                    aria-label={`Increase ${item.product.name} quantity`}
                    className="h-7 w-7 rounded bg-gray-200 text-sm font-bold hover:bg-gray-300"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    aria-label={`Remove ${item.product.name}`}
                    className="ml-1 text-red-400 hover:text-red-600 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <div className="ml-3 w-16 text-right text-sm font-semibold">
                  ${fmt(item.product.price * item.quantity)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="mt-4 space-y-1 border-t border-gray-200 pt-3 text-sm" aria-live="polite" aria-atomic="true">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax (10%)</span>
            <span>${fmt(tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900">
            <span>Total</span>
            <span>${fmt(total)}</span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => setCart([])}
            disabled={cart.length === 0}
          >
            Clear
          </Button>
          <Button
            className="flex-1"
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0}
          >
            Pay ${fmt(total)}
          </Button>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          total={total}
          onPay={handlePay}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
