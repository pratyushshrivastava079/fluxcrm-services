import { db } from '../../core/config/database';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { BadRequestError, NotFoundError } from '../../core/utils/response';
import { randomHex } from '../../core/utils/hash';
import { config } from '../../core/config';
import { sendProposalLink } from '../../core/utils/mailer';
import {
  CreateProposalInput, UpdateProposalInput, SignProposalInput, ProposalItemInput,
} from './proposals.schema';

// ── Financial calculations ────────────────────────────────────────────────────

interface TaxMap { [id: string]: number }

function calcLineTotal(item: ProposalItemInput): number {
  const gross = Number(item.qty) * Number(item.rate);
  const disc  = item.discount_type === 'percent'
    ? gross * Number(item.discount) / 100
    : Number(item.discount);
  return Math.max(0, gross - disc);
}

async function resolveTaxMap(tenantId: string, items: ProposalItemInput[]): Promise<TaxMap> {
  const taxIds = [...new Set(items.flatMap((i) => [i.tax_id, i.tax2_id].filter(Boolean) as string[]))];
  if (!taxIds.length) return {};
  const rows = await db('tax_rates').whereIn('id', taxIds).where({ tenant_id: tenantId }).select('id', 'rate');
  return Object.fromEntries((rows as Array<{ id: string; rate: number }>).map((r) => [r.id, Number(r.rate)]));
}

function calcTotal(
  items: ProposalItemInput[],
  discount: number,
  discountType: 'percent' | 'fixed',
  adjustment: number,
  taxMap: TaxMap,
): number {
  const subtotal = items.reduce((s, i) => s + calcLineTotal(i), 0);
  const taxTotal = items.reduce((s, i) => {
    const t1 = i.tax_id  ? (taxMap[i.tax_id]  ?? 0) : 0;
    const t2 = i.tax2_id ? (taxMap[i.tax2_id] ?? 0) : 0;
    return s + calcLineTotal(i) * (t1 + t2) / 100;
  }, 0);
  const disc  = discountType === 'percent' ? subtotal * discount / 100 : discount;
  return Math.max(0, subtotal - disc + taxTotal + adjustment);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getProposal(tenantId: string, proposalId: string) {
  const p = await db('proposals')
    .where({ id: proposalId, tenant_id: tenantId })
    .whereNull('deleted_at')
    .first();
  if (!p) throw new NotFoundError('Proposal');
  return p;
}

async function resolveRecipient(toType: string, toId: string) {
  if (toType === 'lead') {
    const lead = await db('leads').where({ id: toId }).first(
      'first_name', 'last_name', 'email', 'phone', 'company',
      'address', 'city', 'state', 'zip', 'country',
    );
    return lead ? {
      name:    `${lead.first_name} ${lead.last_name}`.trim(),
      email:   lead.email as string | null,
      phone:   lead.phone as string | null,
      address: lead.address as string | null,
      city:    lead.city as string | null,
      state:   lead.state as string | null,
      zip:     lead.zip as string | null,
      country: lead.country as string | null,
    } : null;
  }
  const customer = await db('contacts')
    .where({ customer_id: toId, is_primary: true })
    .whereNull('deleted_at')
    .first('first_name', 'last_name', 'email', 'phone');
  if (customer) {
    const cust = await db('customers').where({ id: toId }).first('billing_address', 'billing_city', 'billing_state', 'billing_zip', 'billing_country');
    return {
      name:    `${customer.first_name} ${customer.last_name}`.trim(),
      email:   customer.email as string | null,
      phone:   customer.phone as string | null,
      address: cust?.billing_address ?? null,
      city:    cust?.billing_city    ?? null,
      state:   cust?.billing_state   ?? null,
      zip:     cust?.billing_zip     ?? null,
      country: cust?.billing_country ?? null,
    };
  }
  return null;
}

async function saveItems(
  trx: any,
  proposalId: string,
  tenantId: string,
  items: ProposalItemInput[],
) {
  await trx('proposal_items').where({ proposal_id: proposalId }).delete();
  if (!items.length) return;
  await trx('proposal_items').insert(
    items.map((item, idx) => ({
      proposal_id:   proposalId,
      tenant_id:     tenantId,
      description:   item.description,
      long_desc:     item.long_desc ?? null,
      qty:           Number(item.qty),
      unit:          item.unit ?? null,
      rate:          Number(item.rate),
      tax_id:        item.tax_id  ?? null,
      tax2_id:       item.tax2_id ?? null,
      discount:      Number(item.discount),
      discount_type: item.discount_type,
      line_total:    calcLineTotal(item),
      is_optional:   item.is_optional ?? false,
      sort_order:    idx,
    })),
  );
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function listProposals(tenantId: string, params: PaginationParams & { toType?: string; toId?: string }) {
  const query = db('proposals as p')
    .where('p.tenant_id', tenantId)
    .whereNull('p.deleted_at');

  if (params.toType) query.where('p.to_type', params.toType);
  if (params.toId)   query.where('p.to_id', params.toId);
  if (params.search) query.whereILike('p.subject', `%${params.search}%`);

  const [{ count }] = await query.clone().count('p.id as count');
  const total = Number(count);

  const proposals = await query
    .leftJoin('users as u', 'u.id', 'p.assigned_to')
    .leftJoin('currencies as c', 'c.id', 'p.currency_id')
    .orderBy('p.created_at', 'desc')
    .limit(params.perPage)
    .offset(params.offset)
    .select(
      'p.id', 'p.subject', 'p.to_type', 'p.to_id', 'p.to_name', 'p.status',
      'p.total', 'p.date', 'p.open_till', 'p.sent_at', 'p.signature_status',
      'p.hash', 'p.created_at',
      db.raw("concat(u.first_name, ' ', u.last_name) as assigned_name"),
      'c.symbol as currency_symbol', 'c.code as currency_code',
    );

  return { proposals, meta: buildMeta(total, params.page, params.perPage) };
}

export async function getProposalById(tenantId: string, proposalId: string) {
  const proposal = await db('proposals as p')
    .where('p.id', proposalId)
    .where('p.tenant_id', tenantId)
    .whereNull('p.deleted_at')
    .leftJoin('currencies as c', 'c.id', 'p.currency_id')
    .leftJoin('users as u', 'u.id', 'p.assigned_to')
    .first(
      'p.*',
      'c.code as currency_code',
      'c.symbol as currency_symbol',
      db.raw("concat(u.first_name, ' ', u.last_name) as assigned_name"),
    );
  if (!proposal) throw new NotFoundError('Proposal');

  const items = await db('proposal_items')
    .where({ proposal_id: proposalId })
    .orderBy('sort_order');

  return { ...proposal, items };
}

/** Public endpoint — no auth, restricted fields */
export async function getProposalByHash(hash: string) {
  const proposal = await db('proposals')
    .where({ hash })
    .whereNull('deleted_at')
    .first(
      'id', 'subject', 'content', 'status', 'signature_status',
      'total', 'date', 'open_till', 'to_type', 'to_id', 'signed_at',
      'signed_by_name',
    );
  if (!proposal) throw new NotFoundError('Proposal');

  if (proposal.status === 'sent') {
    await db('proposals').where({ hash }).update({ status: 'viewed', viewed_at: db.fn.now() });
    proposal.status = 'viewed';
  }

  const recipient = await resolveRecipient(proposal.to_type, proposal.to_id);
  return { ...proposal, recipient };
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createProposal(
  tenantId: string,
  createdBy: string,
  input: CreateProposalInput,
) {
  const hash  = randomHex(32);
  const items = input.items ?? [];
  const taxMap = items.length ? await resolveTaxMap(tenantId, items) : {};

  const total = items.length
    ? calcTotal(items, Number(input.discount), input.discount_type ?? 'percent', Number(input.adjustment ?? 0), taxMap)
    : Number(input.total ?? 0);

  // Auto-populate recipient fields if not provided
  let recipientFields: Record<string, any> = {};
  if (!input.to_name && !input.to_email) {
    const recipient = await resolveRecipient(input.to_type, input.to_id);
    if (recipient) {
      recipientFields = {
        to_name:    recipient.name    ?? null,
        to_email:   recipient.email   ?? null,
        to_phone:   recipient.phone   ?? null,
        to_address: recipient.address ?? null,
        to_city:    recipient.city    ?? null,
        to_state:   recipient.state   ?? null,
        to_zip:     recipient.zip     ?? null,
        to_country: recipient.country ?? null,
      };
    }
  }

  const { items: _items, ...proposalFields } = input;

  return await db.transaction(async (trx) => {
    const [proposal] = await trx('proposals')
      .insert({
        tenant_id:  tenantId,
        created_by: createdBy,
        hash,
        ...proposalFields,
        ...recipientFields,
        total,
        date: input.date ?? new Date().toISOString().slice(0, 10),
      })
      .returning('*');

    if (items.length) {
      await saveItems(trx, proposal.id, tenantId, items);
    }

    return proposal;
  });
}

export async function updateProposal(
  tenantId: string,
  proposalId: string,
  input: UpdateProposalInput,
) {
  const proposal = await getProposal(tenantId, proposalId);
  if (proposal.status !== 'draft') {
    throw new BadRequestError('Only draft proposals can be edited');
  }

  const items  = input.items ?? [];
  const taxMap = items.length ? await resolveTaxMap(tenantId, items) : {};

  const total = items.length
    ? calcTotal(items, Number(input.discount ?? proposal.discount), input.discount_type ?? proposal.discount_type, Number(input.adjustment ?? proposal.adjustment), taxMap)
    : (input.total !== undefined ? Number(input.total) : proposal.total);

  const { items: _items, ...proposalFields } = input;

  return await db.transaction(async (trx) => {
    const [updated] = await trx('proposals')
      .where({ id: proposalId, tenant_id: tenantId })
      .update({ ...proposalFields, total, updated_at: db.fn.now() })
      .returning('*');

    if (input.items !== undefined) {
      await saveItems(trx, proposalId, tenantId, items);
    }

    return updated;
  });
}

export async function deleteProposal(tenantId: string, proposalId: string) {
  await getProposal(tenantId, proposalId);
  await db('proposals')
    .where({ id: proposalId, tenant_id: tenantId })
    .update({ deleted_at: db.fn.now() });
}

export async function sendProposal(
  tenantId: string,
  proposalId: string,
  senderName: string,
) {
  const proposal = await getProposal(tenantId, proposalId);

  // Use stored to_email or fall back to resolving from related record
  let email = proposal.to_email as string | null;
  let recipientName = proposal.to_name as string | null;

  if (!email) {
    const recipient = await resolveRecipient(proposal.to_type, proposal.to_id);
    email         = recipient?.email ?? null;
    recipientName = recipient?.name  ?? recipientName;
  }

  if (!email) {
    throw new BadRequestError('Recipient has no email address. Add one before sending.');
  }

  const publicUrl = `${config.APP_URL}/proposals/view/${proposal.hash}`;

  await sendProposalLink({
    to:               email,
    recipientName:    recipientName ?? 'there',
    proposalSubject:  proposal.subject,
    publicUrl,
    senderName,
    expiresOn: proposal.open_till
      ? new Date(proposal.open_till).toLocaleDateString('en-US', { dateStyle: 'long' })
      : null,
  });

  const [updated] = await db('proposals')
    .where({ id: proposalId })
    .update({ status: 'sent', sent_at: db.fn.now(), updated_at: db.fn.now() })
    .returning('*');

  return updated;
}

export async function signProposal(
  hash: string,
  input: SignProposalInput,
  signerIp: string,
) {
  const proposal = await db('proposals').where({ hash }).whereNull('deleted_at').first();
  if (!proposal) throw new NotFoundError('Proposal');

  if (proposal.signature_status === 'signed') {
    throw new BadRequestError('This proposal has already been signed');
  }

  if (proposal.open_till && new Date(proposal.open_till) < new Date()) {
    throw new BadRequestError('This proposal has expired');
  }

  const [updated] = await db('proposals')
    .where({ hash })
    .update({
      signature_status: 'signed',
      signed_at:        db.fn.now(),
      signed_by_name:   input.signer_name,
      signed_by_ip:     signerIp,
      signature_data:   input.signature_data,
      status:           'accepted',
      accepted_at:      db.fn.now(),
      updated_at:       db.fn.now(),
    })
    .returning(['id', 'subject', 'signed_at', 'signed_by_name', 'status']);

  return updated;
}
