import { eventBus } from '../../../infra/event-bus.js';
import { logger } from '../../../logger.js';
import { NotificationService } from './notification.service.js';

// ── Event payload types ────────────────────────────────────────────────────────

interface DealWonPayload {
  tenantId: string;
  dealId: string;
  dealName: string;
  ownerId: string;
}

interface DealLostPayload {
  tenantId: string;
  dealId: string;
  dealName: string;
  ownerId: string;
}

interface TicketAssignedPayload {
  tenantId: string;
  ticketId: string;
  ticketSubject: string;
  assigneeId: string;
}

interface InvoiceOverduePayload {
  tenantId: string;
  invoiceId: string;
  invoiceNumber: string;
  accountManagerId: string;
}

interface LeaveRequestCreatedPayload {
  tenantId: string;
  leaveRequestId: string;
  employeeName: string;
  managerId: string;
}

interface PayrollApprovedPayload {
  tenantId: string;
  payrollRunId: string;
  period: string;
  employeeIds: string[];
}

// ── Register listeners ─────────────────────────────────────────────────────────

export function registerNotificationListeners(): void {
  const service = new NotificationService();

  // sales.deal.won → notify deal owner
  eventBus.subscribe<DealWonPayload>('sales.deal.won', async (event) => {
    const { tenantId, dealId, dealName, ownerId } = event.payload;
    try {
      await service.createNotification(tenantId, ownerId, {
        type: 'DEAL_WON',
        title: 'Deal Won',
        body: `Deal Won: ${dealName}`,
        entityType: 'deal',
        entityId: dealId,
        actionUrl: `/sales/deals/${dealId}`,
      });
    } catch (err) {
      logger.error({ err, eventId: event.id }, 'Failed to create DEAL_WON notification');
    }
  });

  // sales.deal.lost → notify deal owner
  eventBus.subscribe<DealLostPayload>('sales.deal.lost', async (event) => {
    const { tenantId, dealId, dealName, ownerId } = event.payload;
    try {
      await service.createNotification(tenantId, ownerId, {
        type: 'DEAL_LOST',
        title: 'Deal Lost',
        body: `Deal Lost: ${dealName}`,
        entityType: 'deal',
        entityId: dealId,
        actionUrl: `/sales/deals/${dealId}`,
      });
    } catch (err) {
      logger.error({ err, eventId: event.id }, 'Failed to create DEAL_LOST notification');
    }
  });

  // support.ticket.assigned → notify assignee
  eventBus.subscribe<TicketAssignedPayload>('support.ticket.assigned', async (event) => {
    const { tenantId, ticketId, ticketSubject, assigneeId } = event.payload;
    try {
      await service.createNotification(tenantId, assigneeId, {
        type: 'TICKET_ASSIGNED',
        title: 'Ticket Assigned',
        body: `Ticket Assigned: ${ticketSubject}`,
        entityType: 'ticket',
        entityId: ticketId,
        actionUrl: `/support/tickets/${ticketId}`,
      });
    } catch (err) {
      logger.error({ err, eventId: event.id }, 'Failed to create TICKET_ASSIGNED notification');
    }
  });

  // accounting.invoice.overdue → notify account manager
  eventBus.subscribe<InvoiceOverduePayload>('accounting.invoice.overdue', async (event) => {
    const { tenantId, invoiceId, invoiceNumber, accountManagerId } = event.payload;
    try {
      await service.createNotification(tenantId, accountManagerId, {
        type: 'INVOICE_OVERDUE',
        title: 'Invoice Overdue',
        body: `Invoice Overdue: ${invoiceNumber}`,
        entityType: 'invoice',
        entityId: invoiceId,
        actionUrl: `/accounting/invoices/${invoiceId}`,
      });
    } catch (err) {
      logger.error({ err, eventId: event.id }, 'Failed to create INVOICE_OVERDUE notification');
    }
  });

  // hr.leave_request.created → notify manager
  eventBus.subscribe<LeaveRequestCreatedPayload>('hr.leave_request.created', async (event) => {
    const { tenantId, leaveRequestId, employeeName, managerId } = event.payload;
    try {
      await service.createNotification(tenantId, managerId, {
        type: 'LEAVE_REQUEST',
        title: 'Leave Request',
        body: `Leave Request from ${employeeName}`,
        entityType: 'leave_request',
        entityId: leaveRequestId,
      });
    } catch (err) {
      logger.error({ err, eventId: event.id }, 'Failed to create LEAVE_REQUEST notification');
    }
  });

  // hr.payroll_run.approved → notify all employees
  eventBus.subscribe<PayrollApprovedPayload>('hr.payroll_run.approved', async (event) => {
    const { tenantId, payrollRunId, period, employeeIds } = event.payload;
    const notificationPromises = employeeIds.map((userId) =>
      service
        .createNotification(tenantId, userId, {
          type: 'PAYROLL_APPROVED',
          title: 'Payroll Approved',
          body: `Payroll Approved for ${period}`,
          entityType: 'payroll_run',
          entityId: payrollRunId,
        })
        .catch((err) => {
          logger.error(
            { err, eventId: event.id, userId },
            'Failed to create PAYROLL_APPROVED notification for user',
          );
        }),
    );

    await Promise.all(notificationPromises);
  });

  logger.info('Notification event listeners registered');
}
