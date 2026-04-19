import { db } from '../../core/config/database';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayLabel(date: Date): string {
  return DAY_LABELS[date.getDay()];
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

// ── Main aggregator ───────────────────────────────────────────────────────────

export async function getDashboardStats(tenantId: string, userId: string) {
  const [
    invoiceCounts,
    financialSummary,
    proposalCounts,
    estimateCounts,
    leadsByStatus,
    projectsByStatus,
    myTasks,
    myProjects,
    paymentRecords,
    recentActivity,
    ticketStats,
    contractsExpiring,
    goals,
  ] = await Promise.all([
    getInvoiceCounts(tenantId),
    getFinancialSummary(tenantId),
    getProposalCounts(tenantId),
    getEstimateCounts(tenantId),
    getLeadsByStatus(tenantId),
    getProjectsByStatus(tenantId),
    getMyTasks(tenantId, userId),
    getMyProjects(tenantId, userId),
    getPaymentRecords(tenantId),
    getRecentActivity(tenantId),
    getTicketStats(tenantId),
    getContractsExpiring(tenantId),
    getGoals(tenantId),
  ]);

  // Top-bar summary numbers
  type SC = { status: string; count: string | number };
  type LSC = { is_won: boolean; count: string | number };
  type PSC = { status: string; count: string | number };
  type MT  = { is_closed: boolean };

  const awaitingPayment = (invoiceCounts as SC[]).filter(
    (r) => ['sent', 'unpaid', 'partial', 'overdue'].includes(r.status),
  );
  const awaitingCount = awaitingPayment.reduce((s, r) => s + Number(r.count), 0);
  const totalInvoices  = (invoiceCounts as SC[]).reduce((s, r) => s + Number(r.count), 0);

  const totalLeads     = (leadsByStatus as LSC[]).reduce((s, r) => s + Number(r.count), 0);
  const convertedCount = (leadsByStatus as LSC[])
    .filter((r) => r.is_won)
    .reduce((s, r) => s + Number(r.count), 0);

  const inProgressProjects = (projectsByStatus as PSC[]).find((r) => r.status === 'in_progress');
  const totalProjects       = (projectsByStatus as PSC[]).reduce((s, r) => s + Number(r.count), 0);

  const openTasks  = (myTasks as MT[]).filter((t) => !t.is_closed).length;
  const totalTasks = myTasks.length;

  return {
    // ── Top bar ───────────────────────────────────────────────────────────────
    top_bar: {
      invoices_awaiting_payment: { count: awaitingCount, total: totalInvoices },
      converted_leads:           { converted: convertedCount, total: totalLeads },
      projects_in_progress:      { count: Number(inProgressProjects?.count ?? 0), total: totalProjects },
      tasks_not_finished:        { count: openTasks, total: totalTasks },
    },

    // ── Financial ─────────────────────────────────────────────────────────────
    financial: financialSummary,

    // ── Overviews ─────────────────────────────────────────────────────────────
    invoice_overview:  invoiceCounts,
    proposal_overview: proposalCounts,
    estimate_overview: estimateCounts,

    // ── Charts ────────────────────────────────────────────────────────────────
    leads_by_status:    leadsByStatus,
    projects_by_status: projectsByStatus,

    // ── My work ───────────────────────────────────────────────────────────────
    my_tasks:    myTasks.slice(0, 10),
    my_projects: myProjects.slice(0, 6),

    // ── Payments ──────────────────────────────────────────────────────────────
    payment_records: paymentRecords,

    // ── Activity ──────────────────────────────────────────────────────────────
    recent_activity: recentActivity,

    // ── Phase 3 ───────────────────────────────────────────────────────────────
    ticket_stats:        ticketStats,
    contracts_expiring:  contractsExpiring,
    goals,
  };
}

// ── Invoice counts by status ──────────────────────────────────────────────────

async function getInvoiceCounts(tenantId: string) {
  const rows = await db('invoices')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .groupBy('status')
    .select('status')
    .count('id as count');

  return rows as Array<{ status: string; count: string | number }>;
}

// ── Financial summary ─────────────────────────────────────────────────────────

async function getFinancialSummary(tenantId: string) {
  const now = new Date();
  const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));

  const [outstandingRow, overdueRow, paidRow] = await Promise.all([
    // Outstanding = balance_due for sent/unpaid/partial
    db('invoices')
      .where({ tenant_id: tenantId })
      .whereNull('deleted_at')
      .whereIn('status', ['sent', 'unpaid', 'partial'])
      .sum('balance_due as total')
      .first(),

    // Past due = balance_due for overdue
    db('invoices')
      .where({ tenant_id: tenantId })
      .whereNull('deleted_at')
      .where('status', 'overdue')
      .sum('balance_due as total')
      .first(),

    // Paid this month = payments received this calendar month
    db('payments as p')
      .join('invoices as i', 'i.id', 'p.invoice_id')
      .where('i.tenant_id', tenantId)
      .where('p.date', '>=', monthStart)
      .sum('p.amount as total')
      .first(),
  ]);

  return {
    outstanding:     Number(outstandingRow?.total ?? 0),
    past_due:        Number(overdueRow?.total ?? 0),
    paid_this_month: Number(paidRow?.total ?? 0),
  };
}

// ── Proposal counts by status ─────────────────────────────────────────────────

async function getProposalCounts(tenantId: string) {
  const rows = await db('proposals')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .groupBy('status')
    .select('status')
    .count('id as count');

  return rows as Array<{ status: string; count: string | number }>;
}

// ── Estimate counts by status ─────────────────────────────────────────────────

async function getEstimateCounts(tenantId: string) {
  const rows = await db('estimates')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .groupBy('status')
    .select('status')
    .count('id as count');

  return rows as Array<{ status: string; count: string | number }>;
}

// ── Leads by status ───────────────────────────────────────────────────────────

async function getLeadsByStatus(tenantId: string) {
  const rows = await db('leads as l')
    .join('lead_statuses as ls', 'ls.id', 'l.status_id')
    .where('l.tenant_id', tenantId)
    .whereNull('l.deleted_at')
    .groupBy('ls.id', 'ls.name', 'ls.color', 'ls.sort_order', 'ls.is_won', 'ls.is_lost')
    .orderBy('ls.sort_order')
    .select('ls.name as status_name', 'ls.color', 'ls.is_won', 'ls.is_lost')
    .count('l.id as count');

  return rows as unknown as Array<{
    status_name: string;
    color: string;
    is_won: boolean;
    is_lost: boolean;
    count: string | number;
  }>;
}

// ── Projects by status ────────────────────────────────────────────────────────

async function getProjectsByStatus(tenantId: string) {
  const rows = await db('projects')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .groupBy('status')
    .select('status')
    .count('id as count');

  return rows as Array<{ status: string; count: string | number }>;
}

// ── My tasks (assigned to userId, not closed) ─────────────────────────────────

async function getMyTasks(tenantId: string, userId: string) {
  const rows = await db('tasks as t')
    .join('task_assignees as ta', 'ta.task_id', 't.id')
    .join('task_statuses as ts', 'ts.id', 't.status_id')
    .leftJoin('projects as p', 'p.id', 't.project_id')
    .where('t.tenant_id', tenantId)
    .where('ta.user_id', userId)
    .whereNull('t.deleted_at')
    .orderBy([
      { column: 'ts.is_closed', order: 'asc' },
      { column: 't.due_date',   order: 'asc'  },
      { column: 't.created_at', order: 'desc' },
    ])
    .limit(10)
    .select(
      't.id', 't.name', 't.priority', 't.due_date', 't.start_date',
      'ts.name as status_name', 'ts.color as status_color', 'ts.is_closed',
      'p.name as project_name',
    );

  return rows;
}

// ── My projects (member of) ───────────────────────────────────────────────────

async function getMyProjects(tenantId: string, userId: string) {
  const rows = await db('projects as p')
    .join('project_members as pm', 'pm.project_id', 'p.id')
    .where('p.tenant_id', tenantId)
    .where('pm.user_id', userId)
    .whereNull('p.deleted_at')
    .whereNotIn('p.status', ['finished', 'cancelled'])
    .orderBy([
      { column: 'p.is_pinned', order: 'desc' },
      { column: 'p.deadline',  order: 'asc'  },
    ])
    .limit(6)
    .select(
      'p.id', 'p.name', 'p.status', 'p.color',
      'p.deadline', 'p.is_pinned',
    );

  // Attach task counts
  const ids = rows.map((r: { id: string }) => r.id);
  let taskCounts: Array<{ project_id: string; total: number; closed: number }> = [];
  if (ids.length) {
    taskCounts = (await db('tasks as t')
      .join('task_statuses as ts', 'ts.id', 't.status_id')
      .whereIn('t.project_id', ids)
      .whereNull('t.deleted_at')
      .groupBy('t.project_id')
      .select(
        't.project_id',
        db.raw('count(t.id) as total'),
        db.raw('sum(case when ts.is_closed then 1 else 0 end) as closed'),
      )) as unknown as Array<{ project_id: string; total: number; closed: number }>;
  }

  const countMap = Object.fromEntries(
    taskCounts.map((r) => [r.project_id, r]),
  );

  return rows.map((r: { id: string }) => ({
    ...r,
    total_tasks:  Number(countMap[r.id]?.total  ?? 0),
    closed_tasks: Number(countMap[r.id]?.closed ?? 0),
  }));
}

// ── Payment records (7-day bar chart) ────────────────────────────────────────

async function getPaymentRecords(tenantId: string) {
  const today     = new Date();
  const thisWeek  = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
  const lastWeek  = Array.from({ length: 7 }, (_, i) => subDays(today, 13 - i));

  async function sumForRange(days: Date[]) {
    const start = isoDate(days[0]);
    const end   = isoDate(days[days.length - 1]);

    const rows = await db('payments as p')
      .join('invoices as i', 'i.id', 'p.invoice_id')
      .where('i.tenant_id', tenantId)
      .whereBetween('p.date', [start, end])
      .groupBy('p.date')
      .select('p.date')
      .sum('p.amount as total');

    const map = Object.fromEntries(
      (rows as unknown as Array<{ date: string; total: string | number }>)
        .map((r) => [r.date, Number(r.total)]),
    );

    return days.map((d) => ({
      day:    dayLabel(d),
      date:   isoDate(d),
      amount: map[isoDate(d)] ?? 0,
    }));
  }

  const [thisWeekData, lastWeekData] = await Promise.all([
    sumForRange(thisWeek),
    sumForRange(lastWeek),
  ]);

  return { this_week: thisWeekData, last_week: lastWeekData };
}

// ── Recent activity ───────────────────────────────────────────────────────────

async function getRecentActivity(tenantId: string) {
  // Combine recent items from leads, invoices, projects (latest 15 across all)
  const [recentLeads, recentInvoices, recentProjects] = await Promise.all([
    db('leads as l')
      .leftJoin('users as u', 'u.id', 'l.assigned_to')
      .where('l.tenant_id', tenantId)
      .whereNull('l.deleted_at')
      .orderBy('l.created_at', 'desc')
      .limit(5)
      .select(
        'l.id', 'l.first_name', 'l.last_name', 'l.company', 'l.flag',
        'l.created_at',
        db.raw("concat(u.first_name, ' ', u.last_name) as assigned_name"),
      ),

    db('invoices as i')
      .join('customers as c', 'c.id', 'i.customer_id')
      .where('i.tenant_id', tenantId)
      .whereNull('i.deleted_at')
      .orderBy('i.created_at', 'desc')
      .limit(5)
      .select('i.id', 'i.number', 'i.status', 'i.total', 'i.created_at', 'c.company_name'),

    db('projects')
      .where({ tenant_id: tenantId })
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
      .limit(5)
      .select('id', 'name', 'status', 'created_at'),
  ]);

  const activity: Array<{
    type: string;
    id: string;
    title: string;
    subtitle: string;
    badge: string;
    badge_color: string;
    created_at: string;
  }> = [];

  for (const l of recentLeads) {
    activity.push({
      type:        'lead',
      id:          l.id,
      title:       `${l.first_name} ${l.last_name}`.trim() || l.company || 'Unknown',
      subtitle:    l.company ?? '',
      badge:       l.flag === 'converted' ? 'Converted' : 'Open',
      badge_color: l.flag === 'converted' ? '#22c55e' : '#6366f1',
      created_at:  l.created_at,
    });
  }

  for (const inv of recentInvoices) {
    activity.push({
      type:        'invoice',
      id:          inv.id,
      title:       inv.number,
      subtitle:    inv.company_name,
      badge:       inv.status,
      badge_color: invoiceStatusColor(inv.status),
      created_at:  inv.created_at,
    });
  }

  for (const proj of recentProjects) {
    activity.push({
      type:        'project',
      id:          proj.id,
      title:       proj.name,
      subtitle:    '',
      badge:       proj.status.replace('_', ' '),
      badge_color: projectStatusColor(proj.status),
      created_at:  proj.created_at,
    });
  }

  // Sort by created_at descending, return top 12
  activity.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return activity.slice(0, 12);
}

function invoiceStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: '#94a3b8', sent: '#3b82f6', viewed: '#8b5cf6',
    unpaid: '#f97316', partial: '#eab308', paid: '#22c55e',
    overdue: '#ef4444', cancelled: '#6b7280', void: '#6b7280',
  };
  return map[status] ?? '#94a3b8';
}

function projectStatusColor(status: string): string {
  const map: Record<string, string> = {
    not_started: '#94a3b8', in_progress: '#3b82f6',
    on_hold: '#eab308', cancelled: '#ef4444', finished: '#22c55e',
  };
  return map[status] ?? '#94a3b8';
}

// ── Ticket stats ──────────────────────────────────────────────────────────────

async function getTicketStats(tenantId: string) {
  const [byStatus, awaitingByDept] = await Promise.all([
    db('tickets as t')
      .join('ticket_statuses as ts', 'ts.id', 't.status_id')
      .where('t.tenant_id', tenantId)
      .whereNull('t.deleted_at')
      .groupBy('ts.id', 'ts.name', 'ts.color', 'ts.is_closed', 'ts.sort_order')
      .orderBy('ts.sort_order')
      .select('ts.name as status_name', 'ts.color', 'ts.is_closed')
      .count('t.id as count'),

    db('tickets as t')
      .leftJoin('departments as d', 'd.id', 't.department_id')
      .where('t.tenant_id', tenantId)
      .whereNull('t.deleted_at')
      .where('t.last_reply_by', 'client')
      .groupBy('d.id', 'd.name')
      .select(db.raw("coalesce(d.name, 'Unassigned') as department_name"))
      .count('t.id as count'),
  ]);

  return {
    by_status:             byStatus,
    awaiting_reply_by_dept: awaitingByDept,
  };
}

// ── Contracts expiring soon (next 30 days) ────────────────────────────────────

async function getContractsExpiring(tenantId: string) {
  const now   = new Date();
  const limit = new Date(now);
  limit.setDate(limit.getDate() + 30);

  const pad = (n: number) => String(n).padStart(2, '0');
  const isoNow   = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const isoLimit = `${limit.getFullYear()}-${pad(limit.getMonth()+1)}-${pad(limit.getDate())}`;

  return db('contracts as con')
    .join('customers as c', 'c.id', 'con.customer_id')
    .where('con.tenant_id', tenantId)
    .whereNull('con.deleted_at')
    .where('con.status', 'active')
    .whereNotNull('con.end_date')
    .whereBetween('con.end_date', [isoNow, isoLimit])
    .orderBy('con.end_date', 'asc')
    .limit(10)
    .select(
      'con.id', 'con.number', 'con.subject', 'con.end_date', 'con.value',
      'c.company_name as customer_name',
    );
}

// ── Goals with computed progress ──────────────────────────────────────────────

async function getGoals(tenantId: string) {
  const rows = await db('goals')
    .where({ tenant_id: tenantId, is_active: true })
    .orderBy('created_at', 'desc')
    .select('*');

  return Promise.all(
    rows.map(async (g: {
      id: string; type: string; start_date: string; end_date: string;
      current_value: number; target_value: number;
    }) => {
      let current = Number(g.current_value);

      if (g.type === 'invoiced_amount') {
        const row = await db('payments as p')
          .join('invoices as i', 'i.id', 'p.invoice_id')
          .where('i.tenant_id', tenantId)
          .whereBetween('p.date', [g.start_date, g.end_date])
          .sum('p.amount as total')
          .first();
        current = Number(row?.total ?? 0);
      } else if (g.type === 'new_customers') {
        const [{ count }] = await db('customers')
          .where({ tenant_id: tenantId })
          .whereBetween('created_at', [g.start_date + ' 00:00:00', g.end_date + ' 23:59:59'])
          .count('id as count');
        current = Number(count);
      } else if (g.type === 'new_contracts') {
        const [{ count }] = await db('contracts')
          .where({ tenant_id: tenantId })
          .whereNull('deleted_at')
          .whereBetween('created_at', [g.start_date + ' 00:00:00', g.end_date + ' 23:59:59'])
          .count('id as count');
        current = Number(count);
      }

      const target   = Number(g.target_value);
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      return { ...g, current_value: current, progress };
    }),
  );
}
