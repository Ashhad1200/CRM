import { lazy } from 'react';
import { Route } from 'react-router';

const ProductList = lazy(() => import('./pages/product-list'));
const ProductDetail = lazy(() => import('./pages/product-detail'));
const SalesOrders = lazy(() => import('./pages/sales-orders'));
const PurchaseOrders = lazy(() => import('./pages/purchase-orders'));

export function InventoryRoutes() {
  return (
    <>
      <Route path="products" element={<ProductList />} />
      <Route path="products/:id" element={<ProductDetail />} />
      <Route path="orders" element={<SalesOrders />} />
      <Route path="purchase-orders" element={<PurchaseOrders />} />
    </>
  );
}
