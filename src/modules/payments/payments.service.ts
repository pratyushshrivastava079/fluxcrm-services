import { db } from '../../core/config/database';
import { buildMeta } from '../../core/utils/pagination';
import { ListPaymentsInput } from './payments.schema';

export async function listPayments(tenantId: string, params: ListPaymentsInput) {
  const { page, per_page, search, customer_id, sort_by, sort_dir } = params;

  let q = db('payments as p')
    .join('invoices as i',   'i.id', 'p.invoice_id')
    .join('customers as c',  'c.id', 'p.customer_id')
    .leftJoin('payment_modes as pm', 'pm.id', 'p.payment_mode_id')
    .where('p.tenant_id', tenantId)
    .select(
      'p.id',
      'p.amount',
      'p.date',
      'p.status',
      'p.transaction_id',
      'p.note',
      'p.created_at',
      'i.id   as invoice_id',
      'i.number as invoice_number',
      'c.id   as customer_id',
      'c.company_name',
      'pm.name as payment_mode_name',
    );

  if (customer_id) q = q.where('p.customer_id', customer_id);
  if (search)      q = q.where(function () {
    this.whereILike('i.number', `%${search}%`)
        .orWhereILike('c.company_name', `%${search}%`)
        .orWhereILike('p.transaction_id', `%${search}%`);
  });

  const [{ count }] = await q.clone().clearSelect().count('p.id as count');
  const total = Number(count);

  const data = await q
    .orderBy(`p.${sort_by}`, sort_dir)
    .limit(per_page)
    .offset((page - 1) * per_page);

  return { data, meta: buildMeta(total, page, per_page) };
}
