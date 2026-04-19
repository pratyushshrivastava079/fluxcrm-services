import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { NotFoundError, BadRequestError } from '../../core/utils/response';
import { StartTimerInput, StopTimerInput, LogTimeInput } from './timesheets.schema';

function calcHours(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, ms / 3_600_000);
}

export async function getActiveTimer(tenantId: string, userId: string) {
  return db('timesheets as ts')
    .leftJoin('tasks as t', 't.id', 'ts.task_id')
    .leftJoin('projects as p', 'p.id', 'ts.project_id')
    .where({ 'ts.tenant_id': tenantId, 'ts.user_id': userId })
    .whereNull('ts.end_time')
    .select('ts.*', 't.name as task_name', 'p.name as project_name')
    .first();
}

export async function listTimesheets(
  tenantId: string,
  params: PaginationParams & { project_id?: string; task_id?: string; user_id?: string },
) {
  const { page = 1, perPage = 50, project_id, task_id, user_id } = params;
  const per_page = perPage;

  let q = db('timesheets as ts')
    .leftJoin('tasks as t', 't.id', 'ts.task_id')
    .leftJoin('projects as p', 'p.id', 'ts.project_id')
    .leftJoin('users as u', 'u.id', 'ts.user_id')
    .where('ts.tenant_id', tenantId)
    .select(
      'ts.*',
      't.name as task_name',
      'p.name as project_name',
      'u.first_name', 'u.last_name',
    );

  if (project_id) q = q.where('ts.project_id', project_id);
  if (task_id)    q = q.where('ts.task_id', task_id);
  if (user_id)    q = q.where('ts.user_id', user_id);

  const [{ count }] = await q.clone().clearSelect().count('ts.id as count');
  const data = await q.orderBy('ts.start_time', 'desc').limit(per_page).offset((page - 1) * per_page);

  const stats = await db('timesheets').where('tenant_id', tenantId)
    .modify(q2 => {
      if (project_id) q2.where('project_id', project_id);
      if (user_id)    q2.where('user_id', user_id);
    })
    .whereNotNull('end_time')
    .select(
      db.raw('SUM(hours) as total_hours'),
      db.raw('SUM(CASE WHEN is_billable THEN hours ELSE 0 END) as billable_hours'),
    )
    .first();

  return {
    timesheets: data,
    meta: buildMeta(Number(count), page, per_page),
    total_hours:    Number((stats as Record<string, unknown>)?.total_hours ?? 0),
    billable_hours: Number((stats as Record<string, unknown>)?.billable_hours ?? 0),
  };
}

export async function startTimer(tenantId: string, userId: string, input: StartTimerInput) {
  // Stop any existing running timer first
  const running = await getActiveTimer(tenantId, userId);
  if (running) {
    const end = new Date();
    const hours = calcHours(new Date(running.start_time), end);
    await db('timesheets').where({ id: running.id }).update({ end_time: end, hours, updated_at: db.fn.now() });
  }

  const [timer] = await db('timesheets').insert({
    tenant_id:   tenantId,
    user_id:     userId,
    task_id:     input.task_id,
    project_id:  input.project_id,
    note:        input.note,
    is_billable: input.is_billable,
    hourly_rate: input.hourly_rate,
    start_time:  new Date(),
    hours:       0,
  }).returning('*');

  return timer;
}

export async function stopTimer(tenantId: string, userId: string, id: string, input: StopTimerInput) {
  const timer = await db('timesheets').where({ id, tenant_id: tenantId, user_id: userId }).first();
  if (!timer) throw new NotFoundError('Timer');
  if (timer.end_time) throw new BadRequestError('Timer already stopped');

  const end   = new Date();
  const hours = calcHours(new Date(timer.start_time), end);

  const [updated] = await db('timesheets').where({ id }).update({
    end_time:   end,
    hours:      parseFloat(hours.toFixed(4)),
    note:       input.note ?? timer.note,
    updated_at: db.fn.now(),
  }).returning('*');

  return updated;
}

export async function logTime(tenantId: string, userId: string, input: LogTimeInput) {
  const start = new Date(input.start_time);
  const end   = new Date(input.end_time);
  if (end <= start) throw new BadRequestError('end_time must be after start_time');

  const hours = calcHours(start, end);

  const [entry] = await db('timesheets').insert({
    tenant_id:   tenantId,
    user_id:     userId,
    task_id:     input.task_id,
    project_id:  input.project_id,
    note:        input.note,
    is_billable: input.is_billable,
    hourly_rate: input.hourly_rate,
    start_time:  start,
    end_time:    end,
    hours:       parseFloat(hours.toFixed(4)),
  }).returning('*');

  return entry;
}

export async function deleteTimesheet(tenantId: string, userId: string, id: string, isAdmin: boolean) {
  const entry = await db('timesheets').where({ id, tenant_id: tenantId }).first();
  if (!entry) throw new NotFoundError('Timesheet');
  if (!isAdmin && entry.user_id !== userId) throw new BadRequestError('Cannot delete another user\'s timesheet');
  await db('timesheets').where({ id }).delete();
}

export async function getProjectHoursSummary(tenantId: string, projectId: string) {
  const rows = await db('timesheets as ts')
    .join('users as u', 'u.id', 'ts.user_id')
    .where({ 'ts.tenant_id': tenantId, 'ts.project_id': projectId })
    .whereNotNull('ts.end_time')
    .groupBy('u.id', 'u.first_name', 'u.last_name')
    .select('u.id', 'u.first_name', 'u.last_name')
    .select(
      db.raw('SUM(ts.hours) as total_hours'),
      db.raw('SUM(CASE WHEN ts.is_billable THEN ts.hours ELSE 0 END) as billable_hours'),
    );

  return rows;
}
