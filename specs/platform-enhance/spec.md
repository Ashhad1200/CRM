# Feature Specification: SoftBusiness Platform Mega-Enhancement

**Feature Branch**: `002-platform-enhance`  
**Created**: 2026-02-27  
**Status**: Draft  
**Input**: Enhance SoftCRM into a full all-in-one business platform — CRM + ERP + POS + Unified Accounting — with glassmorphism UI overhaul. Target: General-purpose (retail, services, wholesale, manufacturing, distribution).

---

## Executive Summary

SoftBusiness is the evolution of SoftCRM into a **complete business operating system**. It adds 7 new bounded contexts (HR & Payroll, Manufacturing, Warehouse/WMS, Procurement, POS, Asset Management, Quality Control) to the existing 10, creates a unified accounting backbone that ties all financial transactions together, and delivers a stunning glassmorphism UI that makes enterprise software feel premium.

**Core value proposition:** One platform replaces Salesforce + QuickBooks + Odoo + Square + SAP. Zero data silos. One login.

---

## Scope

### New Modules (7 Bounded Contexts)

| # | Module | Schema | Key Capabilities |
|---|--------|--------|------------------|
| 11 | **HR & Payroll** | `hr` | Employees, departments, org chart, leave management, attendance, payroll runs, pay slips, benefits, tax withholding |
| 12 | **Manufacturing** | `manufacturing` | Bill of Materials (BOM), work orders, MRP, shop floor tracking, production scheduling, yield tracking |
| 13 | **Warehouse / WMS** | `warehouse` | Locations, bins, stock moves, pick/pack/ship, cycle counting, lot/serial tracking, multi-warehouse |
| 14 | **Procurement** | `procurement` | Purchase requisitions, RFQ, supplier management, supplier scoring, purchase order workflow, goods receipt |
| 15 | **POS (Retail)** | `pos` | Multi-terminal, barcode scanning, cash management, receipt printing, shift management, returns/exchanges |
| 16 | **POS (Restaurant)** | `pos` | Table management, kitchen display, order modifiers, split bills, tips, course management |
| 17 | **Asset Management** | `assets` | Fixed asset register, depreciation (straight-line, declining, units-of-production), maintenance scheduling, disposal |
| 18 | **Quality Control** | `quality` | Inspections, checklists, non-conformance reports (NCR), corrective/preventive actions (CAPA), supplier quality |

### Enhanced Existing Modules

| Module | Enhancements |
|--------|-------------|
| **Sales** | AI-powered lead scoring engine, gamification (leaderboards, badges, targets), social selling (LinkedIn/X integration), web visitor tracking, meeting scheduler (Calendly-like), guided selling playbooks |
| **Marketing** | Visual automation builder (drag-and-drop flow), A/B testing engine, multi-touch attribution model, advanced segmentation builder, social media management |
| **Support** | Embeddable live chat widget, SLA dashboard with real-time breach alerts, AI ticket categorization, sentiment analysis, customer health score |
| **Accounting** | Multi-company consolidation, budget management with variance analysis, cost centers & profit centers, fixed asset depreciation (ties to Asset module), bank feeds via Plaid API, payroll journal integration, multi-currency with live FX rates, tax filing automation, recurring billing enhancements |
| **Inventory** | Warehouse integration (stock moves → WMS), lot/serial number tracking, reorder point automation, demand forecasting, inventory valuation (FIFO/LIFO/weighted avg) |
| **Projects** | Resource planning with capacity view, Gantt chart, project templates, budget tracking with actual vs. planned, client portal billing |
| **Comms** | Built-in meeting scheduler, video call integration (Zoom/Teams API), unified inbox, communication templates |
| **Analytics** | Drag-and-drop dashboard builder, AI-powered forecasting (revenue, inventory, cash flow), anomaly detection, natural language query interface, scheduled report delivery |
| **Platform** | Command palette (⌘K), global search across all entities, notification center with preferences, theme engine (glassmorphism + dark/light), plugin/extension API, white-labeling foundation |

### UI Overhaul — Glassmorphism Design System

**Design Philosophy:** Frosted glass surfaces with depth, backdrop blur, subtle gradients, luminous borders, and fluid micro-animations. Dark mode as first-class citizen.

#### New Design Tokens
- **Glass surfaces**: 3 tiers — `glass-1` (subtle, 8% opacity), `glass-2` (medium, 15%), `glass-3` (strong, 25%)
- **Backdrop blur**: `blur-sm` (4px), `blur-md` (12px), `blur-lg` (24px), `blur-xl` (40px)
- **Border glow**: luminous borders with `rgba(255,255,255,0.1)` in dark mode, `rgba(0,0,0,0.05)` in light
- **Mesh gradients**: Multi-color ambient backgrounds per module (Sales=blue, Accounting=green, POS=purple, HR=amber)
- **Motion**: Spring physics for dialogs/sheets, stagger for lists, parallax for depth layers
- **Shadows**: Layered shadows (3 levels) with color-tinted ambient glow

#### New Components (20+)
- `GlassCard`, `GlassPanel` — frosted glass containers
- `StatCard` — metric card with value, trend arrow, sparkline, glassmorphic surface
- `CommandPalette` — ⌘K launcher with fuzzy search, actions, navigation, recent items
- `NotificationPanel` — slide-over with grouped notifications, mark-read, action buttons
- `DashboardGrid` — react-grid-layout based, drag-and-drop widget placement, persist layout
- `ChartCard` — Recharts wrapper (line, bar, area, pie, funnel, gauge) in glass container
- `Timeline` — activity feed / audit trail with avatars, timestamps, action badges
- `StepWizard` — multi-step form with progress indicator, validation per step
- `TreeView` — expandable tree for org charts, BOM hierarchy, chart of accounts
- `Calendar` — day/week/month views with event creation, drag-to-reschedule
- `GanttChart` — project/manufacturing timeline with dependencies, milestones
- `POSTerminal` — full-screen POS layout (product grid, cart, payment, receipt)
- `KitchenDisplay` — order queue with timers, bump-to-complete
- `ProgressRing` — circular progress indicator with percentage
- `DateRangePicker` — dual calendar with presets (today, this week, this month, custom)
- `FileUpload` — drag-and-drop zone with preview, progress, multi-file
- `SearchInput` — with keyboard shortcut hint badge, clear button, loading state
- `Switch` / `Toggle` — animated on/off toggle
- `Skeleton` — glassmorphic loading placeholder
- `Slider` — range slider with marks and tooltips

#### Enhanced Existing Components
- `DataTable` → inline editing, row expansion, CSV/PDF export, column pinning, virtual scrolling
- `KanbanBoard` → swimlanes, card covers/thumbnails, quick-add inline, WIP limits
- `Shell` → glassmorphism sidebar with blur, module-colored accent, animated nav transitions
- `FormBuilder` → conditional field visibility, repeater/array fields, section grouping

---

## User Scenarios

### US11 — Store Manager Processes a Retail Sale (POS) — P1

A store manager opens the POS terminal, scans product barcodes, applies a loyalty discount, processes payment (cash + card split), prints a receipt, and the sale auto-creates inventory deductions and accounting journal entries.

**Acceptance Scenarios:**
1. **Given** a POS session is open, **When** the cashier scans a barcode, **Then** the product appears in the cart with price from the active price book, stock availability is checked.
2. **Given** items in the cart, **When** a loyalty card is scanned, **Then** points are calculated and applicable discounts applied automatically.
3. **Given** a completed cart, **When** split payment is selected (cash + card), **Then** each tender is recorded separately with correct change calculation.
4. **Given** a completed sale, **When** payment is finalized, **Then** a receipt is generated (thermal ESC/POS format), inventory is decremented, a sales journal entry is created (debit Cash/AR, credit Revenue + Tax Payable), and the POS session totals update.
5. **Given** the POS is offline, **When** a sale is completed, **Then** it is stored in IndexedDB and synced when connectivity restores.

### US12 — HR Manager Runs Monthly Payroll — P1

An HR manager reviews attendance, processes leave accruals, runs payroll calculation, reviews pay slips, approves the run, and payroll journal entries are auto-posted to the general ledger.

**Acceptance Scenarios:**
1. **Given** employee records with salary structures, **When** payroll is initiated for a period, **Then** gross pay, deductions (tax, benefits, leave), and net pay are calculated per employee.
2. **Given** a calculated payroll run, **When** the HR manager approves, **Then** pay slips are generated as PDFs, journal entries are created (debit Salary Expense, credit Salary Payable + Tax Payable + Benefits Payable), and the run is locked.
3. **Given** leave requests for the period, **When** payroll runs, **Then** unpaid leave is deducted from gross pay and paid leave is tracked against accrual balance.

### US13 — Production Manager Creates a Manufacturing Work Order — P2

A production manager creates a work order from a BOM, assigns it to a work center, tracks material consumption and labor hours, and records finished goods into warehouse stock.

**Acceptance Scenarios:**
1. **Given** a BOM with raw materials and operations, **When** a work order is created, **Then** required materials are reserved from inventory, expected duration is calculated, and the order appears on the shop floor dashboard.
2. **Given** an in-progress work order, **When** an operation is completed, **Then** labor hours are logged, material consumption is recorded, and WIP inventory is updated.
3. **Given** a completed work order, **When** production is marked done, **Then** finished goods are received into the warehouse, COGS journal entries are created, and actual vs. planned variance is calculated.

### US14 — Warehouse Worker Fulfills a Sales Order (Pick/Pack/Ship) — P2

A warehouse worker receives a pick list, picks items from bin locations, packs them, generates shipping labels, and marks the order as shipped.

**Acceptance Scenarios:**
1. **Given** a confirmed sales order, **When** a pick list is generated, **Then** optimal pick routes are suggested based on bin locations, and items are reserved.
2. **Given** picked items, **When** packing is completed, **Then** a packing slip is generated, weight/dimensions are recorded, and shipping label is created via carrier API.
3. **Given** a packed shipment, **When** marked as shipped, **Then** inventory is decremented, the sales order status updates, the customer receives tracking info, and revenue journal entries are posted.

### US15 — Restaurant Server Manages Table Orders (Restaurant POS) — P2

A server opens a table, takes a multi-course order with modifiers, sends it to the kitchen display, processes split payments, and closes the table.

**Acceptance Scenarios:**
1. **Given** a table map, **When** guests are seated, **Then** the table status changes to occupied with party size and server assignment.
2. **Given** an open table, **When** items are ordered with modifiers (no onions, extra cheese), **Then** the order appears on the kitchen display grouped by course.
3. **Given** multiple guests, **When** split bill is requested, **Then** items can be assigned per guest or split evenly, with separate payment processing.

### US16 — CFO Reviews Multi-Company Consolidated Financials — P1

A CFO switches between company entities, reviews individual P&L statements, then generates a consolidated balance sheet with inter-company eliminations.

**Acceptance Scenarios:**
1. **Given** multi-company setup, **When** the CFO selects "Consolidated View," **Then** financial statements are merged with inter-company transactions eliminated.
2. **Given** different currencies per company, **When** consolidation runs, **Then** FX translation is applied using closing rates for balance sheet, average rates for P&L.

### US17 — Business Owner Uses Command Palette — P1

A user presses ⌘K, types a natural language query or action, and gets instant results — navigate to a contact, create an invoice, search across all modules.

**Acceptance Scenarios:**
1. **Given** any page, **When** ⌘K is pressed, **Then** a glassmorphic overlay appears with a search input, recent items, and suggested actions.
2. **Given** a search query "John's invoices," **When** submitted, **Then** results show matching invoices for contacts named John, with inline previews and quick actions.
3. **Given** an action query "create invoice for Acme Corp," **When** selected, **Then** the invoice creation form opens pre-populated with Acme Corp's billing details.

---

## Data Model Additions

### HR & Payroll Schema (`hr`)

```
Employee, Department, Position, EmploymentContract, LeaveType, LeaveRequest,
Attendance, PayrollStructure, PayrollRun, PaySlip, PaySlipLine, Benefit,
EmployeeBenefit, TaxBracket
```

### Manufacturing Schema (`manufacturing`)

```
BillOfMaterial, BOMLine, WorkCenter, WorkOrder, WorkOrderOperation,
MaterialConsumption, ProductionOutput, MRPRun, MRPRecommendation
```

### Warehouse Schema (`warehouse`)

```
Warehouse, Location, Bin, StockMove, StockLot, SerialNumber,
PickList, PickListLine, PackOrder, Shipment, ShipmentTracking, CycleCount
```

### Procurement Schema (`procurement`)

```
PurchaseRequisition, RequisitionLine, RequestForQuote, RFQResponse,
Supplier, SupplierRating, GoodsReceipt, GoodsReceiptLine
```

### POS Schema (`pos`)

```
POSTerminal, POSSession, POSOrder, POSOrderLine, POSPayment,
TableMap, Table, KitchenOrder, KitchenOrderItem,
LoyaltyProgram, LoyaltyCard, LoyaltyTransaction, GiftCard, GiftCardTransaction
```

### Quality Schema (`quality`)

```
Inspection, InspectionChecklist, ChecklistItem, InspectionResult,
NonConformanceReport, CorrectiveAction, PreventiveAction
```

### Asset Schema (`assets`)

```
FixedAsset, AssetCategory, DepreciationSchedule, DepreciationEntry,
AssetTransfer, AssetDisposal, MaintenanceSchedule, MaintenanceLog
```

---

## Cross-Module Integration Map

| Source Event | Target Module | Action |
|-------------|---------------|--------|
| `deal.won` | Accounting | Auto-create invoice |
| `deal.won` | Projects | Optionally create project |
| `invoice.sent` | Accounting | Create AR/Revenue JE |
| `payment.received` | Accounting | Create Cash/AR JE |
| `pos.sale.completed` | Inventory | Decrement stock |
| `pos.sale.completed` | Accounting | Create Sales/Cash JE |
| `pos.sale.completed` | Loyalty | Accrue points |
| `payroll.approved` | Accounting | Create Payroll JE |
| `workorder.completed` | Inventory | Receive finished goods |
| `workorder.completed` | Accounting | Create COGS/WIP JE |
| `expense.approved` | Accounting | Create Expense/AP JE |
| `purchase.received` | Inventory | Increment stock |
| `purchase.received` | Accounting | Create Inventory/AP JE |
| `asset.depreciation` | Accounting | Create Depreciation JE |
| `shipment.shipped` | Inventory | Decrement stock |
| `shipment.shipped` | Accounting | Create Revenue/COGS JE |
| `leave.approved` | Payroll | Adjust payroll calculation |

---

## API Route Plan (New Modules)

### HR & Payroll — `/api/v1/hr/`
```
GET/POST       /employees
GET/PATCH/DEL  /employees/:id
GET/POST       /departments
GET/POST       /leave-types
GET/POST       /leave-requests
POST           /leave-requests/:id/approve
POST           /leave-requests/:id/reject
GET/POST       /attendance
GET/POST       /payroll-runs
POST           /payroll-runs/:id/calculate
POST           /payroll-runs/:id/approve
GET            /payroll-runs/:id/payslips
GET            /payroll-runs/:id/payslips/:empId/pdf
GET            /org-chart
```

### Manufacturing — `/api/v1/manufacturing/`
```
GET/POST       /boms
GET/PATCH      /boms/:id
GET/POST       /work-orders
PATCH          /work-orders/:id
POST           /work-orders/:id/start
POST           /work-orders/:id/complete
POST           /work-orders/:id/operations/:opId/complete
POST           /work-orders/:id/material-consumption
GET/POST       /work-centers
POST           /mrp/run
GET            /mrp/recommendations
```

### Warehouse — `/api/v1/warehouse/`
```
GET/POST       /warehouses
GET/POST       /locations
GET/POST       /bins
GET/POST       /stock-moves
POST           /stock-moves/:id/confirm
GET/POST       /pick-lists
POST           /pick-lists/:id/pick
GET/POST       /pack-orders
POST           /pack-orders/:id/pack
GET/POST       /shipments
POST           /shipments/:id/ship
GET            /stock-levels
GET            /lot-tracking/:lotId
```

### Procurement — `/api/v1/procurement/`
```
GET/POST       /requisitions
POST           /requisitions/:id/approve
GET/POST       /rfqs
POST           /rfqs/:id/send
POST           /rfqs/:id/responses
GET/POST       /suppliers
GET            /suppliers/:id/rating
POST           /goods-receipts
```

### POS — `/api/v1/pos/`
```
GET/POST       /terminals
POST           /sessions/open
POST           /sessions/:id/close
GET            /sessions/:id/summary
POST           /orders
POST           /orders/:id/pay
POST           /orders/:id/void
POST           /orders/:id/return
GET/POST       /tables (restaurant)
PATCH          /tables/:id/status
POST           /kitchen/orders
POST           /kitchen/orders/:id/bump
GET/POST       /loyalty/programs
POST           /loyalty/cards/:id/accrue
POST           /loyalty/cards/:id/redeem
GET/POST       /gift-cards
POST           /gift-cards/:id/charge
POST           /gift-cards/:id/redeem
POST           /sync/offline-orders (batch sync)
```

### Quality — `/api/v1/quality/`
```
GET/POST       /inspections
POST           /inspections/:id/complete
GET/POST       /checklists
GET/POST       /ncrs
POST           /ncrs/:id/resolve
GET/POST       /capas
POST           /capas/:id/close
```

### Assets — `/api/v1/assets/`
```
GET/POST       /fixed-assets
GET/PATCH      /fixed-assets/:id
POST           /fixed-assets/:id/dispose
GET            /fixed-assets/:id/depreciation-schedule
POST           /depreciation/run
GET/POST       /maintenance-schedules
POST           /maintenance-logs
```

---

## Accounting Enhancements Detail

### Multi-Company
- `Company` model (tenant can have multiple companies)
- Each JE tagged with `companyId`
- Consolidation engine: merge statements, eliminate inter-company
- Inter-company transaction tracking

### Budget Management
- `Budget` model (annual/quarterly, per GL account or cost center)
- `BudgetLine` (amount per period)
- Variance reports (budget vs. actual)
- Alert on budget threshold breach (80%, 100%)

### Cost Centers & Profit Centers
- `CostCenter` model (department/project/location)
- Every JE line can have optional `costCenterId`
- P&L by cost center
- Allocation rules for shared costs

### Fixed Assets
- Ties to `assets` schema
- Depreciation methods: Straight-line, Declining Balance, Units of Production
- Monthly depreciation run → auto JE (debit Depreciation Expense, credit Accumulated Depreciation)
- Asset disposal → gain/loss JE

### Bank Feeds
- Plaid API integration for bank account linking
- Auto-import transactions daily
- Matching engine: amount + date + description fuzzy match
- Reconciliation interface with match/create/exclude actions

### Multi-Currency
- `ExchangeRate` table (daily rates)
- FX API integration for live rates
- Unrealized gain/loss calculation
- Realized gain/loss on payment

### Payroll Integration
- Payroll run creates JEs automatically:
  - Debit: Salary Expense, Employer Tax
  - Credit: Salary Payable, Tax Payable, Benefits Payable, Net Pay Payable

---

## UI Routes (New Pages)

### HR (`/hr/`)
- `/hr/employees` — Employee list with department filter
- `/hr/employees/:id` — Employee profile (details, leave, attendance, payslips)
- `/hr/departments` — Department tree/org chart
- `/hr/leave` — Leave calendar + request management
- `/hr/attendance` — Check-in/out log with timesheet
- `/hr/payroll` — Payroll runs dashboard
- `/hr/payroll/:id` — Run detail with payslip review

### Manufacturing (`/manufacturing/`)
- `/manufacturing/boms` — BOM list with tree expansion
- `/manufacturing/boms/:id` — BOM detail with cost rollup
- `/manufacturing/work-orders` — Kanban (Planned → In Progress → Done)
- `/manufacturing/work-orders/:id` — WO detail with operations, materials, output
- `/manufacturing/shop-floor` — Real-time production dashboard
- `/manufacturing/mrp` — MRP run results and recommendations

### Warehouse (`/warehouse/`)
- `/warehouse/overview` — Stock levels dashboard, low-stock alerts
- `/warehouse/locations` — Warehouse → Location → Bin hierarchy
- `/warehouse/pick-lists` — Active picks with barcode scanner UI
- `/warehouse/pack` — Packing station interface
- `/warehouse/shipments` — Shipment tracking board
- `/warehouse/cycle-counts` — Count scheduling and variance

### Procurement (`/procurement/`)
- `/procurement/requisitions` — Request list with approval status
- `/procurement/rfqs` — RFQ management with supplier responses
- `/procurement/suppliers` — Supplier directory with ratings
- `/procurement/goods-receipts` — Receipt log with QC status

### POS (`/pos/`)
- `/pos/terminal` — Full-screen POS interface (retail mode)
- `/pos/restaurant` — Table map + order taking
- `/pos/kitchen` — Kitchen display system
- `/pos/sessions` — Session management (open/close, cash counts)
- `/pos/loyalty` — Program management, card lookup
- `/pos/reports` — Daily sales, top products, cashier performance

### Assets (`/assets/`)
- `/assets/register` — Asset register with filters
- `/assets/register/:id` — Asset detail with depreciation chart
- `/assets/depreciation` — Run depreciation, review schedule
- `/assets/maintenance` — Upcoming maintenance calendar

### Quality (`/quality/`)
- `/quality/inspections` — Inspection list with pass/fail status
- `/quality/ncrs` — Non-conformance reports board
- `/quality/capas` — CAPA tracking with status flow

### Enhanced Platform
- ⌘K command palette overlay (global)
- `/settings/theme` — Theme customization (glassmorphism tuning)
- `/notifications` — Notification center

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| POS transaction latency | < 200ms end-to-end |
| Dashboard load time | < 2s with 50 widgets |
| Offline POS sync | < 30s for 100 transactions |
| Concurrent POS terminals | 50+ per tenant |
| Payroll calculation | < 10s for 1000 employees |
| Bank feed import | < 60s for 500 transactions |
| UI glassmorphism render | 60fps animations |
| Bundle size (per route) | < 200KB gzipped |
| Accessibility | WCAG 2.1 AA (glass effects respect prefers-reduced-transparency) |
