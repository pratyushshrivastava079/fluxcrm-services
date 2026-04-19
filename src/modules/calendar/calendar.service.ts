import { db } from '../../core/config/database';

export interface CalendarEvent {
  id:         string;
  type:       'task' | 'reminder' | 'milestone' | 'project_deadline';
  title:      string;
  date:       string;      // YYYY-MM-DD
  color:      string;
  related_id?: string;     // project id for milestone/deadline
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export async function getCalendarEvents(
  tenantId: string,
  userId: string,
  year: number,
  month: number,   // 1-based
): Promise<CalendarEvent[]> {
  const start = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end   = `${year}-${pad(month)}-${pad(lastDay)}`;

  const [tasks, reminders, milestones, deadlines] = await Promise.all([
    // Tasks with due_date in range assigned to this user
    db('tasks as t')
      .join('task_assignees as ta', 'ta.task_id', 't.id')
      .join('task_statuses as ts', 'ts.id', 't.status_id')
      .where('t.tenant_id', tenantId)
      .where('ta.user_id', userId)
      .whereNull('t.deleted_at')
      .where('ts.is_closed', false)
      .whereBetween('t.due_date', [start, end])
      .select('t.id', 't.name as title', 't.due_date as date', 'ts.color'),

    // Personal reminders for this user in range
    db('reminders')
      .where({ tenant_id: tenantId, user_id: userId, is_done: false })
      .whereBetween('remind_date', [start, end])
      .select('id', 'title', 'remind_date as date'),

    // Project milestones in range (if milestones table exists)
    db('project_milestones as pm')
      .join('projects as p', 'p.id', 'pm.project_id')
      .join('project_members as pmem', 'pmem.project_id', 'p.id')
      .where('p.tenant_id', tenantId)
      .where('pmem.user_id', userId)
      .whereNull('p.deleted_at')
      .whereBetween('pm.due_date', [start, end])
      .select('pm.id', 'pm.name as title', 'pm.due_date as date', 'p.color', 'p.id as related_id')
      .catch(() => []),   // graceful if table doesn't exist yet

    // Projects with deadline in range (user is member)
    db('projects as p')
      .join('project_members as pm', 'pm.project_id', 'p.id')
      .where('p.tenant_id', tenantId)
      .where('pm.user_id', userId)
      .whereNull('p.deleted_at')
      .whereNotNull('p.deadline')
      .whereBetween('p.deadline', [start, end])
      .select('p.id', 'p.name as title', 'p.deadline as date', 'p.color'),
  ]);

  const events: CalendarEvent[] = [];

  for (const t of tasks as Array<{ id: string; title: string; date: string; color: string }>) {
    events.push({ id: t.id, type: 'task', title: t.title, date: t.date, color: t.color ?? '#6366f1' });
  }

  for (const r of reminders as Array<{ id: string; title: string; date: string }>) {
    events.push({ id: r.id, type: 'reminder', title: r.title, date: r.date, color: '#f59e0b' });
  }

  for (const m of milestones as Array<{ id: string; title: string; date: string; color: string; related_id: string }>) {
    events.push({ id: m.id, type: 'milestone', title: m.title, date: m.date, color: m.color ?? '#8b5cf6', related_id: m.related_id });
  }

  for (const d of deadlines as Array<{ id: string; title: string; date: string; color: string }>) {
    events.push({ id: d.id, type: 'project_deadline', title: d.title, date: d.date, color: d.color ?? '#ef4444' });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}
