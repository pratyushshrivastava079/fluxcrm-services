import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { NotFoundError } from '../../core/utils/response';
import { CreateItemInput, UpdateItemInput, CreateGroupInput, UpdateGroupInput } from './items.schema';

// ── Items ─────────────────────────────────────────────────────────────────────

export async function listItems(
  tenantId: string,
  params: PaginationParams & { group_id?: string },
) {
  const { page = 1, perPage = 25, search, group_id, sortBy = 'description', sortDir = 'asc' } = params;

  const ALLOWED_SORT = new Set(['description', 'rate', 'unit', 'created_at']);
  const col = ALLOWED_SORT.has(sortBy ?? '') ? `i.${sortBy}` : 'i.description';
  const dir = sortDir === 'desc' ? 'desc' : 'asc';

  let q = db('items as i')
    .leftJoin('item_groups as g',  'g.id',  'i.group_id')
    .leftJoin('tax_rates as t1',   't1.id', 'i.tax_id')
    .leftJoin('tax_rates as t2',   't2.id', 'i.tax2_id')
    .where('i.tenant_id', tenantId)
    .whereNull('i.deleted_at')
    .select(
      'i.id', 'i.description', 'i.long_description', 'i.rate', 'i.unit',
      'i.tax_id', 'i.tax2_id', 'i.group_id', 'i.created_at',
      'g.name as group_name',
      't1.name as tax1_name', 't1.rate as tax1_rate',
      't2.name as tax2_name', 't2.rate as tax2_rate',
    );

  if (group_id) q = q.where('i.group_id', group_id);
  if (search)   q = q.whereILike('i.description', `%${search}%`);

  const [{ count }] = await q.clone().clearSelect().count('i.id as count');
  const data = await q.orderBy(col, dir).limit(perPage).offset((page - 1) * perPage);

  return { data, meta: buildMeta(Number(count), page, perPage) };
}

export async function getItem(tenantId: string, id: string) {
  const item = await db('items as i')
    .leftJoin('item_groups as g',  'g.id',  'i.group_id')
    .leftJoin('tax_rates as t1',   't1.id', 'i.tax_id')
    .leftJoin('tax_rates as t2',   't2.id', 'i.tax2_id')
    .where('i.id', id).where('i.tenant_id', tenantId).whereNull('i.deleted_at')
    .select(
      'i.*',
      'g.name as group_name',
      't1.name as tax1_name', 't1.rate as tax1_rate',
      't2.name as tax2_name', 't2.rate as tax2_rate',
    )
    .first();

  if (!item) throw new NotFoundError('Item');
  return item;
}

export async function createItem(tenantId: string, input: CreateItemInput) {
  const [item] = await db('items').insert({
    tenant_id:        tenantId,
    description:      input.description,
    long_description: input.long_description ?? null,
    rate:             input.rate,
    unit:             input.unit ?? null,
    tax_id:           input.tax_id ?? null,
    tax2_id:          input.tax2_id ?? null,
    group_id:         input.group_id ?? null,
  }).returning('*');
  return item;
}

export async function updateItem(tenantId: string, id: string, input: UpdateItemInput) {
  const existing = await db('items').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!existing) throw new NotFoundError('Item');
  const [item] = await db('items').where({ id }).update({
    description:      input.description,
    long_description: input.long_description ?? null,
    rate:             input.rate,
    unit:             input.unit ?? null,
    tax_id:           input.tax_id ?? null,
    tax2_id:          input.tax2_id ?? null,
    group_id:         input.group_id ?? null,
    updated_at:       db.fn.now(),
  }).returning('*');
  return item;
}

export async function deleteItem(tenantId: string, id: string) {
  const existing = await db('items').where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  if (!existing) throw new NotFoundError('Item');
  await db('items').where({ id }).update({ deleted_at: db.fn.now() });
}

export async function bulkDeleteItems(tenantId: string, ids: string[]) {
  await db('items').whereIn('id', ids).where({ tenant_id: tenantId }).update({ deleted_at: db.fn.now() });
}

// ── Groups ────────────────────────────────────────────────────────────────────

export async function listGroups(tenantId: string) {
  return db('item_groups')
    .where({ tenant_id: tenantId })
    .orderBy('name')
    .select('id', 'name', 'description', 'created_at');
}

export async function createGroup(tenantId: string, input: CreateGroupInput) {
  const [group] = await db('item_groups').insert({
    tenant_id:   tenantId,
    name:        input.name,
    description: input.description ?? null,
  }).returning('*');
  return group;
}

export async function updateGroup(tenantId: string, id: string, input: UpdateGroupInput) {
  const existing = await db('item_groups').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Group');
  const [group] = await db('item_groups').where({ id }).update({
    name:        input.name,
    description: input.description ?? null,
    updated_at:  db.fn.now(),
  }).returning('*');
  return group;
}

export async function deleteGroup(tenantId: string, id: string) {
  const existing = await db('item_groups').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Group');
  // Unlink items from this group before deleting
  await db('items').where({ group_id: id, tenant_id: tenantId }).update({ group_id: null });
  await db('item_groups').where({ id }).delete();
}

// ── Reference data ────────────────────────────────────────────────────────────

export async function getTaxRates(tenantId: string) {
  return db('tax_rates').where({ tenant_id: tenantId }).orderBy('name');
}

// ── CSV Import ────────────────────────────────────────────────────────────────

export interface ImportRow {
  row:             number;
  description:     string;
  long_description?: string;
  rate:            string;
  tax?:            string;   // name or id
  tax2?:           string;
  unit?:           string;
  group?:          string;   // name or id
}

export interface ImportRowResult {
  row:          number;
  description:  string;
  rate:         number | null;
  tax_id:       string | null;
  tax2_id:      string | null;
  unit:         string | null;
  group_id:     string | null;
  group_name:   string | null;
  tax1_name:    string | null;
  tax2_name:    string | null;
  errors:       string[];
  status:       'ok' | 'error';
}

export async function importItems(
  tenantId: string,
  rows: ImportRow[],
  simulate: boolean,
): Promise<{ imported: number; failed: number; results: ImportRowResult[] }> {
  // Pre-load lookup tables
  const [taxRates, groups] = await Promise.all([
    db('tax_rates').where({ tenant_id: tenantId }).select('id', 'name'),
    db('item_groups').where({ tenant_id: tenantId }).select('id', 'name'),
  ]);

  const taxByName = new Map<string, string>(taxRates.map((t: any) => [t.name.toLowerCase(), t.id]));
  const taxById   = new Map<string, string>(taxRates.map((t: any) => [t.id, t.name]));
  const grpByName = new Map<string, string>(groups.map((g: any) => [g.name.toLowerCase(), g.id]));
  const grpById   = new Map<string, string>(groups.map((g: any) => [g.id, g.name]));

  function resolveTax(val?: string): { id: string | null; name: string | null; err?: string } {
    if (!val || val.trim() === '') return { id: null, name: null };
    const v = val.trim();
    if (taxById.has(v))   return { id: v, name: taxById.get(v)! };
    const byName = taxByName.get(v.toLowerCase());
    if (byName) return { id: byName, name: v };
    return { id: null, name: null, err: `Tax "${v}" not found` };
  }

  function resolveGroup(val?: string): { id: string | null; name: string | null; err?: string } {
    if (!val || val.trim() === '') return { id: null, name: null };
    const v = val.trim();
    if (grpById.has(v))   return { id: v, name: grpById.get(v)! };
    const byName = grpByName.get(v.toLowerCase());
    if (byName) return { id: byName, name: v };
    return { id: null, name: null, err: `Group "${v}" not found` };
  }

  const results: ImportRowResult[] = [];
  const toInsert: any[] = [];

  for (const row of rows) {
    const errors: string[] = [];

    if (!row.description?.trim()) errors.push('Description is required');
    const rate = parseFloat(row.rate);
    if (isNaN(rate) || rate < 0)  errors.push('Rate must be a valid non-negative number');

    const t1 = resolveTax(row.tax);
    const t2 = resolveTax(row.tax2);
    const gr = resolveGroup(row.group);
    if (t1.err) errors.push(t1.err);
    if (t2.err) errors.push(t2.err);
    if (gr.err) errors.push(gr.err);

    const result: ImportRowResult = {
      row:          row.row,
      description:  row.description?.trim() ?? '',
      rate:         isNaN(rate) ? null : rate,
      tax_id:       t1.id,
      tax2_id:      t2.id,
      unit:         row.unit?.trim() || null,
      group_id:     gr.id,
      group_name:   gr.name,
      tax1_name:    t1.name,
      tax2_name:    t2.name,
      errors,
      status:       errors.length === 0 ? 'ok' : 'error',
    };

    results.push(result);
    if (errors.length === 0 && !simulate) {
      toInsert.push({
        tenant_id:        tenantId,
        description:      result.description,
        long_description: row.long_description?.trim() || null,
        rate:             result.rate,
        unit:             result.unit,
        tax_id:           result.tax_id,
        tax2_id:          result.tax2_id,
        group_id:         result.group_id,
      });
    }
  }

  if (toInsert.length > 0) {
    await db('items').insert(toInsert);
  }

  return {
    imported: results.filter(r => r.status === 'ok').length,
    failed:   results.filter(r => r.status === 'error').length,
    results,
  };
}

// ── CSV parsing helper ────────────────────────────────────────────────────────

export function parseCsv(csvText: string): ImportRow[] {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map(h => h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));

  // Map header positions
  const idx = {
    description:      headers.findIndex(h => h === 'description'),
    long_description: headers.findIndex(h => h.startsWith('long')),
    rate:             headers.findIndex(h => h.startsWith('rate')),
    tax:              headers.findIndex(h => h === 'tax'),
    tax2:             headers.findIndex(h => h === 'tax2'),
    unit:             headers.findIndex(h => h === 'unit'),
    group:            headers.findIndex(h => h === 'group'),
  };

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = parseCsvLine(line);
    rows.push({
      row:             i,
      description:     idx.description >= 0      ? (cells[idx.description]     ?? '') : '',
      long_description: idx.long_description >= 0 ? (cells[idx.long_description] ?? '') : undefined,
      rate:            idx.rate >= 0              ? (cells[idx.rate]            ?? '') : '',
      tax:             idx.tax >= 0               ? (cells[idx.tax]             ?? '') : undefined,
      tax2:            idx.tax2 >= 0              ? (cells[idx.tax2]            ?? '') : undefined,
      unit:            idx.unit >= 0              ? (cells[idx.unit]            ?? '') : undefined,
      group:           idx.group >= 0             ? (cells[idx.group]           ?? '') : undefined,
    });
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}
