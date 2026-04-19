import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { ConflictError, NotFoundError } from '../../core/utils/response';
import { CreateLeadInput, UpdateLeadInput, UpdateLeadStatusInput } from './leads.schema';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getLead(tenantId: string, leadId: string) {
  const lead = await db('leads')
    .where({ id: leadId, tenant_id: tenantId })
    .whereNull('deleted_at')
    .first();
  if (!lead) throw new NotFoundError('Lead');
  return lead;
}

async function getDefaultStatus(tenantId: string) {
  return db('lead_statuses')
    .where({ tenant_id: tenantId, is_default: true })
    .orderBy('sort_order')
    .first();
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function listLeads(tenantId: string, params: PaginationParams & { status_id?: string }) {
  const query = db('leads as l')
    .where('l.tenant_id', tenantId)
    .whereNull('l.deleted_at');

  if (params.search) {
    const s = `%${params.search}%`;
    query.where((b) =>
      b.whereILike('l.first_name', s)
        .orWhereILike('l.last_name', s)
        .orWhereILike('l.email', s)
        .orWhereILike('l.company', s),
    );
  }

  if (params.status_id) query.where('l.status_id', params.status_id);

  const [{ count }] = await query.clone().count('l.id as count');
  const total = Number(count);

  const leads = await query
    .leftJoin('lead_statuses as ls', 'ls.id', 'l.status_id')
    .leftJoin('lead_sources as lsrc', 'lsrc.id', 'l.source_id')
    .leftJoin('users as u', 'u.id', 'l.assigned_to')
    .leftJoin(
      db('taggables as tb')
        .join('tags as t', 't.id', 'tb.tag_id')
        .where('tb.entity_type', 'lead')
        .groupBy('tb.entity_id')
        .select(
          'tb.entity_id',
          db.raw("json_agg(json_build_object('name', t.name, 'color', t.color)) as tags"),
        )
        .as('lt'),
      'lt.entity_id', 'l.id',
    )
    .orderBy('l.created_at', 'desc')
    .limit(params.perPage)
    .offset(params.offset)
    .select(
      'l.id', 'l.first_name', 'l.last_name', 'l.email', 'l.phone', 'l.company',
      'l.value', 'l.currency', 'l.status_id', 'l.flag', 'l.source_id',
      'l.assigned_to', 'l.last_contact_at', 'l.created_at',
      'ls.name as status_name', 'ls.color as status_color',
      'lsrc.name as source_name',
      db.raw("concat(u.first_name, ' ', u.last_name) as assigned_name"),
      db.raw("coalesce(lt.tags, '[]'::json) as tags"),
      db.raw("ROW_NUMBER() OVER (PARTITION BY l.tenant_id ORDER BY l.created_at) as lead_number"),
    );

  return { leads, meta: buildMeta(total, params.page, params.perPage) };
}

export async function getLeadStatusStats(tenantId: string) {
  const rows = await db('leads as l')
    .join('lead_statuses as ls', 'ls.id', 'l.status_id')
    .where('l.tenant_id', tenantId)
    .whereNull('l.deleted_at')
    .where('l.flag', 'open')
    .groupBy('ls.id', 'ls.name', 'ls.color', 'ls.sort_order')
    .orderBy('ls.sort_order')
    .select(
      'ls.id', 'ls.name', 'ls.color',
      db.raw('count(l.id)::int as count'),
      db.raw('coalesce(sum(l.value), 0)::float as total_value'),
    );
  return rows;
}

export async function getLeadBoardData(tenantId: string) {
  const statuses = await db('lead_statuses')
    .where({ tenant_id: tenantId })
    .orderBy('sort_order')
    .select('id', 'name', 'color', 'sort_order', 'is_won', 'is_lost');

  const leads = await db('leads as l')
    .where('l.tenant_id', tenantId)
    .whereNull('l.deleted_at')
    .where('l.flag', 'open')
    .leftJoin('users as u', 'u.id', 'l.assigned_to')
    .leftJoin('lead_sources as lsrc', 'lsrc.id', 'l.source_id')
    .orderBy('l.kanban_position')
    .select(
      'l.id', 'l.first_name', 'l.last_name', 'l.company', 'l.email',
      'l.value', 'l.currency', 'l.status_id', 'l.flag', 'l.kanban_position',
      'l.source_id', 'l.created_at',
      'lsrc.name as source_name',
      db.raw("concat(u.first_name, ' ', u.last_name) as assigned_name"),
      db.raw("ROW_NUMBER() OVER (PARTITION BY l.tenant_id ORDER BY l.created_at) as lead_number"),
    );

  const grouped = statuses.map((status) => ({
    ...status,
    leads: leads
      .filter((l) => l.status_id === status.id)
      .map((l) => ({ ...l, status_name: status.name, status_color: status.color })),
  }));

  return { statuses: grouped };
}

export async function getLeadById(tenantId: string, leadId: string) {
  const lead = await db('leads as l')
    .where('l.id', leadId)
    .where('l.tenant_id', tenantId)
    .whereNull('l.deleted_at')
    .leftJoin('lead_statuses as ls', 'ls.id', 'l.status_id')
    .leftJoin('lead_sources as lsrc', 'lsrc.id', 'l.source_id')
    .leftJoin('users as u', 'u.id', 'l.assigned_to')
    .first(
      'l.*',
      'ls.name as status_name',
      'ls.color as status_color',
      'lsrc.name as source_name',
      db.raw("concat(u.first_name, ' ', u.last_name) as assigned_name"),
    );

  if (!lead) throw new NotFoundError('Lead');

  const activities = await db('lead_activities')
    .where({ lead_id: leadId })
    .orderBy('created_at', 'desc')
    .limit(20)
    .select('*');

  return { ...lead, activities };
}

export async function listLeadStatuses(tenantId: string) {
  return db('lead_statuses')
    .where({ tenant_id: tenantId })
    .orderBy('sort_order')
    .select('id', 'name', 'color', 'sort_order', 'is_default', 'is_won', 'is_lost');
}

export async function listLeadSources(tenantId: string) {
  return db('lead_sources')
    .where({ tenant_id: tenantId })
    .orderBy('name')
    .select('id', 'name');
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createLead(
  tenantId: string,
  _createdBy: string,
  input: CreateLeadInput,
) {
  let statusId = input.status_id;
  if (!statusId) {
    const def = await getDefaultStatus(tenantId);
    statusId = def?.id;
  }

  const maxPos = await db('leads')
    .where({ tenant_id: tenantId, status_id: statusId })
    .whereNull('deleted_at')
    .max('kanban_position as mp')
    .first();

  const kanban_position = ((maxPos?.mp as number) ?? -1) + 1;

  const [lead] = await db('leads')
    .insert({
      tenant_id: tenantId,
      ...input,
      status_id: statusId,
      kanban_position,
    })
    .returning('*');

  return lead;
}

export async function updateLead(
  tenantId: string,
  leadId: string,
  input: UpdateLeadInput,
) {
  await getLead(tenantId, leadId);
  const [updated] = await db('leads')
    .where({ id: leadId, tenant_id: tenantId })
    .update({ ...input, updated_at: db.fn.now() })
    .returning('*');
  return updated;
}

export async function updateLeadStatus(
  tenantId: string,
  leadId: string,
  input: UpdateLeadStatusInput,
) {
  await getLead(tenantId, leadId);
  const [updated] = await db('leads')
    .where({ id: leadId, tenant_id: tenantId })
    .update({
      status_id: input.status_id,
      ...(input.kanban_position !== undefined && { kanban_position: input.kanban_position }),
      updated_at: db.fn.now(),
    })
    .returning('*');
  return updated;
}

export async function deleteLead(tenantId: string, leadId: string) {
  await getLead(tenantId, leadId);
  await db('leads')
    .where({ id: leadId, tenant_id: tenantId })
    .update({ deleted_at: db.fn.now() });
}

// ── Convert lead → customer ───────────────────────────────────────────────────

export async function convertLeadToCustomer(
  tenantId: string,
  leadId: string,
  userId: string,
) {
  const lead = await getLead(tenantId, leadId);

  if (lead.flag === 'converted') {
    throw new ConflictError('Lead has already been converted to a customer');
  }

  return db.transaction(async (trx) => {
    // 1. Create customer from lead info
    const [customer] = await trx('customers')
      .insert({
        tenant_id: tenantId,
        company_name: lead.company || `${lead.first_name} ${lead.last_name}`.trim(),
        phone: lead.phone,
        website: lead.website,
        address_line1: lead.address,
        city: lead.city,
        state: lead.state,
        zip: lead.zip,
        country: lead.country,
        assigned_to: lead.assigned_to,
        converted_from_lead: leadId,
        notes: lead.description,
      })
      .returning('*');

    // 2. Create primary contact
    const [contact] = await trx('contacts')
      .insert({
        tenant_id: tenantId,
        customer_id: customer.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        is_primary: true,
      })
      .returning('*');

    // 3. Mark lead as converted
    const wonStatus = await trx('lead_statuses')
      .where({ tenant_id: tenantId, is_won: true })
      .first();

    await trx('leads')
      .where({ id: leadId })
      .update({
        flag: 'converted',
        converted_at: trx.fn.now(),
        converted_to_customer_id: customer.id,
        ...(wonStatus && { status_id: wonStatus.id }),
        updated_at: trx.fn.now(),
      });

    // 4. Log activity
    await trx('lead_activities').insert({
      tenant_id: tenantId,
      lead_id: leadId,
      user_id: userId,
      type: 'system',
      subject: 'Lead converted to customer',
      description: `Converted to customer: ${customer.company_name}`,
    });

    return { customer, contact };
  });
}
