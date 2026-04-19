import { db } from '../../core/config/database';
import { NotFoundError } from '../../core/utils/response';
import { CreateReminderInput, UpdateReminderInput } from './reminders.schema';

async function getOwned(tenantId: string, userId: string, id: string) {
  const row = await db('reminders')
    .where({ id, tenant_id: tenantId, user_id: userId })
    .first();
  if (!row) throw new NotFoundError('Reminder');
  return row;
}

export async function listReminders(
  tenantId: string,
  userId: string,
  filter: 'upcoming' | 'done' | 'all' = 'all',
) {
  let q = db('reminders')
    .where({ tenant_id: tenantId, user_id: userId })
    .orderBy('remind_date')
    .orderBy('remind_time');

  if (filter === 'upcoming') q = q.where('is_done', false);
  if (filter === 'done')     q = q.where('is_done', true);

  return q.select('*');
}

export async function getRemindersForMonth(
  tenantId: string,
  userId: string,
  year: number,
  month: number,   // 1-based
) {
  const pad   = (n: number) => String(n).padStart(2, '0');
  const start = `${year}-${pad(month)}-01`;
  const end   = `${year}-${pad(month)}-${new Date(year, month, 0).getDate()}`;
  return db('reminders')
    .where({ tenant_id: tenantId, user_id: userId })
    .whereBetween('remind_date', [start, end])
    .orderBy('remind_date')
    .select('*');
}

export async function createReminder(
  tenantId: string,
  userId: string,
  input: CreateReminderInput,
) {
  const [row] = await db('reminders')
    .insert({ tenant_id: tenantId, user_id: userId, ...input })
    .returning('*');
  return row;
}

export async function updateReminder(
  tenantId: string,
  userId: string,
  id: string,
  input: UpdateReminderInput,
) {
  await getOwned(tenantId, userId, id);
  const [row] = await db('reminders')
    .where({ id })
    .update({ ...input, updated_at: db.fn.now() })
    .returning('*');
  return row;
}

export async function toggleReminderDone(
  tenantId: string,
  userId: string,
  id: string,
) {
  const current = await getOwned(tenantId, userId, id);
  const [row] = await db('reminders')
    .where({ id })
    .update({ is_done: !current.is_done, updated_at: db.fn.now() })
    .returning('*');
  return row;
}

export async function deleteReminder(
  tenantId: string,
  userId: string,
  id: string,
) {
  await getOwned(tenantId, userId, id);
  await db('reminders').where({ id }).delete();
}
