import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean) as string[];

function findChrome(): string {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    'Chrome/Chromium not found. Set CHROME_PATH env var or install Google Chrome.',
  );
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const executablePath = findChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export function buildInvoiceHtml(invoice: Record<string, unknown>): string {
  const inv = invoice as {
    number: string; date: string; due_date?: string;
    customer: { company_name: string; address_line1?: string; city?: string; country?: string };
    currency_symbol: string;
    items: Array<{ description: string; qty: number; rate: number; line_total: number }>;
    subtotal: number; discount: number; discount_type: string;
    tax_total: number; adjustment: number; total: number; amount_paid: number; balance_due: number;
    notes?: string; terms?: string;
  };

  const fmt = (n: number) => `${inv.currency_symbol}${Number(n).toFixed(2)}`;

  const rows = inv.items.map(item => `
    <tr>
      <td>${item.description}</td>
      <td style="text-align:center">${item.qty}</td>
      <td style="text-align:right">${fmt(item.rate)}</td>
      <td style="text-align:right">${fmt(item.line_total)}</td>
    </tr>`).join('');

  const discountRow = inv.discount > 0 ? `
    <tr>
      <td colspan="3" style="text-align:right;padding-right:16px">Discount (${inv.discount_type === 'percent' ? inv.discount + '%' : fmt(inv.discount)})</td>
      <td style="text-align:right">-${fmt(inv.discount_type === 'percent' ? inv.subtotal * inv.discount / 100 : inv.discount)}</td>
    </tr>` : '';

  const taxRow = inv.tax_total > 0 ? `
    <tr>
      <td colspan="3" style="text-align:right;padding-right:16px">Tax</td>
      <td style="text-align:right">${fmt(inv.tax_total)}</td>
    </tr>` : '';

  const adjustRow = inv.adjustment !== 0 ? `
    <tr>
      <td colspan="3" style="text-align:right;padding-right:16px">Adjustment</td>
      <td style="text-align:right">${fmt(inv.adjustment)}</td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1e293b; padding: 24px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 32px; }
  .brand { font-size: 24px; font-weight: 700; color: #6366f1; }
  .invoice-meta h1 { font-size: 22px; font-weight: 700; text-align: right; }
  .invoice-meta p { text-align: right; color: #64748b; }
  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #fef3c7; color: #92400e; text-transform: uppercase; }
  .addresses { display: flex; gap: 32px; margin-bottom: 24px; }
  .address-block h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  thead th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
  thead th:last-child { text-align: right; }
  thead th:nth-child(2), thead th:nth-child(3) { text-align: center; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .totals { margin-left: auto; width: 280px; }
  .totals table td { padding: 6px 12px; border: none; }
  .totals .total-row td { font-weight: 700; font-size: 15px; border-top: 2px solid #1e293b; }
  .totals .paid-row td { color: #16a34a; }
  .totals .balance-row td { color: #dc2626; font-weight: 700; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  .notes h4, .terms h4 { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; }
  .notes p, .terms p { color: #475569; line-height: 1.5; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">Performex CRM</div>
    <div class="invoice-meta">
      <h1>INVOICE #${inv.number}</h1>
      <p>Date: ${inv.date}</p>
      ${inv.due_date ? `<p>Due: ${inv.due_date}</p>` : ''}
    </div>
  </div>

  <div class="addresses">
    <div class="address-block">
      <h3>Bill To</h3>
      <strong>${inv.customer.company_name}</strong>
      ${inv.customer.address_line1 ? `<p>${inv.customer.address_line1}</p>` : ''}
      ${inv.customer.city ? `<p>${inv.customer.city}${inv.customer.country ? ', ' + inv.customer.country : ''}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td>Subtotal</td>
        <td style="text-align:right">${fmt(inv.subtotal)}</td>
      </tr>
      ${discountRow}
      ${taxRow}
      ${adjustRow}
      <tr class="total-row">
        <td>Total</td>
        <td style="text-align:right">${fmt(inv.total)}</td>
      </tr>
      ${inv.amount_paid > 0 ? `<tr class="paid-row"><td>Amount Paid</td><td style="text-align:right">-${fmt(inv.amount_paid)}</td></tr>` : ''}
      <tr class="balance-row">
        <td>Balance Due</td>
        <td style="text-align:right">${fmt(inv.balance_due)}</td>
      </tr>
    </table>
  </div>

  ${inv.notes || inv.terms ? `
  <div class="footer">
    ${inv.notes ? `<div class="notes"><h4>Notes</h4><p>${inv.notes}</p></div>` : ''}
    ${inv.terms ? `<div class="terms" style="margin-top:12px"><h4>Terms & Conditions</h4><p>${inv.terms}</p></div>` : ''}
  </div>` : ''}
</body>
</html>`;
}
