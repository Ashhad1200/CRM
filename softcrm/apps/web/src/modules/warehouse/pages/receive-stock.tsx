import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useWarehouses, useLocations, useReceiveStock } from '../api';

type Step = 'product' | 'location' | 'details' | 'review';

interface ReceiveData {
  productId: string;
  warehouseId: string;
  locationId: string;
  lotNumber: string;
  serialNumber: string;
  quantity: string;
  expiryDate: string;
}

export default function ReceiveStockPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('product');
  const [data, setData] = useState<ReceiveData>({
    productId: '',
    warehouseId: '',
    locationId: '',
    lotNumber: '',
    serialNumber: '',
    quantity: '',
    expiryDate: '',
  });

  const { data: warehousesData, isLoading: loadingWarehouses } = useWarehouses();
  const { data: locationsData, isLoading: loadingLocations } = useLocations(
    data.warehouseId || undefined,
    { type: 'RECEIVING' },
  );

  const receiveStock = useReceiveStock();

  const warehouses = warehousesData?.data ?? [];
  const locations = locationsData?.data ?? [];

  const steps: { key: Step; label: string }[] = [
    { key: 'product', label: 'Product' },
    { key: 'location', label: 'Location' },
    { key: 'details', label: 'Details' },
    { key: 'review', label: 'Review' },
  ];

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'product':
        return !!data.productId;
      case 'location':
        return !!data.warehouseId && !!data.locationId;
      case 'details':
        return !!data.lotNumber && !!data.quantity && parseFloat(data.quantity) > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]!.key);
    }
  };

  const handleBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]!.key);
    }
  };

  const handleSubmit = () => {
    receiveStock.mutate(
      {
        productId: data.productId,
        warehouseId: data.warehouseId,
        locationId: data.locationId,
        lotNumber: data.lotNumber,
        serialNumber: data.serialNumber || undefined,
        quantity: data.quantity,
        expiryDate: data.expiryDate || undefined,
      },
      {
        onSuccess: () => {
          navigate('/warehouse/stock');
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/warehouse/stock')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Stock
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Receive Stock</h1>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <div key={step.key} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  idx < currentIndex
                    ? 'bg-green-600 text-white'
                    : idx === currentIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {idx < currentIndex ? '✓' : idx + 1}
              </div>
              <span
                className={`ml-2 text-sm ${
                  idx === currentIndex ? 'font-medium text-gray-900' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
              {idx < steps.length - 1 && (
                <div
                  className={`mx-4 h-0.5 w-16 ${
                    idx < currentIndex ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded border border-gray-200 bg-white p-6">
        {/* Step 1: Product */}
        {currentStep === 'product' && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Select Product
            </h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Product ID / SKU
              </label>
              <input
                value={data.productId}
                onChange={(e) => setData({ ...data, productId: e.target.value })}
                placeholder="Enter product ID or scan barcode"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the product ID or use a barcode scanner
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {currentStep === 'location' && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Select Destination
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Warehouse
                </label>
                <select
                  value={data.warehouseId}
                  onChange={(e) =>
                    setData({ ...data, warehouseId: e.target.value, locationId: '' })
                  }
                  disabled={loadingWarehouses}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select warehouse...</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Receiving Location
                </label>
                <select
                  value={data.locationId}
                  onChange={(e) => setData({ ...data, locationId: e.target.value })}
                  disabled={!data.warehouseId || loadingLocations}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select location...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Only receiving locations are shown
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {currentStep === 'details' && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Stock Details
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Lot Number *
                  </label>
                  <input
                    value={data.lotNumber}
                    onChange={(e) => setData({ ...data, lotNumber: e.target.value })}
                    placeholder="e.g. LOT-2024-001"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Serial Number
                  </label>
                  <input
                    value={data.serialNumber}
                    onChange={(e) =>
                      setData({ ...data, serialNumber: e.target.value })
                    }
                    placeholder="Optional"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={data.quantity}
                    onChange={(e) => setData({ ...data, quantity: e.target.value })}
                    step="0.001"
                    min="0"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={data.expiryDate}
                    onChange={(e) => setData({ ...data, expiryDate: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 'review' && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Review &amp; Confirm
            </h2>
            <div className="rounded bg-gray-50 p-4">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Product ID:</dt>
                  <dd className="font-medium text-gray-900">{data.productId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Warehouse:</dt>
                  <dd className="font-medium text-gray-900">
                    {warehouses.find((w) => w.id === data.warehouseId)?.name ?? '-'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Location:</dt>
                  <dd className="font-medium text-gray-900">
                    {locations.find((l) => l.id === data.locationId)?.code ?? '-'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Lot Number:</dt>
                  <dd className="font-medium text-gray-900">{data.lotNumber}</dd>
                </div>
                {data.serialNumber && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Serial Number:</dt>
                    <dd className="font-medium text-gray-900">{data.serialNumber}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Quantity:</dt>
                  <dd className="font-medium text-gray-900">{data.quantity}</dd>
                </div>
                {data.expiryDate && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Expiry Date:</dt>
                    <dd className="font-medium text-gray-900">
                      {new Date(data.expiryDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex justify-between border-t border-gray-200 pt-4">
          <button
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/warehouse/stock')}
              className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            {currentStep === 'review' ? (
              <button
                onClick={handleSubmit}
                disabled={receiveStock.isPending}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {receiveStock.isPending ? 'Receiving...' : 'Receive Stock'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Next
              </button>
            )}
          </div>
        </div>

        {receiveStock.isError && (
          <p className="mt-2 text-sm text-red-600">{receiveStock.error.message}</p>
        )}
      </div>
    </div>
  );
}
