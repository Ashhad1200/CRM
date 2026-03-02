// ── @softcrm/db — Public API ───────────────────────────────────────────────────

export { getPrismaClient, disconnectPrisma } from './client.js';
export { tenantContext } from './tenant-context.js';

// Re-export Prisma types for consumers
export type { PrismaClient, Prisma } from '@prisma/client';

// Re-export JSON types from Prisma runtime
export type { JsonValue, InputJsonValue, JsonObject, InputJsonObject } from '@prisma/client/runtime/library';

// Re-export enums used across modules
export {
  // Platform enums
  NotificationType,
  NotificationCategory,
  TenantStatus,
  UserStatus,
  AuditAction,
  FieldType,
  WorkflowStatus,
  WorkflowExecStatus,
  AccessLevel,
  OwnershipScope,
  // Sales enums
  LifecycleStage,
  LeadSource,
  LeadStatus,
  QuoteStatus,
  TargetPeriod,
  TargetMetric,
  // Support enums
  TicketStatus,
  TicketChannel,
  AuthorType,
  ArticleStatus,
  Priority,
  // Accounting enums
  AccountType,
  InvoiceStatus,
  ExpenseStatus,
  FiscalPeriodStatus,
  RecurringFrequency,
  PaymentMethod,
  BudgetPeriod,
  BankTxnStatus,
  Currency,
  ApprovalStatus,
  // Inventory enums
  SalesOrderStatus,
  PurchaseOrderStatus,
  TaxClass,
  StockAdjustmentReason,
} from '@prisma/client';
