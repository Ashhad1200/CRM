// ── Shared Kernel — Public API ─────────────────────────────────────────────────
// Single barrel export for @softcrm/shared-kernel

// Types
export type {
  UserId,
  TenantId,
  EntityId,
  Money,
  Address,
  PhoneNumber,
  EmailAddress,
  DateRange,
  Pagination,
  SortDirection,
  SortOrder,
  PaginatedResult,
  CrudAction,
  OwnershipScope,
} from './types/index.js';

export {
  money,
  addMoney,
  subtractMoney,
  multiplyMoney,
  formatMoney,
  isZeroMoney,
  emailAddress,
  dateRange,
  paginatedResult,
} from './types/index.js';

// Errors
export {
  AppError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
  RateLimitError,
  InternalError,
} from './errors/index.js';

// Events
export type {
  DomainEvent,
  EventType,
  CreateEventInput,
  DealWonPayload,
  DealStageChangedPayload,
  LeadConvertedPayload,
  InvoicePaidPayload,
  TicketCreatedPayload,
  StockLowPayload,
} from './events/index.js';

export { EventTypes, isValidEventType } from './events/index.js';

// Utils
export {
  generateId,
  slugify,
  parseDateRange,
  assertNever,
  paginateQuery,
  buildPaginatedResult,
  retry,
  sleep,
} from './utils/index.js';
