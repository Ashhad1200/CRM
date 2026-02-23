-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "accounting";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "analytics";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "comms";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "inventory";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "marketing";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "projects";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "sales";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "support";

-- CreateEnum
CREATE TYPE "accounting"."AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "accounting"."InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'PAID', 'VOID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "accounting"."ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "accounting"."FiscalPeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "accounting"."RecurringFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "accounting"."PaymentMethod" AS ENUM ('CASH', 'CHECK', 'CREDIT_CARD', 'BANK_TRANSFER', 'WIRE', 'ACH', 'OTHER');

-- CreateEnum
CREATE TYPE "analytics"."WidgetType" AS ENUM ('CHART', 'KPI', 'TABLE', 'FUNNEL');

-- CreateEnum
CREATE TYPE "analytics"."ForecastType" AS ENUM ('REVENUE', 'PIPELINE');

-- CreateEnum
CREATE TYPE "comms"."ActivityType" AS ENUM ('EMAIL', 'CALL', 'MEETING', 'NOTE', 'SMS');

-- CreateEnum
CREATE TYPE "comms"."ActivityDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "comms"."EmailSyncProvider" AS ENUM ('GMAIL', 'OUTLOOK');

-- CreateEnum
CREATE TYPE "comms"."EmailSyncStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "comms"."CallStatus" AS ENUM ('INITIATED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "inventory"."SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "inventory"."PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "inventory"."TaxClass" AS ENUM ('STANDARD', 'REDUCED', 'ZERO', 'EXEMPT');

-- CreateEnum
CREATE TYPE "inventory"."StockAdjustmentReason" AS ENUM ('PURCHASE', 'SALE', 'RETURN', 'DAMAGE', 'CORRECTION', 'RESERVED', 'RELEASED');

-- CreateEnum
CREATE TYPE "marketing"."CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "marketing"."CampaignType" AS ENUM ('EMAIL', 'SMS', 'SOCIAL', 'EVENT');

-- CreateEnum
CREATE TYPE "marketing"."ABVariant" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "marketing"."TouchType" AS ENUM ('FIRST', 'MID', 'LAST');

-- CreateEnum
CREATE TYPE "platform"."WorkflowStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "platform"."WorkflowExecStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "projects"."ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "projects"."TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');

-- CreateEnum
CREATE TYPE "projects"."TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "sales"."LifecycleStage" AS ENUM ('SUBSCRIBER', 'LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST');

-- CreateEnum
CREATE TYPE "sales"."LeadSource" AS ENUM ('WEB_FORM', 'LANDING_PAGE', 'EMAIL', 'SOCIAL', 'REFERRAL', 'COLD_CALL', 'TRADE_SHOW', 'PARTNER', 'API', 'OTHER');

-- CreateEnum
CREATE TYPE "sales"."LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "sales"."QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "support"."TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_INTERNAL', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "support"."TicketChannel" AS ENUM ('EMAIL', 'PHONE', 'CHAT', 'PORTAL', 'SOCIAL', 'API');

-- CreateEnum
CREATE TYPE "support"."AuthorType" AS ENUM ('AGENT', 'CUSTOMER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "support"."ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "accounting"."chart_of_accounts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "accounting"."AccountType" NOT NULL,
    "parent_id" UUID,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."fiscal_periods" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "accounting"."FiscalPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "closed_at" TIMESTAMP(3),
    "closed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."journal_entries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "reference" JSONB,
    "period_id" UUID NOT NULL,
    "posted_at" TIMESTAMP(3),
    "is_reversing" BOOLEAN NOT NULL DEFAULT false,
    "reversed_entry_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."journal_lines" (
    "id" UUID NOT NULL,
    "journal_entry_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "description" VARCHAR(500),

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."invoices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invoice_number" INTEGER NOT NULL,
    "contact_id" UUID,
    "account_id" UUID,
    "deal_id" UUID,
    "status" "accounting"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" "platform"."Currency" NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "payment_terms" VARCHAR(100),
    "due_date" DATE,
    "sent_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."invoice_lines" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "account_id" UUID,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."payments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "method" "accounting"."PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" VARCHAR(200),
    "date" DATE NOT NULL,
    "journal_entry_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."expenses" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "vendor_name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(500),
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" "platform"."Currency" NOT NULL DEFAULT 'USD',
    "category_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "receipt_url" VARCHAR(500),
    "project_id" UUID,
    "status" "accounting"."ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" VARCHAR(500),
    "journal_entry_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."recurring_invoices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "template_invoice_id" UUID NOT NULL,
    "frequency" "accounting"."RecurringFrequency" NOT NULL,
    "next_run_date" DATE NOT NULL,
    "last_run_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "recurring_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."credit_notes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "journal_entry_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."Dashboard" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "ownerId" UUID NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "layout" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."Widget" (
    "id" UUID NOT NULL,
    "dashboardId" UUID NOT NULL,
    "type" "analytics"."WidgetType" NOT NULL,
    "config" JSONB NOT NULL,
    "position" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."SavedReport" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "ownerId" UUID NOT NULL,
    "fieldSelection" JSONB NOT NULL,
    "groupBy" VARCHAR(255),
    "aggregation" VARCHAR(50),
    "filters" JSONB,
    "scheduleFrequency" VARCHAR(50),
    "scheduleRecipients" VARCHAR(255)[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."Forecast" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "type" "analytics"."ForecastType" NOT NULL,
    "period" VARCHAR(50) NOT NULL,
    "predictedValue" DECIMAL(18,2) NOT NULL,
    "confidenceLow" DECIMAL(18,2) NOT NULL,
    "confidenceHigh" DECIMAL(18,2) NOT NULL,
    "modelVersion" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Forecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comms"."Activity" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "type" "comms"."ActivityType" NOT NULL,
    "direction" "comms"."ActivityDirection" NOT NULL,
    "contactId" UUID,
    "dealId" UUID,
    "ticketId" UUID,
    "accountId" UUID,
    "subject" TEXT,
    "body" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comms"."EmailSync" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "comms"."EmailSyncProvider" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "status" "comms"."EmailSyncStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comms"."EmailTemplate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "mergeFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comms"."CallLog" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'twilio',
    "callSid" TEXT,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "recordingUrl" TEXT,
    "status" "comms"."CallStatus" NOT NULL DEFAULT 'INITIATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."products" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "unit_price" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_class" "inventory"."TaxClass" NOT NULL DEFAULT 'STANDARD',
    "category_id" VARCHAR(30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(30),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."price_books" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "currency" "platform"."Currency" NOT NULL DEFAULT 'USD',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."price_book_entries" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "price_book_id" VARCHAR(30) NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_book_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."warehouses" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."stock_levels" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "warehouse_id" VARCHAR(30) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved_qty" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."sales_orders" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "order_number" INTEGER NOT NULL,
    "deal_id" VARCHAR(30),
    "contact_id" VARCHAR(30),
    "account_id" VARCHAR(30),
    "status" "inventory"."SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "fulfilled_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(30),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."sales_order_lines" (
    "id" VARCHAR(30) NOT NULL,
    "sales_order_id" VARCHAR(30) NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "line_total" DECIMAL(15,2) NOT NULL,
    "fulfilled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sales_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."purchase_orders" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "po_number" INTEGER NOT NULL,
    "vendor_name" VARCHAR(255) NOT NULL,
    "status" "inventory"."PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "approval_status" "platform"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ordered_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(30),
    "approved_by" VARCHAR(30),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."po_lines" (
    "id" VARCHAR(30) NOT NULL,
    "purchase_order_id" VARCHAR(30) NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(15,2) NOT NULL,
    "line_total" DECIMAL(15,2) NOT NULL,
    "received_qty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "po_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."stock_adjustments" (
    "id" VARCHAR(30) NOT NULL,
    "tenant_id" VARCHAR(30) NOT NULL,
    "product_id" VARCHAR(30) NOT NULL,
    "warehouse_id" VARCHAR(30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" "inventory"."StockAdjustmentReason" NOT NULL,
    "reference" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(30),

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing"."Segment" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "criteria" JSONB,
    "isDynamic" BOOLEAN NOT NULL DEFAULT true,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing"."Campaign" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "marketing"."CampaignType" NOT NULL DEFAULT 'EMAIL',
    "segmentId" UUID,
    "subjectA" VARCHAR(500) NOT NULL,
    "subjectB" VARCHAR(500),
    "bodyHtml" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "status" "marketing"."CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing"."CampaignRecipient" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "variant" "marketing"."ABVariant" NOT NULL DEFAULT 'A',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing"."MarketingTouch" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "dealId" UUID,
    "touchType" "marketing"."TouchType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingTouch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing"."Unsubscribe" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unsubscribe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."workflows" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(1000),
    "trigger" JSONB NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "status" "platform"."WorkflowStatus" NOT NULL DEFAULT 'INACTIVE',
    "loop_limit" INTEGER NOT NULL DEFAULT 5,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."workflow_executions" (
    "id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "trigger_event" VARCHAR(100) NOT NULL,
    "trigger_payload" JSONB,
    "status" "platform"."WorkflowExecStatus" NOT NULL DEFAULT 'RUNNING',
    "action_results" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."ProjectTemplate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "tasks" JSONB NOT NULL,
    "milestones" JSONB NOT NULL,
    "defaultAssignees" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."Project" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "dealId" UUID,
    "accountId" UUID,
    "templateId" UUID,
    "status" "projects"."ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMPTZ(3),
    "endDate" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."Task" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "assigneeId" UUID,
    "priority" "projects"."TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "projects"."TaskStatus" NOT NULL DEFAULT 'TODO',
    "dueDate" TIMESTAMPTZ(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."Milestone" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "dueDate" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."MilestoneTask" (
    "id" UUID NOT NULL,
    "milestoneId" UUID NOT NULL,
    "taskId" UUID NOT NULL,

    CONSTRAINT "MilestoneTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."TimeEntry" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "hours" DECIMAL(6,2) NOT NULL,
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."contacts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "emails" VARCHAR(255)[] DEFAULT ARRAY[]::VARCHAR(255)[],
    "phones" VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[],
    "company" VARCHAR(255),
    "job_title" VARCHAR(200),
    "account_id" UUID,
    "lifecycle_stage" "sales"."LifecycleStage" NOT NULL DEFAULT 'SUBSCRIBER',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "owner_id" UUID,
    "team_id" UUID,
    "source" VARCHAR(100),
    "avatar_url" VARCHAR(500),
    "address" JSONB,
    "social_profiles" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."accounts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "industry" VARCHAR(100),
    "size" VARCHAR(50),
    "website" VARCHAR(500),
    "phone" VARCHAR(50),
    "billing_address" JSONB,
    "shipping_address" JSONB,
    "parent_account_id" UUID,
    "owner_id" UUID,
    "team_id" UUID,
    "annual_revenue" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."leads" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "company" VARCHAR(255),
    "job_title" VARCHAR(200),
    "source" "sales"."LeadSource" NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" "sales"."LeadStatus" NOT NULL DEFAULT 'NEW',
    "assigned_owner_id" UUID,
    "converted_contact_id" UUID,
    "converted_deal_id" UUID,
    "converted_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."pipelines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."pipeline_stages" (
    "id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "order" INTEGER NOT NULL,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "color" VARCHAR(7),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."deals" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" "platform"."Currency" NOT NULL DEFAULT 'USD',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "weighted_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "expected_close_date" DATE,
    "owner_id" UUID,
    "account_id" UUID,
    "won_at" TIMESTAMP(3),
    "lost_at" TIMESTAMP(3),
    "lost_reason" VARCHAR(500),
    "last_activity_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."deal_contacts" (
    "id" UUID NOT NULL,
    "deal_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "role" VARCHAR(100),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "deal_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."quotes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "deal_id" UUID NOT NULL,
    "quote_number" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" "platform"."Currency" NOT NULL DEFAULT 'USD',
    "status" "sales"."QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "approval_status" "platform"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "valid_until" DATE,
    "notes" TEXT,
    "sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."quote_lines" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "product_id" UUID,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "quote_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support"."SlaPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" "platform"."Priority" NOT NULL,
    "firstResponseMinutes" INTEGER NOT NULL,
    "resolutionMinutes" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support"."Ticket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "platform"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "support"."TicketStatus" NOT NULL DEFAULT 'OPEN',
    "channel" "support"."TicketChannel" NOT NULL DEFAULT 'PORTAL',
    "contactId" TEXT,
    "accountId" TEXT,
    "assignedAgentId" TEXT,
    "slaPolicyId" TEXT,
    "slaDeadline" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support"."TicketReply" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorType" "support"."AuthorType" NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support"."KBCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KBCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support"."KBArticle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "categoryId" TEXT,
    "status" "support"."ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "KBArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support"."CsatSurvey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "CsatSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chart_of_accounts_tenant_id_idx" ON "accounting"."chart_of_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "chart_of_accounts_tenant_id_type_idx" ON "accounting"."chart_of_accounts"("tenant_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_tenant_id_code_key" ON "accounting"."chart_of_accounts"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "fiscal_periods_tenant_id_idx" ON "accounting"."fiscal_periods"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_periods_tenant_id_year_month_key" ON "accounting"."fiscal_periods"("tenant_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_reversed_entry_id_key" ON "accounting"."journal_entries"("reversed_entry_id");

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_idx" ON "accounting"."journal_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_period_id_idx" ON "accounting"."journal_entries"("tenant_id", "period_id");

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_date_idx" ON "accounting"."journal_entries"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "journal_lines_journal_entry_id_idx" ON "accounting"."journal_lines"("journal_entry_id");

-- CreateIndex
CREATE INDEX "journal_lines_account_id_idx" ON "accounting"."journal_lines"("account_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_idx" ON "accounting"."invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_status_idx" ON "accounting"."invoices"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_contact_id_idx" ON "accounting"."invoices"("tenant_id", "contact_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_deal_id_idx" ON "accounting"."invoices"("tenant_id", "deal_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenant_id_invoice_number_key" ON "accounting"."invoices"("tenant_id", "invoice_number");

-- CreateIndex
CREATE INDEX "invoice_lines_invoice_id_idx" ON "accounting"."invoice_lines"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "accounting"."payments"("tenant_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "accounting"."payments"("invoice_id");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_idx" ON "accounting"."expenses"("tenant_id");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_status_idx" ON "accounting"."expenses"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_category_id_idx" ON "accounting"."expenses"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "recurring_invoices_tenant_id_idx" ON "accounting"."recurring_invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "recurring_invoices_tenant_id_is_active_next_run_date_idx" ON "accounting"."recurring_invoices"("tenant_id", "is_active", "next_run_date");

-- CreateIndex
CREATE INDEX "credit_notes_tenant_id_idx" ON "accounting"."credit_notes"("tenant_id");

-- CreateIndex
CREATE INDEX "credit_notes_invoice_id_idx" ON "accounting"."credit_notes"("invoice_id");

-- CreateIndex
CREATE INDEX "Dashboard_tenantId_ownerId_idx" ON "analytics"."Dashboard"("tenantId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Dashboard_tenantId_name_key" ON "analytics"."Dashboard"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Widget_dashboardId_idx" ON "analytics"."Widget"("dashboardId");

-- CreateIndex
CREATE INDEX "SavedReport_tenantId_ownerId_idx" ON "analytics"."SavedReport"("tenantId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedReport_tenantId_name_key" ON "analytics"."SavedReport"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Forecast_tenantId_type_idx" ON "analytics"."Forecast"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Activity_tenantId_contactId_timestamp_idx" ON "comms"."Activity"("tenantId", "contactId", "timestamp");

-- CreateIndex
CREATE INDEX "Activity_tenantId_dealId_timestamp_idx" ON "comms"."Activity"("tenantId", "dealId", "timestamp");

-- CreateIndex
CREATE INDEX "Activity_tenantId_ticketId_timestamp_idx" ON "comms"."Activity"("tenantId", "ticketId", "timestamp");

-- CreateIndex
CREATE INDEX "Activity_tenantId_accountId_timestamp_idx" ON "comms"."Activity"("tenantId", "accountId", "timestamp");

-- CreateIndex
CREATE INDEX "Activity_tenantId_timestamp_idx" ON "comms"."Activity"("tenantId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSync_tenantId_userId_provider_key" ON "comms"."EmailSync"("tenantId", "userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_tenantId_name_key" ON "comms"."EmailTemplate"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CallLog_activityId_key" ON "comms"."CallLog"("activityId");

-- CreateIndex
CREATE INDEX "CallLog_tenantId_callSid_idx" ON "comms"."CallLog"("tenantId", "callSid");

-- CreateIndex
CREATE INDEX "products_tenant_id_is_active_idx" ON "inventory"."products"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "products_tenant_id_name_idx" ON "inventory"."products"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_sku_key" ON "inventory"."products"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "price_books_tenant_id_is_default_idx" ON "inventory"."price_books"("tenant_id", "is_default");

-- CreateIndex
CREATE INDEX "price_book_entries_tenant_id_idx" ON "inventory"."price_book_entries"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_book_entries_price_book_id_product_id_key" ON "inventory"."price_book_entries"("price_book_id", "product_id");

-- CreateIndex
CREATE INDEX "warehouses_tenant_id_idx" ON "inventory"."warehouses"("tenant_id");

-- CreateIndex
CREATE INDEX "stock_levels_tenant_id_product_id_idx" ON "inventory"."stock_levels"("tenant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_product_id_warehouse_id_key" ON "inventory"."stock_levels"("product_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "sales_orders_tenant_id_status_idx" ON "inventory"."sales_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sales_orders_tenant_id_deal_id_idx" ON "inventory"."sales_orders"("tenant_id", "deal_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_tenant_id_order_number_key" ON "inventory"."sales_orders"("tenant_id", "order_number");

-- CreateIndex
CREATE INDEX "sales_order_lines_sales_order_id_idx" ON "inventory"."sales_order_lines"("sales_order_id");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_status_idx" ON "inventory"."purchase_orders"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_tenant_id_po_number_key" ON "inventory"."purchase_orders"("tenant_id", "po_number");

-- CreateIndex
CREATE INDEX "po_lines_purchase_order_id_idx" ON "inventory"."po_lines"("purchase_order_id");

-- CreateIndex
CREATE INDEX "stock_adjustments_tenant_id_product_id_idx" ON "inventory"."stock_adjustments"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "Segment_tenantId_idx" ON "marketing"."Segment"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Segment_tenantId_name_key" ON "marketing"."Segment"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Campaign_tenantId_status_idx" ON "marketing"."Campaign"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Campaign_tenantId_segmentId_idx" ON "marketing"."Campaign"("tenantId", "segmentId");

-- CreateIndex
CREATE INDEX "CampaignRecipient_tenantId_campaignId_idx" ON "marketing"."CampaignRecipient"("tenantId", "campaignId");

-- CreateIndex
CREATE INDEX "CampaignRecipient_tenantId_contactId_idx" ON "marketing"."CampaignRecipient"("tenantId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_contactId_key" ON "marketing"."CampaignRecipient"("campaignId", "contactId");

-- CreateIndex
CREATE INDEX "MarketingTouch_tenantId_contactId_idx" ON "marketing"."MarketingTouch"("tenantId", "contactId");

-- CreateIndex
CREATE INDEX "MarketingTouch_tenantId_campaignId_idx" ON "marketing"."MarketingTouch"("tenantId", "campaignId");

-- CreateIndex
CREATE INDEX "MarketingTouch_tenantId_dealId_idx" ON "marketing"."MarketingTouch"("tenantId", "dealId");

-- CreateIndex
CREATE INDEX "Unsubscribe_tenantId_idx" ON "marketing"."Unsubscribe"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Unsubscribe_tenantId_contactId_key" ON "marketing"."Unsubscribe"("tenantId", "contactId");

-- CreateIndex
CREATE INDEX "workflows_tenant_id_status_idx" ON "platform"."workflows"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflows_tenant_id_name_key" ON "platform"."workflows"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "workflow_executions_workflow_id_started_at_idx" ON "platform"."workflow_executions"("workflow_id", "started_at");

-- CreateIndex
CREATE INDEX "ProjectTemplate_tenantId_idx" ON "projects"."ProjectTemplate"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTemplate_tenantId_name_key" ON "projects"."ProjectTemplate"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Project_tenantId_status_idx" ON "projects"."Project"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Project_tenantId_dealId_idx" ON "projects"."Project"("tenantId", "dealId");

-- CreateIndex
CREATE INDEX "Project_tenantId_accountId_idx" ON "projects"."Project"("tenantId", "accountId");

-- CreateIndex
CREATE INDEX "Task_projectId_status_idx" ON "projects"."Task"("projectId", "status");

-- CreateIndex
CREATE INDEX "Task_projectId_order_idx" ON "projects"."Task"("projectId", "order");

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "projects"."Task"("assigneeId");

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "projects"."Milestone"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneTask_milestoneId_taskId_key" ON "projects"."MilestoneTask"("milestoneId", "taskId");

-- CreateIndex
CREATE INDEX "TimeEntry_taskId_idx" ON "projects"."TimeEntry"("taskId");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_idx" ON "projects"."TimeEntry"("userId");

-- CreateIndex
CREATE INDEX "contacts_tenant_id_idx" ON "sales"."contacts"("tenant_id");

-- CreateIndex
CREATE INDEX "contacts_tenant_id_account_id_idx" ON "sales"."contacts"("tenant_id", "account_id");

-- CreateIndex
CREATE INDEX "contacts_tenant_id_owner_id_idx" ON "sales"."contacts"("tenant_id", "owner_id");

-- CreateIndex
CREATE INDEX "accounts_tenant_id_idx" ON "sales"."accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "accounts_tenant_id_owner_id_idx" ON "sales"."accounts"("tenant_id", "owner_id");

-- CreateIndex
CREATE INDEX "leads_tenant_id_idx" ON "sales"."leads"("tenant_id");

-- CreateIndex
CREATE INDEX "leads_tenant_id_status_idx" ON "sales"."leads"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "leads_tenant_id_assigned_owner_id_idx" ON "sales"."leads"("tenant_id", "assigned_owner_id");

-- CreateIndex
CREATE INDEX "pipelines_tenant_id_idx" ON "sales"."pipelines"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "pipelines_tenant_id_name_key" ON "sales"."pipelines"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_pipeline_id_order_key" ON "sales"."pipeline_stages"("pipeline_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_pipeline_id_name_key" ON "sales"."pipeline_stages"("pipeline_id", "name");

-- CreateIndex
CREATE INDEX "deals_tenant_id_idx" ON "sales"."deals"("tenant_id");

-- CreateIndex
CREATE INDEX "deals_tenant_id_pipeline_id_stage_id_idx" ON "sales"."deals"("tenant_id", "pipeline_id", "stage_id");

-- CreateIndex
CREATE INDEX "deals_tenant_id_owner_id_idx" ON "sales"."deals"("tenant_id", "owner_id");

-- CreateIndex
CREATE INDEX "deals_tenant_id_account_id_idx" ON "sales"."deals"("tenant_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "deal_contacts_deal_id_contact_id_key" ON "sales"."deal_contacts"("deal_id", "contact_id");

-- CreateIndex
CREATE INDEX "quotes_tenant_id_idx" ON "sales"."quotes"("tenant_id");

-- CreateIndex
CREATE INDEX "quotes_tenant_id_deal_id_idx" ON "sales"."quotes"("tenant_id", "deal_id");

-- CreateIndex
CREATE UNIQUE INDEX "SlaPolicy_tenantId_priority_key" ON "support"."SlaPolicy"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "Ticket_tenantId_status_idx" ON "support"."Ticket"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Ticket_tenantId_assignedAgentId_idx" ON "support"."Ticket"("tenantId", "assignedAgentId");

-- CreateIndex
CREATE INDEX "Ticket_tenantId_priority_idx" ON "support"."Ticket"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "Ticket_tenantId_slaDeadline_idx" ON "support"."Ticket"("tenantId", "slaDeadline");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_tenantId_ticketNumber_key" ON "support"."Ticket"("tenantId", "ticketNumber");

-- CreateIndex
CREATE INDEX "TicketReply_ticketId_createdAt_idx" ON "support"."TicketReply"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KBCategory_tenantId_name_key" ON "support"."KBCategory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "KBArticle_tenantId_status_idx" ON "support"."KBArticle"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "KBArticle_tenantId_slug_key" ON "support"."KBArticle"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CsatSurvey_ticketId_key" ON "support"."CsatSurvey"("ticketId");

-- AddForeignKey
ALTER TABLE "accounting"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "accounting"."fiscal_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_reversed_entry_id_fkey" FOREIGN KEY ("reversed_entry_id") REFERENCES "accounting"."journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "accounting"."journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "accounting"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."invoice_lines" ADD CONSTRAINT "invoice_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "accounting"."invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."payments" ADD CONSTRAINT "payments_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "accounting"."journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."recurring_invoices" ADD CONSTRAINT "recurring_invoices_template_invoice_id_fkey" FOREIGN KEY ("template_invoice_id") REFERENCES "accounting"."invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "accounting"."invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."credit_notes" ADD CONSTRAINT "credit_notes_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "accounting"."journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics"."Widget" ADD CONSTRAINT "Widget_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "analytics"."Dashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comms"."CallLog" ADD CONSTRAINT "CallLog_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "comms"."Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."price_book_entries" ADD CONSTRAINT "price_book_entries_price_book_id_fkey" FOREIGN KEY ("price_book_id") REFERENCES "inventory"."price_books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."price_book_entries" ADD CONSTRAINT "price_book_entries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."stock_levels" ADD CONSTRAINT "stock_levels_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."stock_levels" ADD CONSTRAINT "stock_levels_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."sales_order_lines" ADD CONSTRAINT "sales_order_lines_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "inventory"."sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."sales_order_lines" ADD CONSTRAINT "sales_order_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."po_lines" ADD CONSTRAINT "po_lines_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "inventory"."purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."po_lines" ADD CONSTRAINT "po_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing"."Campaign" ADD CONSTRAINT "Campaign_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "marketing"."Segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing"."CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketing"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing"."MarketingTouch" ADD CONSTRAINT "MarketingTouch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketing"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "platform"."workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."Project" ADD CONSTRAINT "Project_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "projects"."ProjectTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."MilestoneTask" ADD CONSTRAINT "MilestoneTask_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "projects"."Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."MilestoneTask" ADD CONSTRAINT "MilestoneTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "projects"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."TimeEntry" ADD CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "projects"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."contacts" ADD CONSTRAINT "contacts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "sales"."accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."accounts" ADD CONSTRAINT "accounts_parent_account_id_fkey" FOREIGN KEY ("parent_account_id") REFERENCES "sales"."accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."leads" ADD CONSTRAINT "leads_converted_contact_id_fkey" FOREIGN KEY ("converted_contact_id") REFERENCES "sales"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "sales"."pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."deals" ADD CONSTRAINT "deals_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "sales"."pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."deals" ADD CONSTRAINT "deals_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "sales"."pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."deals" ADD CONSTRAINT "deals_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "sales"."accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."deal_contacts" ADD CONSTRAINT "deal_contacts_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "sales"."deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."deal_contacts" ADD CONSTRAINT "deal_contacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "sales"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."quotes" ADD CONSTRAINT "quotes_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "sales"."deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."quote_lines" ADD CONSTRAINT "quote_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "sales"."quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support"."Ticket" ADD CONSTRAINT "Ticket_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "support"."SlaPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support"."TicketReply" ADD CONSTRAINT "TicketReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support"."Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support"."KBCategory" ADD CONSTRAINT "KBCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "support"."KBCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support"."KBArticle" ADD CONSTRAINT "KBArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "support"."KBCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support"."CsatSurvey" ADD CONSTRAINT "CsatSurvey_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support"."Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
