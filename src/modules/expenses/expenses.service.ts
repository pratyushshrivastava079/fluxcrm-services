import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { NotFoundError } from '../../core/utils/response';
import {
  CreateExpenseCategoryInput,
  CreateExpenseInput,
  UpdateExpenseInput,
} from './expenses.schema';

// ── Categories ────────────────────────────────────────────────────────────────

export async function listCategories(tenantId: string) {
  return db('expense_categories')
    .where({ tenant_id: tenantId })
    .orderBy('name')
    .select('id', 'name', 'description');
}

export async function createCategory(tenantId: string, input: CreateExpenseCategoryInput) {
  const [row] = await db('expense_categories')
    .insert({ tenant_id: tenantId, ...input })
    .returning('*');
  return row;
}

export async function deleteCategory(tenantId: string, id: string) {
  const row = await db('expense_categories').where({ id, tenant_id: tenantId }).first();
  if (!row) throw new NotFoundError('Expense category');
  await db('expense_categories').where({ id }).delete();
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function listExpenses(
  tenantId: string,
  params: PaginationParams & { status?: string; customer_id?: string; category_id?: string; billable?: string },
) {
  const { page = 1, perPage = 25, search, status, customer_id, category_id, billable } = params;

  let q = db('expenses as e')
    .leftJoin('expense_categories as ec', 'ec.id', 'e.category_id')
    .leftJoin('customers as c',           'c.id',  'e.customer_id')
    .leftJoin('projects as p',            'p.id',  'e.project_id')
    .leftJoin('currencies as cur',        'cur.id','e.currency_id')
    .where('e.tenant_id', tenantId)
    .leftJoin('invoices as inv', 'inv.id', 'e.invoice_id')
    .select(
      'e.id', 'e.name', 'e.amount', 'e.date', 'e.status',
      'e.is_billable', 'e.note', 'e.receipt_url', 'e.created_at',
      'e.reference_no', 'e.payment_mode', 'e.invoice_id', 'e.tags',
      'ec.name as category_name',
      'c.company_name as customer_name',
      'p.name as project_name',
      'cur.symbol as currency_symbol',
      'cur.code as currency_code',
      'inv.number as invoice_number',
    );

  if (status)      q = q.where('e.status', status);
  if (customer_id) q = q.where('e.customer_id', customer_id);
  if (category_id) q = q.where('e.category_id', category_id);
  if (billable === 'true') q = q.where('e.is_billable', true);
  if (search)      q = q.whereILike('e.name', `%${search}%`);

  const [{ count }] = await q.clone().clearSelect().count('e.id as count');
  const data = await q.orderBy('e.date', 'desc').limit(perPage).offset((page - 1) * perPage);

  return { data, meta: buildMeta(Number(count), page, perPage) };
}

export async function getExpense(tenantId: string, id: string) {
  const row = await db('expenses as e')
    .leftJoin('expense_categories as ec', 'ec.id', 'e.category_id')
    .leftJoin('customers as c',           'c.id',  'e.customer_id')
    .leftJoin('projects as p',            'p.id',  'e.project_id')
    .leftJoin('currencies as cur',        'cur.id','e.currency_id')
    .leftJoin('invoices as inv',          'inv.id','e.invoice_id')
    .where('e.id', id).where('e.tenant_id', tenantId)
    .select(
      'e.*',
      'ec.name as category_name',
      'c.company_name as customer_name',
      'p.name as project_name',
      'cur.symbol as currency_symbol',
      'cur.code as currency_code',
      'inv.number as invoice_number',
    )
    .first();

  if (!row) throw new NotFoundError('Expense');
  return row;
}

export async function createExpense(tenantId: string, userId: string, input: CreateExpenseInput) {
  const [row] = await db('expenses')
    .insert({
      tenant_id:   tenantId,
      added_by:    userId,
      name:        input.name,
      amount:      input.amount,
      date:        input.date,
      currency_id: input.currency_id,
      category_id: input.category_id ?? null,
      customer_id: input.customer_id ?? null,
      project_id:  input.project_id  ?? null,
      tax_id:      input.tax_id      ?? null,
      note:         input.note,
      is_billable:  input.is_billable ?? false,
      receipt_url:  input.receipt_url ?? null,
      reference_no: input.reference_no ?? null,
      payment_mode: input.payment_mode ?? null,
      invoice_id:   input.invoice_id   ?? null,
      tags:         input.tags ?? [],
    })
    .returning('*');
  return row;
}

export async function updateExpense(tenantId: string, id: string, input: UpdateExpenseInput) {
  const existing = await db('expenses').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Expense');

  const [row] = await db('expenses')
    .where({ id })
    .update({ ...input, updated_at: db.fn.now() })
    .returning('*');
  return row;
}

export async function deleteExpense(tenantId: string, id: string) {
  const existing = await db('expenses').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Expense');
  await db('expenses').where({ id }).delete();
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getExpenseStats(tenantId: string) {
  const base = db('expenses').where({ tenant_id: tenantId });

  const [totalRow, billableRow, nonBillableRow, notInvoicedRow, billedRow] = await Promise.all([
    base.clone().sum('amount as total').first(),
    base.clone().where('is_billable', true).sum('amount as total').first(),
    base.clone().where('is_billable', false).sum('amount as total').first(),
    base.clone().where('is_billable', true).whereNot('status', 'invoiced').sum('amount as total').first(),
    base.clone().where('status', 'invoiced').sum('amount as total').first(),
  ]);

  return {
    total:        Number(totalRow?.total       ?? 0),
    billable:     Number(billableRow?.total    ?? 0),
    non_billable: Number(nonBillableRow?.total ?? 0),
    not_invoiced: Number(notInvoicedRow?.total ?? 0),
    billed:       Number(billedRow?.total      ?? 0),
  };
}

// ── CSV Import ────────────────────────────────────────────────────────────────

export interface ExpenseImportRow {
  row:          number;
  category?:    string;
  amount:       string;
  tax?:         string;
  tax2?:        string;
  reference_no?: string;
  note?:        string;
  name?:        string;
  customer?:    string;
  billable?:    string;
  payment_mode?: string;
  date:         string;
}

export interface ExpenseImportRowResult {
  row:           number;
  name:          string;
  amount:        number | null;
  date:          string;
  category_id:   string | null;
  category_name: string | null;
  customer_id:   string | null;
  customer_name: string | null;
  tax_id:        string | null;
  tax_name:      string | null;
  tax2_id:       string | null;
  tax2_name:     string | null;
  reference_no:  string | null;
  note:          string | null;
  payment_mode:  string | null;
  is_billable:   boolean;
  errors:        string[];
  status:        'ok' | 'error';
}

export async function importExpenses(
  tenantId: string,
  userId: string,
  rows: ExpenseImportRow[],
  simulate: boolean,
): Promise<{ imported: number; failed: number; results: ExpenseImportRowResult[] }> {
  // Pre-load lookup tables
  const [categories, taxRates, customers, currencies] = await Promise.all([
    db('expense_categories').where({ tenant_id: tenantId }).select('id', 'name'),
    db('tax_rates').where({ tenant_id: tenantId }).select('id', 'name'),
    db('customers').where({ tenant_id: tenantId }).select('id', 'company_name'),
    db('currencies').where({ tenant_id: tenantId }).orderBy('is_default', 'desc').select('id', 'code').first(),
  ]);

  const catByName = new Map<string, string>((categories as any[]).map(c => [c.name.toLowerCase(), c.id]));
  const catById   = new Map<string, string>((categories as any[]).map(c => [c.id, c.name]));
  const taxByName = new Map<string, string>((taxRates as any[]).map(t => [t.name.toLowerCase(), t.id]));
  const taxById   = new Map<string, string>((taxRates as any[]).map(t => [t.id, t.name]));
  const custByName = new Map<string, string>((customers as any[]).map(c => [c.company_name.toLowerCase(), c.id]));
  const custById   = new Map<string, string>((customers as any[]).map(c => [c.id, c.company_name]));

  // Default currency (first active)
  const defaultCurrencyId = (currencies as any)?.id ?? null;

  function resolveCategory(val?: string) {
    if (!val?.trim()) return { id: null, name: null };
    const v = val.trim();
    if (catById.has(v))   return { id: v, name: catById.get(v)! };
    const byName = catByName.get(v.toLowerCase());
    if (byName) return { id: byName, name: v };
    return { id: null, name: null, err: `Category "${v}" not found` };
  }

  function resolveTax(val?: string) {
    if (!val?.trim()) return { id: null, name: null };
    const v = val.trim();
    if (taxById.has(v))   return { id: v, name: taxById.get(v)! };
    const byName = taxByName.get(v.toLowerCase());
    if (byName) return { id: byName, name: v };
    return { id: null, name: null, err: `Tax "${v}" not found` };
  }

  function resolveCustomer(val?: string) {
    if (!val?.trim()) return { id: null, name: null };
    const v = val.trim();
    if (custById.has(v))   return { id: v, name: custById.get(v)! };
    const byName = custByName.get(v.toLowerCase());
    if (byName) return { id: byName, name: v };
    return { id: null, name: null, err: `Customer "${v}" not found` };
  }

  function parseBillable(val?: string): boolean {
    if (!val) return false;
    return ['1', 'yes', 'true', 'y'].includes(val.trim().toLowerCase());
  }

  function validateDate(val: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(val?.trim() ?? '');
  }

  const results: ExpenseImportRowResult[] = [];
  const toInsert: any[] = [];

  for (const row of rows) {
    const errors: string[] = [];

    const amount = parseFloat(row.amount);
    if (!row.amount?.trim() || isNaN(amount) || amount < 0) errors.push('Amount must be a valid non-negative number');

    if (!row.date?.trim() || !validateDate(row.date)) errors.push('Date must be in Y-m-d format (e.g. 2026-04-16)');

    const cat  = resolveCategory(row.category);
    const tax  = resolveTax(row.tax);
    const tax2 = resolveTax(row.tax2);
    const cust = resolveCustomer(row.customer);

    if (cat.err)  errors.push(cat.err);
    if (tax.err)  errors.push(tax.err);
    if (tax2.err) errors.push(tax2.err);
    if (cust.err) errors.push(cust.err);

    const result: ExpenseImportRowResult = {
      row:           row.row,
      name:          row.name?.trim() || `Expense ${row.row}`,
      amount:        isNaN(amount) ? null : amount,
      date:          row.date?.trim() ?? '',
      category_id:   cat.id,
      category_name: cat.name ?? (row.category?.trim() || null),
      customer_id:   cust.id,
      customer_name: cust.name ?? (row.customer?.trim() || null),
      tax_id:        tax.id,
      tax_name:      tax.name ?? (row.tax?.trim() || null),
      tax2_id:       tax2.id,
      tax2_name:     tax2.name ?? (row.tax2?.trim() || null),
      reference_no:  row.reference_no?.trim() || null,
      note:          row.note?.trim() || null,
      payment_mode:  row.payment_mode?.trim() || null,
      is_billable:   parseBillable(row.billable),
      errors,
      status: errors.length === 0 ? 'ok' : 'error',
    };

    results.push(result);

    if (errors.length === 0 && !simulate) {
      toInsert.push({
        tenant_id:    tenantId,
        added_by:     userId,
        name:         result.name,
        amount:       result.amount,
        date:         result.date,
        currency_id:  defaultCurrencyId,
        category_id:  result.category_id,
        customer_id:  result.customer_id,
        tax_id:       result.tax_id,
        note:         result.note,
        is_billable:  result.is_billable,
        reference_no: result.reference_no,
        payment_mode: result.payment_mode,
      });
    }
  }

  if (toInsert.length > 0) {
    await db('expenses').insert(toInsert);
  }

  return {
    imported: results.filter(r => r.status === 'ok').length,
    failed:   results.filter(r => r.status === 'error').length,
    results,
  };
}

export function parseExpenseCsv(csvText: string): ExpenseImportRow[] {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]).map(h =>
    h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  );

  const idx = {
    category:     headers.findIndex(h => h.startsWith('cat')),
    amount:       headers.findIndex(h => h.startsWith('amount') || h === 'amt'),
    tax:          headers.findIndex(h => h === 'tax'),
    tax2:         headers.findIndex(h => h === 'tax2'),
    reference_no: headers.findIndex(h => h.startsWith('ref')),
    note:         headers.findIndex(h => h === 'note' || h === 'notes'),
    name:         headers.findIndex(h => h.includes('expense') && h.includes('name') || h === 'name'),
    customer:     headers.findIndex(h => h.startsWith('cust')),
    billable:     headers.findIndex(h => h.startsWith('bill')),
    payment_mode: headers.findIndex(h => h.startsWith('payment')),
    date:         headers.findIndex(h => h === 'date'),
  };

  const rows: ExpenseImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = parseLine(line);
    const get = (j: number) => j >= 0 ? (cells[j] ?? '').trim() : undefined;
    rows.push({
      row:          i,
      category:     get(idx.category),
      amount:       get(idx.amount) ?? '',
      tax:          get(idx.tax),
      tax2:         get(idx.tax2),
      reference_no: get(idx.reference_no),
      note:         get(idx.note),
      name:         get(idx.name),
      customer:     get(idx.customer),
      billable:     get(idx.billable),
      payment_mode: get(idx.payment_mode),
      date:         get(idx.date) ?? '',
    });
  }
  return rows;
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  result.push(cur.trim());
  return result;
}
