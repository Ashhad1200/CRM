import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const WarehousesList = lazy(() => import('./pages/warehouses-list'));
const WarehouseDetail = lazy(() => import('./pages/warehouse-detail'));
const LocationsTree = lazy(() => import('./pages/locations-tree'));
const StockPage = lazy(() => import('./pages/stock-page'));
const StockLotDetail = lazy(() => import('./pages/stock-lot-detail'));
const PickListsList = lazy(() => import('./pages/pick-lists-list'));
const PickListDetail = lazy(() => import('./pages/pick-list-detail'));
const ShipmentsList = lazy(() => import('./pages/shipments-list'));
const ShipmentDetail = lazy(() => import('./pages/shipment-detail'));
const CycleCountsList = lazy(() => import('./pages/cycle-counts-list'));
const CycleCountDetail = lazy(() => import('./pages/cycle-count-detail'));
const ReceiveStock = lazy(() => import('./pages/receive-stock'));
const PackingStation = lazy(() => import('./pages/packing-station'));
const SerialTracking = lazy(() => import('./pages/serial-tracking'));

const tabs: ModuleTab[] = [
  { label: 'Warehouses', to: 'warehouses' },
  { label: 'Locations', to: 'locations' },
  { label: 'Stock', to: 'stock' },
  { label: 'Pick Lists', to: 'pick-lists' },
  { label: 'Shipments', to: 'shipments' },
  { label: 'Cycle Counts', to: 'cycle-counts' },
  { label: 'Packing', to: 'packing' },
  { label: 'Serials', to: 'serials' },
];

export function WarehouseRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="stock" replace />} />
      <Route element={<ModuleLayout title="Warehouse" tabs={tabs} />}>
        <Route path="warehouses" element={<WarehousesList />} />
        <Route path="warehouses/:id" element={<WarehouseDetail />} />
        <Route path="locations" element={<LocationsTree />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="stock/:id" element={<StockLotDetail />} />
        <Route path="stock/receive" element={<ReceiveStock />} />
        <Route path="pick-lists" element={<PickListsList />} />
        <Route path="pick-lists/:id" element={<PickListDetail />} />
        <Route path="shipments" element={<ShipmentsList />} />
        <Route path="shipments/:id" element={<ShipmentDetail />} />
        <Route path="cycle-counts" element={<CycleCountsList />} />
        <Route path="cycle-counts/:id" element={<CycleCountDetail />} />
        <Route path="packing" element={<PackingStation />} />
        <Route path="serials" element={<SerialTracking />} />
      </Route>
    </Routes>
  );
}
