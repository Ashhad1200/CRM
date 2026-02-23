# Feature Specification: SoftCRM Enterprise Platform

**Feature Branch**: `001-crm-platform`  
**Created**: 2026-02-21  
**Status**: Draft  
**Input**: User description: "Build an all-in-one Enterprise CRM platform designed to be the single source of truth for a business. It must centralize customer data and automate workflows across 10 core modules: Sales (pipelines, lead scoring, CPQ), Marketing (campaigns, automation), Customer Support (ticketing, self-service portals), a fully integrated core Accounting module (invoicing, general ledger, AR/AP, expense management), Inventory, and post-sale Project Management. The system must include a Communication hub (email/VoIP sync), comprehensive Analytics/AI forecasting, and an Admin platform with strict Role-Based Access Control (RBAC) and custom fields. The goal is to eliminate the need for third-party accounting and marketing tools."

---

## Executive Summary

SoftCRM is an all-in-one enterprise platform that replaces the fragmented stack of Salesforce + QuickBooks + Mailchimp + Zendesk + Asana with a single, unified system. It is the **single source of truth** for customer data, financial records, marketing engagement, and support history.

**Core value proposition:** One platform, ten modules, zero data silos.

**Governing document:** All implementation must comply with the [SoftCRM Constitution](../../.specify/memory/constitution.md). Product scope is defined in [CRM_Blueprint.md](../../CRM_Blueprint.md).

---

## Scope

### In Scope (10 Core Modules)

| # | Module | Bounded Context | Key Capabilities |
|---|--------|----------------|------------------|
| 1 | **Sales** | `sales` | Contacts & accounts, leads, pipelines, deals, CPQ, territory management |
| 2 | **Marketing** | `marketing` | Campaigns, email automation, landing pages, segmentation, attribution |
| 3 | **Customer Support** | `support` | Ticketing, SLA/escalation, knowledge base, self-service portal, CSAT |
| 4 | **Accounting** | `accounting` | Invoicing, general ledger, AR/AP, expenses, bank reconciliation, tax, financial reports |
| 5 | **Inventory** | `inventory` | Product catalog, price books, stock management, purchase/sales orders, vendors |
| 6 | **Project Management** | `projects` | Post-sale project boards, tasks, milestones, time tracking, client collaboration |
| 7 | **Communication Hub** | `comms` | 2-way email sync, VoIP/calling, SMS, live chat, internal collaboration |
| 8 | **Analytics & AI** | `analytics` | Dashboards, custom reports, AI forecasting, lead scoring, anomaly detection |
| 9 | **Platform & Admin** | `platform` | RBAC, custom fields/modules, workflow automation, API, audit logs, SSO/MFA |
| 10 | **Mobile App** | `mobile` | Cross-platform native, offline sync, GPS check-in, push notifications |

### Out of Scope (v1)

- HR / payroll module
- Full ERP manufacturing & warehouse management
- White-label / reseller portal
- Marketplace / third-party plugin store (extension *points* are in scope; the store is not)
- Video meeting hosting (integration with Zoom/Teams is in scope)
- Social media posting/publishing (social *listening* and lead capture are in scope)
- AI conversation intelligence / call transcription (planned for v2)

### Non-Goals

- Replacing dedicated ERP for manufacturing businesses
- Supporting on-premise deployment in v1 (cloud-native only)
- Building a custom email delivery infrastructure (use transactional email service)

---

## User Scenarios & Testing

### User Story 1 — Sales Rep Manages Pipeline End-to-End (Priority: P1)

A sales representative captures a new lead from a web form, qualifies it, converts it to a deal, moves it through pipeline stages, generates a quote (CPQ), gets manager approval on a discount, and closes the deal — all within the CRM.

**Why this priority**: The sales pipeline is the revenue engine. Without this, there is no CRM.

**Independent Test**: Can be fully tested by creating a lead, moving through pipeline stages, generating a quote, and marking as won. Delivers core sales value independently.

**Acceptance Scenarios**:

1. **Given** a web form submission with name, email, company, and source, **When** the form is submitted, **Then** a Lead record is created with auto-assigned owner (round-robin rule), lead score calculated, and the rep receives a notification.
2. **Given** a qualified lead, **When** the rep clicks "Convert to Deal," **Then** a Contact (or updated existing), Account, and Deal are created; the lead is marked converted; and the deal appears in the pipeline board.
3. **Given** a deal in the pipeline, **When** the rep drags it to a new stage on the Kanban board, **Then** the stage, probability, and weighted value update; any stage-entry automation triggers (e.g., task creation); and the timeline logs the change.
4. **Given** a deal at the Proposal stage, **When** the rep clicks "Create Quote," **Then** the CPQ engine opens with products from the catalog, applies the price book, allows line-item discounts, calculates tax, and generates a branded PDF.
5. **Given** a quote with a discount exceeding the rep's authority (>15%), **When** the quote is submitted, **Then** it enters an approval workflow; the manager receives a notification; the deal stage shows "Pending Approval."
6. **Given** an approved quote, **When** the customer accepts (e-signature or manual), **Then** the deal is marked Won, revenue is recorded, a won-deal event is published (for Accounting to auto-generate an invoice and for Projects to optionally create a project).
7. **Given** a deal has had no activity for 14 days, **When** the daily stale-deal check runs, **Then** the deal is flagged as "rotting" and the rep receives an alert.

---

### User Story 2 — Accountant Manages Invoicing & Financial Reporting (Priority: P1)

An accountant generates invoices from won deals, records customer payments, manages expenses, reconciles bank transactions, and produces month-end financial statements — all without leaving the CRM.

**Why this priority**: Eliminates the #1 third-party dependency (QuickBooks/Xero). The Accounting module is the core differentiator.

**Independent Test**: Can be tested by creating an invoice, recording a payment, and generating a P&L report end-to-end.

**Acceptance Scenarios**:

1. **Given** a deal is marked Won, **When** the `deal.won` event fires, **Then** the Accounting module auto-generates a draft invoice populated with line items from the quote, customer billing details from the Contact/Account, applicable tax rates, and payment terms (Net 30 default).
2. **Given** a draft invoice, **When** the accountant reviews and clicks "Send," **Then** the invoice is finalized (immutable), a PDF is generated from the branded template, an email is sent to the customer with a payment link, and double-entry journal entries are created (debit AR, credit Revenue per line-item account).
3. **Given** an outstanding invoice, **When** a payment is received (manual entry, payment gateway webhook, or bank import), **Then** the payment is recorded against the invoice, AR is debited, the invoice status updates (Partial / Paid), and the customer's outstanding balance recalculates.
4. **Given** an invoice is 7 days past due, **When** the overdue check runs, **Then** an automated reminder email is sent; at 30 days, a second reminder; at 60 days, the account is flagged for collections review.
5. **Given** a set of bank transactions imported via Plaid, **When** the accountant opens Bank Reconciliation, **Then** the system auto-matches imported transactions to recorded invoices/expenses by amount and date, highlights unmatched items, and allows manual matching.
6. **Given** the current fiscal period, **When** the accountant runs "Profit & Loss," **Then** the report shows Revenue, COGS, Gross Profit, Operating Expenses (by category), and Net Income, grouped by the Chart of Accounts, with drill-down to individual journal entries.
7. **Given** an employee submits an expense with a receipt photo, **When** the expense is created, **Then** OCR extracts amount and vendor; the expense enters the approval workflow; upon approval, a journal entry is auto-created (debit Expense, credit AP or Cash).

---

### User Story 3 — Support Agent Resolves a Customer Ticket (Priority: P1)

A customer submits a support ticket via the self-service portal. A support agent is assigned, uses the knowledge base and customer context (purchase history, past tickets) to resolve the issue, and the customer receives a CSAT survey.

**Why this priority**: Customer retention is as valuable as sales. Support ties directly into the customer record (single source of truth).

**Independent Test**: Can be tested by creating a ticket through the portal, assigning to an agent, resolving, and verifying CSAT survey delivery.

**Acceptance Scenarios**:

1. **Given** a customer is logged into the self-service portal, **When** they submit a ticket (subject, description, priority, attachments), **Then** a Ticket record is created with auto-assigned agent (skill-based routing), SLA timer starts based on priority, and the customer sees the ticket in their portal.
2. **Given** a ticket assigned to an agent, **When** the agent opens it, **Then** they see the customer's full context panel: contact info, account details, deal history, past tickets, recent communications, and outstanding invoices — all pulled from respective modules via API.
3. **Given** the agent is composing a reply, **When** they search the knowledge base, **Then** relevant articles are surfaced ranked by relevance; the agent can insert a link or paste the solution directly.
4. **Given** a ticket with SLA of 4 hours (high priority), **When** 3 hours elapse without a response, **Then** an escalation alert fires to the team lead; if SLA breaches, it is logged for SLA compliance reporting.
5. **Given** the agent resolves the ticket, **When** they mark it "Resolved," **Then** the customer receives a resolution notification; after 24 hours, a CSAT survey is sent; the ticket timeline is updated.
6. **Given** a customer rates CSAT as 1-2 (unhappy), **When** the survey is submitted, **Then** a follow-up task is auto-created for the support manager and a `ticket.csat_low` event is published for Analytics.

---

### User Story 4 — Marketing Manager Runs a Campaign with Attribution (Priority: P2)

A marketing manager creates an email campaign targeting a specific customer segment, monitors engagement in real-time, and sees which leads and deals the campaign generated with multi-touch attribution.

**Why this priority**: Eliminates the Mailchimp/HubSpot dependency. Closes the loop between marketing spend and revenue.

**Independent Test**: Can be tested by creating a segment, sending a campaign, tracking opens/clicks, and verifying attribution on resulting leads.

**Acceptance Scenarios**:

1. **Given** the marketing manager defines a segment (e.g., "Contacts in 'Technology' industry, deal value > $10K, last contacted > 30 days ago"), **When** the segment is saved, **Then** the system queries across Contacts/Accounts/Deals to produce a dynamic, auto-updating recipient list.
2. **Given** a segment, **When** the manager creates an email campaign (template editor with merge fields, subject line A/B variants, scheduled send time), **Then** the campaign is queued for the scheduled time; a preview is available; test sends work.
3. **Given** a sent campaign, **When** the manager views the campaign dashboard, **Then** they see real-time metrics: delivered, bounced, opened, clicked, unsubscribed, with per-link click tracking and geographic heatmap.
4. **Given** a recipient clicks a link and fills out a web form, **When** the form is submitted, **Then** a Lead is created (or existing Contact updated) with the campaign tagged as a touchpoint; the marketing attribution model records this as a touch.
5. **Given** a deal is won that has multiple marketing touches, **When** the attribution report is run, **Then** it shows first-touch, last-touch, and linear multi-touch attribution across all campaigns that influenced the deal, with revenue credit per campaign.
6. **Given** an email bounces or a contact unsubscribes, **When** the event is processed, **Then** the contact's email status is updated globally (across all modules), and the contact is excluded from future campaigns (CAN-SPAM / GDPR compliance).

---

### User Story 5 — Admin Configures RBAC, Custom Fields & Workflow Automation (Priority: P1)

An administrator sets up the platform: defines roles with granular permissions (module, entity, field-level), creates custom fields to match the business's unique data model, and builds no-code workflows that automate cross-module processes.

**Why this priority**: The Platform/Admin module is the foundation that all other modules depend on. RBAC is a constitutional requirement (Principle I).

**Independent Test**: Can be tested by creating roles, assigning users, verifying access restrictions, and running a workflow with observable side effects.

**Acceptance Scenarios**:

1. **Given** the admin opens Role Management, **When** they create a role "Field Sales Rep," **Then** they can set permissions per module (Sales: full, Accounting: read-only invoices, Support: create tickets, Marketing: none), per entity (Deals: own only, Contacts: team), and per field (hide "Competitor Analysis" field from this role).
2. **Given** a user with "Field Sales Rep" role, **When** they log in, **Then** the navigation shows only permitted modules; within Sales, they see only their own deals; the "Competitor Analysis" field is not rendered; API calls to forbidden endpoints return `403`.
3. **Given** the admin opens Custom Fields, **When** they add a "Renewal Date" (date) field to the Account entity, **Then** the field appears in Account forms, list views, filters, reports, and API responses — without a code deploy.
4. **Given** the admin opens the Workflow Builder, **When** they create a rule: "When Deal stage = Won AND deal value > $50K → Create a Project from template 'Enterprise Onboarding' AND assign to Professional Services team AND send Slack notification," **Then** the workflow executes on the next qualifying deal, creating the project, assigning the team, and firing the webhook.
5. **Given** auditing requirements, **When** any user performs a create, update, or delete on any record, **Then** the audit log captures: user, timestamp, IP, module, entity, record ID, field changes (old → new), and the log is immutable.
6. **Given** the admin configures SSO (SAML 2.0) with the company's IdP, **When** a user navigates to the login page, **Then** they are redirected to the IdP; upon successful authentication, a session is created with the user's CRM role; MFA is enforced per constitutional mandate.

---

### User Story 6 — Inventory Manager Fulfills a Sales Order (Priority: P2)

An inventory manager receives a sales order triggered from a won deal, checks stock, creates a purchase order for out-of-stock items, and fulfills the order — with inventory levels updating in real-time.

**Why this priority**: Connects the sales-to-fulfillment loop. Prevents overselling.

**Independent Test**: Can be tested by creating a product, recording stock, processing a sales order, and verifying stock level changes.

**Acceptance Scenarios**:

1. **Given** a deal is won with quoted products, **When** the `deal.won` event fires, **Then** a Sales Order is auto-created in Inventory with line items matching the quote; status is "Pending Fulfillment."
2. **Given** a sales order, **When** the inventory manager opens it, **Then** each line item shows current stock level, reserved quantity, and available quantity; out-of-stock items are highlighted.
3. **Given** an item is out of stock, **When** the manager clicks "Create Purchase Order," **Then** a PO is created pre-populated with the vendor (from product record), quantity needed, and cost from the price book; the PO enters the approval workflow.
4. **Given** stock is received against a PO, **When** the manager records receipt, **Then** stock levels update; the PO status changes to "Received"; journal entries are auto-created in Accounting (debit Inventory, credit AP).
5. **Given** all items are in stock, **When** the manager clicks "Fulfill," **Then** stock levels decrement; the sales order status changes to "Fulfilled"; COGS journal entries are created in Accounting; the customer is notified.

---

### User Story 7 — Project Manager Runs Post-Sale Delivery (Priority: P2)

After a deal is won, a project is auto-created. The project manager assigns tasks, tracks milestones, logs time, and collaborates with the client through a portal.

**Why this priority**: Completes the customer lifecycle from sale to delivery. Ties time tracking to invoicing.

**Independent Test**: Can be tested by creating a project from a deal, adding tasks, logging time, and verifying milestone completion.

**Acceptance Scenarios**:

1. **Given** a deal won event with a workflow rule, **When** the project creation trigger fires, **Then** a Project is created from the configured template (e.g., "SaaS Onboarding" with pre-defined tasks, milestones, and default assignees), linked to the Deal and Account.
2. **Given** an active project, **When** viewed on the Kanban board, **Then** tasks are shown in columns (To Do, In Progress, Review, Done) with assignee avatars, due dates, and priority indicators; drag-and-drop moves tasks between columns.
3. **Given** a task, **When** a team member logs time, **Then** hours are recorded against the task, project, and account; billable hours are flagged; the data is available for the Accounting module to generate time-based invoices.
4. **Given** a project with milestones, **When** all tasks in a milestone are completed, **Then** the milestone is auto-completed; a Gantt chart view reflects progress; the client sees the milestone status in the client portal.
5. **Given** the client portal, **When** the client logs in, **Then** they see project progress, completed milestones, shared documents, and can add comments on tasks — but cannot see internal notes or costs.

---

### User Story 8 — Communication Hub: Full Email & Call History (Priority: P2)

All customer communications — emails, calls, SMS — are automatically captured and displayed on the contact timeline, regardless of which module initiated them.

**Why this priority**: The communication hub ensures the "single source of truth" promise by eliminating shadow communication channels.

**Independent Test**: Can be tested by sending an email from Gmail, verifying it appears on the contact timeline, and making a VoIP call with logged recording.

**Acceptance Scenarios**:

1. **Given** 2-way email sync is configured (Gmail OAuth), **When** a rep sends an email to a customer from Gmail, **Then** the email appears on the Contact's timeline in the CRM within 60 seconds, associated to the correct Contact by email address matching.
2. **Given** 2-way email sync, **When** a customer replies to a synced email, **Then** the reply appears on the Contact timeline; if it matches an open deal or ticket, it is also linked to that record.
3. **Given** a rep clicks "Call" on a Contact, **When** the VoIP call connects (Twilio integration), **Then** a call activity is created with start time, duration (auto-tracked), caller/callee, and optional recording (if consent given); the activity appears on the timeline.
4. **Given** an email template with merge fields (`{{contact.first_name}}`, `{{deal.name}}`), **When** the rep sends it from within the CRM, **Then** fields are populated from the record context; open/click tracking is enabled; the email appears in the timeline.
5. **Given** a bulk email to 500 contacts, **When** sent from the Communication Hub, **Then** each contact's timeline shows the email; bounce/unsubscribe events update contact email status; sending respects rate limits and CAN-SPAM compliance.

---

### User Story 9 — Executive Views AI-Powered Analytics Dashboard (Priority: P2)

A VP of Sales opens the analytics dashboard and sees real-time pipeline health, AI revenue forecast, team performance, and can drill down into any metric.

**Why this priority**: Analytics transforms data into decisions. AI forecasting differentiates from basic CRM reporting.

**Independent Test**: Can be tested by seeding data and verifying dashboard metrics match expected calculations.

**Acceptance Scenarios**:

1. **Given** the VP opens the Sales Dashboard, **When** the page loads, **Then** they see: total pipeline value, weighted pipeline, deals by stage, win rate (this period vs last), revenue closed (MTD/QTD/YTD), average deal size, and sales velocity — all updating in real-time via WebSocket.
2. **Given** the AI forecasting model has been trained on historical deals, **When** the VP views "Revenue Forecast," **Then** the system shows predicted revenue for the next 3 months with confidence intervals, displayed as a trend chart overlaid on actual vs target.
3. **Given** a custom report builder, **When** the VP drags fields (e.g., Deal Owner, Stage, Close Date, Value) into rows/columns/filters, **Then** a tabular report is generated with grouping, aggregation (sum, avg, count), and can be saved, scheduled for email delivery, or exported to CSV/PDF.
4. **Given** any metric on a dashboard, **When** the VP clicks on it, **Then** they drill down to the underlying records (e.g., clicking "Deals at Negotiation" shows the list of those deals with their details).
5. **Given** the AI anomaly detector, **When** it detects an unusual pattern (e.g., lead volume drops 40% week-over-week), **Then** it generates an alert sent to the configured user with context: "Lead volume is 40% below the 4-week average. Top declining sources: [source list]."
6. **Given** a KPI scorecard per rep, **When** the VP opens Team Performance, **Then** each rep shows: deals closed, revenue, activities logged, average response time, pipeline coverage ratio, and a comparison to target.

---

### User Story 10 — Field Sales Rep Works Offline on Mobile (Priority: P3)

A field sales rep visits clients in areas with poor connectivity. They look up contacts, update deals, log GPS check-ins, and capture expenses — all offline. Data syncs when back online.

**Why this priority**: Critical for field-heavy businesses (construction, medical devices, FMCG). Constitution mandates offline-first for mobile.

**Independent Test**: Can be tested by enabling airplane mode, performing CRUD operations, re-enabling network, and verifying sync.

**Acceptance Scenarios**:

1. **Given** the mobile app syncs when online, **When** the device goes offline, **Then** the rep can access all contacts, accounts, and deals assigned to them from the local cache; the app indicates "Offline Mode."
2. **Given** offline mode, **When** the rep updates a deal stage, adds a note, or creates a new contact, **Then** changes are queued locally; the sync indicator shows pending changes count.
3. **Given** offline mode, **When** the rep taps "Check In," **Then** GPS coordinates and timestamp are recorded locally; a check-in record is created linked to the nearest Account (by address matching).
4. **Given** the device comes back online, **When** sync triggers, **Then** all queued changes are pushed to the server; conflicts (e.g., same deal edited by another user) use last-write-wins with a manual conflict resolution prompt showing both versions.
5. **Given** an expense logging flow, **When** the rep photographs a receipt, **Then** OCR runs locally (on-device ML) to extract amount and vendor; the expense is saved offline and synced later.

---

### Edge Cases

- **Duplicate lead creation**: When a lead is captured with an email matching an existing contact, the system should warn, offer to merge, or auto-link based on admin-configured rules.
- **Currency mismatch**: When a deal is in USD but the quote is sent to a customer in EUR, the CPQ must use the configured exchange rate (manually set or API-fetched) and display both currencies.
- **Circular workflow triggers**: A workflow that triggers another workflow must have loop detection (max 5 chained triggers) to prevent infinite loops.
- **Concurrent deal edits**: Two reps editing the same deal simultaneously — optimistic locking with conflict notification on save.
- **Invoice voiding**: A finalized invoice cannot be edited; it can only be voided (creating a credit note) to maintain audit integrity.
- **Accounting period close**: Once a fiscal period is closed, no journal entries can be backdated into it without admin override with audit trail.
- **Data deletion (GDPR)**: A customer exercises "right to erasure." The system must delete PII across all modules while preserving anonymized financial records for legal retention.
- **Large bulk import**: Importing 100K contacts via CSV must not block the UI; it should run as a background job with progress tracking and error report.
- **API rate limiting**: External API consumers are rate-limited (1000 req/min default) to prevent abuse; internal module-to-module calls are excluded.
- **SSO session expiry**: When the IdP revokes a session, the CRM must invalidate the local session within 5 minutes (poll or backchannel logout).

---

## Requirements

### Functional Requirements — Module 1: Sales

- **FR-S001**: System MUST capture leads from web forms, manual entry, CSV import, and API with source tracking.
- **FR-S002**: System MUST calculate lead scores based on configurable rules (demographic fit + behavioral engagement).
- **FR-S003**: System MUST support multiple sales pipelines with customizable stages, probabilities, and weighted values.
- **FR-S004**: System MUST provide a Kanban board and list view for pipeline visualization with drag-and-drop stage transitions.
- **FR-S005**: System MUST support lead-to-deal conversion creating Contact, Account, and Deal records atomically.
- **FR-S006**: System MUST implement CPQ: product selection from catalog, price book lookup, line-item discounts, tax calculation, and branded PDF quote generation.
- **FR-S007**: System MUST support multi-step approval workflows for quotes exceeding configurable discount thresholds.
- **FR-S008**: System MUST detect and alert on stale ("rotting") deals based on configurable inactivity thresholds.
- **FR-S009**: System MUST track territory assignments and enforce territory-based lead/deal routing.
- **FR-S010**: System MUST publish domain events (`lead.created`, `lead.converted`, `deal.stage_changed`, `deal.won`, `deal.lost`) for cross-module integration.

### Functional Requirements — Module 2: Marketing

- **FR-M001**: System MUST support dynamic customer segmentation based on contact/account/deal attributes and behavioral data.
- **FR-M002**: System MUST provide an email campaign builder with template editor, merge fields, A/B testing (subject line, content), and scheduled sends.
- **FR-M003**: System MUST track email engagement: delivered, bounced, opened, clicked, replied, unsubscribed — per recipient.
- **FR-M004**: System MUST support multi-touch marketing attribution (first-touch, last-touch, linear) linking campaigns to deals/revenue.
- **FR-M005**: System MUST provide a landing page builder with form capture that creates/updates Leads or Contacts.
- **FR-M006**: System MUST enforce email compliance: unsubscribe link in all campaigns, suppression lists, bounce handling, CAN-SPAM/GDPR consent tracking.
- **FR-M007**: System MUST publish domain events (`campaign.sent`, `email.opened`, `email.clicked`, `lead.captured_from_campaign`).

### Functional Requirements — Module 3: Customer Support

- **FR-CS001**: System MUST support multi-channel ticket creation: email, self-service portal, chat, phone, API.
- **FR-CS002**: System MUST assign tickets via configurable routing rules (skill-based, round-robin, load-balanced).
- **FR-CS003**: System MUST enforce SLAs with configurable response/resolution times per priority and auto-escalation on breach.
- **FR-CS004**: System MUST provide a self-service portal where customers can submit tickets, view status, access knowledge base articles, and view their invoices.
- **FR-CS005**: System MUST support a knowledge base with article authoring (rich text, images, video), categorization, search, and article suggestion during ticket resolution.
- **FR-CS006**: System MUST support CSAT and NPS surveys triggered upon ticket resolution.
- **FR-CS007**: System MUST display the customer's cross-module context (deals, invoices, past tickets, communications) on the ticket detail view.
- **FR-CS008**: System MUST publish domain events (`ticket.created`, `ticket.resolved`, `ticket.escalated`, `ticket.csat_received`).

### Functional Requirements — Module 4: Accounting

- **FR-A001**: System MUST implement double-entry bookkeeping with a configurable Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses).
- **FR-A002**: System MUST auto-generate invoices from won deals/quotes with line items, tax, payment terms, and branded PDF.
- **FR-A003**: System MUST support recurring invoices for subscription billing with configurable frequency.
- **FR-A004**: System MUST record payments (manual, payment gateway webhook, bank import) against invoices with partial payment support.
- **FR-A005**: System MUST manage Accounts Receivable with aging reports (Current, 30, 60, 90+ days) and automated payment reminders.
- **FR-A006**: System MUST manage Accounts Payable: vendor bill entry, approval workflow, payment scheduling, aging reports.
- **FR-A007**: System MUST support expense management: submission with receipt OCR, category, project/client allocation, approval workflow, and auto-journal-entry on approval.
- **FR-A008**: System MUST import bank transactions (via Plaid/Open Banking) and provide a reconciliation interface with auto-matching.
- **FR-A009**: System MUST generate financial reports: Profit & Loss, Balance Sheet, Cash Flow Statement, Trial Balance — filterable by date range, department, and project.
- **FR-A010**: System MUST support multi-currency with configurable exchange rates and automatic conversion on transactions.
- **FR-A011**: System MUST support tax configuration per region (VAT, GST, sales tax) with automatic calculation on invoices and tax summary reports.
- **FR-A012**: System MUST enforce fiscal period controls: period open/close, restriction on backdating entries to closed periods.
- **FR-A013**: System MUST create immutable journal entries for all financial transactions. Corrections are made via reversing entries only.
- **FR-A014**: System MUST publish domain events (`invoice.created`, `invoice.sent`, `payment.received`, `expense.approved`, `period.closed`).

### Functional Requirements — Module 5: Inventory

- **FR-I001**: System MUST manage a product catalog with SKU, description, unit price, cost, tax class, and custom attributes.
- **FR-I002**: System MUST support multiple price books (by region, currency, customer tier) with effective date ranges.
- **FR-I003**: System MUST track real-time stock levels per product per warehouse/location.
- **FR-I004**: System MUST auto-create sales orders from won deals and support manual sales order creation.
- **FR-I005**: System MUST support purchase order creation, approval, and goods receipt with stock level adjustment.
- **FR-I006**: System MUST create corresponding Accounting journal entries on inventory receipt (debit Inventory, credit AP) and fulfillment (debit COGS, credit Inventory).
- **FR-I007**: System MUST publish domain events (`order.created`, `order.fulfilled`, `stock.low`, `po.received`).

### Functional Requirements — Module 6: Project Management

- **FR-P001**: System MUST create projects from won deals using configurable templates (pre-defined tasks, milestones, assignees).
- **FR-P002**: System MUST support task management: creation, assignment, priority, due date, status (Kanban board + list view).
- **FR-P003**: System MUST support milestones with automatic completion when all associated tasks are done.
- **FR-P004**: System MUST support time tracking per task with billable/non-billable classification.
- **FR-P005**: System MUST provide a client-facing portal showing project progress, milestones, shared documents, and a commenting interface — with no visibility into internal notes or cost data.
- **FR-P006**: System MUST publish domain events (`project.created`, `milestone.completed`, `time.logged`).

### Functional Requirements — Module 7: Communication Hub

- **FR-CH001**: System MUST support 2-way email sync with Gmail (OAuth) and Outlook (OAuth) with < 60-second latency.
- **FR-CH002**: System MUST auto-associate synced emails/calls/SMS with the correct Contact by email address or phone number matching.
- **FR-CH003**: System MUST support VoIP calling via Twilio integration with click-to-call, call duration tracking, and optional recording.
- **FR-CH004**: System MUST support email templates with merge fields from any related record (Contact, Deal, Account, Invoice, Ticket).
- **FR-CH005**: System MUST track email opens and link clicks per recipient.
- **FR-CH006**: System MUST support SMS sending via configurable provider (Twilio, MessageBird).
- **FR-CH007**: System MUST provide an internal team chat per deal/ticket/project (threaded conversations, @mentions, file attachments).
- **FR-CH008**: System MUST display a unified timeline on every Contact/Account showing all communications across channels, chronologically.

### Functional Requirements — Module 8: Analytics & AI

- **FR-AN001**: System MUST provide real-time dashboards with configurable widgets (charts, KPIs, tables, funnels) updated via WebSocket.
- **FR-AN002**: System MUST provide a drag-and-drop custom report builder with field selection, grouping, aggregation (sum, avg, count, min, max), filtering, and sorting.
- **FR-AN003**: System MUST support scheduled report delivery via email (daily, weekly, monthly) in PDF/CSV.
- **FR-AN004**: System MUST provide AI-powered revenue forecasting with predicted close amounts and confidence intervals based on historical deal data.
- **FR-AN005**: System MUST provide AI lead scoring that combines demographic fit and behavioral engagement into a composite score with explainability (top contributing factors).
- **FR-AN006**: System MUST support anomaly detection that alerts on statistically significant deviations in key metrics (lead volume, conversion rate, revenue).
- **FR-AN007**: System MUST provide drill-down from any dashboard metric to the underlying record list.
- **FR-AN008**: System MUST provide per-rep KPI scorecards: deals closed, revenue, activities, response time, pipeline coverage.

### Functional Requirements — Module 9: Platform & Admin

- **FR-PL001**: System MUST implement RBAC with permissions configurable per module, per entity, per field, and per ownership scope (own, team, all).
- **FR-PL002**: System MUST support custom fields on all core entities (Contact, Account, Lead, Deal, Ticket, Invoice, Product, Project) with types: text, number, date, dropdown, multi-select, lookup, formula, rollup.
- **FR-PL003**: System MUST support custom modules / objects defined by the admin with fields, layouts, and relationships — without code deploy.
- **FR-PL004**: System MUST provide a visual no-code workflow builder with triggers (record events, time-based, webhook), conditions, and actions (field update, record create, email send, webhook call, module-to-module).
- **FR-PL005**: System MUST enforce immutable, append-only audit logs for all data mutations with actor, timestamp, IP, record ID, and field-level diff.
- **FR-PL006**: System MUST support SSO via SAML 2.0 and OIDC, with mandatory MFA enforcement.
- **FR-PL007**: System MUST expose a REST API (OpenAPI 3.1 spec) for every module's public CRUD operations with authentication, pagination, filtering, and rate limiting.
- **FR-PL008**: System MUST support webhook subscriptions for domain events, allowing external systems to subscribe to specific event types.
- **FR-PL009**: System MUST support multi-language (i18n) with externalized strings and RTL layout support.
- **FR-PL010**: System MUST support multi-currency with admin-configurable exchange rates and a base currency per tenant.
- **FR-PL011**: System MUST support bulk data import (CSV) with background processing, progress tracking, validation report, and duplicate detection.
- **FR-PL012**: System MUST provide sandbox environments for testing customizations before production deployment.

### Functional Requirements — Module 10: Mobile App

- **FR-MB001**: System MUST provide native mobile apps (iOS & Android) or cross-platform (React Native / Flutter) with full offline capability for assigned records.
- **FR-MB002**: System MUST sync offline changes when connectivity is restored with conflict resolution (last-write-wins + manual override).
- **FR-MB003**: System MUST support GPS check-in linked to Account/Contact by location proximity.
- **FR-MB004**: System MUST support push notifications for assignments, mentions, SLA alerts, and workflow triggers.
- **FR-MB005**: System MUST support camera-based receipt scanning (OCR) and business card scanning for contact creation.
- **FR-MB006**: System MUST meet performance budgets: app launch < 2 s, screen transitions < 300 ms, offline data access < 100 ms.

---

### Key Entities

- **Tenant**: The top-level organization. All data is scoped to a tenant. Attributes: name, plan, base currency, locale, data region.
- **User**: A person with CRM access. Belongs to a Tenant, has Role(s), and Team membership. Attributes: email, name, role, team, MFA status, last login.
- **Contact**: An individual person. Attributes: name, email(s), phone(s), company (lookup → Account), address, tags, custom fields, lifecycle stage.
- **Account**: A company/organization. Attributes: name, industry, size, website, billing address, parent account (self-referential), custom fields.
- **Lead**: An unqualified prospect. Attributes: source, score, status (New/Contacted/Qualified/Converted/Lost), assigned owner, custom fields. Converts to Contact + Account + Deal.
- **Deal**: A sales opportunity. Attributes: name, pipeline, stage, value, currency, probability, expected close date, owner, associated Contact(s)/Account, custom fields.
- **Quote**: A formal price proposal. Attributes: deal (lookup), line items (product, qty, unit price, discount, tax), total, status (Draft/Sent/Accepted/Rejected), validity period.
- **Product**: An item in the catalog. Attributes: name, SKU, description, unit price, cost, tax class, category, stock level, custom attributes.
- **Invoice**: A financial document. Attributes: number (auto-increment), account/contact (lookup), line items, subtotal, tax, total, currency, status (Draft/Sent/Partial/Paid/Overdue/Void), payment terms, due date, journal entry reference.
- **Journal Entry**: A double-entry record. Attributes: date, description, lines (account, debit, credit), reference document (invoice/expense/PO), period, immutable flag.
- **Expense**: An expenditure record. Attributes: vendor, amount, category, date, receipt URL, project/client allocation, approval status, journal entry reference.
- **Ticket**: A support request. Attributes: number, subject, description, priority, status (Open/Pending/Resolved/Closed), SLA, assigned agent, contact/account (lookup), channel.
- **Campaign**: A marketing effort. Attributes: name, type (email/SMS/web), segment, content, schedule, status (Draft/Scheduled/Active/Completed), metrics (sent/opened/clicked/bounced).
- **Project**: A post-sale delivery. Attributes: name, deal (lookup), account (lookup), template, status (Active/On Hold/Completed), start/end dates, milestones, team.
- **Task**: A unit of work. Belongs to a Project or standalone. Attributes: title, description, assignee, due date, priority, status (To Do/In Progress/Review/Done), time logged.
- **Activity**: A communication or action. Attributes: type (email/call/meeting/note/SMS), direction (inbound/outbound), contact/deal/ticket (polymorphic association), content/recording URL, timestamp.
- **Workflow Rule**: An automation definition. Attributes: trigger (event/schedule), conditions, actions, status (active/inactive), execution log.
- **Audit Log**: An immutable record. Attributes: timestamp, actor (user), IP, module, entity, record ID, action (create/update/delete), field changes (old/new), chain hash.

---

## Cross-Module Integration Map

The following domain events drive the "single source of truth" by connecting modules without coupling their internals:

| Event | Producer | Consumer(s) | Effect |
|-------|----------|-------------|--------|
| `lead.created` | Sales | Analytics, Marketing | Update dashboards, check campaign attribution |
| `lead.converted` | Sales | Analytics | Conversion metrics |
| `deal.stage_changed` | Sales | Analytics | Pipeline metrics update |
| `deal.won` | Sales | Accounting, Inventory, Projects, Analytics | Auto-create invoice, auto-create sales order, optionally create project, update revenue metrics |
| `deal.lost` | Sales | Analytics | Loss analytics, competitor tracking |
| `invoice.sent` | Accounting | Comms | Email delivery, timeline entry |
| `payment.received` | Accounting | Sales, Analytics | Deal payment status, revenue realization |
| `expense.approved` | Accounting | Projects | Project cost tracking |
| `ticket.created` | Support | Analytics, Comms | Dashboard update, notification |
| `ticket.csat_received` | Support | Analytics | CSAT aggregation |
| `campaign.sent` | Marketing | Analytics, Comms | Campaign metrics, email tracking |
| `email.received` | Comms | Sales, Support | Timeline update, potential ticket creation |
| `order.fulfilled` | Inventory | Accounting | COGS journal entry |
| `stock.low` | Inventory | Platform (Notifications) | Low-stock alert |
| `project.created` | Projects | Analytics | Resource utilization tracking |
| `time.logged` | Projects | Accounting | Billable hours for invoicing |
| `milestone.completed` | Projects | Comms, Analytics | Client notification, project metrics |
| `user.login` | Platform | Analytics (Security) | Login audit, anomaly detection |
| `record.mutated` | Platform (Audit) | Analytics (Compliance) | Audit trail entry |

---

## Non-Functional Requirements

### Performance

| Metric | Target | Verification |
|--------|--------|-------------|
| API response (p95, read) | < 200 ms | Load test (k6) with 500 concurrent users |
| API response (p95, write) | < 500 ms | Load test (k6) with 200 concurrent writes |
| Dashboard load (p95) | < 2 s | Lighthouse + synthetic monitoring |
| FCP (4G mobile) | < 1.5 s | Lighthouse mobile |
| TTI (4G mobile) | < 3 s | Lighthouse mobile |
| Bulk import (100K contacts) | < 5 min | Integration test with sample CSV |
| Report generation (1M records) | < 10 s | Benchmark test |
| Concurrent users per tenant | 500+ | Load test |
| Event propagation (publish → consume) | < 2 s | Integration test with timestamps |

### Reliability

- 99.9% uptime SLO (< 8.76 hours downtime/year)
- Zero data loss guarantee for financial transactions (synchronous writes, WAL)
- Graceful degradation: if Analytics module is down, Sales/Accounting continue operating
- Automated failover for database and message bus

### Security

*See Constitution, Principle I.* Summary:
- AES-256 at rest, TLS 1.3 in transit, field-level encryption for PII
- SSO (SAML/OIDC) + MFA mandatory
- RBAC + field-level security
- Immutable audit logs
- GDPR, SOC 2, PCI DSS compliance
- SAST + dependency scan on every PR

### Scalability

- Horizontal scaling per module (stateless services behind load balancer)
- Database read replicas for reporting workloads
- Message bus partitioned per tenant for event isolation
- CDN for static assets and document storage

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A sales rep can capture a lead and close a deal (full pipeline journey) in under 10 minutes of active work.
- **SC-002**: An accountant can generate a month-end P&L report within 30 seconds of clicking "Generate."
- **SC-003**: A support agent sees full cross-module customer context (deals, invoices, past tickets) on ticket open in < 2 seconds.
- **SC-004**: The system handles 500 concurrent users per tenant with all performance targets met.
- **SC-005**: 100% of financial transactions produce correct double-entry journal entries verified by Trial Balance (debits = credits).
- **SC-006**: Offline mobile operations sync with zero data loss within 30 seconds of connectivity resuming.
- **SC-007**: No unauthorized data access is possible — verified by RBAC boundary tests covering all module/entity/field combinations.
- **SC-008**: AI revenue forecast achieves ≤ 15% MAPE (Mean Absolute Percentage Error) after 6 months of historical data.
- **SC-009**: All campaign attribution accurately traces revenue back to originating marketing touchpoints with < 1% discrepancy.
- **SC-010**: The platform supports adding a custom field or workflow rule with zero code deployment and < 2 minutes of admin work.

---

## Risks & Follow-Ups

1. **Accounting module complexity**: Double-entry bookkeeping with multi-currency, tax compliance, and audit requirements is the highest-complexity module. Recommend building this with a dedicated financial domain expert on the team. *Mitigation: Start with single-currency, single-tax-jurisdiction MVP, then iterate.*

2. **Cross-module event consistency**: With 10 modules communicating via events, eventual consistency edge cases (e.g., invoice created before deal status propagates) need careful handling. *Mitigation: Use idempotent event handlers, outbox pattern, and explicit event ordering per aggregate.*

3. **Offline sync conflict resolution**: last-write-wins is simple but can lose data. Mobile field workers editing the same record (rare but possible) need a conflict UX. *Mitigation: Constitution already mandates LWW with manual override; implement a clear conflict resolution UI for mobile.*

---

**📋 Architectural decision detected: Modular monolith vs. microservices for the 10-module architecture — this affects deployment strategy, latency, and team autonomy. Document reasoning and tradeoffs? Run `/sp.adr modular-monolith-vs-microservices`.**

**📋 Architectural decision detected: Choice of event bus (Kafka vs. RabbitMQ vs. cloud-native) for cross-module integration — affects reliability, ordering guarantees, and operational complexity. Document reasoning and tradeoffs? Run `/sp.adr event-bus-selection`.**

**📋 Architectural decision detected: Accounting engine design (build custom vs. adapt open-source ledger) — affects correctness, compliance, and development timeline. Document reasoning and tradeoffs? Run `/sp.adr accounting-engine-design`.**
