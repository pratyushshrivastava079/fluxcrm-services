import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { NotFoundError } from '../../core/utils/response';
import { CreateTicketInput, UpdateTicketInput, ReplyTicketInput } from './tickets.schema';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function nextNumber(tenantId: string): Promise<string> {
  const row = await db('tickets')
    .where({ tenant_id: tenantId })
    .max('number as mx')
    .first();
  let next = 1;
  if (row?.mx) {
    const m = String(row.mx).match(/(\d+)$/);
    if (m) next = parseInt(m[1]) + 1;
  }
  return `TKT-${String(next).padStart(4, '0')}`;
}

async function getTicket(tenantId: string, id: string) {
  const row = await db('tickets').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!row) throw new NotFoundError('Ticket');
  return row;
}

async function getDefaultStatus(tenantId: string) {
  return db('ticket_statuses').where({ tenant_id: tenantId, is_default: true }).first();
}

// ── Reference data ────────────────────────────────────────────────────────────

export async function listStatuses(tenantId: string) {
  return db('ticket_statuses').where({ tenant_id: tenantId }).orderBy('sort_order').select('*');
}

export async function listPriorities(tenantId: string) {
  return db('ticket_priorities').where({ tenant_id: tenantId }).orderBy('sort_order').select('*');
}

export async function listDepartments(tenantId: string) {
  return db('departments').where({ tenant_id: tenantId }).orderBy('name').select('id', 'name');
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function listTickets(
  tenantId: string,
  params: PaginationParams & { status_id?: string; department_id?: string; assigned_to?: string },
) {
  const { page = 1, perPage = 25, search, status_id, department_id, assigned_to } = params;

  let q = db('tickets as t')
    .join('customers as c', 'c.id', 't.customer_id')
    .join('ticket_statuses as ts', 'ts.id', 't.status_id')
    .join('ticket_priorities as tp', 'tp.id', 't.priority_id')
    .leftJoin('departments as d', 'd.id', 't.department_id')
    .leftJoin('users as u', 'u.id', 't.assigned_to')
    .where('t.tenant_id', tenantId)
    .whereNull('t.deleted_at')
    .select(
      't.id', 't.number', 't.subject', 't.last_reply_at', 't.last_reply_by',
      't.created_at', 't.updated_at',
      'c.company_name as customer_name',
      'ts.id as status_id', 'ts.name as status_name', 'ts.color as status_color', 'ts.is_closed',
      'tp.id as priority_id', 'tp.name as priority_name', 'tp.color as priority_color',
      'd.name as department_name',
      db.raw("concat(u.first_name, ' ', u.last_name) as assigned_name"),
    );

  if (status_id)     q = q.where('t.status_id', status_id);
  if (department_id) q = q.where('t.department_id', department_id);
  if (assigned_to)   q = q.where('t.assigned_to', assigned_to);
  if (search)        q = q.whereILike('t.subject', `%${search}%`).orWhereILike('c.company_name', `%${search}%`);

  const [{ count }] = await q.clone().clearSelect().count('t.id as count');
  const tickets = await q.orderBy('t.updated_at', 'desc').limit(perPage).offset((page - 1) * perPage);

  return { tickets, meta: buildMeta(Number(count), page, perPage) };
}

export async function getTicketById(tenantId: string, id: string) {
  const ticket = await db('tickets as t')
    .join('customers as c', 'c.id', 't.customer_id')
    .join('ticket_statuses as ts', 'ts.id', 't.status_id')
    .join('ticket_priorities as tp', 'tp.id', 't.priority_id')
    .leftJoin('departments as d', 'd.id', 't.department_id')
    .leftJoin('ticket_services as sv', 'sv.id', 't.service_id')
    .leftJoin('users as u', 'u.id', 't.assigned_to')
    .where('t.id', id).where('t.tenant_id', tenantId).whereNull('t.deleted_at')
    .first(
      't.*',
      'c.company_name as customer_name',
      'ts.name as status_name', 'ts.color as status_color', 'ts.is_closed',
      'tp.name as priority_name', 'tp.color as priority_color',
      'd.name as department_name',
      'sv.name as service_name',
      db.raw("concat(u.first_name, ' ', u.last_name) as assigned_name"),
    );

  if (!ticket) throw new NotFoundError('Ticket');

  const replies = await db('ticket_replies as tr')
    .leftJoin('users as u', 'u.id', db.raw('CASE WHEN tr.reply_by_type = ? THEN tr.reply_by_id END', ['staff']))
    .where('tr.ticket_id', id)
    .whereNull('tr.deleted_at')
    .orderBy('tr.created_at', 'asc')
    .select(
      'tr.id', 'tr.content', 'tr.reply_by_type', 'tr.reply_by_id',
      'tr.is_initial', 'tr.is_internal_note', 'tr.created_at',
      db.raw("concat(u.first_name, ' ', u.last_name) as author_name"),
      'u.avatar_url as author_avatar',
    );

  return { ...ticket, replies };
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createTicket(tenantId: string, userId: string, input: CreateTicketInput) {
  const [defaultStatus, number] = await Promise.all([
    getDefaultStatus(tenantId),
    nextNumber(tenantId),
  ]);

  return db.transaction(async (trx) => {
    const [ticket] = await trx('tickets').insert({
      tenant_id:     tenantId,
      number,
      subject:       input.subject,
      customer_id:   input.customer_id,
      contact_id:    input.contact_id ?? null,
      department_id: input.department_id ?? null,
      service_id:    input.service_id ?? null,
      status_id:     defaultStatus?.id,
      priority_id:   input.priority_id,
      assigned_to:   input.assigned_to ?? null,
      last_reply_at: db.fn.now(),
      last_reply_by: 'staff',
    }).returning('*');

    await trx('ticket_replies').insert({
      ticket_id:    ticket.id,
      reply_by_type: 'staff',
      reply_by_id:  userId,
      content:      input.message,
      is_initial:   true,
    });

    return ticket;
  });
}

export async function updateTicket(tenantId: string, id: string, input: UpdateTicketInput) {
  await getTicket(tenantId, id);
  const [updated] = await db('tickets')
    .where({ id, tenant_id: tenantId })
    .update({ ...input, updated_at: db.fn.now() })
    .returning('*');
  return updated;
}

export async function replyToTicket(
  tenantId: string,
  ticketId: string,
  userId: string,
  input: ReplyTicketInput,
) {
  await getTicket(tenantId, ticketId);

  const [reply] = await db('ticket_replies').insert({
    ticket_id:        ticketId,
    reply_by_type:    'staff',
    reply_by_id:      userId,
    content:          input.content,
    is_internal_note: input.is_internal_note,
  }).returning('*');

  await db('tickets').where({ id: ticketId }).update({
    last_reply_at: db.fn.now(),
    last_reply_by: 'staff',
    updated_at:    db.fn.now(),
  });

  return reply;
}

export async function deleteTicket(tenantId: string, id: string) {
  await getTicket(tenantId, id);
  await db('tickets').where({ id, tenant_id: tenantId }).update({ deleted_at: db.fn.now() });
}

// ── Stats for dashboard ───────────────────────────────────────────────────────

export async function getTicketStats(tenantId: string) {
  const byStatus = await db('tickets as t')
    .join('ticket_statuses as ts', 'ts.id', 't.status_id')
    .where('t.tenant_id', tenantId)
    .whereNull('t.deleted_at')
    .groupBy('ts.id', 'ts.name', 'ts.color', 'ts.is_closed', 'ts.sort_order')
    .orderBy('ts.sort_order')
    .select('ts.name as status_name', 'ts.color', 'ts.is_closed')
    .count('t.id as count');

  const byDepartment = await db('tickets as t')
    .leftJoin('departments as d', 'd.id', 't.department_id')
    .where('t.tenant_id', tenantId)
    .whereNull('t.deleted_at')
    .where('t.last_reply_by', 'client')   // awaiting staff reply
    .groupBy('d.id', 'd.name')
    .select(db.raw("coalesce(d.name, 'Unassigned') as department_name"))
    .count('t.id as count');

  const staffReport = await db('tickets as t')
    .join('users as u', 'u.id', 't.assigned_to')
    .where('t.tenant_id', tenantId)
    .whereNull('t.deleted_at')
    .groupBy('u.id', 'u.first_name', 'u.last_name')
    .select(
      'u.id as user_id',
      db.raw("concat(u.first_name, ' ', u.last_name) as staff_name"),
    )
    .count('t.id as total_assigned')
    .countDistinct(db.raw("case when ts2.is_closed = false then t.id end as open_tickets"))
    .join('ticket_statuses as ts2', 'ts2.id', 't.status_id')
    .orderBy('total_assigned', 'desc')
    .limit(10);

  return { by_status: byStatus, awaiting_reply_by_dept: byDepartment, staff_report: staffReport };
}
