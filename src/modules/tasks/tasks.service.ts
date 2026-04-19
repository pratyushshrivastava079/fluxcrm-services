import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { NotFoundError } from '../../core/utils/response';
import { CreateTaskInput, UpdateTaskInput } from './tasks.schema';

export async function listTaskStatuses(tenantId: string) {
  return db('task_statuses').where({ tenant_id: tenantId }).orderBy('sort_order');
}

export async function listTasks(
  tenantId: string,
  params: PaginationParams & { project_id?: string; status_id?: string; assigned_to?: string; priority?: string },
) {
  const { page = 1, perPage = 25, search, project_id, status_id, assigned_to, priority } = params;
  const per_page = perPage;

  let q = db('tasks as t')
    .leftJoin('task_statuses as ts', 'ts.id', 't.status_id')
    .leftJoin('projects as p', 'p.id', 't.project_id')
    .where('t.tenant_id', tenantId)
    .whereNull('t.deleted_at')
    .select(
      't.id', 't.name', 't.priority', 't.start_date', 't.due_date', 't.estimated_hours',
      't.is_billable', 't.completed_at', 't.sort_order', 't.created_at', 't.project_id', 't.tags',
      'ts.id as status_id', 'ts.name as status_name', 'ts.color as status_color', 'ts.is_closed',
      'p.name as project_name',
    );

  if (project_id)  q = q.where('t.project_id', project_id);
  if (status_id)   q = q.where('t.status_id', status_id);
  if (priority)    q = q.where('t.priority', priority);
  if (search)      q = q.whereILike('t.name', `%${search}%`);
  if (assigned_to) {
    q = q.whereExists(
      db('task_assignees').where('task_assignees.task_id', db.ref('t.id')).where('task_assignees.user_id', assigned_to),
    );
  }

  const [{ count }] = await q.clone().clearSelect().count('t.id as count');
  const tasks = await q.orderBy('t.sort_order').orderBy('t.created_at', 'desc').limit(per_page).offset((page - 1) * per_page);

  if (tasks.length) {
    const ids = tasks.map((t: { id: string }) => t.id);
    const assignees = await db('task_assignees as ta')
      .join('users as u', 'u.id', 'ta.user_id')
      .whereIn('ta.task_id', ids)
      .select('ta.task_id', 'ta.user_id', 'u.first_name', 'u.last_name', 'u.avatar_url');

    const assigneeMap: Record<string, unknown[]> = {};
    assignees.forEach((a: { task_id: string }) => {
      (assigneeMap[a.task_id] ??= []).push(a);
    });
    (tasks as Array<Record<string, unknown>>).forEach(t => { t.assignees = assigneeMap[t.id as string] ?? []; });
  }

  return { tasks, meta: buildMeta(Number(count), page, per_page) };
}

export async function getTaskStatusStats(tenantId: string) {
  const statuses = await db('task_statuses').where({ tenant_id: tenantId }).orderBy('sort_order').select('id', 'name', 'color');
  const rows = await db('tasks')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .groupBy('status_id')
    .select('status_id', db.raw('count(*) as count'));
  const map = Object.fromEntries((rows as any[]).map(r => [r.status_id, Number(r.count)]));
  return statuses.map((s: any) => ({ status_id: s.id, status_name: s.name, status_color: s.color, count: map[s.id] ?? 0 }));
}

export async function getTask(tenantId: string, id: string) {
  const task = await db('tasks as t')
    .leftJoin('task_statuses as ts', 'ts.id', 't.status_id')
    .leftJoin('projects as p', 'p.id', 't.project_id')
    .where('t.id', id).where('t.tenant_id', tenantId).whereNull('t.deleted_at')
    .select('t.*', 'ts.name as status_name', 'ts.color as status_color', 'ts.is_closed', 'p.name as project_name')
    .first();

  if (!task) throw new NotFoundError('Task');

  const assignees = await db('task_assignees as ta')
    .join('users as u', 'u.id', 'ta.user_id')
    .where('ta.task_id', id)
    .select('ta.*', 'u.first_name', 'u.last_name', 'u.email', 'u.avatar_url');

  const comments = await db('task_comments as tc')
    .join('users as u', 'u.id', 'tc.user_id')
    .where('tc.task_id', id).whereNull('tc.deleted_at')
    .select('tc.*', 'u.first_name', 'u.last_name', 'u.avatar_url')
    .orderBy('tc.created_at', 'asc');

  const timesheets = await db('timesheets').where({ task_id: id }).orderBy('start_time', 'desc');
  const totalHours = timesheets.reduce((s: number, t: { hours: string }) => s + Number(t.hours), 0);

  return { ...task, assignees, comments, timesheets, total_hours: totalHours };
}

export async function createTask(tenantId: string, userId: string, input: CreateTaskInput) {
  const { assignees, ...taskData } = input;

  return db.transaction(async trx => {
    const [task] = await trx('tasks').insert({
      tenant_id: tenantId,
      ...taskData,
    }).returning('*');

    const toAssign = assignees?.length ? assignees : [userId];
    await trx('task_assignees').insert(toAssign.map(uid => ({
      task_id:     task.id,
      user_id:     uid,
      assigned_by: userId,
    })));

    return task;
  });
}

export async function updateTask(tenantId: string, id: string, input: UpdateTaskInput) {
  const existing = await db('tasks').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!existing) throw new NotFoundError('Task');

  const { assignees, ...taskData } = input;

  // Mark completed if moved to a closed status
  if (taskData.status_id) {
    const status = await db('task_statuses').where('id', taskData.status_id).first();
    if (status?.is_closed && !existing.completed_at) {
      (taskData as Record<string, unknown>).completed_at = new Date();
    } else if (status && !status.is_closed && existing.completed_at) {
      (taskData as Record<string, unknown>).completed_at = null;
    }
  }

  return db.transaction(async trx => {
    const [updated] = await trx('tasks').where({ id }).update({
      ...taskData,
      updated_at: db.fn.now(),
    }).returning('*');

    if (assignees !== undefined) {
      await trx('task_assignees').where({ task_id: id }).delete();
      if (assignees.length) {
        await trx('task_assignees').insert(assignees.map(uid => ({ task_id: id, user_id: uid })));
      }
    }

    return updated;
  });
}

export async function deleteTask(tenantId: string, id: string) {
  const exists = await db('tasks').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!exists) throw new NotFoundError('Task');
  await db('tasks').where({ id }).update({ deleted_at: db.fn.now() });
}
