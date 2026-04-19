import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { NotFoundError } from '../../core/utils/response';
import { CreateProjectInput, UpdateProjectInput } from './projects.schema';

export async function listProjects(tenantId: string, params: PaginationParams & { status?: string; customer_id?: string }) {
  const { page = 1, perPage = 20, search, sortBy = 'created_at', sortDir = 'desc', status, customer_id } = params;
  const per_page = perPage; const sort_by = sortBy; const sort_dir = sortDir;

  let q = db('projects as p')
    .leftJoin('customers as c', 'c.id', 'p.customer_id')
    .where('p.tenant_id', tenantId)
    .whereNull('p.deleted_at')
    .select(
      'p.id', 'p.name', 'p.status', 'p.color', 'p.billing_type',
      'p.start_date', 'p.deadline', 'p.estimated_hours', 'p.budget_amount',
      'p.is_pinned', 'p.created_at',
      'c.company_name as customer_name',
    );

  if (status) q = q.where('p.status', status);
  if (customer_id) q = q.where('p.customer_id', customer_id);
  if (search) q = q.whereILike('p.name', `%${search}%`);

  const [{ count }] = await q.clone().clearSelect().count('p.id as count');
  const data = await q.orderBy(`p.${sort_by}`, sort_dir).limit(per_page).offset((page - 1) * per_page);

  // Attach task counts and logged hours
  const ids = data.map((p: { id: string }) => p.id);
  if (ids.length) {
    const taskCounts = await db('tasks').whereIn('project_id', ids).whereNull('deleted_at')
      .groupBy('project_id').select('project_id').count('id as total');
    const hours = await db('timesheets').whereIn('project_id', ids)
      .groupBy('project_id').select('project_id').sum('hours as total_hours');
    const memberRows = await db('project_members as pm')
      .join('users as u', 'u.id', 'pm.user_id')
      .whereIn('pm.project_id', ids)
      .select('pm.project_id', 'pm.user_id', 'u.first_name', 'u.last_name', 'u.avatar_url', 'pm.is_project_manager');

    const tcMap: Record<string, number>   = Object.fromEntries((taskCounts as any[]).map(r => [r.project_id, Number(r.total)]));
    const hrMap: Record<string, number>   = Object.fromEntries((hours as any[]).map(r => [r.project_id, Number(r.total_hours)]));
    const mMap:  Record<string, any[]>    = {};
    (memberRows as any[]).forEach(m => { (mMap[m.project_id] ??= []).push(m); });

    (data as Array<Record<string, unknown>>).forEach(p => {
      p.task_count  = tcMap[p.id as string] ?? 0;
      p.total_hours = hrMap[p.id as string] ?? 0;
      p.members     = mMap[p.id as string]  ?? [];
    });
  }

  return { projects: data, meta: buildMeta(Number(count), page, per_page) };
}

export async function getProject(tenantId: string, id: string) {
  const project = await db('projects as p')
    .leftJoin('customers as c', 'c.id', 'p.customer_id')
    .leftJoin('currencies as cur', 'cur.id', 'p.currency_id')
    .where('p.id', id).where('p.tenant_id', tenantId).whereNull('p.deleted_at')
    .select('p.*', 'c.company_name as customer_name', 'cur.symbol as currency_symbol', 'cur.code as currency_code')
    .first();

  if (!project) throw new NotFoundError('Project');

  const members = await db('project_members as pm')
    .join('users as u', 'u.id', 'pm.user_id')
    .where('pm.project_id', id)
    .select('pm.*', 'u.first_name', 'u.last_name', 'u.email', 'u.avatar_url');

  const stats = await db('timesheets').where({ project_id: id })
    .select(
      db.raw('SUM(hours) as total_hours'),
      db.raw('SUM(CASE WHEN is_billable THEN hours ELSE 0 END) as billable_hours'),
    )
    .first();

  const taskStats = await db('tasks as t')
    .leftJoin('task_statuses as ts', 'ts.id', 't.status_id')
    .where('t.project_id', id).whereNull('t.deleted_at')
    .groupBy('ts.is_closed')
    .select('ts.is_closed')
    .count('t.id as cnt');

  const totalTasks  = (taskStats as any[]).reduce((s: number, r: any) => s + Number(r.cnt), 0);
  const closedRow   = (taskStats as any[]).find(r => r.is_closed);
  const closedTasks = closedRow ? Number(closedRow.cnt) : 0;
  const progress    = totalTasks > 0 ? Math.round(closedTasks / totalTasks * 100) : 0;

  return {
    ...project,
    members,
    stats: {
      total_hours:    Number((stats as any)?.total_hours ?? 0),
      billable_hours: Number((stats as any)?.billable_hours ?? 0),
      total_tasks:   totalTasks,
      closed_tasks:  Number(closedTasks),
      progress,
    },
  };
}

export async function createProject(tenantId: string, userId: string, input: CreateProjectInput) {
  const { members, ...projectData } = input;

  return db.transaction(async trx => {
    const [project] = await trx('projects').insert({
      tenant_id:   tenantId,
      ...projectData,
    }).returning('*');

    if (members?.length) {
      await trx('project_members').insert(members.map(m => ({
        project_id:         project.id,
        user_id:            m.user_id,
        is_project_manager: m.is_project_manager,
      })));
    } else {
      // Add creator as project manager by default
      await trx('project_members').insert({ project_id: project.id, user_id: userId, is_project_manager: true });
    }

    return project;
  });
}

export async function updateProject(tenantId: string, id: string, input: UpdateProjectInput) {
  const exists = await db('projects').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!exists) throw new NotFoundError('Project');

  const { members, ...projectData } = input;

  return db.transaction(async trx => {
    const [updated] = await trx('projects').where({ id }).update({
      ...projectData,
      updated_at: db.fn.now(),
    }).returning('*');

    if (members !== undefined) {
      await trx('project_members').where({ project_id: id }).delete();
      if (members.length) {
        await trx('project_members').insert(members.map(m => ({
          project_id:         id,
          user_id:            m.user_id,
          is_project_manager: m.is_project_manager,
        })));
      }
    }

    return updated;
  });
}

export async function deleteProject(tenantId: string, id: string) {
  const exists = await db('projects').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!exists) throw new NotFoundError('Project');
  await db('projects').where({ id }).update({ deleted_at: db.fn.now() });
}

const ALL_STATUSES = ['not_started', 'in_progress', 'on_hold', 'cancelled', 'finished'] as const;

export async function getProjectStatusStats(tenantId: string) {
  const rows = await db('projects')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .groupBy('status')
    .select('status', db.raw('count(*) as count'));
  const map = Object.fromEntries((rows as any[]).map(r => [r.status, Number(r.count)]));
  return ALL_STATUSES.map(s => ({ status: s, count: map[s] ?? 0 }));
}
