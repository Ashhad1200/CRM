-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "assets";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "manufacturing";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "pos";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "procurement";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "quality";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "warehouse";

-- CreateEnum
CREATE TYPE "accounting"."BudgetPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "accounting"."BankTxnStatus" AS ENUM ('PENDING', 'MATCHED', 'RECONCILED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "assets"."DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'UNITS_OF_PRODUCTION');

-- CreateEnum
CREATE TYPE "assets"."AssetStatus" AS ENUM ('ACTIVE', 'DISPOSED', 'UNDER_MAINTENANCE', 'FULLY_DEPRECIATED');

-- CreateEnum
CREATE TYPE "assets"."MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'INSPECTION');

-- CreateEnum
CREATE TYPE "assets"."MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "assets"."DisposalMethod" AS ENUM ('SOLD', 'SCRAPPED', 'DONATED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "assets"."AssetCondition" AS ENUM ('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "assets"."AssignmentType" AS ENUM ('EMPLOYEE', 'DEPARTMENT', 'LOCATION');

-- CreateEnum
CREATE TYPE "assets"."MaintenanceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "assets"."DisposalStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "assets"."TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "assets"."AuditStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "assets"."AuditScope" AS ENUM ('FULL', 'LOCATION', 'CATEGORY', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "comms"."MeetingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "comms"."ChatSessionStatus" AS ENUM ('WAITING', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "hr"."EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- CreateEnum
CREATE TYPE "hr"."EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "hr"."LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "hr"."AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "hr"."PayrollRunStatus" AS ENUM ('DRAFT', 'CALCULATING', 'PENDING_APPROVAL', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "hr"."PaySlipStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "hr"."BenefitType" AS ENUM ('HEALTH', 'DENTAL', 'VISION', 'RETIREMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "manufacturing"."WorkCenterStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "manufacturing"."WorkOrderStatus" AS ENUM ('DRAFT', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "manufacturing"."OperationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "manufacturing"."MRPStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "platform"."NotificationType" AS ENUM ('DEAL_WON', 'DEAL_LOST', 'TICKET_ASSIGNED', 'TICKET_OVERDUE', 'INVOICE_OVERDUE', 'APPROVAL_REQUIRED', 'LEAVE_REQUEST', 'PAYROLL_APPROVED', 'SYSTEM', 'MENTION');

-- CreateEnum
CREATE TYPE "platform"."NotificationCategory" AS ENUM ('SALES', 'SUPPORT', 'BILLING', 'HR', 'INVENTORY', 'PROJECTS', 'SYSTEM', 'GENERAL');

-- CreateEnum
CREATE TYPE "pos"."POSTerminalStatus" AS ENUM ('ONLINE', 'OFFLINE', 'CLOSED');

-- CreateEnum
CREATE TYPE "pos"."POSSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "pos"."POSOrderStatus" AS ENUM ('OPEN', 'PAID', 'REFUNDED', 'VOID');

-- CreateEnum
CREATE TYPE "pos"."POSPaymentMethod" AS ENUM ('CASH', 'CARD', 'MOBILE', 'LOYALTY_POINTS', 'SPLIT');

-- CreateEnum
CREATE TYPE "pos"."POSPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "pos"."RestaurantTableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING');

-- CreateEnum
CREATE TYPE "pos"."KitchenOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'SERVED');

-- CreateEnum
CREATE TYPE "pos"."KitchenOrderItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "procurement"."SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "procurement"."PurchaseRequisitionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PO_CREATED');

-- CreateEnum
CREATE TYPE "procurement"."RFQStatus" AS ENUM ('DRAFT', 'SENT', 'RESPONSES_RECEIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "procurement"."ProcurementPOStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "procurement"."GoodsReceiptStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "quality"."InspectionType" AS ENUM ('INCOMING', 'IN_PROCESS', 'FINAL', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "quality"."ChecklistItemType" AS ENUM ('PASS_FAIL', 'NUMERIC', 'TEXT');

-- CreateEnum
CREATE TYPE "quality"."InspectionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'WAIVED');

-- CreateEnum
CREATE TYPE "quality"."InspectionResult" AS ENUM ('PASS', 'FAIL', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "quality"."NcrSeverity" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "quality"."NcrStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "quality"."CorrectiveActionType" AS ENUM ('CORRECTIVE', 'PREVENTIVE');

-- CreateEnum
CREATE TYPE "quality"."CorrectiveActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "sales"."TargetPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "sales"."TargetMetric" AS ENUM ('DEALS_WON', 'REVENUE', 'ACTIVITIES', 'LEADS_CONVERTED', 'MEETINGS_BOOKED');

-- CreateEnum
CREATE TYPE "warehouse"."WarehouseStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "warehouse"."LocationType" AS ENUM ('RECEIVING', 'STORAGE', 'PICKING', 'SHIPPING', 'QUARANTINE');

-- CreateEnum
CREATE TYPE "warehouse"."StockLotStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'QUARANTINE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "warehouse"."StockMoveType" AS ENUM ('RECEIPT', 'DELIVERY', 'INTERNAL', 'ADJUSTMENT', 'RETURN');

-- CreateEnum
CREATE TYPE "warehouse"."StockMoveStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "warehouse"."PickListStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "warehouse"."PickListLineStatus" AS ENUM ('PENDING', 'PARTIAL', 'DONE');

-- CreateEnum
CREATE TYPE "warehouse"."ShipmentStatus" AS ENUM ('PENDING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED');

-- CreateEnum
CREATE TYPE "warehouse"."CycleCountStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "warehouse"."PackOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PACKED', 'SHIPPED');

-- AlterTable
ALTER TABLE "accounting"."journal_entries" ADD COLUMN     "company_id" UUID;

-- AlterTable
ALTER TABLE "accounting"."journal_lines" ADD COLUMN     "cost_center_id" UUID;

-- AlterTable
ALTER TABLE "sales"."leads" ADD COLUMN     "last_scored_at" TIMESTAMP(3),
ADD COLUMN     "score_breakdown" JSONB;

-- CreateTable
CREATE TABLE "accounting"."companies" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "base_currency" "platform"."Currency" NOT NULL DEFAULT 'USD',
    "fiscal_year_end" INTEGER NOT NULL DEFAULT 12,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "address" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."budgets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "year" INTEGER NOT NULL,
    "period" "accounting"."BudgetPeriod" NOT NULL DEFAULT 'MONTHLY',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."budget_lines" (
    "id" UUID NOT NULL,
    "budget_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."cost_centers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "parent_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."exchange_rates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "from_currency" "platform"."Currency" NOT NULL,
    "to_currency" "platform"."Currency" NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "effective_date" DATE NOT NULL,
    "source" VARCHAR(50) NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."bank_transactions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "external_id" VARCHAR(255),
    "date" DATE NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" "platform"."Currency" NOT NULL DEFAULT 'USD',
    "category" VARCHAR(100),
    "status" "accounting"."BankTxnStatus" NOT NULL DEFAULT 'PENDING',
    "matched_account_id" UUID,
    "journal_entry_id" UUID,
    "plaid_txn_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets"."asset_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "useful_life_years" INTEGER NOT NULL,
    "salvage_value_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "depreciation_method" "assets"."DepreciationMethod" NOT NULL,
    "gl_account_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets"."fixed_assets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "asset_number" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category_id" UUID NOT NULL,
    "serial_number" VARCHAR(200),
    "purchase_date" DATE NOT NULL,
    "purchase_price" DECIMAL(15,2) NOT NULL,
    "current_book_value" DECIMAL(15,2) NOT NULL,
    "salvage_value" DECIMAL(15,2) NOT NULL,
    "useful_life_years" INTEGER NOT NULL,
    "depreciation_method" "assets"."DepreciationMethod" NOT NULL,
    "total_units_expected" DECIMAL(15,4),
    "total_units_produced" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "location_id" VARCHAR(100),
    "department_id" UUID,
    "assigned_to" UUID,
    "condition" "assets"."AssetCondition" NOT NULL DEFAULT 'NEW',
    "status" "assets"."AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "purchase_invoice_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets"."depreciation_schedules" (
    "id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "opening_value" DECIMAL(15,2) NOT NULL,
    "depreciation_charge" DECIMAL(15,2) NOT NULL,
    "closing_value" DECIMAL(15,2) NOT NULL,
    "is_posted" BOOLEAN NOT NULL DEFAULT false,
    "journal_entry_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depreciation_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets"."asset_maintenance" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "type" "assets"."MaintenanceType" NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "completed_date" DATE,
    "cost" DECIMAL(15,2),
    "vendor" VARCHAR(255),
    "description" TEXT NOT NULL,
    "status" "assets"."MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "asset_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets"."maintenance_schedules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "maintenance_type" "assets"."MaintenanceType" NOT NULL,
    "frequency" "assets"."MaintenanceFrequency" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "last_scheduled_date" DATE,
    "next_scheduled_date" DATE,
    "estimated_cost" DECIMAL(15,2),
    "vendor" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets"."asset_transfers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "transfer_number" VARCHAR(50) NOT NULL,
    "from_location_id" VARCHAR(100),
    "to_location_id" VARCHAR(100),
    "from_department_id" UUID,
    "to_department_id" UUID,
    "from_assigned_to" UUID,
    "to_assigned_to" UUID,
    "transfer_date" DATE NOT NULL,
    "effective_date" DATE NOT NULL,
    "reason" TEXT,
    "status" "assets"."TransferStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "asset_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets"."asset_audits" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "audit_number" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "scope" "assets"."AuditScope" NOT NULL DEFAULT 'FULL',
    "scope_filter" JSONB,
    "scheduled_date" DATE NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" "assets"."AuditStatus" NOT NULL DEFAULT 'SCHEDULED',
    "total_assets" INTEGER NOT NULL DEFAULT 0,
    "assets_verified" INTEGER NOT NULL DEFAULT 0,
    "assets_missing" INTEGER NOT NULL DEFAULT 0,
    "assets_found" INTEGER NOT NULL DEFAULT 0,
    "discrepancies" INTEGER NOT NULL DEFAULT 0,
    "findings" TEXT,
    "recommendations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "conducted_by" UUID,

    CONSTRAINT "asset_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets"."asset_audit_lines" (
    "id" UUID NOT NULL,
    "audit_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "expected_location" VARCHAR(100),
    "actual_location" VARCHAR(100),
    "expected_condition" "assets"."AssetCondition",
    "actual_condition" "assets"."AssetCondition",
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_discrepancy" BOOLEAN NOT NULL DEFAULT false,
    "discrepancy_type" VARCHAR(50),
    "notes" TEXT,
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_audit_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets"."asset_disposals" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "disposal_number" VARCHAR(50) NOT NULL,
    "disposal_date" DATE NOT NULL,
    "disposal_method" "assets"."DisposalMethod" NOT NULL,
    "status" "assets"."DisposalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "book_value_at_disposal" DECIMAL(15,2) NOT NULL,
    "proceeds_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "disposal_costs" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "gain_loss" DECIMAL(15,2) NOT NULL,
    "buyer_name" VARCHAR(255),
    "buyer_contact" VARCHAR(255),
    "invoice_id" UUID,
    "reason" TEXT,
    "notes" TEXT,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "journal_entry_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "asset_disposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comms"."availability_slots" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comms"."booked_meetings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "host_user_id" UUID NOT NULL,
    "contact_id" UUID,
    "deal_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "location" VARCHAR(500),
    "meeting_url" VARCHAR(500),
    "status" "comms"."MeetingStatus" NOT NULL DEFAULT 'PENDING',
    "guest_email" VARCHAR(255),
    "guest_name" VARCHAR(200),
    "booking_link" VARCHAR(100),
    "notes" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booked_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comms"."chat_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "visitor_id" VARCHAR(100) NOT NULL,
    "visitor_name" VARCHAR(200),
    "visitor_email" VARCHAR(255),
    "agent_id" UUID,
    "contact_id" UUID,
    "status" "comms"."ChatSessionStatus" NOT NULL DEFAULT 'WAITING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "rating" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comms"."chat_messages" (
    "id" UUID NOT NULL,
    "chat_session_id" UUID NOT NULL,
    "sender_type" VARCHAR(20) NOT NULL,
    "sender_id" UUID,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."departments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "parent_department_id" UUID,
    "manager_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."positions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "department_id" UUID,
    "min_salary" DECIMAL(15,2),
    "max_salary" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."employees" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "employee_number" VARCHAR(50) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "department_id" UUID,
    "position_id" UUID,
    "manager_id" UUID,
    "employment_type" "hr"."EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "status" "hr"."EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "hire_date" DATE NOT NULL,
    "termination_date" DATE,
    "avatar_url" VARCHAR(500),
    "address" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."leave_types" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "max_days_per_year" INTEGER NOT NULL,
    "carry_over" BOOLEAN NOT NULL DEFAULT false,
    "paid_leave" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."leave_requests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "days" DECIMAL(5,1) NOT NULL,
    "reason" TEXT,
    "status" "hr"."LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."attendance" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "hours_worked" DECIMAL(5,2),
    "status" "hr"."AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."payroll_structures" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "components" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."payroll_runs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "payroll_structure_id" UUID,
    "status" "hr"."PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "total_gross" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_net" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."pay_slips" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "payroll_run_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "gross_pay" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "deductions" JSONB NOT NULL,
    "net_pay" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "components" JSONB NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "hr"."PaySlipStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_slips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."benefits" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "hr"."BenefitType" NOT NULL,
    "employer_contribution" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "employee_contribution" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."tax_brackets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "min_income" DECIMAL(15,2) NOT NULL,
    "max_income" DECIMAL(15,2),
    "rate" DECIMAL(5,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturing"."bills_of_material" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "bom_version" VARCHAR(50) NOT NULL DEFAULT '1.0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "total_cost" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "bills_of_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturing"."bom_lines" (
    "id" UUID NOT NULL,
    "bom_id" UUID NOT NULL,
    "component_product_id" UUID NOT NULL,
    "description" VARCHAR(500),
    "quantity" DECIMAL(15,4) NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "unit_cost" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(15,4) NOT NULL DEFAULT 0,

    CONSTRAINT "bom_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturing"."work_centers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "capacity" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "capacity_unit" VARCHAR(50) NOT NULL DEFAULT 'hours',
    "cost_per_hour" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "status" "manufacturing"."WorkCenterStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturing"."work_orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "work_order_number" VARCHAR(50) NOT NULL,
    "bom_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "planned_quantity" DECIMAL(15,4) NOT NULL,
    "produced_quantity" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "status" "manufacturing"."WorkOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "planned_start_date" DATE,
    "planned_end_date" DATE,
    "actual_start_date" TIMESTAMP(3),
    "actual_end_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturing"."work_order_operations" (
    "id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "work_center_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "planned_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "actual_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "manufacturing"."OperationStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "work_order_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturing"."material_consumptions" (
    "id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "component_product_id" UUID NOT NULL,
    "planned_qty" DECIMAL(15,4) NOT NULL,
    "consumed_qty" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "unit" VARCHAR(50) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "consumed_by" UUID,

    CONSTRAINT "material_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturing"."production_outputs" (
    "id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "lot_number" VARCHAR(100),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by" UUID,
    "warehouse_location_id" UUID,

    CONSTRAINT "production_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturing"."mrp_runs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "run_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horizon" INTEGER NOT NULL DEFAULT 30,
    "status" "manufacturing"."MRPStatus" NOT NULL DEFAULT 'RUNNING',
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "mrp_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."notifications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "platform"."NotificationType" NOT NULL,
    "category" "platform"."NotificationCategory" NOT NULL DEFAULT 'GENERAL',
    "title" VARCHAR(255) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "action_url" VARCHAR(500),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."notification_preferences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category" "platform"."NotificationCategory" NOT NULL,
    "in_app" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos"."pos_terminals" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "warehouse_id" UUID,
    "status" "pos"."POSTerminalStatus" NOT NULL DEFAULT 'OFFLINE',
    "current_session_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_terminals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos"."pos_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "terminal_id" UUID NOT NULL,
    "cashier_id" UUID NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "opening_cash" DECIMAL(15,2) NOT NULL,
    "closing_cash" DECIMAL(15,2),
    "expected_cash" DECIMAL(15,2),
    "variance" DECIMAL(15,2),
    "status" "pos"."POSSessionStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos"."pos_orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "order_number" VARCHAR(50) NOT NULL,
    "status" "pos"."POSOrderStatus" NOT NULL DEFAULT 'OPEN',
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" "platform"."Currency" NOT NULL DEFAULT 'USD',
    "customer_id" UUID,
    "loyalty_points_earned" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "pos_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos"."pos_order_lines" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(15,2) NOT NULL,
    "modifiers" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "pos_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos"."pos_payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "method" "pos"."POSPaymentMethod" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reference" VARCHAR(200),
    "processed_at" TIMESTAMP(3) NOT NULL,
    "status" "pos"."POSPaymentStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "pos_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos"."loyalty_programs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "points_per_currency" DECIMAL(10,4) NOT NULL,
    "points_redemption_rate" DECIMAL(10,6) NOT NULL,
    "min_redemption" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos"."customer_loyalty" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "lifetime_points" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_loyalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos"."restaurant_tables" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "table_number" VARCHAR(20) NOT NULL,
    "section" VARCHAR(100),
    "capacity" INTEGER NOT NULL,
    "status" "pos"."RestaurantTableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "current_order_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos"."kitchen_orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "table_id" UUID,
    "ticket_number" VARCHAR(50) NOT NULL,
    "status" "pos"."KitchenOrderStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "printed_at" TIMESTAMP(3),
    "ready_at" TIMESTAMP(3),
    "served_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos"."kitchen_order_items" (
    "id" UUID NOT NULL,
    "kitchen_order_id" UUID NOT NULL,
    "order_line_id" UUID NOT NULL,
    "product_name" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "course" VARCHAR(50),
    "modifiers" JSONB NOT NULL DEFAULT '[]',
    "status" "pos"."KitchenOrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "done_at" TIMESTAMP(3),

    CONSTRAINT "kitchen_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement"."suppliers" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "contact_name" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "website" VARCHAR(255),
    "address" JSONB,
    "payment_terms" VARCHAR(255),
    "currency" "platform"."Currency" NOT NULL DEFAULT 'USD',
    "rating" DECIMAL(3,2),
    "status" "procurement"."SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(30),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement"."supplier_products" (
    "id" VARCHAR(30) NOT NULL,
    "supplier_id" VARCHAR(30) NOT NULL,
    "product_id" UUID NOT NULL,
    "supplier_sku" VARCHAR(100),
    "unit_price" DECIMAL(15,2) NOT NULL,
    "min_order_qty" DECIMAL(15,4) NOT NULL,
    "lead_time_days" INTEGER NOT NULL,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement"."purchase_requisitions" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "req_number" VARCHAR(50) NOT NULL,
    "requested_by" UUID NOT NULL,
    "department_id" UUID,
    "status" "procurement"."PurchaseRequisitionStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by" VARCHAR(30),
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "purchase_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement"."purchase_requisition_lines" (
    "id" VARCHAR(30) NOT NULL,
    "requisition_id" VARCHAR(30) NOT NULL,
    "product_id" UUID NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "estimated_unit_price" DECIMAL(15,2) NOT NULL,
    "required_by_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requisition_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement"."rfqs" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "rfq_number" VARCHAR(50) NOT NULL,
    "requisition_id" VARCHAR(30),
    "status" "procurement"."RFQStatus" NOT NULL DEFAULT 'DRAFT',
    "valid_until" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(30),

    CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement"."rfq_suppliers" (
    "id" VARCHAR(30) NOT NULL,
    "rfq_id" VARCHAR(30) NOT NULL,
    "supplier_id" VARCHAR(30) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "response_received_at" TIMESTAMP(3),
    "quoted_price" DECIMAL(15,2),
    "quoted_lead_time_days" INTEGER,
    "notes" TEXT,

    CONSTRAINT "rfq_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement"."procurement_purchase_orders" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "po_number" VARCHAR(50) NOT NULL,
    "supplier_id" VARCHAR(30) NOT NULL,
    "requisition_id" VARCHAR(30),
    "status" "procurement"."ProcurementPOStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" "platform"."Currency" NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "expected_delivery_date" TIMESTAMP(3),
    "approval_status" "platform"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" VARCHAR(30),
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(30),
    "updated_by" VARCHAR(30),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "procurement_purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement"."procurement_po_lines" (
    "id" VARCHAR(30) NOT NULL,
    "po_id" VARCHAR(30) NOT NULL,
    "product_id" UUID NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(15,2) NOT NULL,
    "received_qty" DECIMAL(15,4) NOT NULL DEFAULT 0,

    CONSTRAINT "procurement_po_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement"."goods_receipts" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "po_id" VARCHAR(30) NOT NULL,
    "receipt_number" VARCHAR(50) NOT NULL,
    "received_by" VARCHAR(30) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "warehouse_id" UUID,
    "notes" TEXT,
    "status" "procurement"."GoodsReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(30),

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement"."goods_receipt_lines" (
    "id" VARCHAR(30) NOT NULL,
    "receipt_id" VARCHAR(30) NOT NULL,
    "po_line_id" VARCHAR(30) NOT NULL,
    "product_id" UUID NOT NULL,
    "received_qty" DECIMAL(15,4) NOT NULL,
    "lot_number" VARCHAR(100),
    "notes" TEXT,

    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement"."supplier_ratings" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "supplier_id" VARCHAR(30) NOT NULL,
    "po_id" VARCHAR(30),
    "quality_score" DECIMAL(3,2) NOT NULL,
    "delivery_score" DECIMAL(3,2) NOT NULL,
    "price_score" DECIMAL(3,2) NOT NULL,
    "overall_score" DECIMAL(3,2) NOT NULL,
    "comments" TEXT,
    "rated_by" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality"."InspectionTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "quality"."InspectionType" NOT NULL,
    "description" TEXT,
    "checklistItems" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality"."Inspection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL,
    "type" "quality"."InspectionType" NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "productId" TEXT,
    "lotNumber" TEXT,
    "batchSize" INTEGER,
    "sampledUnits" INTEGER,
    "status" "quality"."InspectionStatus" NOT NULL DEFAULT 'PENDING',
    "inspectorId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "conductedDate" TIMESTAMP(3),
    "overallResult" "quality"."InspectionResult",
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality"."InspectionResultItem" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "resultType" "quality"."ChecklistItemType" NOT NULL,
    "passFail" BOOLEAN,
    "numericValue" DECIMAL(65,30),
    "textValue" TEXT,
    "isPassing" BOOLEAN NOT NULL,
    "notes" TEXT,

    CONSTRAINT "InspectionResultItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality"."NonConformanceReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ncrNumber" TEXT NOT NULL,
    "inspectionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "quality"."NcrSeverity" NOT NULL,
    "productId" TEXT,
    "supplierId" TEXT,
    "status" "quality"."NcrStatus" NOT NULL DEFAULT 'OPEN',
    "rootCause" TEXT,
    "immediateAction" TEXT,
    "detectedBy" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "NonConformanceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality"."CorrectiveAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ncrId" TEXT NOT NULL,
    "actionType" "quality"."CorrectiveActionType" NOT NULL,
    "description" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" "quality"."CorrectiveActionStatus" NOT NULL DEFAULT 'OPEN',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality"."SupplierQualityScore" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalInspections" INTEGER NOT NULL DEFAULT 0,
    "passedInspections" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "ncrCount" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierQualityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."sales_targets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "period" "sales"."TargetPeriod" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "metric" "sales"."TargetMetric" NOT NULL,
    "target_value" DECIMAL(15,2) NOT NULL,
    "actual_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."badges" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "icon" VARCHAR(50) NOT NULL,
    "criteria" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."user_badges" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."leaderboard_entries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "period" VARCHAR(20) NOT NULL,
    "period_start" DATE NOT NULL,
    "deals_won" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "activities" INTEGER NOT NULL DEFAULT 0,
    "leads_converted" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboard_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."social_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "profile_url" VARCHAR(500) NOT NULL,
    "profile_data" JSONB,
    "enriched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."social_activities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "social_profile_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "content" TEXT,
    "engagement_score" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."wh_warehouses" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "address" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "warehouse"."WarehouseStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(30),

    CONSTRAINT "wh_warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."wh_locations" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "warehouse_id" VARCHAR(30) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "type" "warehouse"."LocationType" NOT NULL,
    "zone" VARCHAR(50),
    "aisle" VARCHAR(20),
    "rack" VARCHAR(20),
    "bin" VARCHAR(20),
    "max_capacity" DECIMAL(15,3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wh_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."wh_stock_lots" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "warehouse_id" VARCHAR(30) NOT NULL,
    "location_id" VARCHAR(30),
    "lot_number" VARCHAR(100) NOT NULL,
    "serial_number" VARCHAR(100),
    "quantity" DECIMAL(15,3) NOT NULL,
    "reserved_qty" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "expiry_date" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL,
    "status" "warehouse"."StockLotStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "wh_stock_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."wh_stock_moves" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "reference" VARCHAR(100) NOT NULL,
    "move_type" "warehouse"."StockMoveType" NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "warehouse_id" VARCHAR(30) NOT NULL,
    "lot_id" VARCHAR(30),
    "from_location_id" VARCHAR(30),
    "to_location_id" VARCHAR(30),
    "planned_qty" DECIMAL(15,3) NOT NULL,
    "done_qty" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "status" "warehouse"."StockMoveStatus" NOT NULL DEFAULT 'DRAFT',
    "source_document" VARCHAR(100),
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "done_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(30),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "wh_stock_moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."wh_pick_lists" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "warehouse_id" VARCHAR(30) NOT NULL,
    "source_order_id" VARCHAR(30),
    "source_order_type" VARCHAR(20),
    "status" "warehouse"."PickListStatus" NOT NULL DEFAULT 'DRAFT',
    "assigned_to" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(30),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "wh_pick_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."wh_pick_list_lines" (
    "id" VARCHAR(30) NOT NULL,
    "pick_list_id" VARCHAR(30) NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "location_id" VARCHAR(30) NOT NULL,
    "lot_id" VARCHAR(30),
    "requested_qty" DECIMAL(15,3) NOT NULL,
    "picked_qty" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "status" "warehouse"."PickListLineStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "wh_pick_list_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."wh_shipments" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "warehouse_id" VARCHAR(30) NOT NULL,
    "pick_list_id" VARCHAR(30),
    "carrier" VARCHAR(100),
    "tracking_number" VARCHAR(100),
    "shipped_at" TIMESTAMP(3),
    "estimated_delivery" TIMESTAMP(3),
    "status" "warehouse"."ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "recipient_name" VARCHAR(255) NOT NULL,
    "recipient_address" JSONB NOT NULL DEFAULT '{}',
    "weight" DECIMAL(10,3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(30),

    CONSTRAINT "wh_shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."wh_cycle_counts" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "warehouse_id" VARCHAR(30) NOT NULL,
    "location_id" VARCHAR(30),
    "status" "warehouse"."CycleCountStatus" NOT NULL DEFAULT 'DRAFT',
    "counted_by" VARCHAR(30) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "discrepancies" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(30),

    CONSTRAINT "wh_cycle_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."wh_serial_numbers" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "serial_number" VARCHAR(100) NOT NULL,
    "lot_id" VARCHAR(30),
    "warehouse_id" VARCHAR(30) NOT NULL,
    "location_id" VARCHAR(30),
    "status" "warehouse"."StockLotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "received_at" TIMESTAMP(3) NOT NULL,
    "shipped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wh_serial_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."wh_pack_orders" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "warehouse_id" VARCHAR(30) NOT NULL,
    "pick_list_id" VARCHAR(30),
    "shipment_id" VARCHAR(30),
    "status" "warehouse"."PackOrderStatus" NOT NULL DEFAULT 'PENDING',
    "packed_by" VARCHAR(30),
    "packed_at" TIMESTAMP(3),
    "total_weight" DECIMAL(10,3),
    "box_count" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(30),

    CONSTRAINT "wh_pack_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."wh_pack_order_lines" (
    "id" VARCHAR(30) NOT NULL,
    "pack_order_id" VARCHAR(30) NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "box_number" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "wh_pack_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "companies_tenant_id_idx" ON "accounting"."companies"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_tenant_id_code_key" ON "accounting"."companies"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "budgets_tenant_id_idx" ON "accounting"."budgets"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_tenant_id_company_id_name_year_key" ON "accounting"."budgets"("tenant_id", "company_id", "name", "year");

-- CreateIndex
CREATE INDEX "budget_lines_budget_id_idx" ON "accounting"."budget_lines"("budget_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_lines_budget_id_account_id_month_key" ON "accounting"."budget_lines"("budget_id", "account_id", "month");

-- CreateIndex
CREATE INDEX "cost_centers_tenant_id_idx" ON "accounting"."cost_centers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_tenant_id_company_id_code_key" ON "accounting"."cost_centers"("tenant_id", "company_id", "code");

-- CreateIndex
CREATE INDEX "exchange_rates_tenant_id_company_id_from_currency_to_curren_idx" ON "accounting"."exchange_rates"("tenant_id", "company_id", "from_currency", "to_currency", "effective_date");

-- CreateIndex
CREATE INDEX "bank_transactions_tenant_id_company_id_status_idx" ON "accounting"."bank_transactions"("tenant_id", "company_id", "status");

-- CreateIndex
CREATE INDEX "bank_transactions_tenant_id_bank_account_id_date_idx" ON "accounting"."bank_transactions"("tenant_id", "bank_account_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_tenant_id_external_id_key" ON "accounting"."bank_transactions"("tenant_id", "external_id");

-- CreateIndex
CREATE INDEX "asset_categories_tenant_id_idx" ON "assets"."asset_categories"("tenant_id");

-- CreateIndex
CREATE INDEX "fixed_assets_tenant_id_idx" ON "assets"."fixed_assets"("tenant_id");

-- CreateIndex
CREATE INDEX "fixed_assets_tenant_id_status_idx" ON "assets"."fixed_assets"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "fixed_assets_tenant_id_category_id_idx" ON "assets"."fixed_assets"("tenant_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_tenant_id_asset_number_key" ON "assets"."fixed_assets"("tenant_id", "asset_number");

-- CreateIndex
CREATE INDEX "depreciation_schedules_asset_id_idx" ON "assets"."depreciation_schedules"("asset_id");

-- CreateIndex
CREATE INDEX "depreciation_schedules_asset_id_is_posted_idx" ON "assets"."depreciation_schedules"("asset_id", "is_posted");

-- CreateIndex
CREATE INDEX "asset_maintenance_tenant_id_idx" ON "assets"."asset_maintenance"("tenant_id");

-- CreateIndex
CREATE INDEX "asset_maintenance_asset_id_idx" ON "assets"."asset_maintenance"("asset_id");

-- CreateIndex
CREATE INDEX "asset_maintenance_tenant_id_status_idx" ON "assets"."asset_maintenance"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "maintenance_schedules_tenant_id_idx" ON "assets"."maintenance_schedules"("tenant_id");

-- CreateIndex
CREATE INDEX "maintenance_schedules_asset_id_idx" ON "assets"."maintenance_schedules"("asset_id");

-- CreateIndex
CREATE INDEX "maintenance_schedules_tenant_id_next_scheduled_date_idx" ON "assets"."maintenance_schedules"("tenant_id", "next_scheduled_date");

-- CreateIndex
CREATE INDEX "asset_transfers_tenant_id_idx" ON "assets"."asset_transfers"("tenant_id");

-- CreateIndex
CREATE INDEX "asset_transfers_asset_id_idx" ON "assets"."asset_transfers"("asset_id");

-- CreateIndex
CREATE INDEX "asset_transfers_tenant_id_status_idx" ON "assets"."asset_transfers"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "asset_transfers_tenant_id_transfer_number_key" ON "assets"."asset_transfers"("tenant_id", "transfer_number");

-- CreateIndex
CREATE INDEX "asset_audits_tenant_id_idx" ON "assets"."asset_audits"("tenant_id");

-- CreateIndex
CREATE INDEX "asset_audits_tenant_id_status_idx" ON "assets"."asset_audits"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "asset_audits_tenant_id_audit_number_key" ON "assets"."asset_audits"("tenant_id", "audit_number");

-- CreateIndex
CREATE INDEX "asset_audit_lines_audit_id_idx" ON "assets"."asset_audit_lines"("audit_id");

-- CreateIndex
CREATE INDEX "asset_audit_lines_asset_id_idx" ON "assets"."asset_audit_lines"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_audit_lines_audit_id_asset_id_key" ON "assets"."asset_audit_lines"("audit_id", "asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_disposals_asset_id_key" ON "assets"."asset_disposals"("asset_id");

-- CreateIndex
CREATE INDEX "asset_disposals_tenant_id_idx" ON "assets"."asset_disposals"("tenant_id");

-- CreateIndex
CREATE INDEX "asset_disposals_tenant_id_status_idx" ON "assets"."asset_disposals"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "asset_disposals_tenant_id_disposal_number_key" ON "assets"."asset_disposals"("tenant_id", "disposal_number");

-- CreateIndex
CREATE INDEX "availability_slots_tenant_id_user_id_idx" ON "comms"."availability_slots"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "booked_meetings_tenant_id_host_user_id_start_time_idx" ON "comms"."booked_meetings"("tenant_id", "host_user_id", "start_time");

-- CreateIndex
CREATE INDEX "booked_meetings_tenant_id_contact_id_idx" ON "comms"."booked_meetings"("tenant_id", "contact_id");

-- CreateIndex
CREATE INDEX "booked_meetings_tenant_id_status_idx" ON "comms"."booked_meetings"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "chat_sessions_tenant_id_status_idx" ON "comms"."chat_sessions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "chat_sessions_tenant_id_agent_id_idx" ON "comms"."chat_sessions"("tenant_id", "agent_id");

-- CreateIndex
CREATE INDEX "chat_sessions_tenant_id_visitor_id_idx" ON "comms"."chat_sessions"("tenant_id", "visitor_id");

-- CreateIndex
CREATE INDEX "chat_messages_chat_session_id_created_at_idx" ON "comms"."chat_messages"("chat_session_id", "created_at");

-- CreateIndex
CREATE INDEX "departments_tenant_id_idx" ON "hr"."departments"("tenant_id");

-- CreateIndex
CREATE INDEX "departments_tenant_id_parent_department_id_idx" ON "hr"."departments"("tenant_id", "parent_department_id");

-- CreateIndex
CREATE INDEX "positions_tenant_id_idx" ON "hr"."positions"("tenant_id");

-- CreateIndex
CREATE INDEX "positions_tenant_id_department_id_idx" ON "hr"."positions"("tenant_id", "department_id");

-- CreateIndex
CREATE INDEX "employees_tenant_id_idx" ON "hr"."employees"("tenant_id");

-- CreateIndex
CREATE INDEX "employees_tenant_id_status_idx" ON "hr"."employees"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "employees_tenant_id_department_id_idx" ON "hr"."employees"("tenant_id", "department_id");

-- CreateIndex
CREATE INDEX "employees_tenant_id_manager_id_idx" ON "hr"."employees"("tenant_id", "manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenant_id_employee_number_key" ON "hr"."employees"("tenant_id", "employee_number");

-- CreateIndex
CREATE INDEX "leave_types_tenant_id_idx" ON "hr"."leave_types"("tenant_id");

-- CreateIndex
CREATE INDEX "leave_requests_tenant_id_idx" ON "hr"."leave_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "leave_requests_tenant_id_employee_id_idx" ON "hr"."leave_requests"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "leave_requests_tenant_id_status_idx" ON "hr"."leave_requests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "leave_requests_tenant_id_employee_id_status_idx" ON "hr"."leave_requests"("tenant_id", "employee_id", "status");

-- CreateIndex
CREATE INDEX "attendance_tenant_id_idx" ON "hr"."attendance"("tenant_id");

-- CreateIndex
CREATE INDEX "attendance_tenant_id_employee_id_idx" ON "hr"."attendance"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "attendance_tenant_id_date_idx" ON "hr"."attendance"("tenant_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_tenant_id_employee_id_date_key" ON "hr"."attendance"("tenant_id", "employee_id", "date");

-- CreateIndex
CREATE INDEX "payroll_structures_tenant_id_idx" ON "hr"."payroll_structures"("tenant_id");

-- CreateIndex
CREATE INDEX "payroll_runs_tenant_id_idx" ON "hr"."payroll_runs"("tenant_id");

-- CreateIndex
CREATE INDEX "payroll_runs_tenant_id_status_idx" ON "hr"."payroll_runs"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_tenant_id_period_key" ON "hr"."payroll_runs"("tenant_id", "period");

-- CreateIndex
CREATE INDEX "pay_slips_tenant_id_idx" ON "hr"."pay_slips"("tenant_id");

-- CreateIndex
CREATE INDEX "pay_slips_tenant_id_payroll_run_id_idx" ON "hr"."pay_slips"("tenant_id", "payroll_run_id");

-- CreateIndex
CREATE INDEX "pay_slips_tenant_id_employee_id_idx" ON "hr"."pay_slips"("tenant_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "pay_slips_payroll_run_id_employee_id_key" ON "hr"."pay_slips"("payroll_run_id", "employee_id");

-- CreateIndex
CREATE INDEX "benefits_tenant_id_idx" ON "hr"."benefits"("tenant_id");

-- CreateIndex
CREATE INDEX "benefits_tenant_id_type_idx" ON "hr"."benefits"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "tax_brackets_tenant_id_idx" ON "hr"."tax_brackets"("tenant_id");

-- CreateIndex
CREATE INDEX "bills_of_material_tenant_id_idx" ON "manufacturing"."bills_of_material"("tenant_id");

-- CreateIndex
CREATE INDEX "bills_of_material_tenant_id_product_id_idx" ON "manufacturing"."bills_of_material"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "bills_of_material_tenant_id_is_active_idx" ON "manufacturing"."bills_of_material"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "bom_lines_bom_id_idx" ON "manufacturing"."bom_lines"("bom_id");

-- CreateIndex
CREATE INDEX "bom_lines_component_product_id_idx" ON "manufacturing"."bom_lines"("component_product_id");

-- CreateIndex
CREATE INDEX "work_centers_tenant_id_idx" ON "manufacturing"."work_centers"("tenant_id");

-- CreateIndex
CREATE INDEX "work_centers_tenant_id_status_idx" ON "manufacturing"."work_centers"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_idx" ON "manufacturing"."work_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_status_idx" ON "manufacturing"."work_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_product_id_idx" ON "manufacturing"."work_orders"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_bom_id_idx" ON "manufacturing"."work_orders"("tenant_id", "bom_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_tenant_id_work_order_number_key" ON "manufacturing"."work_orders"("tenant_id", "work_order_number");

-- CreateIndex
CREATE INDEX "work_order_operations_work_order_id_idx" ON "manufacturing"."work_order_operations"("work_order_id");

-- CreateIndex
CREATE INDEX "work_order_operations_work_center_id_idx" ON "manufacturing"."work_order_operations"("work_center_id");

-- CreateIndex
CREATE INDEX "material_consumptions_work_order_id_idx" ON "manufacturing"."material_consumptions"("work_order_id");

-- CreateIndex
CREATE INDEX "material_consumptions_component_product_id_idx" ON "manufacturing"."material_consumptions"("component_product_id");

-- CreateIndex
CREATE INDEX "production_outputs_work_order_id_idx" ON "manufacturing"."production_outputs"("work_order_id");

-- CreateIndex
CREATE INDEX "production_outputs_product_id_idx" ON "manufacturing"."production_outputs"("product_id");

-- CreateIndex
CREATE INDEX "mrp_runs_tenant_id_idx" ON "manufacturing"."mrp_runs"("tenant_id");

-- CreateIndex
CREATE INDEX "mrp_runs_tenant_id_status_idx" ON "manufacturing"."mrp_runs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "mrp_runs_tenant_id_run_date_idx" ON "manufacturing"."mrp_runs"("tenant_id", "run_date");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_user_id_is_read_idx" ON "platform"."notifications"("tenant_id", "user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_user_id_created_at_idx" ON "platform"."notifications"("tenant_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_user_id_category_idx" ON "platform"."notifications"("tenant_id", "user_id", "category");

-- CreateIndex
CREATE INDEX "notification_preferences_tenant_id_user_id_idx" ON "platform"."notification_preferences"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_tenant_id_user_id_category_key" ON "platform"."notification_preferences"("tenant_id", "user_id", "category");

-- CreateIndex
CREATE INDEX "pos_terminals_tenant_id_idx" ON "pos"."pos_terminals"("tenant_id");

-- CreateIndex
CREATE INDEX "pos_terminals_tenant_id_status_idx" ON "pos"."pos_terminals"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "pos_sessions_tenant_id_idx" ON "pos"."pos_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "pos_sessions_tenant_id_terminal_id_idx" ON "pos"."pos_sessions"("tenant_id", "terminal_id");

-- CreateIndex
CREATE INDEX "pos_sessions_tenant_id_status_idx" ON "pos"."pos_sessions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "pos_orders_tenant_id_idx" ON "pos"."pos_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "pos_orders_tenant_id_session_id_idx" ON "pos"."pos_orders"("tenant_id", "session_id");

-- CreateIndex
CREATE INDEX "pos_orders_tenant_id_status_idx" ON "pos"."pos_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "pos_orders_tenant_id_customer_id_idx" ON "pos"."pos_orders"("tenant_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "pos_orders_tenant_id_order_number_key" ON "pos"."pos_orders"("tenant_id", "order_number");

-- CreateIndex
CREATE INDEX "pos_order_lines_order_id_idx" ON "pos"."pos_order_lines"("order_id");

-- CreateIndex
CREATE INDEX "pos_payments_order_id_idx" ON "pos"."pos_payments"("order_id");

-- CreateIndex
CREATE INDEX "loyalty_programs_tenant_id_idx" ON "pos"."loyalty_programs"("tenant_id");

-- CreateIndex
CREATE INDEX "loyalty_programs_tenant_id_is_active_idx" ON "pos"."loyalty_programs"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "customer_loyalty_tenant_id_idx" ON "pos"."customer_loyalty"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_loyalty_tenant_id_customer_id_idx" ON "pos"."customer_loyalty"("tenant_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_loyalty_tenant_id_customer_id_key" ON "pos"."customer_loyalty"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "restaurant_tables_tenant_id_idx" ON "pos"."restaurant_tables"("tenant_id");

-- CreateIndex
CREATE INDEX "restaurant_tables_tenant_id_status_idx" ON "pos"."restaurant_tables"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_tables_tenant_id_table_number_key" ON "pos"."restaurant_tables"("tenant_id", "table_number");

-- CreateIndex
CREATE INDEX "kitchen_orders_tenant_id_idx" ON "pos"."kitchen_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "kitchen_orders_tenant_id_order_id_idx" ON "pos"."kitchen_orders"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "kitchen_orders_tenant_id_status_idx" ON "pos"."kitchen_orders"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_orders_tenant_id_ticket_number_key" ON "pos"."kitchen_orders"("tenant_id", "ticket_number");

-- CreateIndex
CREATE INDEX "kitchen_order_items_kitchen_order_id_idx" ON "pos"."kitchen_order_items"("kitchen_order_id");

-- CreateIndex
CREATE INDEX "kitchen_order_items_order_line_id_idx" ON "pos"."kitchen_order_items"("order_line_id");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_status_idx" ON "procurement"."suppliers"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_name_idx" ON "procurement"."suppliers"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_tenant_id_code_key" ON "procurement"."suppliers"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "supplier_products_supplier_id_idx" ON "procurement"."supplier_products"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_products_supplier_id_product_id_key" ON "procurement"."supplier_products"("supplier_id", "product_id");

-- CreateIndex
CREATE INDEX "purchase_requisitions_tenant_id_status_idx" ON "procurement"."purchase_requisitions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "purchase_requisitions_tenant_id_requested_by_idx" ON "procurement"."purchase_requisitions"("tenant_id", "requested_by");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requisitions_tenant_id_req_number_key" ON "procurement"."purchase_requisitions"("tenant_id", "req_number");

-- CreateIndex
CREATE INDEX "purchase_requisition_lines_requisition_id_idx" ON "procurement"."purchase_requisition_lines"("requisition_id");

-- CreateIndex
CREATE INDEX "rfqs_tenant_id_status_idx" ON "procurement"."rfqs"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rfqs_tenant_id_rfq_number_key" ON "procurement"."rfqs"("tenant_id", "rfq_number");

-- CreateIndex
CREATE INDEX "rfq_suppliers_rfq_id_idx" ON "procurement"."rfq_suppliers"("rfq_id");

-- CreateIndex
CREATE INDEX "rfq_suppliers_supplier_id_idx" ON "procurement"."rfq_suppliers"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "rfq_suppliers_rfq_id_supplier_id_key" ON "procurement"."rfq_suppliers"("rfq_id", "supplier_id");

-- CreateIndex
CREATE INDEX "procurement_purchase_orders_tenant_id_status_idx" ON "procurement"."procurement_purchase_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "procurement_purchase_orders_tenant_id_supplier_id_idx" ON "procurement"."procurement_purchase_orders"("tenant_id", "supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_purchase_orders_tenant_id_po_number_key" ON "procurement"."procurement_purchase_orders"("tenant_id", "po_number");

-- CreateIndex
CREATE INDEX "procurement_po_lines_po_id_idx" ON "procurement"."procurement_po_lines"("po_id");

-- CreateIndex
CREATE INDEX "goods_receipts_tenant_id_status_idx" ON "procurement"."goods_receipts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "goods_receipts_tenant_id_po_id_idx" ON "procurement"."goods_receipts"("tenant_id", "po_id");

-- CreateIndex
CREATE INDEX "goods_receipt_lines_receipt_id_idx" ON "procurement"."goods_receipt_lines"("receipt_id");

-- CreateIndex
CREATE INDEX "goods_receipt_lines_po_line_id_idx" ON "procurement"."goods_receipt_lines"("po_line_id");

-- CreateIndex
CREATE INDEX "supplier_ratings_tenant_id_supplier_id_idx" ON "procurement"."supplier_ratings"("tenant_id", "supplier_id");

-- CreateIndex
CREATE INDEX "InspectionTemplate_tenantId_type_idx" ON "quality"."InspectionTemplate"("tenantId", "type");

-- CreateIndex
CREATE INDEX "InspectionTemplate_tenantId_isActive_idx" ON "quality"."InspectionTemplate"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Inspection_tenantId_status_idx" ON "quality"."Inspection"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Inspection_tenantId_type_idx" ON "quality"."Inspection"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Inspection_tenantId_productId_idx" ON "quality"."Inspection"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "Inspection_tenantId_inspectorId_idx" ON "quality"."Inspection"("tenantId", "inspectorId");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_tenantId_inspectionNumber_key" ON "quality"."Inspection"("tenantId", "inspectionNumber");

-- CreateIndex
CREATE INDEX "InspectionResultItem_inspectionId_idx" ON "quality"."InspectionResultItem"("inspectionId");

-- CreateIndex
CREATE INDEX "NonConformanceReport_tenantId_status_idx" ON "quality"."NonConformanceReport"("tenantId", "status");

-- CreateIndex
CREATE INDEX "NonConformanceReport_tenantId_severity_idx" ON "quality"."NonConformanceReport"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "NonConformanceReport_tenantId_supplierId_idx" ON "quality"."NonConformanceReport"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "NonConformanceReport_tenantId_productId_idx" ON "quality"."NonConformanceReport"("tenantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "NonConformanceReport_tenantId_ncrNumber_key" ON "quality"."NonConformanceReport"("tenantId", "ncrNumber");

-- CreateIndex
CREATE INDEX "CorrectiveAction_tenantId_status_idx" ON "quality"."CorrectiveAction"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CorrectiveAction_tenantId_ncrId_idx" ON "quality"."CorrectiveAction"("tenantId", "ncrId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_tenantId_assignedTo_idx" ON "quality"."CorrectiveAction"("tenantId", "assignedTo");

-- CreateIndex
CREATE INDEX "CorrectiveAction_tenantId_dueDate_idx" ON "quality"."CorrectiveAction"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "SupplierQualityScore_tenantId_supplierId_idx" ON "quality"."SupplierQualityScore"("tenantId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierQualityScore_tenantId_supplierId_period_key" ON "quality"."SupplierQualityScore"("tenantId", "supplierId", "period");

-- CreateIndex
CREATE INDEX "sales_targets_tenant_id_user_id_idx" ON "sales"."sales_targets"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "sales_targets_tenant_id_period_start_date_idx" ON "sales"."sales_targets"("tenant_id", "period", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "badges_tenant_id_name_key" ON "sales"."badges"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "user_badges_tenant_id_user_id_idx" ON "sales"."user_badges"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "sales"."user_badges"("user_id", "badge_id");

-- CreateIndex
CREATE INDEX "leaderboard_entries_tenant_id_period_period_start_rank_idx" ON "sales"."leaderboard_entries"("tenant_id", "period", "period_start", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_entries_tenant_id_user_id_period_period_start_key" ON "sales"."leaderboard_entries"("tenant_id", "user_id", "period", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "social_profiles_tenant_id_contact_id_platform_key" ON "sales"."social_profiles"("tenant_id", "contact_id", "platform");

-- CreateIndex
CREATE INDEX "social_activities_tenant_id_social_profile_id_occurred_at_idx" ON "sales"."social_activities"("tenant_id", "social_profile_id", "occurred_at");

-- CreateIndex
CREATE INDEX "wh_warehouses_tenant_id_status_idx" ON "warehouse"."wh_warehouses"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "wh_warehouses_tenant_id_code_key" ON "warehouse"."wh_warehouses"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "wh_locations_tenant_id_warehouse_id_idx" ON "warehouse"."wh_locations"("tenant_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "wh_locations_tenant_id_type_idx" ON "warehouse"."wh_locations"("tenant_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "wh_locations_tenant_id_warehouse_id_code_key" ON "warehouse"."wh_locations"("tenant_id", "warehouse_id", "code");

-- CreateIndex
CREATE INDEX "wh_stock_lots_tenant_id_product_id_idx" ON "warehouse"."wh_stock_lots"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "wh_stock_lots_tenant_id_warehouse_id_status_idx" ON "warehouse"."wh_stock_lots"("tenant_id", "warehouse_id", "status");

-- CreateIndex
CREATE INDEX "wh_stock_lots_tenant_id_lot_number_idx" ON "warehouse"."wh_stock_lots"("tenant_id", "lot_number");

-- CreateIndex
CREATE INDEX "wh_stock_moves_tenant_id_move_type_status_idx" ON "warehouse"."wh_stock_moves"("tenant_id", "move_type", "status");

-- CreateIndex
CREATE INDEX "wh_stock_moves_tenant_id_product_id_idx" ON "warehouse"."wh_stock_moves"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "wh_stock_moves_tenant_id_reference_idx" ON "warehouse"."wh_stock_moves"("tenant_id", "reference");

-- CreateIndex
CREATE INDEX "wh_pick_lists_tenant_id_status_idx" ON "warehouse"."wh_pick_lists"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "wh_pick_lists_tenant_id_warehouse_id_idx" ON "warehouse"."wh_pick_lists"("tenant_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "wh_pick_lists_tenant_id_source_order_id_idx" ON "warehouse"."wh_pick_lists"("tenant_id", "source_order_id");

-- CreateIndex
CREATE INDEX "wh_pick_list_lines_pick_list_id_idx" ON "warehouse"."wh_pick_list_lines"("pick_list_id");

-- CreateIndex
CREATE INDEX "wh_shipments_tenant_id_status_idx" ON "warehouse"."wh_shipments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "wh_shipments_tenant_id_warehouse_id_idx" ON "warehouse"."wh_shipments"("tenant_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "wh_cycle_counts_tenant_id_status_idx" ON "warehouse"."wh_cycle_counts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "wh_cycle_counts_tenant_id_warehouse_id_idx" ON "warehouse"."wh_cycle_counts"("tenant_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "wh_serial_numbers_tenant_id_product_id_idx" ON "warehouse"."wh_serial_numbers"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "wh_serial_numbers_tenant_id_warehouse_id_idx" ON "warehouse"."wh_serial_numbers"("tenant_id", "warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "wh_serial_numbers_tenant_id_serial_number_key" ON "warehouse"."wh_serial_numbers"("tenant_id", "serial_number");

-- CreateIndex
CREATE INDEX "wh_pack_orders_tenant_id_status_idx" ON "warehouse"."wh_pack_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "wh_pack_orders_tenant_id_warehouse_id_idx" ON "warehouse"."wh_pack_orders"("tenant_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "wh_pack_order_lines_pack_order_id_idx" ON "warehouse"."wh_pack_order_lines"("pack_order_id");

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_company_id_idx" ON "accounting"."journal_entries"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "journal_lines_cost_center_id_idx" ON "accounting"."journal_lines"("cost_center_id");

-- AddForeignKey
ALTER TABLE "accounting"."budgets" ADD CONSTRAINT "budgets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "accounting"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."budget_lines" ADD CONSTRAINT "budget_lines_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "accounting"."budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cost_centers" ADD CONSTRAINT "cost_centers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "accounting"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cost_centers" ADD CONSTRAINT "cost_centers_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounting"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."exchange_rates" ADD CONSTRAINT "exchange_rates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "accounting"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."bank_transactions" ADD CONSTRAINT "bank_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "accounting"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets"."fixed_assets" ADD CONSTRAINT "fixed_assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "assets"."asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets"."depreciation_schedules" ADD CONSTRAINT "depreciation_schedules_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"."fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets"."asset_maintenance" ADD CONSTRAINT "asset_maintenance_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"."fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets"."maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"."fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets"."asset_transfers" ADD CONSTRAINT "asset_transfers_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"."fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets"."asset_audit_lines" ADD CONSTRAINT "asset_audit_lines_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "assets"."asset_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets"."asset_audit_lines" ADD CONSTRAINT "asset_audit_lines_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"."fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets"."asset_disposals" ADD CONSTRAINT "asset_disposals_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"."fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comms"."chat_messages" ADD CONSTRAINT "chat_messages_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "comms"."chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."departments" ADD CONSTRAINT "departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "hr"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."positions" ADD CONSTRAINT "positions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "hr"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "hr"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."employees" ADD CONSTRAINT "employees_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "hr"."positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."employees" ADD CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "hr"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "hr"."leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."attendance" ADD CONSTRAINT "attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."payroll_runs" ADD CONSTRAINT "payroll_runs_payroll_structure_id_fkey" FOREIGN KEY ("payroll_structure_id") REFERENCES "hr"."payroll_structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."pay_slips" ADD CONSTRAINT "pay_slips_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "hr"."payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."pay_slips" ADD CONSTRAINT "pay_slips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing"."bom_lines" ADD CONSTRAINT "bom_lines_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "manufacturing"."bills_of_material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing"."work_orders" ADD CONSTRAINT "work_orders_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "manufacturing"."bills_of_material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing"."work_order_operations" ADD CONSTRAINT "work_order_operations_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "manufacturing"."work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing"."work_order_operations" ADD CONSTRAINT "work_order_operations_work_center_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "manufacturing"."work_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing"."material_consumptions" ADD CONSTRAINT "material_consumptions_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "manufacturing"."work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing"."production_outputs" ADD CONSTRAINT "production_outputs_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "manufacturing"."work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "platform"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "platform"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos"."pos_sessions" ADD CONSTRAINT "pos_sessions_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "pos"."pos_terminals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos"."pos_orders" ADD CONSTRAINT "pos_orders_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "pos"."pos_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos"."pos_order_lines" ADD CONSTRAINT "pos_order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "pos"."pos_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos"."pos_payments" ADD CONSTRAINT "pos_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "pos"."pos_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos"."kitchen_orders" ADD CONSTRAINT "kitchen_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "pos"."pos_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos"."kitchen_orders" ADD CONSTRAINT "kitchen_orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "pos"."restaurant_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos"."kitchen_order_items" ADD CONSTRAINT "kitchen_order_items_kitchen_order_id_fkey" FOREIGN KEY ("kitchen_order_id") REFERENCES "pos"."kitchen_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos"."kitchen_order_items" ADD CONSTRAINT "kitchen_order_items_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "pos"."pos_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "procurement"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."purchase_requisition_lines" ADD CONSTRAINT "purchase_requisition_lines_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "procurement"."purchase_requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."rfqs" ADD CONSTRAINT "rfqs_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "procurement"."purchase_requisitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."rfq_suppliers" ADD CONSTRAINT "rfq_suppliers_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "procurement"."rfqs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."rfq_suppliers" ADD CONSTRAINT "rfq_suppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "procurement"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."procurement_purchase_orders" ADD CONSTRAINT "procurement_purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "procurement"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."procurement_purchase_orders" ADD CONSTRAINT "procurement_purchase_orders_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "procurement"."purchase_requisitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."procurement_po_lines" ADD CONSTRAINT "procurement_po_lines_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "procurement"."procurement_purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."goods_receipts" ADD CONSTRAINT "goods_receipts_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "procurement"."procurement_purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "procurement"."goods_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_po_line_id_fkey" FOREIGN KEY ("po_line_id") REFERENCES "procurement"."procurement_po_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement"."supplier_ratings" ADD CONSTRAINT "supplier_ratings_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "procurement"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality"."Inspection" ADD CONSTRAINT "Inspection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "quality"."InspectionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality"."InspectionResultItem" ADD CONSTRAINT "InspectionResultItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "quality"."Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality"."NonConformanceReport" ADD CONSTRAINT "NonConformanceReport_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "quality"."Inspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality"."CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_ncrId_fkey" FOREIGN KEY ("ncrId") REFERENCES "quality"."NonConformanceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "sales"."badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."social_activities" ADD CONSTRAINT "social_activities_social_profile_id_fkey" FOREIGN KEY ("social_profile_id") REFERENCES "sales"."social_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_locations" ADD CONSTRAINT "wh_locations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse"."wh_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_stock_lots" ADD CONSTRAINT "wh_stock_lots_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse"."wh_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_stock_lots" ADD CONSTRAINT "wh_stock_lots_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "warehouse"."wh_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_stock_moves" ADD CONSTRAINT "wh_stock_moves_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse"."wh_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_stock_moves" ADD CONSTRAINT "wh_stock_moves_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "warehouse"."wh_stock_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_stock_moves" ADD CONSTRAINT "wh_stock_moves_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "warehouse"."wh_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_stock_moves" ADD CONSTRAINT "wh_stock_moves_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "warehouse"."wh_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_pick_lists" ADD CONSTRAINT "wh_pick_lists_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse"."wh_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_pick_list_lines" ADD CONSTRAINT "wh_pick_list_lines_pick_list_id_fkey" FOREIGN KEY ("pick_list_id") REFERENCES "warehouse"."wh_pick_lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_pick_list_lines" ADD CONSTRAINT "wh_pick_list_lines_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "warehouse"."wh_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_pick_list_lines" ADD CONSTRAINT "wh_pick_list_lines_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "warehouse"."wh_stock_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_shipments" ADD CONSTRAINT "wh_shipments_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse"."wh_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_shipments" ADD CONSTRAINT "wh_shipments_pick_list_id_fkey" FOREIGN KEY ("pick_list_id") REFERENCES "warehouse"."wh_pick_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_cycle_counts" ADD CONSTRAINT "wh_cycle_counts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse"."wh_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_cycle_counts" ADD CONSTRAINT "wh_cycle_counts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "warehouse"."wh_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse"."wh_pack_order_lines" ADD CONSTRAINT "wh_pack_order_lines_pack_order_id_fkey" FOREIGN KEY ("pack_order_id") REFERENCES "warehouse"."wh_pack_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
