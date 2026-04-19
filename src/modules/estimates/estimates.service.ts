import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { NotFoundError, BadRequestError } from '../../core/utils/response';
import { randomHex } from '../../core/utils/hash';
import { CreateEstimateInput, UpdateEstimateInput, EstimateItemInput } from './estimates.schema';

// ── Number generation ─────────────────────────────────────────────────────────

async function nextEstimateNumber(tenantId: string): Promise<string> {
  const row = await db('estimates')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .max('number as mx')
    .first();
  let next = 1;
  if (row?.mx) {
    const m = String(row.mx).match(/(\d+)$/);
    if (m) next = parseInt(m[1]) + 1;
  }
  return `EST-${String(next).padStart(4, '0')}`;
}

// ── Financial calculations ────────────────────────────────────────────────────

interface TaxMap { [id: string]: number }

function calcLineTotals(items: EstimateItemInput[], taxMap: TaxMap) {
  return items.map((item) => {
    const gross = Number(item.qty) * Number(item.rate);
    const lineDiscount = item.discount_type === 'percent'
      ? gross * (Number(item.discount) / 100)
      : Number(item.discount);
    const line_total = Math.max(0, gross - lineDiscount);
    const t1 = item.tax_id  ? (taxMap[item.tax_id]  ?? 0) : 0;
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

async function resolveTaxMap(tenantId: string, items: EstimateItemInput[]): Promise<TaxMap> {
  const taxIds = [...new Set(items.flatMap((i) => [i.tax_id, i.tax2_id].filter(Boolean) as string[]))];
  if (!taxIds.length) return {};
  const rows = await db('tax_rates').whereIn('id', taxIds).where({ tenant_id: tenantId }).select('id', 'rate');
  return Object.fromEntries((rows as Array<{ id: string; rate: number }>).map((r) => [r.id, Number(r.rate)]));
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listEstimates(
  tenantId: string,
  params: PaginationParams & { status?: string; customer_id?: string },
) {
  const { page = 1, perPage = 25, search, status, customer_id, sortBy = 'created_at', sortDir = 'desc' } = params;

  const ALLOWED_SORT = new Set(['created_at', 'date', 'expiry_date', 'total', 'number']);
  const col     = ALLOWED_SORT.has(sortBy) ? `e.${sortBy}` : 'e.created_at';
  const dir     = sortDir === 'asc' ? 'asc' : 'desc';

  let q = db('estimates as e')
    .join('customers as c',        'c.id',  'e.customer_id')
    .leftJoin('currencies as cur', 'cur.id', 'e.currency_id')
    .leftJoin('projects as p',     'p.id',  'e.project_id')
    .where('e.tenant_id', tenantId)
    .whereNull('e.deleted_at')
    .select(
      'e.id', 'e.number', 'e.status', 'e.date', 'e.expiry_date',
      'e.total', 'e.tax_total', 'e.reference', 'e.created_at',
      'e.tags', 'e.project_id',
      'c.company_name as customer_name',
      'cur.symbol as currency_symbol',
      'cur.code as currency_code',
      'p.name as project_name',
    );

  if (status)      q = q.where('e.status', status);
  if (customer_id) q = q.where('e.customer_id', customer_id);
  if (search)      q = q.where((b) => b.whereILike('e.number', `%${search}%`).orWhereILike('c.company_name', `%${search}%`));

  const [{ count }] = await q.clone().clearSelect().count('e.id as count');
  const data = await q.orderBy(col, dir).limit(perPage).offset((page - 1) * perPage);

  return { data, meta: buildMeta(Number(count), page, perPage) };
}

export async function getEstimateStats(tenantId: string) {
  const rows = await db('estimates')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .groupBy('status')
    .select('status', db.raw('COUNT(*) as count'), db.raw('SUM(total) as total'));

  const grandTotal = rows.reduce((s: number, r: any) => s + Number(r.count), 0);

  const ALL_STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired'];
  const by_status = ALL_STATUSES.map(s => {
    const row = rows.find((r: any) => r.status === s);
    return { status: s, count: Number(row?.count ?? 0), total: Number(row?.total ?? 0) };
  });

  return { by_status, grand_total: grandTotal };
}

export async function getEstimate(tenantId: string, id: string) {
  const estimate = await db('estimates as e')
    .join('customers as c',        'c.id',   'e.customer_id')
    .leftJoin('currencies as cur', 'cur.id', 'e.currency_id')
    .where('e.id', id).where('e.tenant_id', tenantId).whereNull('e.deleted_at')
    .select(
      'e.*',
      'c.company_name', 'c.address_line1', 'c.city', 'c.country',
      'cur.symbol as currency_symbol', 'cur.code as currency_code',
    )
    .first();

  if (!estimate) throw new NotFoundError('Estimate');

  const items = await db('estimate_items').where({ estimate_id: id }).orderBy('sort_order');
  return { ...estimate, items };
}

export async function createEstimate(tenantId: string, userId: string, input: CreateEstimateInput) {
  const taxMap    = await resolveTaxMap(tenantId, input.items);
  const lineItems = calcLineTotals(input.items, taxMap);
  const totals    = calcTotals(lineItems, input.discount, input.discount_type, input.adjustment ?? 0);
  const number    = await nextEstimateNumber(tenantId);
  const hash      = randomHex(32);

  return db.transaction(async (trx) => {
    const [estimate] = await trx('estimates').insert({
      tenant_id:     tenantId,
      number,
      customer_id:   input.customer_id,
      project_id:    input.project_id  ?? null,
      currency_id:   input.currency_id,
      assigned_to:   userId,
      date:          input.date,
      expiry_date:   input.expiry_date,
      reference:     input.reference,
      discount:      totals.discount,
      discount_type: input.discount_type,
      adjustment:    input.adjustment ?? 0,
      subtotal:      totals.subtotal,
      tax_total:     totals.tax_total,
      total:         totals.total,
      notes:         input.notes,
      terms:         input.terms,
      tags:          input.tags ?? [],
      status:        'draft',
      hash,
    }).returning('*');

    await trx('estimate_items').insert(
      lineItems.map((item, idx) => ({
        estimate_id:   estimate.id,
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
      })),
    );

    return estimate;
  });
}

export async function updateEstimate(tenantId: string, id: string, input: UpdateEstimateInput) {
  const existing = await db('estimates').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!existing) throw new NotFoundError('Estimate');
  if (['accepted', 'declined'].includes(existing.status)) {
    throw new BadRequestError(`Cannot edit a ${existing.status} estimate`);
  }

  const items    = input.items ?? [];
  const taxMap   = await resolveTaxMap(tenantId, items);
  const lineItems = calcLineTotals(items, taxMap);
  const totals    = calcTotals(lineItems, input.discount ?? 0, input.discount_type ?? 'percent', input.adjustment ?? 0);

  return db.transaction(async (trx) => {
    const [estimate] = await trx('estimates').where({ id }).update({
      customer_id:   input.customer_id,
      project_id:    input.project_id  ?? null,
      currency_id:   input.currency_id,
      date:          input.date,
      expiry_date:   input.expiry_date,
      reference:     input.reference,
      discount:      totals.discount,
      discount_type: input.discount_type,
      adjustment:    input.adjustment ?? 0,
      subtotal:      totals.subtotal,
      tax_total:     totals.tax_total,
      total:         totals.total,
      notes:         input.notes,
      terms:         input.terms,
      tags:          input.tags ?? [],
      updated_at:    trx.fn.now(),
    }).returning('*');

    if (items.length) {
      await trx('estimate_items').where({ estimate_id: id }).delete();
      await trx('estimate_items').insert(
        lineItems.map((item, idx) => ({
          estimate_id:   id,
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
        })),
      );
    }

    return estimate;
  });
}

export async function deleteEstimate(tenantId: string, id: string) {
  const existing = await db('estimates').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!existing) throw new NotFoundError('Estimate');
  await db('estimates').where({ id }).update({ deleted_at: db.fn.now() });
}

export async function sendEstimate(tenantId: string, id: string) {
  const existing = await db('estimates').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!existing) throw new NotFoundError('Estimate');
  const [row] = await db('estimates').where({ id })
    .update({ status: 'sent', sent_at: db.fn.now(), updated_at: db.fn.now() })
    .returning('*');
  return row;
}

export async function updateEstimateStatus(
  tenantId: string,
  id: string,
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired',
) {
  const existing = await db('estimates').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!existing) throw new NotFoundError('Estimate');

  const timestamps: Record<string, unknown> = { updated_at: db.fn.now() };
  if (status === 'sent'     && !existing.sent_at)     timestamps.sent_at     = db.fn.now();
  if (status === 'accepted' && !existing.accepted_at) timestamps.accepted_at = db.fn.now();
  if (status === 'declined' && !existing.declined_at) timestamps.declined_at = db.fn.now();

  const [row] = await db('estimates').where({ id }).update({ status, ...timestamps }).returning('*');
  return row;
}

// ── Reference data (reuse invoice helpers) ────────────────────────────────────

export async function getTaxRates(tenantId: string) {
  return db('tax_rates').where({ tenant_id: tenantId }).orderBy('name');
}

export async function getCurrencies(tenantId: string) {
  return db('currencies').where({ tenant_id: tenantId }).orderBy('is_default', 'desc');
}
