/**
 * E060 — Pay Slip PDF (stub)
 *
 * Returns an HTML representation of a pay slip suitable for printing
 * or conversion to PDF via a downstream service.
 */

export async function generatePaySlipHtml(paySlip: any): Promise<string> {
  return `<!DOCTYPE html><html><head><style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .section { margin: 15px 0; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    .total { font-weight: bold; font-size: 1.2em; }
  </style></head><body>
    <div class="header"><h1>Pay Slip</h1><p>Period: ${paySlip.period ?? ''}</p></div>
    <div class="section"><h3>Employee</h3><p>${paySlip.employeeName ?? ''}</p><p>ID: ${paySlip.employeeNumber ?? ''}</p></div>
    <div class="section"><h3>Earnings</h3><table>
      <tr><th>Description</th><th>Amount</th></tr>
      <tr><td>Basic Salary</td><td>${paySlip.basicSalary ?? 0}</td></tr>
      <tr><td>Allowances</td><td>${paySlip.allowances ?? 0}</td></tr>
      <tr class="total"><td>Gross Pay</td><td>${paySlip.grossPay ?? 0}</td></tr>
    </table></div>
    <div class="section"><h3>Deductions</h3><table>
      <tr><th>Description</th><th>Amount</th></tr>
      <tr><td>Tax</td><td>${paySlip.tax ?? 0}</td></tr>
      <tr><td>Benefits</td><td>${paySlip.benefits ?? 0}</td></tr>
      <tr class="total"><td>Total Deductions</td><td>${paySlip.totalDeductions ?? 0}</td></tr>
    </table></div>
    <div class="section total"><p>Net Pay: ${paySlip.netPay ?? 0}</p></div>
  </body></html>`;
}
