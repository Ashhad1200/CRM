/**
 * E058 — Attendance Service
 *
 * Provides check-in/check-out tracking, timesheet queries, and attendance
 * summaries scoped by tenant.
 */

import { getPrismaClient } from '@softcrm/db';
import { generateId } from '@softcrm/shared-kernel';

export async function checkIn(tenantId: string, employeeId: string) {
  const db = getPrismaClient();
  return db.attendance.create({
    data: { id: generateId(), tenantId, employeeId, checkIn: new Date(), status: 'PRESENT' },
  });
}

export async function checkOut(tenantId: string, employeeId: string) {
  const db = getPrismaClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const record = await db.attendance.findFirst({
    where: { tenantId, employeeId, checkIn: { gte: today }, checkOut: null },
    orderBy: { checkIn: 'desc' },
  });
  if (!record) throw new Error('No check-in found for today');
  const hoursWorked = (Date.now() - record.checkIn.getTime()) / 3600000;
  return db.attendance.update({
    where: { id: record.id },
    data: { checkOut: new Date(), hoursWorked: Math.round(hoursWorked * 100) / 100 },
  });
}

export async function getTimesheet(
  tenantId: string,
  employeeId: string,
  startDate: Date,
  endDate: Date,
) {
  const db = getPrismaClient();
  return db.attendance.findMany({
    where: { tenantId, employeeId, checkIn: { gte: startDate, lte: endDate } },
    orderBy: { checkIn: 'asc' },
  });
}

export async function getAttendanceSummary(
  tenantId: string,
  employeeId: string,
  month: number,
  year: number,
) {
  const db = getPrismaClient();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const records = await db.attendance.findMany({
    where: { tenantId, employeeId, checkIn: { gte: start, lte: end } },
  });
  const totalDays = records.length;
  const totalHours = records.reduce(
    (sum, r) => sum + (r.hoursWorked?.toNumber?.() ?? Number(r.hoursWorked) ?? 0),
    0,
  );
  const avgHours = totalDays > 0 ? totalHours / totalDays : 0;
  const overtime = records.filter(
    (r) => (r.hoursWorked?.toNumber?.() ?? Number(r.hoursWorked) ?? 0) > 8,
  ).length;
  return {
    totalDays,
    totalHours: Math.round(totalHours * 100) / 100,
    avgHours: Math.round(avgHours * 100) / 100,
    overtimeDays: overtime,
  };
}
