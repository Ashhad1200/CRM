import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ModuleLayout, type ModuleTab } from '../../layouts/module-layout';

const VendorsList = lazy(() => import('./pages/vendors-list'));
const VendorDetail = lazy(() => import('./pages/vendor-detail'));
const RequisitionsList = lazy(() => import('./pages/requisitions-list'));
const RequisitionDetail = lazy(() => import('./pages/requisition-detail'));
const PurchaseOrdersList = lazy(() => import('./pages/purchase-orders-list'));
const PurchaseOrderDetail = lazy(() => import('./pages/purchase-order-detail'));
const CreatePurchaseOrder = lazy(() => import('./pages/create-purchase-order'));
const ReceivingList = lazy(() => import('./pages/receiving-list'));
const ReceivingDetail = lazy(() => import('./pages/receiving-detail'));
const InvoicesList = lazy(() => import('./pages/invoices-list'));
const InvoiceDetail = lazy(() => import('./pages/invoice-detail'));
const RFQComparison = lazy(() => import('./pages/rfq-comparison'));
const SupplierRatings = lazy(() => import('./pages/supplier-ratings'));

const tabs: ModuleTab[] = [
  { label: 'Purchase Orders', to: 'purchase-orders' },
  { label: 'Vendors', to: 'vendors' },
  { label: 'Requisitions', to: 'requisitions' },
  { label: 'Receiving', to: 'receiving' },
  { label: 'Invoices', to: 'invoices' },
  { label: 'RFQ Compare', to: 'rfq-compare' },
  { label: 'Ratings', to: 'ratings' },
];

export function ProcurementRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="purchase-orders" replace />} />
      <Route element={<ModuleLayout title="Procurement" tabs={tabs} />}>
        <Route path="vendors" element={<VendorsList />} />
        <Route path="vendors/:id" element={<VendorDetail />} />
        <Route path="requisitions" element={<RequisitionsList />} />
        <Route path="requisitions/:id" element={<RequisitionDetail />} />
        <Route path="purchase-orders" element={<PurchaseOrdersList />} />
        <Route path="purchase-orders/new" element={<CreatePurchaseOrder />} />
        <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
        <Route path="receiving" element={<ReceivingList />} />
        <Route path="receiving/:id" element={<ReceivingDetail />} />
        <Route path="invoices" element={<InvoicesList />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="rfq-compare" element={<RFQComparison />} />
        <Route path="ratings" element={<SupplierRatings />} />
      </Route>
    </Routes>
  );
}
