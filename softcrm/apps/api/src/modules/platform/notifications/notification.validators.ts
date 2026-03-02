import { z } from 'zod';

export const NOTIFICATION_TYPES = [
  'DEAL_WON',
  'DEAL_LOST',
  'TICKET_ASSIGNED',
  'TICKET_OVERDUE',
  'INVOICE_OVERDUE',
  'APPROVAL_REQUIRED',
  'LEAVE_REQUEST',
  'PAYROLL_APPROVED',
  'SYSTEM',
  'MENTION',
] as const;

export const NOTIFICATION_CATEGORIES = [
  'SALES',
  'SUPPORT',
  'BILLING',
  'HR',
  'GENERAL',
] as const;

export const listNotificationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z
    .union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])
    .optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  category: z.enum(NOTIFICATION_CATEGORIES).optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>;

export const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1).max(100),
});

export type MarkReadBody = z.infer<typeof markReadSchema>;

export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
});
