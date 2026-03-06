/**
 * E059 — Payroll Engine Enhancement
 *
 * Provides net-pay calculation with tax brackets and pay-slip generation
 * for a completed payroll run.
 */

import { getPrismaClient } from '@softcrm/db';
import { generateId } from '@softcrm/shared-kernel';

/**
 * Apply a simplified progressive tax bracket and flat benefit deductions
 * to arrive at net pay.
 */
export function calculateNetPay(
  grossPay: number,
  deductions: { taxBrackets?: { min: number; max: number | null; rate: number }[]; benefits?: number },
): { tax: number; benefits: number; totalDeductions: number; netPay: number } {
  let tax = 0;
  const brackets = deductions.taxBrackets ?? [];

  // Progressive tax calculation
  let remaining = grossPay;
  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const upper = bracket.max ?? Infinity;
    const taxable = Math.min(remaining, upper - bracket.min);
    if (taxable > 0) {
      tax += Math.round(taxable * bracket.rate * 100) / 100;
      remaining -= taxable;
    }
  }

  const benefits = deductions.benefits ?? 0;
  const totalDeductions = Math.round((tax + benefits) * 100) / 100;
  const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

  return { tax, benefits, totalDeductions, netPay };
}

/**
 * Generate individual pay slips for every employee included in a payroll run.
 *
 * This reads the existing pay-slip records (created during calculatePayroll)
 * and stamps them as APPROVED, returning the full list.
 */
export async function generatePaySlips(tenantId: string, payrollRunId: string) {
  const db = getPrismaClient();

  const run = await db.payrollRun.findFirst({ where: { id: payrollRunId, tenantId } });
  if (!run) throw new Error('PayrollRun not found');

  if (run.status !== 'APPROVED' && run.status !== 'PENDING_APPROVAL') {
    throw new Error(`Cannot generate pay slips — payroll run status is ${run.status}`);
  }

  const paySlips = await db.paySlip.findMany({
    where: { tenantId, payrollRunId },
    include: { employee: true },
  });

  // Stamp each pay slip as APPROVED
  await db.paySlip.updateMany({
    where: { tenantId, payrollRunId, status: 'DRAFT' },
    data: { status: 'APPROVED' as never },
  });

  return db.paySlip.findMany({
    where: { tenantId, payrollRunId },
    include: { employee: true },
    orderBy: { employee: { lastName: 'asc' } },
  });
}
