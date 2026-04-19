import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { NotFoundError, BadRequestError } from '../../core/utils/response';
import { buildInvoiceHtml, htmlToPdf } from '../../core/utils/pdf';
import { createPaymentIntent } from '../../core/utils/stripe';
import {
  CreateInvoiceInput, UpdateInvoiceInput,
  RecordPaymentInput, InvoiceItemInput,
} from './invoices.schema';
import { randomHex } from '../../core/utils/hash';

// ── Number generation ─────────────────────────────────────────────────────────

async function nextInvoiceNumber(tenantId: string): Promise<string> {
  const row = await db('invoices')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .max('number as mx')
    .first();

  let next = 1;
  if (row?.mx) {
    const m = String(row.mx).match(/(\d+)$/);
    if (m) next = parseInt(m[1]) + 1;
  }
  return `INV-${String(next).padStart(4, '0')}`;
}

// ── Financial calculations ────────────────────────────────────────────────────

interface TaxMap { [id: string]: number }

function calcLineTotals(items: InvoiceItemInput[], taxMap: TaxMap) {
  return items.map(item => {
    const gross = Number(item.qty) * Number(item.rate);
    const lineDiscount = item.discount_type === 'percent'
      ? gross * (Number(item.discount) / 100)
      : Number(item.discount);
    const line_total = gross - lineDiscount;

    const t1 = item.tax_id ? (taxMap[item.tax_id] ?? 0) : 0;
    const t2 = item.tax2_id ? (taxMap[item.tax2_id] ?? 0) : 0;
    const line_tax = line_total * (t1 + t2) / 100;

    return { ...item, line_total, line_tax };
  });
}

function calcTotals(
  items: ReturnType<typeof calcLineTotals>,
  discount: number,
  discountType: 'percent' | 'fixed',
  adjustment: number,
) {
  const subtotal = items.reduce((s, i) => s + i.line_total, 0);
  const taxTotal = items.reduce((s, i) => s + i.line_tax, 0);
  const disc = discountType === 'percent' ? subtotal * discount / 100 : discount;
  const total = subtotal - disc + taxTotal + adjustment;
  return { subtotal, discount: disc, tax_total: taxTotal, total: Math.max(0, total) };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listInvoices(tenantId: string, params: PaginationParams & { status?: string; customer_id?: string }) {
  const { page = 1, perPage = 20, search, sortBy = 'created_at', sortDir = 'desc', status, customer_id } = params;
  const per_page = perPage; const sort_by = sortBy; const sort_dir = sortDir;

  let q = db('invoices as i')
    .join('customers as c', 'c.id', 'i.customer_id')
    .leftJoin('projects as p', 'p.id', 'i.project_id')
    .where('i.tenant_id', tenantId)
    .whereNull('i.deleted_at')
    .select(
      'i.id', 'i.number', 'i.status', 'i.date', 'i.due_date',
      'i.total', 'i.tax_total', 'i.amount_paid', 'i.balance_due', 'i.currency_id',
      'i.tags', 'i.project_id',
      'c.company_name',
      'p.name as project_name',
    );

  if (status) q = q.where('i.status', status);
  if (customer_id) q = q.where('i.customer_id', customer_id);
  if (search) q = q.whereILike('i.number', `%${search}%`).orWhereILike('c.company_name', `%${search}%`);

  const [{ count }] = await q.clone().clearSelect().count('i.id as count');
  const data = await q.orderBy(`i.${sort_by}`, sort_dir).limit(per_page).offset((page - 1) * per_page);

  return { invoices: data, meta: buildMeta(Number(count), page, per_page) };
}

export async function getInvoiceStats(tenantId: string) {
  const rows = await db('invoices')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .groupBy('status')
    .select('status', db.raw('count(*) as count'));

  const totals = await db('invoices')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .select(
      db.raw('SUM(CASE WHEN status = ? THEN total ELSE 0 END) as paid_total', ['paid']),
      db.raw('SUM(CASE WHEN status IN (?, ?) THEN balance_due ELSE 0 END) as overdue_total', ['overdue', 'unpaid']),
      db.raw('SUM(balance_due) as outstanding_total'),
    )
    .first();

  const ALL_STATUSES = ['unpaid', 'paid', 'partial', 'overdue', 'draft', 'sent', 'viewed', 'cancelled'];
  const map = Object.fromEntries((rows as any[]).map(r => [r.status, Number(r.count)]));
  const total = Object.values(map).reduce((s: number, c: unknown) => s + Number(c), 0);

  return {
    by_status: ALL_STATUSES.map(s => ({ status: s, count: map[s] ?? 0, total })),
    paid_total:        Number((totals as any)?.paid_total       ?? 0),
    overdue_total:     Number((totals as any)?.overdue_total    ?? 0),
    outstanding_total: Number((totals as any)?.outstanding_total ?? 0),
  };
}

export async function getInvoice(tenantId: string, id: string) {
  const invoice = await db('invoices as i')
    .join('customers as c', 'c.id', 'i.customer_id')
    .leftJoin('currencies as cur', 'cur.id', 'i.currency_id')
    .leftJoin('users as u', 'u.id', 'i.assigned_to')
    .where('i.id', id).where('i.tenant_id', tenantId).whereNull('i.deleted_at')
    .select(
      'i.*',
      'c.company_name', 'c.address_line1', 'c.address_line2', 'c.city', 'c.state', 'c.zip', 'c.country',
      'c.shipping_street', 'c.shipping_city', 'c.shipping_state', 'c.shipping_zip', 'c.shipping_country',
      'cur.symbol as currency_symbol', 'cur.code as currency_code',
      db.raw("CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name"),
    )
    .first();

  if (!invoice) throw new NotFoundError('Invoice');

  const items = await db('invoice_items').where({ invoice_id: id }).orderBy('sort_order');
  const payments = await db('payments as p')
    .leftJoin('payment_modes as pm', 'pm.id', 'p.payment_mode_id')
    .where('p.invoice_id', id)
    .select('p.*', 'pm.name as payment_mode_name')
    .orderBy('p.date', 'desc');

  return { ...invoice, items, payments };
}

export async function createInvoice(tenantId: string, userId: string, input: CreateInvoiceInput) {
  const taxIds = [...new Set([
    ...input.items.flatMap(i => [i.tax_id, i.tax2_id].filter(Boolean) as string[]),
  ])];
  const taxRates = taxIds.length
    ? await db('tax_rates').whereIn('id', taxIds).where({ tenant_id: tenantId }).select('id', 'rate')
    : [];
  const taxMap: TaxMap = Object.fromEntries(taxRates.map((t: { id: string; rate: number }) => [t.id, Number(t.rate)]));

  const lineItems = calcLineTotals(input.items, taxMap);
  const totals = calcTotals(lineItems, input.discount, input.discount_type, input.adjustment ?? 0);

  const number = await nextInvoiceNumber(tenantId);
  const hash   = randomHex(32);

  return db.transaction(async trx => {
    const [invoice] = await trx('invoices').insert({
      tenant_id:     tenantId,
      number,
      customer_id:   input.customer_id,
      project_id:    input.project_id   ?? null,
      currency_id:   input.currency_id,
      assigned_to:   input.assigned_to  ?? userId,
      date:          input.date,
      due_date:      input.due_date,
      reference:     input.reference,
      discount:      input.discount ?? 0,
      discount_type: input.discount_type ?? 'percent',
      adjustment:    input.adjustment ?? 0,
      subtotal:      totals.subtotal,
      tax_total:     totals.tax_total,
      total:         totals.total,
      notes:         input.notes,
      terms:         input.terms,
      admin_note:    input.admin_note,
      is_recurring:  input.is_recurring ?? false,
      tags:          input.tags ?? [],
      hash,
      status:        'draft',
    }).returning('*');

    const itemRows = lineItems.map((item, idx) => ({
      invoice_id:    invoice.id,
      description:   item.description,
      long_desc:     item.long_desc,
      qty:           item.qty,
      unit:          item.unit,
      rate:          item.rate,
      tax_id:        item.tax_id,
      tax2_id:       item.tax2_id,
      discount:      item.discount,
      discount_type: item.discount_type,
      line_total:    item.line_total,
      sort_order:    item.sort_order ?? idx,
    }));

    await trx('invoice_items').insert(itemRows);

    return invoice;
  });
}

export async function updateInvoice(tenantId: string, id: string, input: UpdateInvoiceInput) {
  const existing = await db('invoices').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!existing) throw new NotFoundError('Invoice');
  if (['paid', 'cancelled', 'void'].includes(existing.status)) {
    throw new BadRequestError(`Cannot edit a ${existing.status} invoice`);
  }

  const items = input.items ?? [];
  const taxIds = [...new Set(items.flatMap(i => [i.tax_id, i.tax2_id].filter(Boolean) as string[]))];
  const taxRates = taxIds.length
    ? await db('tax_rates').whereIn('id', taxIds).where({ tenant_id: tenantId }).select('id', 'rate')
    : [];
  const taxMap: TaxMap = Object.fromEntries(taxRates.map((t: { id: string; rate: number }) => [t.id, Number(t.rate)]));

  const lineItems = calcLineTotals(items, taxMap);
  const totals = calcTotals(lineItems, input.discount ?? 0, input.discount_type ?? 'percent', input.adjustment ?? 0);

  return db.transaction(async trx => {
    const [updated] = await trx('invoices').where({ id }).update({
      customer_id:   input.customer_id,
      project_id:    input.project_id   ?? null,
      currency_id:   input.currency_id,
      assigned_to:   input.assigned_to  ?? undefined,
      date:          input.date,
      due_date:      input.due_date,
      reference:     input.reference,
      discount:      input.discount ?? 0,
      discount_type: input.discount_type ?? 'percent',
      adjustment:    input.adjustment ?? 0,
      subtotal:      totals.subtotal,
      tax_total:     totals.tax_total,
      total:         totals.total,
      notes:         input.notes,
      terms:         input.terms,
      admin_note:    input.admin_note,
      is_recurring:  input.is_recurring,
      tags:          input.tags ?? [],
      updated_at:    db.fn.now(),
    }).returning('*');

    await trx('invoice_items').where({ invoice_id: id }).delete();

    if (lineItems.length) {
      await trx('invoice_items').insert(lineItems.map((item, idx) => ({
        invoice_id:    id,
        description:   item.description,
        long_desc:     item.long_desc,
        qty:           item.qty,
        unit:          item.unit,
        rate:          item.rate,
        tax_id:        item.tax_id,
        tax2_id:       item.tax2_id,
        discount:      item.discount,
        discount_type: item.discount_type,
        line_total:    item.line_total,
        sort_order:    item.sort_order ?? idx,
      })));
    }

    return updated;
  });
}

export async function deleteInvoice(tenantId: string, id: string) {
  const exists = await db('invoices').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!exists) throw new NotFoundError('Invoice');
  await db('invoices').where({ id }).update({ deleted_at: db.fn.now() });
}

export async function sendInvoice(tenantId: string, id: string) {
  const invoice = await db('invoices').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!invoice) throw new NotFoundError('Invoice');
  if (invoice.status === 'draft') {
    await db('invoices').where({ id }).update({ status: 'sent', last_sent_at: db.fn.now() });
  }
  return db('invoices').where({ id }).first();
}

export async function recordPayment(tenantId: string, invoiceId: string, input: RecordPaymentInput) {
  const invoice = await db('invoices').where({ id: invoiceId, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!invoice) throw new NotFoundError('Invoice');
  if (invoice.status === 'paid') throw new BadRequestError('Invoice is already paid');

  const newPaid = Number(invoice.amount_paid) + input.amount;
  if (newPaid > Number(invoice.total)) throw new BadRequestError('Payment exceeds invoice total');

  const currency = await db('currencies').where({ id: invoice.currency_id }).first();

  return db.transaction(async trx => {
    await trx('payments').insert({
      tenant_id:       tenantId,
      invoice_id:      invoiceId,
      customer_id:     invoice.customer_id,
      amount:          input.amount,
      currency_id:     invoice.currency_id,
      exchange_rate:   currency?.exchange_rate ?? 1,
      payment_mode_id: input.payment_mode_id,
      transaction_id:  input.transaction_id,
      date:            input.date,
      note:            input.note,
      status:          'completed',
    });

    const newStatus = newPaid >= Number(invoice.total) ? 'paid'
      : newPaid > 0 ? 'partial'
      : invoice.status;

    await trx('invoices').where({ id: invoiceId }).update({
      amount_paid: newPaid,
      status:      newStatus,
      updated_at:  db.fn.now(),
    });
  });
}

// ── Activity log ──────────────────────────────────────────────────────────────

export async function listInvoiceActivities(tenantId: string, invoiceId: string) {
  return db('activities as a')
    .leftJoin('users as u', 'u.id', 'a.user_id')
    .where({ 'a.tenant_id': tenantId, 'a.entity_type': 'invoice', 'a.entity_id': invoiceId })
    .select(
      'a.*',
      db.raw("CONCAT(u.first_name, ' ', u.last_name) as user_name"),
      'u.avatar_url',
    )
    .orderBy('a.created_at', 'desc');
}

export async function addInvoiceNote(tenantId: string, userId: string, invoiceId: string, description: string) {
  const [row] = await db('activities').insert({
    tenant_id:   tenantId,
    entity_type: 'invoice',
    entity_id:   invoiceId,
    user_id:     userId,
    type:        'note',
    description,
  }).returning('*');
  return row;
}

export async function deleteInvoiceActivity(tenantId: string, id: string) {
  await db('activities').where({ id, tenant_id: tenantId }).delete();
}

// ── Invoice reminders ─────────────────────────────────────────────────────────

export async function listInvoiceReminders(tenantId: string, invoiceId: string) {
  return db('reminders')
    .where({ tenant_id: tenantId, related_type: 'invoice', related_id: invoiceId })
    .orderBy('remind_date');
}

export async function createInvoiceReminder(tenantId: string, userId: string, invoiceId: string, input: {
  title: string; description?: string; remind_date: string; remind_time?: string;
}) {
  const [row] = await db('reminders').insert({
    tenant_id:    tenantId,
    user_id:      userId,
    related_type: 'invoice',
    related_id:   invoiceId,
    ...input,
  }).returning('*');
  return row;
}

// ── Invoice tasks ─────────────────────────────────────────────────────────────

export async function listInvoiceTasks(tenantId: string, invoiceId: string) {
  const invoice = await db('invoices').where({ id: invoiceId, tenant_id: tenantId }).first();
  if (!invoice?.project_id) return [];

  return db('tasks as t')
    .leftJoin('task_statuses as ts', 'ts.id', 't.status_id')
    .where('t.tenant_id', tenantId)
    .where('t.project_id', invoice.project_id)
    .whereNull('t.deleted_at')
    .select(
      't.id', 't.name', 't.priority', 't.start_date', 't.due_date',
      't.tags', 't.created_at',
      'ts.name as status_name', 'ts.color as status_color',
    )
    .orderBy('t.sort_order')
    .orderBy('t.created_at');
}

export async function createStripePaymentIntent(tenantId: string, invoiceId: string) {
  const invoice = await getInvoice(tenantId, invoiceId);
  const balanceCents = Math.round(Number(invoice.balance_due) * 100);
  if (balanceCents <= 0) throw new BadRequestError('No balance due');

  return createPaymentIntent(balanceCents, (invoice as { currency_code?: string }).currency_code ?? 'usd', {
    invoice_id: invoiceId,
    tenant_id:  tenantId,
  });
}

export async function generateInvoicePdf(tenantId: string, id: string): Promise<Buffer> {
  const invoice = await getInvoice(tenantId, id);
  const html = buildInvoiceHtml({
    ...invoice,
    customer: {
      company_name: (invoice as { company_name: string }).company_name,
      address_line1: (invoice as { address_line1?: string }).address_line1,
      city: (invoice as { city?: string }).city,
      country: (invoice as { country?: string }).country,
    },
  });
  return htmlToPdf(html);
}

export async function getTaxRates(tenantId: string) {
  return db('tax_rates').where({ tenant_id: tenantId }).orderBy('name');
}

export async function getCurrencies(tenantId: string) {
  return db('currencies').where({ tenant_id: tenantId }).orderBy('is_default', 'desc');
}

export async function getPaymentModes(tenantId: string) {
  return db('payment_modes').where({ tenant_id: tenantId, is_active: true }).orderBy('name');
}
