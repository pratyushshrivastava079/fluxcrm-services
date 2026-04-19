import { db } from '../../core/config/database';
import { NotFoundError } from '../../core/utils/response';
import {
  CurrencyInput, TaxRateInput, PaymentModeInput,
  EmailTemplateInput, GeneralSettings,
} from './settings.schema';

// ── General Settings (key-value) ──────────────────────────────────────────────

export async function getGeneralSettings(tenantId: string): Promise<Record<string, string | null>> {
  const rows = await db('settings')
    .where({ tenant_id: tenantId, group_name: 'general' })
    .select('key', 'value');
  return Object.fromEntries(rows.map((r: { key: string; value: string | null }) => [r.key, r.value]));
}

export async function upsertGeneralSettings(tenantId: string, data: GeneralSettings) {
  const entries = Object.entries(data).map(([key, value]) => ({
    tenant_id:  tenantId,
    key,
    value:      value ?? null,
    group_name: 'general',
  }));

  if (entries.length === 0) return;

  await db('settings')
    .insert(entries)
    .onConflict(['tenant_id', 'key'])
    .merge(['value', 'updated_at']);
}

// ── Currencies ────────────────────────────────────────────────────────────────

export async function listCurrencies(tenantId: string) {
  return db('currencies')
    .where({ tenant_id: tenantId })
    .orderByRaw('is_default DESC, name ASC')
    .select('*');
}

export async function createCurrency(tenantId: string, input: CurrencyInput) {
  if (input.is_default) {
    await db('currencies').where({ tenant_id: tenantId }).update({ is_default: false });
  }
  const [row] = await db('currencies')
    .insert({ tenant_id: tenantId, ...input })
    .returning('*');
  return row;
}

export async function updateCurrency(tenantId: string, id: string, input: Partial<CurrencyInput>) {
  const existing = await db('currencies').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Currency');
  if (input.is_default) {
    await db('currencies').where({ tenant_id: tenantId }).update({ is_default: false });
  }
  const [row] = await db('currencies').where({ id }).update(input).returning('*');
  return row;
}

export async function deleteCurrency(tenantId: string, id: string) {
  const existing = await db('currencies').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Currency');
  if (existing.is_default) throw new Error('Cannot delete the default currency.');
  await db('currencies').where({ id }).delete();
}

// ── Tax Rates ─────────────────────────────────────────────────────────────────

export async function listTaxRates(tenantId: string) {
  return db('tax_rates')
    .where({ tenant_id: tenantId })
    .orderByRaw('is_default DESC, name ASC')
    .select('*');
}

export async function createTaxRate(tenantId: string, input: TaxRateInput) {
  if (input.is_default) {
    await db('tax_rates').where({ tenant_id: tenantId }).update({ is_default: false });
  }
  const [row] = await db('tax_rates')
    .insert({ tenant_id: tenantId, ...input })
    .returning('*');
  return row;
}

export async function updateTaxRate(tenantId: string, id: string, input: Partial<TaxRateInput>) {
  const existing = await db('tax_rates').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Tax rate');
  if (input.is_default) {
    await db('tax_rates').where({ tenant_id: tenantId }).update({ is_default: false });
  }
  const [row] = await db('tax_rates').where({ id }).update(input).returning('*');
  return row;
}

export async function deleteTaxRate(tenantId: string, id: string) {
  const existing = await db('tax_rates').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Tax rate');
  await db('tax_rates').where({ id }).delete();
}

// ── Payment Modes ─────────────────────────────────────────────────────────────

export async function listPaymentModes(tenantId: string) {
  return db('payment_modes')
    .where({ tenant_id: tenantId })
    .orderBy('name')
    .select('*');
}

export async function createPaymentMode(tenantId: string, input: PaymentModeInput) {
  const [row] = await db('payment_modes')
    .insert({ tenant_id: tenantId, ...input })
    .returning('*');
  return row;
}

export async function updatePaymentMode(tenantId: string, id: string, input: Partial<PaymentModeInput>) {
  const existing = await db('payment_modes').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Payment mode');
  const [row] = await db('payment_modes').where({ id }).update(input).returning('*');
  return row;
}

export async function deletePaymentMode(tenantId: string, id: string) {
  const existing = await db('payment_modes').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Payment mode');
  await db('payment_modes').where({ id }).delete();
}

// ── Email Templates ───────────────────────────────────────────────────────────

export async function listEmailTemplates(tenantId: string) {
  return db('email_templates')
    .where({ tenant_id: tenantId })
    .orderBy('event_key')
    .select('*');
}

export async function getEmailTemplate(tenantId: string, id: string) {
  const row = await db('email_templates').where({ id, tenant_id: tenantId }).first();
  if (!row) throw new NotFoundError('Email template');
  return row;
}

export async function upsertEmailTemplate(tenantId: string, input: EmailTemplateInput, modifiedBy?: string) {
  const existing = await db('email_templates')
    .where({ tenant_id: tenantId, event_key: input.event_key, language: input.language ?? 'en' })
    .first();

  if (existing) {
    const [row] = await db('email_templates')
      .where({ id: existing.id })
      .update({ ...input, last_modified_by: modifiedBy ?? null })
      .returning('*');
    return row;
  }

  const [row] = await db('email_templates')
    .insert({ tenant_id: tenantId, ...input, last_modified_by: modifiedBy ?? null })
    .returning('*');
  return row;
}

export async function updateEmailTemplate(
  tenantId: string, id: string,
  input: Partial<EmailTemplateInput>, modifiedBy?: string,
) {
  const existing = await db('email_templates').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Email template');
  const [row] = await db('email_templates')
    .where({ id })
    .update({ ...input, last_modified_by: modifiedBy ?? null })
    .returning('*');
  return row;
}

export async function deleteEmailTemplate(tenantId: string, id: string) {
  const existing = await db('email_templates').where({ id, tenant_id: tenantId }).first();
  if (!existing) throw new NotFoundError('Email template');
  await db('email_templates').where({ id }).delete();
}
