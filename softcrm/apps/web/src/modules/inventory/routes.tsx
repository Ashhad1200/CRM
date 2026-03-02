import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const ProductList = lazy(() => import('./pages/product-list'));
const ProductDetail = lazy(() => import('./pages/product-detail'));
const SalesOrders = lazy(() => import('./pages/sales-orders'));
const PurchaseOrders = lazy(() => import('./pages/purchase-orders'));

const tabs: ModuleTab[] = [
  { label: 'Products', to: 'products' },
  { label: 'Sales Orders', to: 'orders' },
  { label: 'Purchase Orders', to: 'purchase-orders' },
];

export function InventoryRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="products" replace />} />
      <Route element={<ModuleLayout title="Inventory" tabs={tabs} />}>
        <Route path="products" element={<ProductList />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="orders" element={<SalesOrders />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
      </Route>
    </Routes>
  );
}
