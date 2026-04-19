import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { NotFoundError } from '../../core/utils/response';
import { randomHex } from '../../core/utils/hash';
import { CreateContractInput, UpdateContractInput } from './contracts.schema';

async function nextNumber(tenantId: string): Promise<string> {
  const row = await db('contracts').where({ tenant_id: tenantId }).max('number as mx').first();
  let next = 1;
  if (row?.mx) {
    const m = String(row.mx).match(/(\d+)$/);
    if (m) next = parseInt(m[1]) + 1;
  }
  return `CON-${String(next).padStart(4, '0')}`;
}

async function getContract(tenantId: string, id: string) {
  const row = await db('contracts').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!row) throw new NotFoundError('Contract');
  return row;
}

// ── Reference data ────────────────────────────────────────────────────────────

export async function listContractTypes(tenantId: string) {
  return db('contract_types').where({ tenant_id: tenantId }).orderBy('name').select('*');
}

export async function createContractType(tenantId: string, name: string) {
  const [row] = await db('contract_types').insert({ tenant_id: tenantId, name }).returning('*');
  return row;
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getContractStats(tenantId: string) {
  const now = new Date().toISOString().slice(0, 10);
  const thirtyDaysLater = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const thirtyDaysAgo   = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

  const [active, expired, about_to_expire, recently_added, trash] = await Promise.all([
    db('contracts').where({ tenant_id: tenantId, status: 'active' }).whereNull('deleted_at').count('id as c').first(),
    db('contracts').where({ tenant_id: tenantId, status: 'expired' }).whereNull('deleted_at').count('id as c').first(),
    db('contracts').where({ tenant_id: tenantId, status: 'active' }).whereNull('deleted_at')
      .whereNotNull('end_date').whereBetween('end_date', [now, thirtyDaysLater]).count('id as c').first(),
    db('contracts').where({ tenant_id: tenantId }).whereNull('deleted_at')
      .where('created_at', '>=', thirtyDaysAgo).count('id as c').first(),
    db('contracts').where({ tenant_id: tenantId }).whereNotNull('deleted_at').count('id as c').first(),
  ]);

  const byType = await db('contracts as con')
    .leftJoin('contract_types as ct', 'ct.id', 'con.type_id')
    .where('con.tenant_id', tenantId).whereNull('con.deleted_at')
    .groupBy('ct.name')
    .select(db.raw('COALESCE(ct.name, \'Untyped\') as type_name'))
    .count('con.id as count')
    .sum('con.value as total_value');

  return {
    active_count:     Number((active as any)?.c ?? 0),
    expired_count:    Number((expired as any)?.c ?? 0),
    about_to_expire:  Number((about_to_expire as any)?.c ?? 0),
    recently_added:   Number((recently_added as any)?.c ?? 0),
    trash_count:      Number((trash as any)?.c ?? 0),
    by_type: byType.map(r => ({
      type_name:   (r as any).type_name as string,
      count:       Number((r as any).count),
      total_value: Number((r as any).total_value ?? 0),
    })),
  };
}

export async function listContracts(
  tenantId: string,
  params: PaginationParams & { status?: string; customer_id?: string },
) {
  const { page = 1, perPage = 25, search, status, customer_id } = params;

  let q = db('contracts as con')
    .join('customers as c', 'c.id', 'con.customer_id')
    .leftJoin('contract_types as ct', 'ct.id', 'con.type_id')
    .leftJoin('projects as p', 'p.id', 'con.project_id')
    .where('con.tenant_id', tenantId)
    .whereNull('con.deleted_at')
    .select(
      'con.id', 'con.number', 'con.subject', 'con.status', 'con.value',
      'con.start_date', 'con.end_date', 'con.signature_status', 'con.created_at',
      'c.company_name as customer_name',
      'ct.name as type_name',
      'p.name as project_name',
    );

  if (status)      q = q.where('con.status', status);
  if (customer_id) q = q.where('con.customer_id', customer_id);
  if (search)      q = q.whereILike('con.subject', `%${search}%`).orWhereILike('c.company_name', `%${search}%`);

  const [{ count }] = await q.clone().clearSelect().count('con.id as count');
  const contracts   = await q.orderBy('con.created_at', 'desc').limit(perPage).offset((page - 1) * perPage);

  return { contracts, meta: buildMeta(Number(count), page, perPage) };
}

export async function getContractById(tenantId: string, id: string) {
  const contract = await db('contracts as con')
    .join('customers as c', 'c.id', 'con.customer_id')
    .leftJoin('contract_types as ct', 'ct.id', 'con.type_id')
    .leftJoin('currencies as cur', 'cur.id', 'con.currency_id')
    .where('con.id', id).where('con.tenant_id', tenantId).whereNull('con.deleted_at')
    .first(
      'con.*',
      'c.company_name as customer_name',
      'ct.name as type_name',
      'cur.symbol as currency_symbol', 'cur.code as currency_code',
    );

  if (!contract) throw new NotFoundError('Contract');
  return contract;
}

export async function getContractsExpiringSoon(tenantId: string, days = 30) {
  const now   = new Date();
  const limit = new Date(now);
  limit.setDate(limit.getDate() + days);

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
    .select(
      'con.id', 'con.number', 'con.subject', 'con.end_date', 'con.value', 'con.status',
      'c.company_name as customer_name',
    );
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createContract(tenantId: string, input: CreateContractInput) {
  const [number, hash] = await Promise.all([nextNumber(tenantId), randomHex(32)]);
  const [contract] = await db('contracts').insert({
    tenant_id: tenantId,
    number,
    hash,
    ...input,
  }).returning('*');
  return contract;
}

export async function updateContract(tenantId: string, id: string, input: UpdateContractInput) {
  await getContract(tenantId, id);
  const [updated] = await db('contracts')
    .where({ id, tenant_id: tenantId })
    .update({ ...input, updated_at: db.fn.now() })
    .returning('*');
  return updated;
}

export async function deleteContract(tenantId: string, id: string) {
  await getContract(tenantId, id);
  await db('contracts').where({ id, tenant_id: tenantId }).update({ deleted_at: db.fn.now() });
}
