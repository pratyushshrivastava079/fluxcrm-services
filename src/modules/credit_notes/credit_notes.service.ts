import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { NotFoundError } from '../../core/utils/response';
import { CreateCreditNoteInput, UpdateCreditNoteInput } from './credit_notes.schema';

// ── Number generation ─────────────────────────────────────────────────────────

async function nextCreditNoteNumber(tenantId: string): Promise<string> {
  const row = await db('credit_notes')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .max('number as mx')
    .first();
  let next = 1;
  if (row?.mx) {
    const m = String(row.mx).match(/(\d+)$/);
    if (m) next = parseInt(m[1]) + 1;
  }
  return `CN-${String(next).padStart(6, '0')}`;
}

// ── Financial calculations ────────────────────────────────────────────────────

interface TaxMap { [id: string]: number }

function calcLineTotals(items: CreateCreditNoteInput['items'], taxMap: TaxMap) {
  return items.map((item) => {
    const gross = Number(item.qty) * Number(item.rate);
    const disc  = item.discount_type === 'percent'
      ? gross * (Number(item.discount) / 100)
      : Number(item.discount);
    const line_total = Math.max(0, gross - disc);
    const t1 = item.tax_id ? (taxMap[item.tax_id] ?? 0) : 0;
    const line_tax = line_total * t1 / 100;
    return { ...item, line_total, line_tax };
  });
}

function calcTotals(
  items: ReturnType<typeof calcLineTotals>,
  discount: number, discountType: 'percent' | 'fixed', adjustment: number,
) {
  const subtotal = items.reduce((s, i) => s + i.line_total, 0);
  const taxTotal = items.reduce((s, i) => s + i.line_tax, 0);
  const disc = discountType === 'percent' ? subtotal * discount / 100 : discount;
  const total = Math.max(0, subtotal - disc + taxTotal + adjustment);
  return { subtotal, tax_total: taxTotal, discount: disc, total };
}

async function resolveTaxMap(tenantId: string, items: CreateCreditNoteInput['items']): Promise<TaxMap> {
  const taxIds = [...new Set(items.map(i => i.tax_id).filter(Boolean) as string[])];
  if (!taxIds.length) return {};
  const rows = await db('tax_rates').whereIn('id', taxIds).where({ tenant_id: tenantId }).select('id', 'rate');
  return Object.fromEntries((rows as any[]).map(r => [r.id, Number(r.rate)]));
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listCreditNotes(
  tenantId: string,
  params: PaginationParams & { status?: string; customer_id?: string },
) {
  const { page = 1, perPage = 25, search, status, customer_id, sortBy = 'date', sortDir = 'desc' } = params;

  const ALLOWED_SORT = new Set(['date', 'number', 'total', 'remaining_amount', 'created_at']);
  const col = ALLOWED_SORT.has(sortBy ?? '') ? `cn.${sortBy}` : 'cn.date';
  const dir = sortDir === 'asc' ? 'asc' : 'desc';

  let q = db('credit_notes as cn')
    .join('customers as c', 'c.id', 'cn.customer_id')
    .leftJoin('currencies as cur', 'cur.id', 'cn.currency_id')
    .leftJoin('projects as p', 'p.id', 'cn.project_id')
    .where('cn.tenant_id', tenantId)
    .whereNull('cn.deleted_at')
    .select(
      'cn.id', 'cn.number', 'cn.status', 'cn.date', 'cn.reference',
      'cn.total', 'cn.remaining_amount', 'cn.created_at',
      'cn.tags', 'cn.project_id',
      'c.company_name as customer_name',
      'cur.symbol as currency_symbol',
      'cur.code as currency_code',
      'p.name as project_name',
    );

  if (status)      q = q.where('cn.status', status);
  if (customer_id) q = q.where('cn.customer_id', customer_id);
  if (search)      q = q.where(b => b.whereILike('cn.number', `%${search}%`).orWhereILike('c.company_name', `%${search}%`));

  const [{ count }] = await q.clone().clearSelect().count('cn.id as count');
  const data = await q.orderBy(col, dir).limit(perPage).offset((page - 1) * perPage);

  return { data, meta: buildMeta(Number(count), page, perPage) };
}

export async function getCreditNote(tenantId: string, id: string) {
  const cn = await db('credit_notes as cn')
    .join('customers as c', 'c.id', 'cn.customer_id')
    .leftJoin('currencies as cur', 'cur.id', 'cn.currency_id')
    .where('cn.id', id).where('cn.tenant_id', tenantId).whereNull('cn.deleted_at')
    .select('cn.*', 'c.company_name as customer_name', 'cur.symbol as currency_symbol', 'cur.code as currency_code')
    .first();

  if (!cn) throw new NotFoundError('Credit Note');

  const items = await db('credit_note_items').where({ credit_note_id: id }).orderBy('sort_order');
  return { ...cn, items };
}

export async function createCreditNote(tenantId: string, _userId: string, input: CreateCreditNoteInput) {
  const taxMap    = await resolveTaxMap(tenantId, input.items);
  const lineItems = calcLineTotals(input.items, taxMap);
  const totals    = calcTotals(lineItems, input.discount, input.discount_type, input.adjustment ?? 0);
  const number    = await nextCreditNoteNumber(tenantId);

  return db.transaction(async (trx) => {
    const [cn] = await trx('credit_notes').insert({
      tenant_id:     tenantId,
      customer_id:   input.customer_id,
      invoice_id:    input.invoice_id ?? null,
      currency_id:   input.currency_id ?? null,
      number,
      date:          input.date,
      reference:     input.reference ?? null,
      discount:      totals.discount,
      discount_type: input.discount_type,
      adjustment:    input.adjustment ?? 0,
      subtotal:      totals.subtotal,
      tax_total:     totals.tax_total,
      total:         totals.total,
      remaining_amount: totals.total,
      notes:         input.notes ?? null,
      terms:         input.terms ?? null,
      admin_note:    input.admin_note ?? null,
      project_id:    input.project_id ?? null,
      tags:          input.tags ?? [],
      status:        'open',
    }).returning('*');

    await trx('credit_note_items').insert(
      lineItems.map((item, idx) => ({
        credit_note_id: cn.id,
        description:    item.description,
        long_desc:      item.long_desc ?? null,
        qty:            item.qty,
        unit:           item.unit ?? null,
        rate:           item.rate,
        tax_id:         item.tax_id ?? null,
        discount:       item.discount,
        discount_type:  item.discount_type,
        line_total:     item.line_total,
        sort_order:     item.sort_order ?? idx,
      })),
    );

    return cn;
  });
}

export async function updateCreditNote(tenantId: string, id: string, input: UpdateCreditNoteInput) {
  const existing = await db('credit_notes').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!existing) throw new NotFoundError('Credit Note');

  const items     = input.items ?? [];
  const taxMap    = await resolveTaxMap(tenantId, items);
  const lineItems = calcLineTotals(items, taxMap);
  const totals    = calcTotals(lineItems, input.discount ?? 0, input.discount_type ?? 'percent', input.adjustment ?? 0);

  return db.transaction(async (trx) => {
    const [cn] = await trx('credit_notes').where({ id }).update({
      customer_id:   input.customer_id,
      invoice_id:    input.invoice_id ?? null,
      currency_id:   input.currency_id ?? null,
      date:          input.date,
      reference:     input.reference ?? null,
      discount:      totals.discount,
      discount_type: input.discount_type,
      adjustment:    input.adjustment ?? 0,
      subtotal:      totals.subtotal,
      tax_total:     totals.tax_total,
      total:         totals.total,
      notes:         input.notes ?? null,
      terms:         input.terms ?? null,
      admin_note:    input.admin_note ?? null,
      project_id:    input.project_id ?? null,
      tags:          input.tags ?? [],
      updated_at:    trx.fn.now(),
    }).returning('*');

    if (items.length) {
      await trx('credit_note_items').where({ credit_note_id: id }).delete();
      await trx('credit_note_items').insert(
        lineItems.map((item, idx) => ({
          credit_note_id: id,
          description:    item.description,
          long_desc:      item.long_desc ?? null,
          qty:            item.qty,
          unit:           item.unit ?? null,
          rate:           item.rate,
          tax_id:         item.tax_id ?? null,
          discount:       item.discount,
          discount_type:  item.discount_type,
          line_total:     item.line_total,
          sort_order:     item.sort_order ?? idx,
        })),
      );
    }

    return cn;
  });
}

export async function deleteCreditNote(tenantId: string, id: string) {
  const existing = await db('credit_notes').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!existing) throw new NotFoundError('Credit Note');
  await db('credit_notes').where({ id }).update({ deleted_at: db.fn.now() });
}

export async function updateCreditNoteStatus(tenantId: string, id: string, status: 'open' | 'closed' | 'void') {
  const existing = await db('credit_notes').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!existing) throw new NotFoundError('Credit Note');
  const [row] = await db('credit_notes').where({ id }).update({ status, updated_at: db.fn.now() }).returning('*');
  return row;
}

export async function getCreditNoteStats(tenantId: string) {
  const rows = await db('credit_notes')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .groupBy('status')
    .select('status', db.raw('COUNT(*) as count'), db.raw('SUM(total) as total'), db.raw('SUM(remaining_amount) as remaining'));

  const ALL = ['open', 'closed', 'void'];
  const by_status = ALL.map(s => {
    const r = (rows as any[]).find(x => x.status === s);
    return { status: s, count: Number(r?.count ?? 0), total: Number(r?.total ?? 0), remaining: Number(r?.remaining ?? 0) };
  });

  const grand_total     = by_status.reduce((s, r) => s + r.count, 0);
  const total_amount    = by_status.reduce((s, r) => s + r.total, 0);
  const remaining_total = by_status.reduce((s, r) => s + r.remaining, 0);

  return { by_status, grand_total, total_amount, remaining_total };
}

// ── Reference data ────────────────────────────────────────────────────────────

export async function getTaxRates(tenantId: string) {
  return db('tax_rates').where({ tenant_id: tenantId }).orderBy('name');
}

export async function getCurrencies(tenantId: string) {
  return db('currencies').where({ tenant_id: tenantId }).orderBy('is_default', 'desc');
}
