# Tasks: SoftBusiness Platform Mega-Enhancement

**Input**: [specs/platform-enhance/spec.md](spec.md)  
**Prerequisites**: Existing SoftCRM codebase with 10 modules, all building and passing tests.

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel with other [P] tasks in same phase

---

## Phase 1: Glassmorphism Design System Overhaul

**Purpose**: Transform the UI foundation to glassmorphic aesthetic with 20+ new components.

### 1A: Design Tokens & Theme Engine

- [ ] E001 [P] Create glassmorphism design tokens in `packages/ui/src/tokens/glass.ts`: glass surfaces (glass-1/2/3 with opacity + blur), border-glow colors (dark/light), mesh gradient definitions per module, motion spring configs, layered shadow system
- [ ] E002 [P] Create theme engine in `packages/ui/src/tokens/theme.ts`: `ThemeProvider` with dark/light mode toggle, CSS custom properties for all tokens, `useTheme()` hook, `prefers-color-scheme` media query support, `prefers-reduced-transparency` fallback
- [ ] E003 [P] Create animation utilities in `packages/ui/src/utils/motion.ts`: spring animation presets, stagger config generator, list enter/exit transitions, dialog scale-blur transition, page route transitions
- [ ] E004 Update existing color tokens in `packages/ui/src/tokens/index.ts`: add dark-mode semantic colors, module accent colors (sales=blue, accounting=green, hr=amber, pos=purple, manufacturing=slate, warehouse=orange)
- [ ] E005 Update Tailwind config: add glass utilities (`bg-glass-1`, `backdrop-blur-md`, `border-glow`), dark mode class strategy, custom animation keyframes

### 1B: New Primitive Components

- [ ] E006 [P] Create `GlassCard` in `packages/ui/src/primitives/glass-card.tsx`: frosted glass container with 3 tiers (subtle/medium/strong), hover glow effect, dark/light variants
- [ ] E007 [P] Create `GlassPanel` in `packages/ui/src/primitives/glass-panel.tsx`: larger glass container for page sections, optional header slot, collapsible
- [ ] E008 [P] Create `StatCard` in `packages/ui/src/primitives/stat-card.tsx`: value + label + trend arrow (up/down/flat) + mini sparkline + glassmorphic background, color-coded by trend
- [ ] E009 [P] Create `ProgressRing` in `packages/ui/src/primitives/progress-ring.tsx`: SVG circular progress with percentage text, animated fill, size variants (sm/md/lg)
- [ ] E010 [P] Create `Switch` in `packages/ui/src/primitives/switch.tsx`: animated toggle with spring physics, label slot, disabled state
- [ ] E011 [P] Create `Slider` in `packages/ui/src/primitives/slider.tsx`: range slider with marks, tooltips, min/max, step, dual-thumb range mode
- [ ] E012 [P] Create `DateRangePicker` in `packages/ui/src/primitives/date-range-picker.tsx`: dual calendar, preset buttons (Today, This Week, This Month, This Quarter, Custom), glassmorphic dropdown
- [ ] E013 [P] Create `SearchInput` in `packages/ui/src/primitives/search-input.tsx`: input with search icon, keyboard shortcut hint badge (⌘K), clear button, loading spinner, debounced onChange
- [ ] E014 [P] Create `FileUpload` in `packages/ui/src/primitives/file-upload.tsx`: drag-and-drop zone, file preview thumbnails, progress bar per file, multi-file support, accept filter
- [ ] E015 [P] Create `Skeleton` in `packages/ui/src/primitives/skeleton.tsx`: glassmorphic loading placeholder with shimmer animation, variants (text, circle, rect, card)

### 1C: New Composite Components

- [ ] E016 Create `CommandPalette` in `packages/ui/src/composites/command-palette.tsx`: ⌘K triggered overlay, fuzzy search input, categorized results (Navigation, Actions, Recent), keyboard navigation (↑↓ Enter Esc), action callbacks, glassmorphic backdrop
- [ ] E017 Create `NotificationPanel` in `packages/ui/src/composites/notification-panel.tsx`: slide-over panel, grouped notifications (Today, Earlier, This Week), mark-read/unread, action buttons per notification, real-time badge count
- [ ] E018 Create `DashboardGrid` in `packages/ui/src/composites/dashboard-grid.tsx`: react-grid-layout wrapper, drag-and-drop widget placement, resize handles, persist layout to localStorage/API, responsive breakpoints, add-widget dialog
- [ ] E019 Create `ChartCard` in `packages/ui/src/composites/chart-card.tsx`: Recharts wrapper in GlassCard — line, bar, area, pie, funnel, gauge chart types, responsive, tooltip, legend, loading skeleton
- [ ] E020 Create `Timeline` in `packages/ui/src/composites/timeline.tsx`: vertical activity feed with avatar, timestamp, action badge (created/updated/commented), content slot, load-more pagination
- [ ] E021 Create `StepWizard` in `packages/ui/src/composites/step-wizard.tsx`: multi-step form container, step indicator with progress line, per-step validation, back/next/finish buttons, glassmorphic step cards
- [ ] E022 Create `TreeView` in `packages/ui/src/composites/tree-view.tsx`: expandable/collapsible tree, lazy-load children, checkbox selection, drag-and-drop reorder, search/filter, icons per node
- [ ] E023 Create `Calendar` in `packages/ui/src/composites/calendar.tsx`: day/week/month views, event creation (click-drag), event display with color coding, navigation controls, today button
- [ ] E024 Create `GanttChart` in `packages/ui/src/composites/gantt-chart.tsx`: horizontal timeline bars, dependencies (arrows), milestones (diamonds), zoom controls, drag-to-resize duration, glassmorphic bars

### 1D: Enhanced Existing Components

- [ ] E025 Enhance `DataTable` in `packages/ui/src/composites/data-table.tsx`: add inline editing (cell click → input), row expansion (nested content), CSV/PDF export buttons, column pinning (left/right), virtual scrolling for 10k+ rows
- [ ] E026 Enhance `KanbanBoard` in `packages/ui/src/composites/kanban.tsx`: add swimlanes (horizontal grouping), card cover images/thumbnails, quick-add inline input per column, WIP limit indicator per column, column collapse
- [ ] E027 Enhance `Shell` in `packages/ui/src/layouts/shell.tsx`: glassmorphic sidebar with backdrop-blur, module-colored accent stripe, animated nav item transitions, notification badge on bell icon, user avatar menu with glass dropdown
- [ ] E028 Enhance `FormBuilder` in `packages/ui/src/composites/form-builder.tsx`: add conditional field visibility (show/hide based on other field values), repeater/array fields (add/remove rows), section grouping with headers

### 1E: Component Tests

- [ ] E029 [P] Write tests for new primitives: `packages/ui/src/__tests__/glass-card.test.tsx`, `stat-card.test.tsx`, `progress-ring.test.tsx`, `switch.test.tsx`, `date-range-picker.test.tsx`, `search-input.test.tsx`
- [ ] E030 [P] Write tests for new composites: `packages/ui/src/__tests__/command-palette.test.tsx`, `dashboard-grid.test.tsx`, `timeline.test.tsx`, `tree-view.test.tsx`, `step-wizard.test.tsx`

**Checkpoint**: All new UI components render correctly, pass tests, support dark/light mode. `pnpm turbo build` succeeds.

---

## Phase 2: Platform Enhancements

- [ ] E031 Create `CommandPaletteProvider` in `apps/web/src/providers/command-palette-provider.tsx`: global ⌘K listener, register commands from all modules, recent items from localStorage, action dispatcher
- [ ] E032 Create global search API in `apps/api/src/modules/platform/search/search.routes.ts` + `search.service.ts`: Meilisearch multi-index search across contacts, deals, invoices, tickets, products, employees; return typed results with module/entity/id
- [ ] E033 Create notification system: `apps/api/src/modules/platform/notifications/notification.service.ts` + routes + Prisma model `Notification` in platform schema; user preferences (email/push/in-app per event type); Socket.IO real-time delivery
- [ ] E034 Create theme settings page: `apps/web/src/modules/platform/pages/theme-settings.tsx`: glass intensity slider, dark/light toggle, accent color picker, preview panel
- [ ] E035 Update `apps/web/src/layouts/app-shell.tsx`: apply glassmorphism to sidebar/topnav, integrate CommandPalette, add notification bell with panel, add theme toggle to user menu
- [ ] E036 Enhance sidebar navigation: add module icons, badge counts (unread tickets, pending approvals, overdue invoices), collapsible sections for CRM/ERP/POS groups

**Checkpoint**: ⌘K works globally, notifications appear in real-time, theme toggles correctly.

---

## Phase 3: CRM Enhancements

- [ ] E037 [P] Add gamification: `apps/api/src/modules/sales/gamification.service.ts` — leaderboard calculation (deals won, revenue, activities), badges (First Deal, 10-Deal Streak, Big Fish), targets with progress; Prisma models: `SalesTarget`, `Badge`, `UserBadge`, `LeaderboardEntry` in sales schema
- [ ] E038 [P] Add AI lead scoring: `apps/api/src/modules/sales/lead-scoring.service.ts` — rule-based scoring engine (demographic + behavioral signals), score recalculation on lead update, score decay over time; add `scoreBreakdown` JSON field to Lead model
- [ ] E039 [P] Add meeting scheduler: `apps/api/src/modules/comms/scheduler.service.ts` + routes — availability slots, booking links, calendar sync (Google/Outlook API), confirmation emails; Prisma models: `AvailabilitySlot`, `BookedMeeting` in comms schema
- [ ] E040 [P] Add social selling: `apps/api/src/modules/sales/social.service.ts` — LinkedIn profile enrichment (API), social activity tracking, social touch scoring
- [ ] E041 [P] Enhance marketing automation builder: `apps/web/src/modules/marketing/pages/automation-builder.tsx` — visual flow editor (react-flow), trigger → condition → action nodes, email/wait/branch node types
- [ ] E042 [P] Add support live chat widget: `apps/api/src/modules/support/chat.service.ts` — Socket.IO based real-time chat, agent routing, chat transcript storage; embeddable widget script
- [ ] E043 Add SLA dashboard: `apps/web/src/modules/support/pages/sla-dashboard.tsx` — real-time SLA breach monitoring, response time charts, resolution time charts, at-risk tickets
- [ ] E044 [P] Frontend pages: Sales leaderboard page, lead scoring config page, meeting scheduler settings page, support chat agent view

**Checkpoint**: Lead scoring runs, leaderboard displays, meeting links bookable, chat widget functional.

---

## Phase 4: Accounting Enhancements

- [ ] E045 Add `Company` model to platform schema; add `companyId` to `JournalEntry`; multi-company switcher in UI navbar
- [ ] E046 Create consolidation engine: `apps/api/src/modules/accounting/consolidation.service.ts` — merge P&L/BS across companies, inter-company elimination rules, FX translation
- [ ] E047 Add budget management: Prisma models `Budget`, `BudgetLine` in accounting schema; `budget.service.ts` with variance calculation (budget vs actual per GL account per period)
- [ ] E048 Add cost centers: Prisma model `CostCenter` in accounting schema; add optional `costCenterId` to `JournalLine`; P&L by cost center report
- [ ] E049 Add bank feeds: `apps/api/src/modules/accounting/bank-feed.service.ts` — Plaid API integration for account linking, transaction import, auto-matching engine (amount + date ± 3 days + description fuzzy), reconciliation UI
- [ ] E050 Add multi-currency: `ExchangeRate` model, FX API integration (daily rate fetch cron), unrealized/realized gain/loss calculation, FX JE auto-creation
- [ ] E051 Add payroll journal integration: event listener for `payroll.approved` → auto-create payroll JE (Salary Expense / Tax Payable / Net Pay Payable)
- [ ] E052 [P] Frontend pages: Budget management page, cost center report, bank reconciliation interface, multi-company switcher, FX rates management
- [ ] E053 [P] Update existing accounting reports to support company filter and cost center breakdown

**Checkpoint**: Multi-company works, budgets track variance, bank feeds import and match.

---

## Phase 5: ERP — HR & Payroll

- [ ] E054 Create `prisma/schema/hr.prisma`: models Employee, Department, Position, EmploymentContract, LeaveType, LeaveRequest, Attendance, PayrollStructure, PayrollRun, PaySlip, PaySlipLine, Benefit, EmployeeBenefit, TaxBracket — all with tenantId, audit fields
- [ ] E055 Create HR module backend: `apps/api/src/modules/hr/` — routes.ts, service.ts, repository.ts, validators.ts, types.ts, events.ts, listeners.ts
- [ ] E056 Create employee service: CRUD employees with department/position, employment history, document attachments
- [ ] E057 Create leave management: leave types (annual, sick, unpaid), leave requests with approval workflow, balance tracking, calendar view data
- [ ] E058 Create attendance service: check-in/out, timesheet calculation, overtime rules, integration with leave (auto-deduct for approved leave)
- [ ] E059 Create payroll engine: `apps/api/src/modules/hr/payroll/payroll.service.ts` — calculate gross pay from salary structure, apply deductions (tax brackets, benefits, unpaid leave), generate pay slips, lock payroll run, emit `payroll.approved` event
- [ ] E060 Create pay slip PDF: `apps/api/src/modules/hr/payroll/payslip-pdf.service.ts` — Puppeteer-generated pay slip with company branding, earnings breakdown, deductions, net pay
- [ ] E061 [P] Create HR frontend: `apps/web/src/modules/hr/` — routes.tsx, api.ts, pages/ (employees-list, employee-detail, departments, leave-calendar, attendance, payroll-runs, payroll-detail)
- [ ] E062 Create org chart page: `apps/web/src/modules/hr/pages/org-chart.tsx` — TreeView component showing department → team → employee hierarchy
- [ ] E063 [P] Write HR tests: API tests for employee CRUD, leave approval flow, payroll calculation with edge cases (mid-month join, unpaid leave, tax brackets)

**Checkpoint**: Employees manageable, leave flows work, payroll calculates correctly, pay slips generate.

---

## Phase 6: ERP — Manufacturing & Quality

- [ ] E064 Create `prisma/schema/manufacturing.prisma`: BillOfMaterial, BOMLine, WorkCenter, WorkOrder, WorkOrderOperation, MaterialConsumption, ProductionOutput, MRPRun, MRPRecommendation
- [ ] E065 Create `prisma/schema/quality.prisma`: Inspection, InspectionChecklist, ChecklistItem, InspectionResult, NonConformanceReport, CorrectiveAction, PreventiveAction
- [ ] E066 Create manufacturing backend: `apps/api/src/modules/manufacturing/` — full module structure; BOM CRUD with cost rollup, work order lifecycle (Draft → Planned → InProgress → Done), material consumption tracking, production output recording
- [ ] E067 Create MRP engine: `apps/api/src/modules/manufacturing/mrp.service.ts` — explode demand from sales orders through BOM tree, check available inventory, generate procurement/production recommendations
- [ ] E068 Create quality backend: `apps/api/src/modules/quality/` — inspections with checklist execution, NCR creation on failure, CAPA tracking, supplier quality scoring
- [ ] E069 [P] Create manufacturing frontend: BOM list/detail (with TreeView), work order Kanban, shop floor dashboard, MRP results page
- [ ] E070 [P] Create quality frontend: inspection execution page, NCR board, CAPA tracker
- [ ] E071 [P] Write manufacturing tests: BOM cost rollup, work order state machine, material consumption validation, MRP explosion

**Checkpoint**: BOMs define products, work orders track production, MRP generates recommendations, quality inspections run.

---

## Phase 7: ERP — Warehouse & Procurement

- [ ] E072 Create `prisma/schema/warehouse.prisma`: Warehouse, Location, Bin, StockMove, StockLot, SerialNumber, PickList, PickListLine, PackOrder, Shipment, ShipmentTracking, CycleCount
- [ ] E073 Create `prisma/schema/procurement.prisma`: PurchaseRequisition, RequisitionLine, RequestForQuote, RFQResponse, Supplier, SupplierRating, GoodsReceipt, GoodsReceiptLine
- [ ] E074 Create warehouse backend: `apps/api/src/modules/warehouse/` — warehouse/location/bin CRUD, stock moves (receipt/transfer/issue/adjustment), lot/serial tracking, pick list generation with route optimization, pack order workflow, shipment tracking
- [ ] E075 Create procurement backend: `apps/api/src/modules/procurement/` — purchase requisition with approval, RFQ creation and response comparison, supplier directory with rating, goods receipt with quality check trigger
- [ ] E076 [P] Create warehouse frontend: stock levels dashboard, location hierarchy (TreeView), pick list execution (barcode scanner UI), packing station, shipment board, cycle count interface
- [ ] E077 [P] Create procurement frontend: requisition list, RFQ comparison table, supplier directory with ratings, goods receipt form
- [ ] E078 [P] Write warehouse tests: stock move validation (no negative stock), pick list generation, lot tracking
- [ ] E079 [P] Write procurement tests: requisition approval flow, RFQ lifecycle, goods receipt → inventory

**Checkpoint**: Warehouse operations functional, procurement workflow complete, stock moves accurate.

---

## Phase 8: POS System

- [ ] E080 Create `prisma/schema/pos.prisma`: POSTerminal, POSSession, POSOrder, POSOrderLine, POSPayment, TableMap, Table, KitchenOrder, KitchenOrderItem, LoyaltyProgram, LoyaltyCard, LoyaltyTransaction, GiftCard, GiftCardTransaction
- [ ] E081 Create POS backend: `apps/api/src/modules/pos/` — terminal management, session lifecycle (open/close with cash count), order CRUD, payment processing (cash, card, split), void/return, receipt generation
- [ ] E082 Create restaurant POS backend: table management (status: available/occupied/reserved), kitchen order routing, order modifiers, split bill logic, course management, tip recording
- [ ] E083 Create loyalty & gift card services: loyalty program CRUD, point accrual rules, redemption, gift card issuance/charge/redeem/balance
- [ ] E084 Create POS frontend — retail terminal: `apps/web/src/modules/pos/pages/terminal.tsx` — full-screen glassmorphic POS interface, product grid with search/barcode, cart sidebar, payment modal with split-tender, receipt preview
- [ ] E085 Create POS frontend — restaurant: `apps/web/src/modules/pos/pages/restaurant.tsx` — table map (visual layout, color-coded status), order-taking interface, modifier selection, kitchen display page with order queue + timer + bump button
- [ ] E086 Create POS session management: `apps/web/src/modules/pos/pages/sessions.tsx` — open/close with cash count, session summary report (sales total, payment breakdown, variance)
- [ ] E087 Create POS offline mode: service worker for `apps/web/`, Dexie.js (IndexedDB) for offline order storage, background sync when online, conflict resolution
- [ ] E088 [P] Create POS integration events: `pos.sale.completed` → Inventory (decrement) + Accounting (Sales JE) + Loyalty (accrue points)
- [ ] E089 [P] Create POS reports page: daily sales, hourly breakdown, top products, cashier performance, payment method breakdown
- [ ] E090 [P] Write POS tests: order + payment flow, split payment, offline queue, receipt generation, loyalty point calculation

**Checkpoint**: Retail POS processes sales, restaurant POS manages tables/kitchen, offline mode works, accounting JEs auto-created.

---

## Phase 9: Asset Management

- [ ] E091 Create `prisma/schema/assets.prisma`: FixedAsset, AssetCategory, DepreciationSchedule, DepreciationEntry, AssetTransfer, AssetDisposal, MaintenanceSchedule, MaintenanceLog
- [ ] E092 Create asset backend: `apps/api/src/modules/assets/` — asset register CRUD, depreciation calculation (straight-line, declining balance, units-of-production), monthly depreciation run with JE creation, asset disposal with gain/loss
- [ ] E093 Create asset frontend: register list, asset detail with depreciation chart, run depreciation page, maintenance calendar
- [ ] E094 [P] Write asset tests: depreciation calculation accuracy, disposal JE, maintenance scheduling

**Checkpoint**: Assets tracked, depreciation runs monthly, maintenance scheduled.

---

## Phase 10: Analytics & AI Enhancement

- [ ] E095 Create dashboard builder: `apps/web/src/modules/analytics/pages/dashboard-builder.tsx` — DashboardGrid with widget catalog (StatCard, ChartCard, DataTable, KanbanBoard mini), drag-and-drop, resize, save layout per user
- [ ] E096 Create widget data API: `apps/api/src/modules/analytics/widgets.service.ts` — configurable data queries per widget type (KPI value, time series, top-N, funnel), cross-module data access
- [ ] E097 [P] Create pre-built dashboards: Sales (pipeline value, conversion, leaderboard), Accounting (cash position, AR aging, revenue trend), HR (headcount, leave balance, payroll cost), POS (daily sales, top items), Manufacturing (WO status, production rate)
- [ ] E098 [P] Add AI forecasting service: `apps/api/src/modules/analytics/forecast.service.ts` — linear regression for revenue forecast, exponential smoothing for inventory demand, cash flow projection
- [ ] E099 [P] Add natural language query: `apps/api/src/modules/analytics/nl-query.service.ts` — parse natural language → structured query → execute → format result

**Checkpoint**: Dashboards customizable, forecasts generate, NL queries return results.

---

## Phase 11: Cross-Module Integration & Polish

- [ ] E100 Wire all domain event listeners: verify every event in the cross-module integration map fires and is handled correctly
- [ ] E101 Create unified activity timeline: aggregate activities across all modules per contact/account on their detail page
- [ ] E102 Enhance mobile app: add POS tablet mode, field service check-in, offline inventory count
- [ ] E103 [P] Performance optimization: virtual scrolling on all large lists, lazy-load module routes, optimize Prisma queries (select only needed fields), Redis caching for dashboard widgets
- [ ] E104 [P] E2E tests: Playwright tests for critical flows — POS sale, payroll run, work order lifecycle, lead-to-cash pipeline
- [ ] E105 [P] Accessibility audit: WCAG 2.1 AA compliance, glassmorphism respects `prefers-reduced-transparency`, keyboard navigation for POS, screen reader support

**Checkpoint**: All modules integrated, performance targets met, E2E tests pass, accessible.

---

## Summary

| Phase | Tasks | New Files (est.) | New Prisma Models (est.) |
|-------|-------|-------------------|--------------------------|
| 1. UI Design System | E001–E030 | 30+ components | 0 |
| 2. Platform | E031–E036 | 10 files | 1 (Notification) |
| 3. CRM Enhancement | E037–E044 | 20 files | 6 |
| 4. Accounting Enhancement | E045–E053 | 15 files | 4 |
| 5. HR & Payroll | E054–E063 | 25 files | 14 |
| 6. Manufacturing & QC | E064–E071 | 25 files | 16 |
| 7. Warehouse & Procurement | E072–E079 | 25 files | 18 |
| 8. POS System | E080–E090 | 30 files | 14 |
| 9. Asset Management | E091–E094 | 12 files | 8 |
| 10. Analytics & AI | E095–E099 | 10 files | 0 |
| 11. Integration & Polish | E100–E105 | 10 files | 0 |
| **Total** | **105 tasks** | **~210 files** | **~81 models** |
