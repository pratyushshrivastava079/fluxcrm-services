import { db } from '../../core/config/database';

// ── Helpers ───────────────────────────────────────────────────────────────────

function padMonth(s: string): string {
  // ensure ISO date string for knex
  return s.length === 10 ? s : s.substring(0, 10);
}

// ── Revenue Report ────────────────────────────────────────────────────────────

export async function getRevenueReport(tenantId: string, from: string, to: string) {
  const [
    summary,
    byMonth,
    byCustomer,
    byStatus,
  ] = await Promise.all([
    // Total invoiced + collected in range
    db('invoices as i')
      .where('i.tenant_id', tenantId)
      .whereNull('i.deleted_at')
      .whereBetween('i.date', [padMonth(from), padMonth(to)])
      .select(
        db.raw('coalesce(sum(i.total), 0) as total_invoiced'),
        db.raw('coalesce(sum(i.amount_paid), 0) as total_collected'),
      )
      .first(),

    // By month — invoiced + collected
    db.raw(`
      SELECT
        to_char(date_trunc('month', i.date::date), 'Mon YYYY') AS month,
        COALESCE(SUM(i.total), 0)       AS invoiced,
        COALESCE(SUM(i.amount_paid), 0) AS collected
      FROM invoices i
      WHERE i.tenant_id = ?
        AND i.deleted_at IS NULL
        AND i.date BETWEEN ? AND ?
      GROUP BY date_trunc('month', i.date::date)
      ORDER BY date_trunc('month', i.date::date)
    `, [tenantId, padMonth(from), padMonth(to)]),

    // By customer — top 10
    db('invoices as i')
      .join('customers as c', 'c.id', 'i.customer_id')
      .where('i.tenant_id', tenantId)
      .whereNull('i.deleted_at')
      .whereBetween('i.date', [padMonth(from), padMonth(to)])
      .groupBy('c.id', 'c.company_name')
      .orderByRaw('SUM(i.total) DESC')
      .limit(10)
      .select(
        'c.company_name as customer_name',
        db.raw('coalesce(sum(i.total), 0) as invoiced'),
        db.raw('coalesce(sum(i.amount_paid), 0) as collected'),
        db.raw('count(i.id) as invoice_count'),
      ),

    // By status
    db('invoices as i')
      .where('i.tenant_id', tenantId)
      .whereNull('i.deleted_at')
      .whereBetween('i.date', [padMonth(from), padMonth(to)])
      .groupBy('i.status')
      .select(
        'i.status',
        db.raw('count(i.id) as count'),
        db.raw('coalesce(sum(i.total), 0) as amount'),
      ),
  ]);

  return {
    total_invoiced:  Number(summary?.total_invoiced  ?? 0),
    total_collected: Number(summary?.total_collected ?? 0),
    by_month:    (byMonth.rows as Array<{ month: string; invoiced: string; collected: string }>)
      .map((r) => ({ month: r.month, invoiced: Number(r.invoiced), collected: Number(r.collected) })),
    by_customer: byCustomer.map((r: { customer_name: string; invoiced: string; collected: string; invoice_count: string }) => ({
      customer_name:  r.customer_name,
      invoiced:       Number(r.invoiced),
      collected:      Number(r.collected),
      invoice_count:  Number(r.invoice_count),
    })),
    by_status: byStatus.map((r: { status: string; count: string; amount: string }) => ({
      status: r.status,
      count:  Number(r.count),
      amount: Number(r.amount),
    })),
  };
}

// ── Expenses Report ───────────────────────────────────────────────────────────

export async function getExpensesReport(tenantId: string, from: string, to: string) {
  const [summary, byMonth, byCategory] = await Promise.all([
    db('expenses as e')
      .where('e.tenant_id', tenantId)
      .whereBetween('e.date', [padMonth(from), padMonth(to)])
      .select(
        db.raw('coalesce(sum(e.amount), 0) as total'),
        db.raw("coalesce(sum(case when e.billable then e.amount else 0 end), 0) as billable"),
        db.raw('count(e.id) as count'),
      )
      .first(),

    db.raw(`
      SELECT
        to_char(date_trunc('month', e.date::date), 'Mon YYYY') AS month,
        COALESCE(SUM(e.amount), 0) AS total,
        COALESCE(SUM(CASE WHEN e.billable THEN e.amount ELSE 0 END), 0) AS billable
      FROM expenses e
      WHERE e.tenant_id = ?
        AND e.date BETWEEN ? AND ?
      GROUP BY date_trunc('month', e.date::date)
      ORDER BY date_trunc('month', e.date::date)
    `, [tenantId, padMonth(from), padMonth(to)]),

    db('expenses as e')
      .leftJoin('expense_categories as ec', 'ec.id', 'e.category_id')
      .where('e.tenant_id', tenantId)
      .whereBetween('e.date', [padMonth(from), padMonth(to)])
      .groupBy('ec.id', 'ec.name')
      .orderByRaw('SUM(e.amount) DESC')
      .select(
        db.raw("coalesce(ec.name, 'Uncategorized') as category_name"),
        db.raw('coalesce(sum(e.amount), 0) as total'),
        db.raw('count(e.id) as count'),
      ),
  ]);

  return {
    total:    Number(summary?.total    ?? 0),
    billable: Number(summary?.billable ?? 0),
    count:    Number(summary?.count    ?? 0),
    by_month: (byMonth.rows as Array<{ month: string; total: string; billable: string }>)
      .map((r) => ({ month: r.month, total: Number(r.total), billable: Number(r.billable) })),
    by_category: byCategory.map((r: { category_name: string; total: string; count: string }) => ({
      category_name: r.category_name,
      total:         Number(r.total),
      count:         Number(r.count),
    })),
  };
}

// ── Projects Report ───────────────────────────────────────────────────────────

export async function getProjectsReport(tenantId: string, from: string, to: string) {
  const [summary, byStatus, byMonth, overdue] = await Promise.all([
    db('projects as p')
      .where('p.tenant_id', tenantId)
      .whereNull('p.deleted_at')
      .whereBetween('p.created_at', [padMonth(from) + ' 00:00:00', padMonth(to) + ' 23:59:59'])
      .select(
        db.raw('count(p.id) as total'),
        db.raw("count(case when p.status = 'finished' then 1 end) as finished"),
      )
      .first(),

    db('projects as p')
      .where('p.tenant_id', tenantId)
      .whereNull('p.deleted_at')
      .whereBetween('p.created_at', [padMonth(from) + ' 00:00:00', padMonth(to) + ' 23:59:59'])
      .groupBy('p.status')
      .select('p.status', db.raw('count(p.id) as count')),

    db.raw(`
      SELECT
        to_char(date_trunc('month', p.created_at), 'Mon YYYY') AS month,
        COUNT(p.id) AS created,
        COUNT(CASE WHEN p.status = 'finished' THEN 1 END) AS finished
      FROM projects p
      WHERE p.tenant_id = ?
        AND p.deleted_at IS NULL
        AND p.created_at BETWEEN ? AND ?
      GROUP BY date_trunc('month', p.created_at)
      ORDER BY date_trunc('month', p.created_at)
    `, [tenantId, padMonth(from) + ' 00:00:00', padMonth(to) + ' 23:59:59']),

    // Overdue = not finished/cancelled but deadline passed
    db('projects as p')
      .where('p.tenant_id', tenantId)
      .whereNull('p.deleted_at')
      .whereNotIn('p.status', ['finished', 'cancelled'])
      .whereNotNull('p.deadline')
      .where('p.deadline', '<', new Date().toISOString().substring(0, 10))
      .count('p.id as count')
      .first(),
  ]);

  const total    = Number(summary?.total    ?? 0);
  const finished = Number(summary?.finished ?? 0);

  return {
    total,
    finished,
    completion_rate: total > 0 ? Math.round((finished / total) * 100) : 0,
    overdue: Number(overdue?.count ?? 0),
    by_status: byStatus.map((r: { status: string; count: string }) => ({
      status: r.status,
      count:  Number(r.count),
    })),
    by_month: (byMonth.rows as Array<{ month: string; created: string; finished: string }>)
      .map((r) => ({ month: r.month, created: Number(r.created), finished: Number(r.finished) })),
  };
}

// ── Tickets Report ────────────────────────────────────────────────────────────

export async function getTicketsReport(tenantId: string, from: string, to: string) {
  const [summary, byStatus, byPriority, byMonth] = await Promise.all([
    db('tickets as t')
      .join('ticket_statuses as ts', 'ts.id', 't.status_id')
      .where('t.tenant_id', tenantId)
      .whereNull('t.deleted_at')
      .whereBetween('t.created_at', [padMonth(from) + ' 00:00:00', padMonth(to) + ' 23:59:59'])
      .select(
        db.raw('count(t.id) as total'),
        db.raw('count(case when ts.is_closed then 1 end) as closed'),
        db.raw('count(case when not ts.is_closed then 1 end) as open'),
      )
      .first(),

    db('tickets as t')
      .join('ticket_statuses as ts', 'ts.id', 't.status_id')
      .where('t.tenant_id', tenantId)
      .whereNull('t.deleted_at')
      .whereBetween('t.created_at', [padMonth(from) + ' 00:00:00', padMonth(to) + ' 23:59:59'])
      .groupBy('ts.id', 'ts.name', 'ts.color', 'ts.sort_order')
      .orderBy('ts.sort_order')
      .select('ts.name as status_name', 'ts.color', db.raw('count(t.id) as count')),

    db('tickets as t')
      .where('t.tenant_id', tenantId)
      .whereNull('t.deleted_at')
      .whereBetween('t.created_at', [padMonth(from) + ' 00:00:00', padMonth(to) + ' 23:59:59'])
      .groupBy('t.priority')
      .select('t.priority', db.raw('count(t.id) as count')),

    db.raw(`
      SELECT
        to_char(date_trunc('month', t.created_at), 'Mon YYYY') AS month,
        COUNT(t.id) AS opened,
        COUNT(CASE WHEN ts.is_closed THEN 1 END) AS closed
      FROM tickets t
      JOIN ticket_statuses ts ON ts.id = t.status_id
      WHERE t.tenant_id = ?
        AND t.deleted_at IS NULL
        AND t.created_at BETWEEN ? AND ?
      GROUP BY date_trunc('month', t.created_at)
      ORDER BY date_trunc('month', t.created_at)
    `, [tenantId, padMonth(from) + ' 00:00:00', padMonth(to) + ' 23:59:59']),
  ]);

  return {
    total:  Number(summary?.total  ?? 0),
    open:   Number(summary?.open   ?? 0),
    closed: Number(summary?.closed ?? 0),
    by_status: byStatus.map((r: { status_name: string; color: string; count: string }) => ({
      status_name: r.status_name,
      color:       r.color,
      count:       Number(r.count),
    })),
    by_priority: byPriority.map((r: { priority: string; count: string }) => ({
      priority: r.priority,
      count:    Number(r.count),
    })),
    by_month: (byMonth.rows as Array<{ month: string; opened: string; closed: string }>)
      .map((r) => ({ month: r.month, opened: Number(r.opened), closed: Number(r.closed) })),
  };
}
