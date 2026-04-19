import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { NotFoundError } from '../../core/utils/response';
import { CreateSubscriptionInput, UpdateSubscriptionInput } from './subscriptions.schema';

// ── Next billing date calculation ─────────────────────────────────────────────

function nextBillingDate(from: string, recurrence: string): string {
  const d = new Date(from);
  switch (recurrence) {
    case 'daily':     d.setDate(d.getDate() + 1); break;
    case 'weekly':    d.setDate(d.getDate() + 7); break;
    case 'biweekly':  d.setDate(d.getDate() + 14); break;
    case 'monthly':   d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'biannual':  d.setMonth(d.getMonth() + 6); break;
    case 'annual':    d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listSubscriptions(
  tenantId: string,
  params: PaginationParams & { status?: string; customer_id?: string },
) {
  const { page = 1, perPage = 25, search, status, customer_id } = params;

  let q = db('subscriptions as s')
    .join('customers as c',        'c.id',   's.customer_id')
    .leftJoin('currencies as cur', 'cur.id', 's.currency_id')
    .leftJoin('tax_rates as t',    't.id',   's.tax_id')
    .leftJoin('tax_rates as t2',   't2.id',  's.tax2_id')
    .where('s.tenant_id', tenantId)
    .select(
      's.id', 's.name', 's.description', 's.quantity', 's.unit_price',
      's.recurrence_type', 's.start_date', 's.next_billing_date', 's.end_date',
      's.status', 's.notes', 's.terms', 's.include_description_in_invoice', 's.created_at',
      'c.company_name as customer_name',
      'cur.symbol as currency_symbol',
      'cur.code as currency_code',
      't.name as tax_name',
      't.rate as tax_rate',
      't2.name as tax2_name',
      't2.rate as tax2_rate',
    );

  if (status)      q = q.where('s.status', status);
  if (customer_id) q = q.where('s.customer_id', customer_id);
  if (search)      q = q.where((b) => b.whereILike('s.name', `%${search}%`).orWhereILike('c.company_name', `%${search}%`));

  const [{ count }] = await q.clone().clearSelect().count('s.id as count');
  const data = await q.orderBy('s.created_at', 'desc').limit(perPage).offset((page - 1) * perPage);

  return { data, meta: buildMeta(Number(count), page, perPage) };
}

export async function getSubscription(tenantId: string, id: string) {
  const row = await db('subscriptions as s')
    .join('customers as c',        'c.id',   's.customer_id')
    .leftJoin('currencies as cur', 'cur.id', 's.currency_id')
    .leftJoin('tax_rates as t',    't.id',   's.tax_id')
    .leftJoin('tax_rates as t2',   't2.id',  's.tax2_id')
    .where('s.id', id).where('s.tenant_id', tenantId)
    .select(
      's.*',
      'c.company_name as customer_name',
      'cur.symbol as currency_symbol',
      'cur.code as currency_code',
      't.name as tax_name',
      't.rate as tax_rate',
      't2.name as tax2_name',
      't2.rate as tax2_rate',
    )
    .first();

  if (!row) throw new NotFoundError('Subscription');
  return row;
}

export async function createSubscription(tenantId: string, input: CreateSubscriptionInput) {
  const billing = nextBillingDate(input.start_date, input.recurrence_type);

  const [row] = await db('subscriptions')
    .insert({
      tenant_id:        tenantId,
      customer_id:      input.customer_id,
      name:             input.name,
      description:      input.description,
      quantity:         input.quantity ?? 1,
      unit_price:       input.unit_price,
      currency_id:      input.currency_id,
      tax_id:           input.tax_id ?? null,
      tax2_id:          input.tax2_id ?? null,
      recurrence_type:  input.recurrence_type,
      start_date:       input.start_date,
      next_billing_date: billing,
      end_date:         input.end_date ?? null,
      notes:            input.notes,
      terms:            input.terms ?? null,
      include_description_in_invoice: input.include_description_in_invoice ?? false,
      status:           'active',
    })
    .returning('*');

  return row;
}

export async function updateSubscription(tenantId: string, id: string, input: UpdateSubscriptionInput) {
  const existing = await db('subscriptions').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Subscription');

  const updates: Record<string, unknown> = { ...input, updated_at: db.fn.now() };

  // Recalculate next billing date if start_date or recurrence changed
  const recurrence = input.recurrence_type ?? existing.recurrence_type;
  const start      = input.start_date      ?? existing.start_date;
  if (input.recurrence_type || input.start_date) {
    updates.next_billing_date = nextBillingDate(start, recurrence);
  }

  const [row] = await db('subscriptions').where({ id }).update(updates).returning('*');
  return row;
}

export async function deleteSubscription(tenantId: string, id: string) {
  const existing = await db('subscriptions').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Subscription');
  await db('subscriptions').where({ id }).delete();
}

export async function updateStatus(
  tenantId: string,
  id: string,
  status: 'active' | 'trialing' | 'paused' | 'past_due' | 'cancelled' | 'expired',
) {
  const existing = await db('subscriptions').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Subscription');
  const [row] = await db('subscriptions')
    .where({ id })
    .update({ status, updated_at: db.fn.now() })
    .returning('*');
  return row;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getSubscriptionStats(tenantId: string) {
  const rows = await db('subscriptions')
    .where({ tenant_id: tenantId })
    .groupBy('status')
    .select('status')
    .count('id as count');

  return rows as Array<{ status: string; count: string | number }>;
}
