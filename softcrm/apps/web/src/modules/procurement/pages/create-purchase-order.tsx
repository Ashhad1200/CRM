import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useCreatePurchaseOrder, useSuppliers } from '../api';
import type { Currency } from '../api';

interface LineItem {
  key: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

function emptyLine(): LineItem {
  return {
    key: crypto.randomUUID(),
    productId: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    taxRate: 0,
  };
}

function calcLineTotal(line: LineItem): number {
  return line.quantity * line.unitPrice * (1 + line.taxRate / 100);
}

const STEPS = [
  { id: 1, name: 'Select Supplier' },
  { id: 2, name: 'Add Line Items' },
  { id: 3, name: 'Review & Create' },
];

export default function CreatePurchaseOrderPage() {
  const navigate = useNavigate();
  const createPO = useCreatePurchaseOrder();
  const { data: suppliersData } = useSuppliers({ status: 'ACTIVE' });
  const suppliers = suppliersData?.data ?? [];

  const [currentStep, setCurrentStep] = useState(1);
  const [supplierId, setSupplierId] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const updateLine = (key: string, field: keyof Omit<LineItem, 'key'>, raw: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        if (field === 'description' || field === 'productId') {
          return { ...l, [field]: raw };
        }
        const num = parseFloat(raw);
        return { ...l, [field]: isNaN(num) ? 0 : num };
      })
    );
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (key: string) =>
    setLines((prev) => {
      const next = prev.filter((l) => l.key !== key);
      return next.length === 0 ? [emptyLine()] : next;
    });

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const taxAmount = lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice * (l.taxRate / 100),
    0
  );
  const grandTotal = subtotal + taxAmount;

  const handleSubmit = () => {
    createPO.mutate(
      {
        supplierId,
        currency,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        lines: lines.map((l) => ({
          productId: l.productId || crypto.randomUUID(),
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate / 100,
        })),
      },
      {
        onSuccess: (data) => {
          navigate(`/procurement/purchase-orders/${data.data.id}`);
        },
      }
    );
  };

  const canProceedStep1 = !!supplierId;
  const canProceedStep2 = lines.some((l) => l.description && l.quantity > 0);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Purchase Order</h1>
        <Link
          to="/procurement/purchase-orders"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </Link>
      </div>

      {/* Step Wizard */}
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center">
          {STEPS.map((step, stepIdx) => (
            <li
              key={step.name}
              className={`relative ${stepIdx !== STEPS.length - 1 ? 'flex-1' : ''}`}
            >
              <div className="flex items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    currentStep > step.id
                      ? 'bg-blue-600 text-white'
                      : currentStep === step.id
                        ? 'border-2 border-blue-600 text-blue-600'
                        : 'border-2 border-gray-300 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? (
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step.id
                  )}
                </span>
                <span
                  className={`ml-2 text-sm font-medium ${
                    currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step.name}
                </span>
              </div>
              {stepIdx !== STEPS.length - 1 && (
                <div className="absolute top-4 left-12 -ml-px mt-0.5 h-0.5 w-full bg-gray-200">
                  <div
                    className={`h-full bg-blue-600 transition-all ${
                      currentStep > step.id ? 'w-full' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step 1: Select Supplier */}
      {currentStep === 1 && (
        <div className="rounded border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Select Supplier</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Supplier *
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select a supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          {selectedSupplier && (
            <div className="mt-4 rounded bg-gray-50 p-3">
              <p className="text-sm text-gray-600">
                <strong>Contact:</strong> {selectedSupplier.contactName ?? '-'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {selectedSupplier.email ?? '-'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Payment Terms:</strong> {selectedSupplier.paymentTerms ?? '-'}
              </p>
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!canProceedStep1}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Next: Add Line Items
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Add Line Items */}
      {currentStep === 2 && (
        <div className="rounded border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Add Line Items</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-gray-600">Description</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600">Qty</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600">Unit Price</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600">Tax %</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-600">Line Total</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line) => (
                  <tr key={line.key}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(line.key, 'description', e.target.value)}
                        placeholder="Item description"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step={1}
                        min={0}
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, 'quantity', e.target.value)}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line.key, 'unitPrice', e.target.value)}
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        value={line.taxRate}
                        onChange={(e) => updateLine(line.key, 'taxRate', e.target.value)}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                      ${calcLineTotal(line).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="text-red-500 hover:text-red-700"
                        aria-label="Remove line"
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={addLine}
            className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            + Add Line
          </button>
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              disabled={!canProceedStep2}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Create */}
      {currentStep === 3 && (
        <div className="rounded border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Review Purchase Order</h2>
          <div className="mb-6 grid grid-cols-3 gap-4 rounded bg-gray-50 p-4">
            <div>
              <p className="text-sm text-gray-500">Supplier</p>
              <p className="font-medium text-gray-900">
                {selectedSupplier?.name ?? supplierId}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Currency</p>
              <p className="font-medium text-gray-900">{currency}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Expected Delivery</p>
              <p className="font-medium text-gray-900">
                {expectedDeliveryDate
                  ? new Date(expectedDeliveryDate).toLocaleDateString()
                  : '-'}
              </p>
            </div>
          </div>

          <h3 className="mb-2 text-sm font-semibold text-gray-700">Line Items</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Unit Price</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Tax %</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line) => (
                  <tr key={line.key}>
                    <td className="px-4 py-2 text-gray-900">{line.description}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{line.quantity}</td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      ${line.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">{line.taxRate}%</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      ${calcLineTotal(line).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <dl className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Subtotal</dt>
                <dd className="font-medium text-gray-900">${subtotal.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Tax</dt>
                <dd className="font-medium text-gray-900">${taxAmount.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1">
                <dt className="font-semibold text-gray-900">Total</dt>
                <dd className="font-semibold text-gray-900">
                  {currency} {grandTotal.toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={createPO.isPending}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {createPO.isPending ? 'Creating...' : 'Create Purchase Order'}
            </button>
          </div>

          {createPO.isError && (
            <p className="mt-4 text-sm text-red-600">{createPO.error.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
