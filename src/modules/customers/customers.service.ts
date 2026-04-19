import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { NotFoundError } from '../../core/utils/response';
import { CreateCustomerInput, UpdateCustomerInput } from './customers.schema';

// ── CSV Import ────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_').trim());
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = values[j] ?? ''; });
    return row;
  });
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export async function importCustomers(
  tenantId: string,
  csvText: string,
  simulate = false,
): Promise<ImportResult> {
  const rows = parseCSV(csvText);
  let imported = 0;
  let skipped = 0;
  const errors: { row: number; message: string }[] = [];
  const seenEmails = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed, account for header row

    const firstname = row['firstname'] || row['first_name'] || '';
    const lastname  = row['lastname']  || row['last_name']  || '';
    const email     = (row['email'] || '').toLowerCase().trim();
    const company   = row['company'] || '';

    if (!firstname.trim()) {
      errors.push({ row: rowNum, message: 'Firstname is required' });
      continue;
    }
    if (!company.trim()) {
      errors.push({ row: rowNum, message: 'Company is required' });
      continue;
    }

    // Duplicate email check (within batch)
    if (email) {
      if (seenEmails.has(email)) { skipped++; continue; }
      // Duplicate check against DB
      const existing = await db('contacts')
        .whereRaw('lower(email) = ?', [email])
        .whereNull('deleted_at')
        .first('id');
      if (existing) { skipped++; continue; }
      seenEmails.add(email);
    }

    if (!simulate) {
      const [customer] = await db('customers').insert({
        tenant_id:        tenantId,
        company_name:     company,
        vat_number:       row['vat'] || null,
        phone:            row['phonenumber'] || null,
        country:          row['country'] || null,
        city:             row['city'] || null,
        zip:              row['zip'] || null,
        state:            row['state'] || null,
        address_line1:    row['address'] || null,
        website:          row['website'] || null,
        is_active:        true,
        portal_allowed:   true,
        default_currency: 'USD',
        default_language: 'en',
        custom_fields:    '{}',
      }).returning('*');

      await db('contacts').insert({
        tenant_id:    tenantId,
        customer_id:  customer.id,
        first_name:   firstname,
        last_name:    lastname,
        email:        email || null,
        phone:        row['contact_phonenumber'] || null,
        job_title:    row['position'] || null,
        is_primary:   true,
        do_not_contact: false,
        send_invoices:  false,
        send_estimates: false,
        send_contracts: false,
        send_projects:  false,
        custom_fields: '{}',
      });
    }

    imported++;
  }

  return { imported, skipped, errors };
}

export async function listCustomers(tenantId: string, params: PaginationParams) {
  const query = db('customers as c')
    .where('c.tenant_id', tenantId)
    .whereNull('c.deleted_at');

  if (params.search) {
    const s = `%${params.search}%`;
    query.where((b) =>
      b.whereILike('c.company_name', s)
        .orWhereILike('c.phone', s)
        .orWhereILike('c.city', s),
    );
  }

  const [{ count }] = await query.clone().count('c.id as count');
  const total = Number(count);

  const customers = await query
    .leftJoin(
      db('contacts').whereNull('deleted_at').where('is_primary', true)
        .select('customer_id', 'first_name', 'last_name', 'email as primary_email')
        .as('pc'),
      'pc.customer_id', 'c.id',
    )
    .leftJoin(
      db('contacts').whereNull('deleted_at').groupBy('customer_id')
        .select('customer_id', db.raw('count(*) as contacts_count'))
        .as('cnt'),
      'cnt.customer_id', 'c.id',
    )
    .orderBy(params.sortBy ? `c.${params.sortBy}` : 'c.created_at', params.sortDir)
    .limit(params.perPage)
    .offset(params.offset)
    .select(
      'c.id', 'c.company_name', 'c.phone', 'c.website', 'c.city', 'c.country',
      'c.default_currency', 'c.is_active', 'c.created_at',
      db.raw("concat(pc.first_name, ' ', pc.last_name) as primary_contact_name"),
      'pc.primary_email',
      db.raw('coalesce(cnt.contacts_count, 0)::int as contacts_count'),
    );

  return { customers, meta: buildMeta(total, params.page, params.perPage) };
}

export async function getCustomerStats(tenantId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const [totals] = await db('customers')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .select(
      db.raw('count(*) as total'),
      db.raw("count(*) filter (where is_active = true) as active"),
      db.raw("count(*) filter (where is_active = false) as inactive"),
    );

  const [contacts] = await db('contacts as ct')
    .join('customers as c', 'c.id', 'ct.customer_id')
    .where('c.tenant_id', tenantId)
    .whereNull('ct.deleted_at')
    .whereNull('c.deleted_at')
    .select(
      db.raw('count(*) as total_contacts'),
      db.raw('count(*) filter (where c.is_active = true) as active_contacts'),
      db.raw('count(*) filter (where c.is_active = false) as inactive_contacts'),
      db.raw(`count(*) filter (where ct.created_at::date = '${today}'::date) as logged_in_today`),
    );

  return {
    total:           Number(totals.total),
    active:          Number(totals.active),
    inactive:        Number(totals.inactive),
    active_contacts: Number(contacts.active_contacts),
    inactive_contacts: Number(contacts.inactive_contacts),
    logged_in_today: Number(contacts.logged_in_today),
  };
}

export async function getCustomer(tenantId: string, customerId: string) {
  const customer = await db('customers')
    .where({ id: customerId, tenant_id: tenantId })
    .whereNull('deleted_at')
    .first();
  if (!customer) throw new NotFoundError('Customer');
  return customer;
}

export async function createCustomer(tenantId: string, input: CreateCustomerInput) {
  const [customer] = await db('customers')
    .insert({
      tenant_id: tenantId,
      ...input,
      custom_fields: JSON.stringify(input.custom_fields ?? {}),
    })
    .returning('*');
  return customer;
}

export async function updateCustomer(
  tenantId: string,
  customerId: string,
  input: UpdateCustomerInput,
) {
  await getCustomer(tenantId, customerId); // throws 404 if missing

  const payload: Record<string, unknown> = { ...input, updated_at: db.fn.now() };
  if (input.custom_fields !== undefined) {
    payload.custom_fields = JSON.stringify(input.custom_fields);
  }

  const [updated] = await db('customers')
    .where({ id: customerId, tenant_id: tenantId })
    .update(payload)
    .returning('*');
  return updated;
}

export async function deleteCustomer(tenantId: string, customerId: string): Promise<void> {
  await getCustomer(tenantId, customerId);
  await db('customers')
    .where({ id: customerId, tenant_id: tenantId })
    .update({ deleted_at: db.fn.now() });
}
