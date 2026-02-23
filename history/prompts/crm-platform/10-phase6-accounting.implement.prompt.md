```prompt
---
id: 10
title: Phase 6 Accounting Module End-to-End
stage: implement
date: 2025-07-26
surface: agent
model: claude-opus-4-20250514
feature: crm-platform
branch: main
user: developer
command: /sp.implement
labels: ["accounting", "invoicing", "journal-entries", "expenses", "payments", "double-entry", "reports", "phase-6"]
links:
  spec: specs/crm-platform/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - packages/db/prisma/schema/accounting.prisma
  - apps/api/src/modules/accounting/types.ts
  - apps/api/src/modules/accounting/validators.ts
  - apps/api/src/modules/accounting/repository.ts
  - apps/api/src/modules/accounting/ledger/chart-of-accounts.service.ts
  - apps/api/src/modules/accounting/ledger/journal-entry.service.ts
  - apps/api/src/modules/accounting/ledger/trial-balance.service.ts
  - apps/api/src/modules/accounting/invoicing/invoice.service.ts
  - apps/api/src/modules/accounting/invoicing/payment.service.ts
  - apps/api/src/modules/accounting/invoicing/recurring.service.ts
  - apps/api/src/modules/accounting/expenses/expense.service.ts
  - apps/api/src/modules/accounting/service.ts
  - apps/api/src/modules/accounting/events.ts
  - apps/api/src/modules/accounting/listeners.ts
  - apps/api/src/modules/accounting/routes.ts
  - apps/api/src/server.ts (modified — mounted accountingRouter at /api/v1/accounting)
  - apps/api/src/modules/accounting/__tests__/journal-entry.service.test.ts
  - apps/api/src/modules/accounting/__tests__/invoice.service.test.ts
  - apps/api/src/modules/accounting/__tests__/payment.service.test.ts
  - apps/api/src/modules/accounting/__tests__/expense.service.test.ts
  - apps/api/src/modules/accounting/__tests__/trial-balance.service.test.ts
  - apps/api/src/modules/accounting/__tests__/listeners.test.ts
  - apps/api/src/modules/accounting/__tests__/deal-to-invoice.test.ts
  - apps/web/src/modules/accounting/api.ts
  - apps/web/src/modules/accounting/routes.tsx
  - apps/web/src/modules/accounting/pages/invoices-list.tsx
  - apps/web/src/modules/accounting/pages/invoice-detail.tsx
  - apps/web/src/modules/accounting/pages/chart-of-accounts.tsx
  - apps/web/src/modules/accounting/pages/journal-entries.tsx
  - apps/web/src/modules/accounting/pages/expenses-list.tsx
  - apps/web/src/modules/accounting/pages/reports.tsx
  - apps/web/src/router.tsx (modified — wired AccountingRoutes into /accounting/*)
tests:
  - apps/api/src/modules/accounting/__tests__/journal-entry.service.test.ts (11 tests)
  - apps/api/src/modules/accounting/__tests__/invoice.service.test.ts (10 tests)
  - apps/api/src/modules/accounting/__tests__/payment.service.test.ts (8 tests)
  - apps/api/src/modules/accounting/__tests__/expense.service.test.ts (7 tests)
  - apps/api/src/modules/accounting/__tests__/trial-balance.service.test.ts (5 tests)
  - apps/api/src/modules/accounting/__tests__/listeners.test.ts (3 tests)
  - apps/api/src/modules/accounting/__tests__/deal-to-invoice.test.ts (3 tests)
---

## Prompt

PROCEED — Complete Phase 6: US2 — Accountant Manages Invoicing & Financial Reporting (T106-T133). Build the full accounting module with double-entry bookkeeping, auto-invoicing from won deals, payments, expenses, and financial reports. All builds and tests must pass. Create PHR #10.

## Response snapshot

Phase 6 (T106-T133) fully implemented across 32 files:

**Accounting Prisma Schema (T106-T107)**: 10 models (ChartOfAccount, FiscalPeriod, JournalEntry, JournalLine, Invoice, InvoiceLine, Payment, Expense, RecurringInvoice, CreditNote) + 7 enums (AccountType, InvoiceStatus, ExpenseStatus, FiscalPeriodStatus, RecurringFrequency, PaymentMethod). Uses `accounting` schema with proper relations, unique constraints on `reversedEntryId`, and Decimal for monetary values.

**Backend Module (T108-T120)**: 15 files — 28 Zod validators with coerced pagination, typed interfaces (JournalEntryWithLines, InvoiceWithLines), ~28-function repository layer with transactional writes. Sub-module services: chart-of-accounts (CRUD + balance), journal-entry (balanced entry validation, reversing entries, fiscal period enforcement), trial-balance (period-based aggregation with isBalanced check), invoice (full lifecycle: create → send → void with auto-JE generation), payment (balance guard, PARTIAL/PAID status transitions, Cash↔AR journal entries), recurring invoices (frequency-based scheduling), expenses (category validation, PENDING→APPROVED/REJECTED with JE on approval). Orchestrator service with financial reports: P&L, Balance Sheet, Cash Flow, AR Aging. 5 event publishers, deal-won listener that auto-creates invoice from quote. 22 Express routes.

**Well-known account codes for auto-JE**: 1000=Cash, 1200=Accounts Receivable, 2000=Accounts Payable, 4000=Revenue.

**Backend Tests (T121-T122)**: 7 test files, 47 tests total — journal-entry (11), invoice (10), payment (8), expense (7), trial-balance (5), listeners (3), deal-to-invoice integration (3). All passing.

**Frontend Module (T123-T132)**: 8 files with ~1,958 lines. TanStack React Query hooks for all 22 endpoints. 6 lazy-loaded page components: invoices list with status filter tabs + create dialog, invoice detail with payments + send/void actions, chart of accounts grouped by type, journal entries with balanced line editor, expenses with approve/reject for PENDING, tabbed reports page (P&L, Balance Sheet, Trial Balance, AR Aging). Routes wired into router.tsx replacing the /accounting/* placeholder.

**Validation**: 5/5 builds passing (including Vite production build with code-split accounting chunks), 203 total tests passing across all packages (up from 156 in Phase 5).

## Outcome

Phase 6 complete. Tasks T106-T133 implemented. Cumulative: 203 tests, 5/5 builds, PHR #10 written. Ready for Phase 7.
```
