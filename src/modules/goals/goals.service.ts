import { db } from '../../core/config/database';
import { NotFoundError } from '../../core/utils/response';
import { CreateGoalInput, UpdateGoalInput } from './goals.schema';

async function getGoal(tenantId: string, id: string) {
  const row = await db('goals').where({ id, tenant_id: tenantId }).first();
  if (!row) throw new NotFoundError('Goal');
  return row;
}

/** Compute actual progress for auto-calculated goal types */
async function computeProgress(tenantId: string, type: string, start: string, end: string) {
  if (type === 'invoiced_amount') {
    const row = await db('payments as p')
      .join('invoices as i', 'i.id', 'p.invoice_id')
      .where('i.tenant_id', tenantId)
      .whereBetween('p.date', [start, end])
      .sum('p.amount as total')
      .first();
    return Number(row?.total ?? 0);
  }

  if (type === 'new_customers') {
    const [{ count }] = await db('customers')
      .where({ tenant_id: tenantId })
      .whereBetween('created_at', [start + ' 00:00:00', end + ' 23:59:59'])
      .count('id as count');
    return Number(count);
  }

  if (type === 'new_contracts') {
    const [{ count }] = await db('contracts')
      .where({ tenant_id: tenantId })
      .whereNull('deleted_at')
      .whereBetween('created_at', [start + ' 00:00:00', end + ' 23:59:59'])
      .count('id as count');
    return Number(count);
  }

  return null; // manual — use stored current_value
}

export async function listGoals(tenantId: string) {
  const goals = await db('goals')
    .where({ tenant_id: tenantId, is_active: true })
    .orderBy('created_at', 'desc')
    .select('*');

  // Enrich auto goals with computed progress
  const enriched = await Promise.all(
    goals.map(async (g: { id: string; type: string; start_date: string; end_date: string; current_value: number }) => {
      const computed = await computeProgress(tenantId, g.type, g.start_date, g.end_date);
      return {
        ...g,
        current_value: computed !== null ? computed : Number(g.current_value),
      };
    }),
  );

  return enriched;
}

export async function createGoal(tenantId: string, input: CreateGoalInput) {
  const [row] = await db('goals')
    .insert({ tenant_id: tenantId, ...input })
    .returning('*');
  return row;
}

export async function updateGoal(tenantId: string, id: string, input: UpdateGoalInput) {
  await getGoal(tenantId, id);
  const [row] = await db('goals')
    .where({ id })
    .update({ ...input, updated_at: db.fn.now() })
    .returning('*');
  return row;
}

export async function deleteGoal(tenantId: string, id: string) {
  await getGoal(tenantId, id);
  await db('goals').where({ id }).delete();
}
