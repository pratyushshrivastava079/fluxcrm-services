import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { NotFoundError } from '../../core/utils/response';
import { CreateContactInput, UpdateContactInput } from './customers.schema';

export async function listContacts(tenantId: string, customerId: string, params: PaginationParams) {
  const query = db('contacts')
    .where({ tenant_id: tenantId, customer_id: customerId })
    .whereNull('deleted_at');

  if (params.search) {
    const s = `%${params.search}%`;
    query.where((b) =>
      b
        .whereILike('first_name', s)
        .orWhereILike('last_name', s)
        .orWhereILike('email', s),
    );
  }

  const [{ count }] = await query.clone().count('id as count');
  const total = Number(count);

  const contacts = await query
    .orderBy(params.sortBy ?? 'is_primary', params.sortDir === 'asc' ? 'desc' : 'asc') // primary first
    .limit(params.perPage)
    .offset(params.offset);

  return { contacts, meta: buildMeta(total, params.page, params.perPage) };
}

export async function getContact(tenantId: string, customerId: string, contactId: string) {
  const contact = await db('contacts')
    .where({ id: contactId, customer_id: customerId, tenant_id: tenantId })
    .whereNull('deleted_at')
    .first();
  if (!contact) throw new NotFoundError('Contact');
  return contact;
}

export async function createContact(
  tenantId: string,
  customerId: string,
  input: CreateContactInput,
) {
  // If setting as primary, unset existing primary
  if (input.is_primary) {
    await db('contacts')
      .where({ customer_id: customerId, tenant_id: tenantId })
      .update({ is_primary: false, updated_at: db.fn.now() });
  }

  const [contact] = await db('contacts')
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      ...input,
      custom_fields: JSON.stringify(input.custom_fields ?? {}),
    })
    .returning('*');
  return contact;
}

export async function updateContact(
  tenantId: string,
  customerId: string,
  contactId: string,
  input: UpdateContactInput,
) {
  await getContact(tenantId, customerId, contactId);

  if (input.is_primary) {
    await db('contacts')
      .where({ customer_id: customerId, tenant_id: tenantId })
      .whereNot('id', contactId)
      .update({ is_primary: false, updated_at: db.fn.now() });
  }

  const payload: Record<string, unknown> = { ...input, updated_at: db.fn.now() };
  if (input.custom_fields !== undefined) {
    payload.custom_fields = JSON.stringify(input.custom_fields);
  }

  const [updated] = await db('contacts')
    .where({ id: contactId, customer_id: customerId, tenant_id: tenantId })
    .update(payload)
    .returning('*');
  return updated;
}

export async function deleteContact(
  tenantId: string,
  customerId: string,
  contactId: string,
): Promise<void> {
  await getContact(tenantId, customerId, contactId);
  await db('contacts')
    .where({ id: contactId, customer_id: customerId, tenant_id: tenantId })
    .update({ deleted_at: db.fn.now() });
}
