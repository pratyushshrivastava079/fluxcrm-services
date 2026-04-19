import { Knex } from 'knex';
import bcrypt from 'bcryptjs';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const ROLE_IDS = {
  admin: '00000000-0000-0000-0000-000000000010',
  staff: '00000000-0000-0000-0000-000000000011',
} as const;

const USER_IDS = {
  admin: '00000000-0000-0000-0000-000000000100',
  sales: '00000000-0000-0000-0000-000000000101',
  support: '00000000-0000-0000-0000-000000000102',
} as const;

const CURRENCY_IDS = {
  usd: '00000000-0000-0000-0000-000000000201',
  eur: '00000000-0000-0000-0000-000000000202',
  gbp: '00000000-0000-0000-0000-000000000203',
} as const;

const TAX_IDS = {
  vat10: '00000000-0000-0000-0000-000000000211',
  gst18: '00000000-0000-0000-0000-000000000212',
} as const;

const PAYMENT_MODE_IDS = {
  bank: '00000000-0000-0000-0000-000000000221',
  card: '00000000-0000-0000-0000-000000000222',
  cash: '00000000-0000-0000-0000-000000000223',
} as const;

const LEAD_SOURCE_IDS = {
  website: '00000000-0000-0000-0000-000000000301',
  referral: '00000000-0000-0000-0000-000000000302',
  linkedin: '00000000-0000-0000-0000-000000000303',
  event: '00000000-0000-0000-0000-000000000304',
} as const;

const LEAD_STATUS_IDS = {
  new: '00000000-0000-0000-0000-000000000311',
  contacted: '00000000-0000-0000-0000-000000000312',
  qualified: '00000000-0000-0000-0000-000000000313',
  proposal: '00000000-0000-0000-0000-000000000314',
  won: '00000000-0000-0000-0000-000000000315',
  lost: '00000000-0000-0000-0000-000000000316',
} as const;

const TASK_STATUS_IDS = {
  todo: '00000000-0000-0000-0000-000000000321',
  progress: '00000000-0000-0000-0000-000000000322',
  testing: '00000000-0000-0000-0000-000000000323',
  done: '00000000-0000-0000-0000-000000000324',
} as const;

const TICKET_STATUS_IDS = {
  open: '00000000-0000-0000-0000-000000000331',
  progress: '00000000-0000-0000-0000-000000000332',
  waiting: '00000000-0000-0000-0000-000000000333',
  closed: '00000000-0000-0000-0000-000000000334',
} as const;

const TICKET_PRIORITY_IDS = {
  low: '00000000-0000-0000-0000-000000000341',
  medium: '00000000-0000-0000-0000-000000000342',
  high: '00000000-0000-0000-0000-000000000343',
} as const;

const DEPARTMENT_IDS = {
  support: '00000000-0000-0000-0000-000000000351',
  billing: '00000000-0000-0000-0000-000000000352',
} as const;

const SERVICE_IDS = {
  onboarding: '00000000-0000-0000-0000-000000000361',
  hosting: '00000000-0000-0000-0000-000000000362',
} as const;

const CUSTOMER_IDS = {
  northstar: '00000000-0000-0000-0000-000000000401',
  apex: '00000000-0000-0000-0000-000000000402',
  bluewave: '00000000-0000-0000-0000-000000000403',
  greenline: '00000000-0000-0000-0000-000000000404',
} as const;

const CONTACT_IDS = {
  northstarPri: '00000000-0000-0000-0000-000000000411',
  northstarOps: '00000000-0000-0000-0000-000000000412',
  apexPri: '00000000-0000-0000-0000-000000000413',
  bluewavePri: '00000000-0000-0000-0000-000000000414',
  bluewaveFin: '00000000-0000-0000-0000-000000000415',
  greenlinePri: '00000000-0000-0000-0000-000000000416',
} as const;

const LEAD_IDS = {
  ava: '00000000-0000-0000-0000-000000000501',
  ethan: '00000000-0000-0000-0000-000000000502',
  mia: '00000000-0000-0000-0000-000000000503',
  noah: '00000000-0000-0000-0000-000000000504',
  sophia: '00000000-0000-0000-0000-000000000505',
  liam: '00000000-0000-0000-0000-000000000506',
  olivia: '00000000-0000-0000-0000-000000000507',
  charlotte: '00000000-0000-0000-0000-000000000508',
} as const;

const PROJECT_IDS = {
  website: '00000000-0000-0000-0000-000000000601',
  onboarding: '00000000-0000-0000-0000-000000000602',
  cleanup: '00000000-0000-0000-0000-000000000603',
} as const;

const TASK_IDS = {
  sitemap: '00000000-0000-0000-0000-000000000611',
  homepage: '00000000-0000-0000-0000-000000000612',
  qa: '00000000-0000-0000-0000-000000000613',
  import: '00000000-0000-0000-0000-000000000614',
  playbook: '00000000-0000-0000-0000-000000000615',
  analytics: '00000000-0000-0000-0000-000000000616',
} as const;

const TIMESHEET_IDS = {
  one: '00000000-0000-0000-0000-000000000621',
  two: '00000000-0000-0000-0000-000000000622',
  three: '00000000-0000-0000-0000-000000000623',
  four: '00000000-0000-0000-0000-000000000624',
  five: '00000000-0000-0000-0000-000000000625',
} as const;

const INVOICE_IDS = {
  draft: '00000000-0000-0000-0000-000000000701',
  unpaid: '00000000-0000-0000-0000-000000000702',
  partial: '00000000-0000-0000-0000-000000000703',
  paid: '00000000-0000-0000-0000-000000000704',
  overdue: '00000000-0000-0000-0000-000000000705',
} as const;

const TICKET_IDS = {
  hosting: '00000000-0000-0000-0000-000000000801',
  billing: '00000000-0000-0000-0000-000000000802',
  analytics: '00000000-0000-0000-0000-000000000803',
  portal: '00000000-0000-0000-0000-000000000804',
} as const;

const CONTRACT_IDS = {
  bluewave: '00000000-0000-0000-0000-000000000901',
  northstar: '00000000-0000-0000-0000-000000000902',
} as const;

const GOAL_IDS = {
  revenue: '00000000-0000-0000-0000-000000001001',
  customers: '00000000-0000-0000-0000-000000001002',
  manual: '00000000-0000-0000-0000-000000001003',
} as const;

function daysFromToday(offset: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function timestampDaysFromNow(offset: number, hour = 10): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

async function upsertById(knex: Knex, table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  await knex(table).insert(rows).onConflict('id').merge();
}

async function upsertComposite(
  knex: Knex,
  table: string,
  conflictColumns: string[],
  rows: Record<string, unknown>[],
) {
  if (!rows.length) return;
  await knex(table).insert(rows).onConflict(conflictColumns).ignore();
}

export async function seed(knex: Knex): Promise<void> {
  const passwordHash = await bcrypt.hash('Admin@123!', 12);
  const goalsTableExists = await knex.schema.hasTable('goals');

  await knex('tenants')
    .insert({
      id: TENANT_ID,
      name: 'Performex Demo',
      slug: 'demo',
      plan: 'professional',
      is_active: true,
    })
    .onConflict('id')
    .merge();

  await knex.transaction(async (trx) => {
    if (goalsTableExists) {
      await trx('goals').where({ tenant_id: TENANT_ID }).delete();
    }

    await trx('payments').where({ tenant_id: TENANT_ID }).delete();
    await trx('invoices').where({ tenant_id: TENANT_ID }).delete();
    await trx('estimates').where({ tenant_id: TENANT_ID }).delete();
    await trx('proposals').where({ tenant_id: TENANT_ID }).delete();
    await trx('contracts').where({ tenant_id: TENANT_ID }).delete();
    await trx('tickets').where({ tenant_id: TENANT_ID }).delete();
    await trx('timesheets').where({ tenant_id: TENANT_ID }).delete();
    await trx('tasks').where({ tenant_id: TENANT_ID }).delete();
    await trx('projects').where({ tenant_id: TENANT_ID }).delete();
    await trx('leads').where({ tenant_id: TENANT_ID }).delete();
    await trx('customers').where({ tenant_id: TENANT_ID }).delete();
    await trx('departments').where({ tenant_id: TENANT_ID }).delete();
    await trx('ticket_services').where({ tenant_id: TENANT_ID }).delete();
    await trx('ticket_priorities').where({ tenant_id: TENANT_ID }).delete();
    await trx('ticket_statuses').where({ tenant_id: TENANT_ID }).delete();
    await trx('task_statuses').where({ tenant_id: TENANT_ID }).delete();
    await trx('lead_statuses').where({ tenant_id: TENANT_ID }).delete();
    await trx('lead_sources').where({ tenant_id: TENANT_ID }).delete();
    await trx('payment_modes').where({ tenant_id: TENANT_ID }).delete();
    await trx('tax_rates').where({ tenant_id: TENANT_ID }).delete();
    await trx('currencies').where({ tenant_id: TENANT_ID }).delete();
    await trx('sessions').where({ tenant_id: TENANT_ID }).delete();

    await trx('password_reset_tokens')
      .whereIn('user_id', trx('users').where({ tenant_id: TENANT_ID }).select('id'))
      .delete();

    await trx('user_roles')
      .whereIn('user_id', trx('users').where({ tenant_id: TENANT_ID }).select('id'))
      .delete();

    await trx('role_permissions')
      .whereIn('role_id', trx('roles').where({ tenant_id: TENANT_ID }).select('id'))
      .delete();

    await trx('users').where({ tenant_id: TENANT_ID }).delete();
    await trx('roles').where({ tenant_id: TENANT_ID }).delete();
  });

  await upsertById(knex, 'roles', [
    {
      id: ROLE_IDS.admin,
      tenant_id: TENANT_ID,
      name: 'Admin',
      description: 'Full access to all modules',
      is_system: true,
      is_default: false,
    },
    {
      id: ROLE_IDS.staff,
      tenant_id: TENANT_ID,
      name: 'Staff',
      description: 'Standard staff access',
      is_system: true,
      is_default: true,
    },
  ]);

  const permissions = await knex('permissions').select('id', 'module', 'action');
  await upsertComposite(
    knex,
    'role_permissions',
    ['role_id', 'permission_id'],
    permissions.map((permission) => ({
      role_id: ROLE_IDS.admin,
      permission_id: permission.id,
    })),
  );

  const staffModules = [
    'leads', 'customers', 'contacts', 'invoices', 'estimates', 'projects',
    'tasks', 'timesheets', 'tickets', 'contracts', 'kb', 'reports', 'goals',
  ];
  const staffActions = ['view', 'create', 'edit', 'reply'];
  await upsertComposite(
    knex,
    'role_permissions',
    ['role_id', 'permission_id'],
    permissions
      .filter((permission) => staffModules.includes(permission.module) && staffActions.includes(permission.action))
      .map((permission) => ({
        role_id: ROLE_IDS.staff,
        permission_id: permission.id,
      })),
  );

  await upsertById(knex, 'users', [
    {
      id: USER_IDS.admin,
      tenant_id: TENANT_ID,
      email: 'admin@performex.local',
      password_hash: passwordHash,
      first_name: 'Admin',
      last_name: 'User',
      is_admin: true,
      status: 'active',
      email_verified_at: knex.fn.now(),
      phone: '+1 555-0100',
      job_title: 'Operations Director',
      timezone: 'Asia/Calcutta',
    },
    {
      id: USER_IDS.sales,
      tenant_id: TENANT_ID,
      email: 'jane@performex.local',
      password_hash: passwordHash,
      first_name: 'Jane',
      last_name: 'Mercer',
      is_admin: false,
      status: 'active',
      email_verified_at: knex.fn.now(),
      phone: '+1 555-0101',
      job_title: 'Sales Manager',
      timezone: 'Asia/Calcutta',
    },
    {
      id: USER_IDS.support,
      tenant_id: TENANT_ID,
      email: 'ryan@performex.local',
      password_hash: passwordHash,
      first_name: 'Ryan',
      last_name: 'Patel',
      is_admin: false,
      status: 'active',
      email_verified_at: knex.fn.now(),
      phone: '+1 555-0102',
      job_title: 'Support Lead',
      timezone: 'Asia/Calcutta',
    },
  ]);

  await upsertComposite(knex, 'user_roles', ['user_id', 'role_id'], [
    { user_id: USER_IDS.admin, role_id: ROLE_IDS.admin, assigned_by: USER_IDS.admin },
    { user_id: USER_IDS.sales, role_id: ROLE_IDS.staff, assigned_by: USER_IDS.admin },
    { user_id: USER_IDS.support, role_id: ROLE_IDS.staff, assigned_by: USER_IDS.admin },
  ]);

  await upsertById(knex, 'currencies', [
    { id: CURRENCY_IDS.usd, tenant_id: TENANT_ID, code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 1, is_default: true },
    { id: CURRENCY_IDS.eur, tenant_id: TENANT_ID, code: 'EUR', name: 'Euro', symbol: 'EUR', exchange_rate: 0.92, is_default: false },
    { id: CURRENCY_IDS.gbp, tenant_id: TENANT_ID, code: 'GBP', name: 'British Pound', symbol: 'GBP', exchange_rate: 0.79, is_default: false },
  ]);

  await upsertById(knex, 'tax_rates', [
    { id: TAX_IDS.vat10, tenant_id: TENANT_ID, name: 'VAT 10%', rate: 10, is_default: true, is_compound: false },
    { id: TAX_IDS.gst18, tenant_id: TENANT_ID, name: 'GST 18%', rate: 18, is_default: false, is_compound: false },
  ]);

  await upsertById(knex, 'payment_modes', [
    { id: PAYMENT_MODE_IDS.bank, tenant_id: TENANT_ID, name: 'Bank Transfer', description: 'ACH and wire payments', is_active: true },
    { id: PAYMENT_MODE_IDS.card, tenant_id: TENANT_ID, name: 'Credit Card', description: 'Online card payments', is_active: true },
    { id: PAYMENT_MODE_IDS.cash, tenant_id: TENANT_ID, name: 'Cash', description: 'Manual cash collection', is_active: true },
  ]);

  await upsertById(knex, 'lead_sources', [
    { id: LEAD_SOURCE_IDS.website, tenant_id: TENANT_ID, name: 'Website' },
    { id: LEAD_SOURCE_IDS.referral, tenant_id: TENANT_ID, name: 'Referral' },
    { id: LEAD_SOURCE_IDS.linkedin, tenant_id: TENANT_ID, name: 'LinkedIn' },
    { id: LEAD_SOURCE_IDS.event, tenant_id: TENANT_ID, name: 'Industry Event' },
  ]);

  await upsertById(knex, 'lead_statuses', [
    { id: LEAD_STATUS_IDS.new, tenant_id: TENANT_ID, name: 'New', color: '#6366f1', sort_order: 1, is_default: true, is_won: false, is_lost: false },
    { id: LEAD_STATUS_IDS.contacted, tenant_id: TENANT_ID, name: 'Contacted', color: '#3b82f6', sort_order: 2, is_default: false, is_won: false, is_lost: false },
    { id: LEAD_STATUS_IDS.qualified, tenant_id: TENANT_ID, name: 'Qualified', color: '#f59e0b', sort_order: 3, is_default: false, is_won: false, is_lost: false },
    { id: LEAD_STATUS_IDS.proposal, tenant_id: TENANT_ID, name: 'Proposal', color: '#8b5cf6', sort_order: 4, is_default: false, is_won: false, is_lost: false },
    { id: LEAD_STATUS_IDS.won, tenant_id: TENANT_ID, name: 'Won', color: '#22c55e', sort_order: 5, is_default: false, is_won: true, is_lost: false },
    { id: LEAD_STATUS_IDS.lost, tenant_id: TENANT_ID, name: 'Lost', color: '#ef4444', sort_order: 6, is_default: false, is_won: false, is_lost: true },
  ]);

  await upsertById(knex, 'task_statuses', [
    { id: TASK_STATUS_IDS.todo, tenant_id: TENANT_ID, name: 'Not Started', color: '#94a3b8', sort_order: 1, is_default: true, is_closed: false },
    { id: TASK_STATUS_IDS.progress, tenant_id: TENANT_ID, name: 'In Progress', color: '#3b82f6', sort_order: 2, is_default: false, is_closed: false },
    { id: TASK_STATUS_IDS.testing, tenant_id: TENANT_ID, name: 'Testing', color: '#f59e0b', sort_order: 3, is_default: false, is_closed: false },
    { id: TASK_STATUS_IDS.done, tenant_id: TENANT_ID, name: 'Complete', color: '#22c55e', sort_order: 4, is_default: false, is_closed: true },
  ]);

  await upsertById(knex, 'departments', [
    {
      id: DEPARTMENT_IDS.support,
      tenant_id: TENANT_ID,
      name: 'Customer Success',
      email: 'support@performex.local',
      email_pipe_enabled: false,
      hide_from_client: false,
      notify_staff_ids: [USER_IDS.support],
    },
    {
      id: DEPARTMENT_IDS.billing,
      tenant_id: TENANT_ID,
      name: 'Billing',
      email: 'billing@performex.local',
      email_pipe_enabled: false,
      hide_from_client: false,
      notify_staff_ids: [USER_IDS.admin],
    },
  ]);

  await upsertById(knex, 'ticket_services', [
    { id: SERVICE_IDS.onboarding, tenant_id: TENANT_ID, name: 'Onboarding' },
    { id: SERVICE_IDS.hosting, tenant_id: TENANT_ID, name: 'Managed Hosting' },
  ]);

  await upsertById(knex, 'ticket_statuses', [
    { id: TICKET_STATUS_IDS.open, tenant_id: TENANT_ID, name: 'Open', color: '#3b82f6', is_default: true, is_closed: false, sort_order: 1 },
    { id: TICKET_STATUS_IDS.progress, tenant_id: TENANT_ID, name: 'In Progress', color: '#f59e0b', is_default: false, is_closed: false, sort_order: 2 },
    { id: TICKET_STATUS_IDS.waiting, tenant_id: TENANT_ID, name: 'Waiting Reply', color: '#8b5cf6', is_default: false, is_closed: false, sort_order: 3 },
    { id: TICKET_STATUS_IDS.closed, tenant_id: TENANT_ID, name: 'Closed', color: '#94a3b8', is_default: false, is_closed: true, sort_order: 4 },
  ]);

  await upsertById(knex, 'ticket_priorities', [
    { id: TICKET_PRIORITY_IDS.low, tenant_id: TENANT_ID, name: 'Low', color: '#94a3b8', sort_order: 1 },
    { id: TICKET_PRIORITY_IDS.medium, tenant_id: TENANT_ID, name: 'Medium', color: '#f59e0b', sort_order: 2 },
    { id: TICKET_PRIORITY_IDS.high, tenant_id: TENANT_ID, name: 'High', color: '#ef4444', sort_order: 3 },
  ]);

  await upsertById(knex, 'customers', [
    {
      id: CUSTOMER_IDS.northstar,
      tenant_id: TENANT_ID,
      company_name: 'Northstar Fitness',
      website: 'https://northstarfitness.example',
      phone: '+1 212 555 1020',
      address_line1: '480 Madison Ave',
      city: 'New York',
      state: 'NY',
      zip: '10022',
      country: 'US',
      default_currency: 'USD',
      default_language: 'en',
      assigned_to: USER_IDS.sales,
      is_active: true,
      portal_allowed: true,
      notes: 'Multi-location gym chain expanding into digital memberships.',
      custom_fields: { segment: 'Enterprise', health_score: 'Green' },
    },
    {
      id: CUSTOMER_IDS.apex,
      tenant_id: TENANT_ID,
      company_name: 'Apex Wellness',
      website: 'https://apexwellness.example',
      phone: '+1 646 555 0132',
      address_line1: '18 Hudson Yards',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
      default_currency: 'USD',
      default_language: 'en',
      assigned_to: USER_IDS.sales,
      converted_from_lead: LEAD_IDS.ava,
      is_active: true,
      portal_allowed: true,
      notes: 'Converted from pipeline after fast-tracked website redesign proposal.',
      custom_fields: { segment: 'Mid-market', renewal_month: 'September' },
    },
    {
      id: CUSTOMER_IDS.bluewave,
      tenant_id: TENANT_ID,
      company_name: 'Bluewave Digital',
      website: 'https://bluewavedigital.example',
      phone: '+44 20 7946 0812',
      address_line1: '14 Bishopsgate',
      city: 'London',
      state: 'London',
      zip: 'EC2N 4BQ',
      country: 'GB',
      default_currency: 'GBP',
      default_language: 'en',
      assigned_to: USER_IDS.admin,
      is_active: true,
      portal_allowed: true,
      notes: 'Agency account with active retainer and frequent support work.',
      custom_fields: { segment: 'Agency', account_tier: 'Gold' },
    },
    {
      id: CUSTOMER_IDS.greenline,
      tenant_id: TENANT_ID,
      company_name: 'Greenline Solar',
      website: 'https://greenlinesolar.example',
      phone: '+49 30 555 880',
      address_line1: 'Potsdamer Platz 2',
      city: 'Berlin',
      state: 'Berlin',
      zip: '10785',
      country: 'DE',
      default_currency: 'EUR',
      default_language: 'en',
      assigned_to: USER_IDS.sales,
      is_active: true,
      portal_allowed: true,
      notes: 'Expansion account for regional rollout dashboards.',
      custom_fields: { segment: 'SMB', partner_channel: 'Referral' },
    },
  ]);

  await upsertById(knex, 'contacts', [
    {
      id: CONTACT_IDS.northstarPri,
      tenant_id: TENANT_ID,
      customer_id: CUSTOMER_IDS.northstar,
      first_name: 'Maya',
      last_name: 'Turner',
      email: 'maya.turner@northstarfitness.example',
      phone: '+1 212 555 1021',
      mobile: '+1 917 555 1021',
      job_title: 'Director of Marketing',
      department: 'Marketing',
      is_primary: true,
      send_invoices: true,
      send_estimates: true,
      send_contracts: true,
      send_projects: true,
      custom_fields: { persona: 'Champion' },
    },
    {
      id: CONTACT_IDS.northstarOps,
      tenant_id: TENANT_ID,
      customer_id: CUSTOMER_IDS.northstar,
      first_name: 'Chris',
      last_name: 'Ramos',
      email: 'chris.ramos@northstarfitness.example',
      phone: '+1 212 555 1022',
      job_title: 'Operations Manager',
      department: 'Operations',
      is_primary: false,
      send_projects: true,
      custom_fields: { persona: 'Power user' },
    },
    {
      id: CONTACT_IDS.apexPri,
      tenant_id: TENANT_ID,
      customer_id: CUSTOMER_IDS.apex,
      first_name: 'Ava',
      last_name: 'Collins',
      email: 'ava@apexwellness.example',
      phone: '+1 646 555 0133',
      job_title: 'Founder',
      department: 'Leadership',
      is_primary: true,
      send_invoices: true,
      send_estimates: true,
      send_contracts: true,
      send_projects: true,
      custom_fields: { persona: 'Decision maker' },
    },
    {
      id: CONTACT_IDS.bluewavePri,
      tenant_id: TENANT_ID,
      customer_id: CUSTOMER_IDS.bluewave,
      first_name: 'Oliver',
      last_name: 'Grant',
      email: 'oliver.grant@bluewavedigital.example',
      phone: '+44 20 7946 0813',
      job_title: 'Managing Partner',
      department: 'Leadership',
      is_primary: true,
      send_invoices: true,
      send_contracts: true,
      send_projects: true,
      custom_fields: { persona: 'Executive sponsor' },
    },
    {
      id: CONTACT_IDS.bluewaveFin,
      tenant_id: TENANT_ID,
      customer_id: CUSTOMER_IDS.bluewave,
      first_name: 'Emma',
      last_name: 'Price',
      email: 'emma.price@bluewavedigital.example',
      phone: '+44 20 7946 0814',
      job_title: 'Finance Controller',
      department: 'Finance',
      is_primary: false,
      send_invoices: true,
      custom_fields: { persona: 'Billing contact' },
    },
    {
      id: CONTACT_IDS.greenlinePri,
      tenant_id: TENANT_ID,
      customer_id: CUSTOMER_IDS.greenline,
      first_name: 'Lena',
      last_name: 'Voss',
      email: 'lena.voss@greenlinesolar.example',
      phone: '+49 30 555 881',
      job_title: 'Head of Growth',
      department: 'Growth',
      is_primary: true,
      send_invoices: true,
      send_estimates: true,
      send_projects: true,
      custom_fields: { persona: 'Expansion lead' },
    },
  ]);

  await upsertById(knex, 'leads', [
    {
      id: LEAD_IDS.ava,
      tenant_id: TENANT_ID,
      status_id: LEAD_STATUS_IDS.won,
      source_id: LEAD_SOURCE_IDS.website,
      assigned_to: USER_IDS.sales,
      first_name: 'Ava',
      last_name: 'Collins',
      company: 'Apex Wellness',
      email: 'ava@apexwellness.example',
      phone: '+1 646 555 0133',
      website: 'https://apexwellness.example',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
      value: 18000,
      currency: 'USD',
      description: 'Requested a launch-ready marketing site and CRM handoff.',
      flag: 'converted',
      kanban_position: 0,
      converted_at: timestampDaysFromNow(-18, 11),
      converted_to_customer_id: CUSTOMER_IDS.apex,
      last_contact_at: timestampDaysFromNow(-19, 16),
      created_at: timestampDaysFromNow(-24, 10),
      updated_at: timestampDaysFromNow(-18, 11),
    },
    {
      id: LEAD_IDS.ethan,
      tenant_id: TENANT_ID,
      status_id: LEAD_STATUS_IDS.new,
      source_id: LEAD_SOURCE_IDS.linkedin,
      assigned_to: USER_IDS.sales,
      first_name: 'Ethan',
      last_name: 'Brooks',
      company: 'Pulse Lab',
      email: 'ethan@pulselab.example',
      phone: '+1 415 555 2201',
      website: 'https://pulselab.example',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'US',
      value: 7200,
      currency: 'USD',
      description: 'Exploring CRM migration and quick-start setup.',
      flag: 'open',
      kanban_position: 0,
      last_contact_at: timestampDaysFromNow(-2, 12),
      created_at: timestampDaysFromNow(-3, 9),
      updated_at: timestampDaysFromNow(-2, 12),
    },
    {
      id: LEAD_IDS.mia,
      tenant_id: TENANT_ID,
      status_id: LEAD_STATUS_IDS.contacted,
      source_id: LEAD_SOURCE_IDS.referral,
      assigned_to: USER_IDS.sales,
      first_name: 'Mia',
      last_name: 'Chen',
      company: 'Harbor Health',
      email: 'mia@harborhealth.example',
      phone: '+1 206 555 9142',
      website: 'https://harborhealth.example',
      city: 'Seattle',
      state: 'WA',
      zip: '98101',
      country: 'US',
      value: 11000,
      currency: 'USD',
      description: 'Warm referral looking for invoicing plus light project management.',
      flag: 'open',
      kanban_position: 0,
      last_contact_at: timestampDaysFromNow(-5, 15),
      created_at: timestampDaysFromNow(-8, 10),
      updated_at: timestampDaysFromNow(-5, 15),
    },
    {
      id: LEAD_IDS.noah,
      tenant_id: TENANT_ID,
      status_id: LEAD_STATUS_IDS.qualified,
      source_id: LEAD_SOURCE_IDS.website,
      assigned_to: USER_IDS.sales,
      first_name: 'Noah',
      last_name: 'Diaz',
      company: 'Vista Clinics',
      email: 'noah@vistaclinics.example',
      phone: '+1 305 555 3009',
      website: 'https://vistaclinics.example',
      city: 'Miami',
      state: 'FL',
      zip: '33131',
      country: 'US',
      value: 24500,
      currency: 'USD',
      description: 'Enterprise buying committee requested a security questionnaire.',
      flag: 'open',
      kanban_position: 0,
      last_contact_at: timestampDaysFromNow(-6, 14),
      created_at: timestampDaysFromNow(-10, 11),
      updated_at: timestampDaysFromNow(-6, 14),
    },
    {
      id: LEAD_IDS.sophia,
      tenant_id: TENANT_ID,
      status_id: LEAD_STATUS_IDS.proposal,
      source_id: LEAD_SOURCE_IDS.event,
      assigned_to: USER_IDS.sales,
      first_name: 'Sophia',
      last_name: 'Nguyen',
      company: 'Luma Pilates',
      email: 'sophia@lumapilates.example',
      phone: '+1 312 555 6117',
      website: 'https://lumapilates.example',
      city: 'Chicago',
      state: 'IL',
      zip: '60601',
      country: 'US',
      value: 9800,
      currency: 'USD',
      description: 'Proposal sent for launch package plus 90-day support.',
      flag: 'open',
      kanban_position: 0,
      last_contact_at: timestampDaysFromNow(-1, 17),
      created_at: timestampDaysFromNow(-12, 10),
      updated_at: timestampDaysFromNow(-1, 17),
    },
    {
      id: LEAD_IDS.liam,
      tenant_id: TENANT_ID,
      status_id: LEAD_STATUS_IDS.new,
      source_id: LEAD_SOURCE_IDS.website,
      assigned_to: USER_IDS.sales,
      first_name: 'Liam',
      last_name: 'Scott',
      company: 'Forge Nutrition',
      email: 'liam@forgenutrition.example',
      phone: '+1 617 555 3307',
      website: 'https://forgenutrition.example',
      city: 'Boston',
      state: 'MA',
      zip: '02110',
      country: 'US',
      value: 5600,
      currency: 'USD',
      description: 'Needs a simpler CRM and recurring invoice workflow.',
      flag: 'open',
      kanban_position: 1,
      last_contact_at: timestampDaysFromNow(-1, 9),
      created_at: timestampDaysFromNow(-2, 8),
      updated_at: timestampDaysFromNow(-1, 9),
    },
    {
      id: LEAD_IDS.olivia,
      tenant_id: TENANT_ID,
      status_id: LEAD_STATUS_IDS.proposal,
      source_id: LEAD_SOURCE_IDS.referral,
      assigned_to: USER_IDS.sales,
      first_name: 'Olivia',
      last_name: 'Reed',
      company: 'Summit Therapy',
      email: 'olivia@summittherapy.example',
      phone: '+1 720 555 4410',
      website: 'https://summittherapy.example',
      city: 'Denver',
      state: 'CO',
      zip: '80202',
      country: 'US',
      value: 14200,
      currency: 'USD',
      description: 'Waiting on final stakeholder sign-off after live demo.',
      flag: 'open',
      kanban_position: 1,
      last_contact_at: timestampDaysFromNow(-4, 13),
      created_at: timestampDaysFromNow(-15, 10),
      updated_at: timestampDaysFromNow(-4, 13),
    },
    {
      id: LEAD_IDS.charlotte,
      tenant_id: TENANT_ID,
      status_id: LEAD_STATUS_IDS.lost,
      source_id: LEAD_SOURCE_IDS.linkedin,
      assigned_to: USER_IDS.sales,
      first_name: 'Charlotte',
      last_name: 'Hayes',
      company: 'Peak Mobility',
      email: 'charlotte@peakmobility.example',
      phone: '+1 503 555 7711',
      website: 'https://peakmobility.example',
      city: 'Portland',
      state: 'OR',
      zip: '97204',
      country: 'US',
      value: 6500,
      currency: 'USD',
      description: 'Paused until next quarter after budget freeze.',
      flag: 'lost',
      kanban_position: 0,
      last_contact_at: timestampDaysFromNow(-9, 16),
      created_at: timestampDaysFromNow(-20, 10),
      updated_at: timestampDaysFromNow(-9, 16),
    },
  ]);

  await upsertById(knex, 'lead_activities', [
    {
      id: '00000000-0000-0000-0000-000000000521',
      tenant_id: TENANT_ID,
      lead_id: LEAD_IDS.sophia,
      user_id: USER_IDS.sales,
      type: 'email',
      subject: 'Proposal follow-up sent',
      description: 'Shared revised scope with optional maintenance plan.',
      completed_at: timestampDaysFromNow(-1, 17),
      created_at: timestampDaysFromNow(-1, 17),
    },
    {
      id: '00000000-0000-0000-0000-000000000522',
      tenant_id: TENANT_ID,
      lead_id: LEAD_IDS.noah,
      user_id: USER_IDS.sales,
      type: 'meeting',
      subject: 'Security review call',
      description: 'Walked through hosting, backups, and audit logs.',
      completed_at: timestampDaysFromNow(-6, 14),
      created_at: timestampDaysFromNow(-6, 14),
    },
    {
      id: '00000000-0000-0000-0000-000000000523',
      tenant_id: TENANT_ID,
      lead_id: LEAD_IDS.ava,
      user_id: USER_IDS.sales,
      type: 'system',
      subject: 'Lead converted to customer',
      description: 'Converted to customer: Apex Wellness',
      completed_at: timestampDaysFromNow(-18, 11),
      created_at: timestampDaysFromNow(-18, 11),
    },
  ]);

  await upsertById(knex, 'projects', [
    {
      id: PROJECT_IDS.website,
      tenant_id: TENANT_ID,
      name: 'Northstar Website Revamp',
      description: 'Position Northstar as a premium hybrid fitness brand and connect lead capture to CRM.',
      customer_id: CUSTOMER_IDS.northstar,
      billing_type: 'fixed_cost',
      fixed_rate: 24000,
      currency_id: CURRENCY_IDS.usd,
      status: 'in_progress',
      start_date: daysFromToday(-21),
      deadline: daysFromToday(18),
      estimated_hours: 160,
      budget_amount: 24000,
      is_pinned: true,
      allow_client_view: true,
      members_see_all_tasks: true,
      color: '#0f766e',
    },
    {
      id: PROJECT_IDS.onboarding,
      tenant_id: TENANT_ID,
      name: 'Bluewave Client Onboarding Sprint',
      description: 'Import legacy customers, tighten permissions, and train account leads.',
      customer_id: CUSTOMER_IDS.bluewave,
      billing_type: 'project_hours',
      hourly_rate: 145,
      currency_id: CURRENCY_IDS.gbp,
      status: 'in_progress',
      start_date: daysFromToday(-14),
      deadline: daysFromToday(9),
      estimated_hours: 96,
      budget_amount: 13920,
      is_pinned: false,
      allow_client_view: true,
      members_see_all_tasks: true,
      color: '#1d4ed8',
    },
    {
      id: PROJECT_IDS.cleanup,
      tenant_id: TENANT_ID,
      name: 'Greenline Analytics Cleanup',
      description: 'Historical dashboard cleanup and UTM normalization work.',
      customer_id: CUSTOMER_IDS.greenline,
      billing_type: 'fixed_cost',
      fixed_rate: 6800,
      currency_id: CURRENCY_IDS.eur,
      status: 'finished',
      start_date: daysFromToday(-32),
      deadline: daysFromToday(-4),
      estimated_hours: 42,
      budget_amount: 6800,
      is_pinned: false,
      allow_client_view: true,
      members_see_all_tasks: true,
      color: '#7c3aed',
    },
  ]);

  await upsertComposite(knex, 'project_members', ['project_id', 'user_id'], [
    { project_id: PROJECT_IDS.website, user_id: USER_IDS.admin, is_project_manager: true },
    { project_id: PROJECT_IDS.website, user_id: USER_IDS.sales, is_project_manager: false },
    { project_id: PROJECT_IDS.onboarding, user_id: USER_IDS.support, is_project_manager: true },
    { project_id: PROJECT_IDS.onboarding, user_id: USER_IDS.admin, is_project_manager: false },
    { project_id: PROJECT_IDS.cleanup, user_id: USER_IDS.sales, is_project_manager: true },
  ]);

  await upsertById(knex, 'tasks', [
    {
      id: TASK_IDS.sitemap,
      tenant_id: TENANT_ID,
      project_id: PROJECT_IDS.website,
      status_id: TASK_STATUS_IDS.done,
      name: 'Approve sitemap and content map',
      description: 'Finalize the new IA before design begins.',
      priority: 'medium',
      start_date: daysFromToday(-21),
      due_date: daysFromToday(-14),
      estimated_hours: 12,
      is_billable: true,
      hourly_rate: 125,
      completed_at: timestampDaysFromNow(-14, 18),
      sort_order: 1,
    },
    {
      id: TASK_IDS.homepage,
      tenant_id: TENANT_ID,
      project_id: PROJECT_IDS.website,
      status_id: TASK_STATUS_IDS.progress,
      name: 'Build homepage sections in React',
      description: 'Hero, proof bar, programs, testimonials, and CTA sections.',
      priority: 'high',
      start_date: daysFromToday(-10),
      due_date: daysFromToday(4),
      estimated_hours: 30,
      is_billable: true,
      hourly_rate: 135,
      sort_order: 2,
    },
    {
      id: TASK_IDS.qa,
      tenant_id: TENANT_ID,
      project_id: PROJECT_IDS.website,
      status_id: TASK_STATUS_IDS.testing,
      name: 'Cross-browser QA and responsive polish',
      description: 'Regression pass on Safari, Chrome, Firefox, and tablet breakpoints.',
      priority: 'urgent',
      start_date: daysFromToday(-1),
      due_date: daysFromToday(6),
      estimated_hours: 16,
      is_billable: true,
      hourly_rate: 120,
      sort_order: 3,
    },
    {
      id: TASK_IDS.import,
      tenant_id: TENANT_ID,
      project_id: PROJECT_IDS.onboarding,
      status_id: TASK_STATUS_IDS.progress,
      name: 'Import legacy contacts and clean duplicates',
      description: 'Load CSV export and normalize company records.',
      priority: 'high',
      start_date: daysFromToday(-12),
      due_date: daysFromToday(2),
      estimated_hours: 24,
      is_billable: true,
      hourly_rate: 145,
      sort_order: 1,
    },
    {
      id: TASK_IDS.playbook,
      tenant_id: TENANT_ID,
      project_id: PROJECT_IDS.onboarding,
      status_id: TASK_STATUS_IDS.todo,
      name: 'Write support escalation playbook',
      description: 'Document SLA and escalation paths for the client success team.',
      priority: 'medium',
      start_date: daysFromToday(1),
      due_date: daysFromToday(7),
      estimated_hours: 10,
      is_billable: false,
      hourly_rate: 0,
      sort_order: 2,
    },
    {
      id: TASK_IDS.analytics,
      tenant_id: TENANT_ID,
      project_id: PROJECT_IDS.cleanup,
      status_id: TASK_STATUS_IDS.done,
      name: 'Normalize analytics property naming',
      description: 'Complete UTM cleanup and historical report validation.',
      priority: 'medium',
      start_date: daysFromToday(-28),
      due_date: daysFromToday(-6),
      estimated_hours: 8,
      is_billable: true,
      hourly_rate: 110,
      completed_at: timestampDaysFromNow(-6, 17),
      sort_order: 1,
    },
  ]);

  await upsertComposite(knex, 'task_assignees', ['task_id', 'user_id'], [
    { task_id: TASK_IDS.sitemap, user_id: USER_IDS.admin, assigned_by: USER_IDS.admin },
    { task_id: TASK_IDS.homepage, user_id: USER_IDS.admin, assigned_by: USER_IDS.admin },
    { task_id: TASK_IDS.homepage, user_id: USER_IDS.sales, assigned_by: USER_IDS.admin },
    { task_id: TASK_IDS.qa, user_id: USER_IDS.admin, assigned_by: USER_IDS.admin },
    { task_id: TASK_IDS.import, user_id: USER_IDS.support, assigned_by: USER_IDS.admin },
    { task_id: TASK_IDS.playbook, user_id: USER_IDS.support, assigned_by: USER_IDS.admin },
    { task_id: TASK_IDS.analytics, user_id: USER_IDS.sales, assigned_by: USER_IDS.admin },
  ]);

  await upsertById(knex, 'timesheets', [
    {
      id: TIMESHEET_IDS.one,
      tenant_id: TENANT_ID,
      task_id: TASK_IDS.homepage,
      project_id: PROJECT_IDS.website,
      user_id: USER_IDS.admin,
      note: 'Built testimonial slider and CTA blocks.',
      start_time: timestampDaysFromNow(-2, 9),
      end_time: timestampDaysFromNow(-2, 13),
      hours: 4,
      is_billable: true,
      hourly_rate: 135,
    },
    {
      id: TIMESHEET_IDS.two,
      tenant_id: TENANT_ID,
      task_id: TASK_IDS.homepage,
      project_id: PROJECT_IDS.website,
      user_id: USER_IDS.sales,
      note: 'Prepared copy revisions with client feedback.',
      start_time: timestampDaysFromNow(-1, 10),
      end_time: timestampDaysFromNow(-1, 12),
      hours: 2,
      is_billable: true,
      hourly_rate: 95,
    },
    {
      id: TIMESHEET_IDS.three,
      tenant_id: TENANT_ID,
      task_id: TASK_IDS.import,
      project_id: PROJECT_IDS.onboarding,
      user_id: USER_IDS.support,
      note: 'Merged duplicate records and validated imports.',
      start_time: timestampDaysFromNow(-3, 11),
      end_time: timestampDaysFromNow(-3, 16),
      hours: 5,
      is_billable: true,
      hourly_rate: 145,
    },
    {
      id: TIMESHEET_IDS.four,
      tenant_id: TENANT_ID,
      task_id: TASK_IDS.analytics,
      project_id: PROJECT_IDS.cleanup,
      user_id: USER_IDS.sales,
      note: 'Final review of cleaned reporting dimensions.',
      start_time: timestampDaysFromNow(-7, 9),
      end_time: timestampDaysFromNow(-7, 12),
      hours: 3,
      is_billable: true,
      hourly_rate: 110,
    },
    {
      id: TIMESHEET_IDS.five,
      tenant_id: TENANT_ID,
      task_id: TASK_IDS.qa,
      project_id: PROJECT_IDS.website,
      user_id: USER_IDS.admin,
      note: 'Responsive adjustments on tablet widths.',
      start_time: timestampDaysFromNow(-1, 14),
      end_time: timestampDaysFromNow(-1, 16),
      hours: 2,
      is_billable: true,
      hourly_rate: 120,
    },
  ]);

  await upsertById(knex, 'estimates', [
    {
      id: '00000000-0000-0000-0000-000000000731',
      tenant_id: TENANT_ID,
      number: 'EST-0001',
      customer_id: CUSTOMER_IDS.northstar,
      assigned_to: USER_IDS.sales,
      currency_id: CURRENCY_IDS.usd,
      status: 'accepted',
      date: daysFromToday(-22),
      expiry_date: daysFromToday(-12),
      subtotal: 16000,
      discount: 5,
      discount_type: 'percent',
      tax_total: 1520,
      adjustment: 0,
      total: 16720,
      notes: 'Accepted estimate for the website revamp.',
      terms: '50% upfront, 50% on launch.',
      accepted_at: timestampDaysFromNow(-20, 10),
      hash: 'est000100000000000000000000000000000000000000000000000000000000',
    },
    {
      id: '00000000-0000-0000-0000-000000000732',
      tenant_id: TENANT_ID,
      number: 'EST-0002',
      customer_id: CUSTOMER_IDS.greenline,
      assigned_to: USER_IDS.sales,
      currency_id: CURRENCY_IDS.eur,
      status: 'sent',
      date: daysFromToday(-4),
      expiry_date: daysFromToday(10),
      subtotal: 4200,
      discount: 0,
      discount_type: 'percent',
      tax_total: 420,
      adjustment: 0,
      total: 4620,
      notes: 'Optional dashboard enhancement package.',
      terms: 'Valid for 14 days.',
      sent_at: timestampDaysFromNow(-4, 15),
      hash: 'est000200000000000000000000000000000000000000000000000000000000',
    },
  ]);

  await upsertById(knex, 'proposals', [
    {
      id: '00000000-0000-0000-0000-000000000741',
      tenant_id: TENANT_ID,
      subject: 'Luma Pilates Launch Package',
      to_type: 'lead',
      to_id: LEAD_IDS.sophia,
      assigned_to: USER_IDS.sales,
      currency_id: CURRENCY_IDS.usd,
      date: daysFromToday(-3),
      open_till: daysFromToday(11),
      status: 'sent',
      content: '<p>Launch site plus CRM onboarding and 90-day support.</p>',
      discount: 0,
      discount_type: 'percent',
      total: 9800,
      sent_at: timestampDaysFromNow(-3, 12),
      signature_status: 'pending',
      allow_comments: true,
      hash: 'prop00010000000000000000000000000000000000000000000000000000000',
    },
    {
      id: '00000000-0000-0000-0000-000000000742',
      tenant_id: TENANT_ID,
      subject: 'Bluewave Quarterly Retainer Expansion',
      to_type: 'customer',
      to_id: CUSTOMER_IDS.bluewave,
      assigned_to: USER_IDS.admin,
      currency_id: CURRENCY_IDS.gbp,
      date: daysFromToday(-16),
      open_till: daysFromToday(-2),
      status: 'accepted',
      content: '<p>Expand support coverage and analytics QA for Q2.</p>',
      discount: 0,
      discount_type: 'percent',
      total: 6200,
      sent_at: timestampDaysFromNow(-16, 10),
      accepted_at: timestampDaysFromNow(-12, 14),
      signature_status: 'signed',
      signed_at: timestampDaysFromNow(-12, 14),
      signed_by_name: 'Oliver Grant',
      allow_comments: false,
      hash: 'prop00020000000000000000000000000000000000000000000000000000000',
    },
  ]);

  await upsertById(knex, 'invoices', [
    {
      id: INVOICE_IDS.draft,
      tenant_id: TENANT_ID,
      number: 'INV-0001',
      customer_id: CUSTOMER_IDS.northstar,
      project_id: PROJECT_IDS.website,
      currency_id: CURRENCY_IDS.usd,
      assigned_to: USER_IDS.admin,
      status: 'draft',
      date: daysFromToday(-1),
      due_date: daysFromToday(14),
      reference: 'NS-WEB-DEP',
      subtotal: 3200,
      discount: 0,
      discount_type: 'percent',
      tax_total: 320,
      adjustment: 0,
      total: 3520,
      amount_paid: 0,
      notes: 'Deposit invoice for the next design milestone.',
      terms: 'Payment due within 14 days.',
      hash: 'inv000100000000000000000000000000000000000000000000000000000000',
      created_at: timestampDaysFromNow(-1, 11),
      updated_at: timestampDaysFromNow(-1, 11),
    },
    {
      id: INVOICE_IDS.unpaid,
      tenant_id: TENANT_ID,
      number: 'INV-0002',
      customer_id: CUSTOMER_IDS.bluewave,
      project_id: PROJECT_IDS.onboarding,
      currency_id: CURRENCY_IDS.gbp,
      assigned_to: USER_IDS.support,
      status: 'sent',
      date: daysFromToday(-8),
      due_date: daysFromToday(6),
      reference: 'BW-ONB-APR',
      subtotal: 2800,
      discount: 0,
      discount_type: 'percent',
      tax_total: 280,
      adjustment: 0,
      total: 3080,
      amount_paid: 0,
      notes: 'April onboarding sprint hours.',
      terms: 'Net 14.',
      last_sent_at: timestampDaysFromNow(-7, 10),
      hash: 'inv000200000000000000000000000000000000000000000000000000000000',
      created_at: timestampDaysFromNow(-8, 9),
      updated_at: timestampDaysFromNow(-7, 10),
    },
    {
      id: INVOICE_IDS.partial,
      tenant_id: TENANT_ID,
      number: 'INV-0003',
      customer_id: CUSTOMER_IDS.apex,
      currency_id: CURRENCY_IDS.usd,
      assigned_to: USER_IDS.sales,
      status: 'partial',
      date: daysFromToday(-12),
      due_date: daysFromToday(2),
      reference: 'AX-LAUNCH-01',
      subtotal: 4500,
      discount: 250,
      discount_type: 'fixed',
      tax_total: 425,
      adjustment: 0,
      total: 4675,
      amount_paid: 2000,
      notes: 'Launch package phase 1.',
      terms: 'Remaining balance due before final handoff.',
      last_sent_at: timestampDaysFromNow(-11, 10),
      hash: 'inv000300000000000000000000000000000000000000000000000000000000',
      created_at: timestampDaysFromNow(-12, 10),
      updated_at: timestampDaysFromNow(-2, 15),
    },
    {
      id: INVOICE_IDS.paid,
      tenant_id: TENANT_ID,
      number: 'INV-0004',
      customer_id: CUSTOMER_IDS.greenline,
      project_id: PROJECT_IDS.cleanup,
      currency_id: CURRENCY_IDS.eur,
      assigned_to: USER_IDS.sales,
      status: 'paid',
      date: daysFromToday(-16),
      due_date: daysFromToday(-6),
      reference: 'GL-ANA-CLS',
      subtotal: 6800,
      discount: 0,
      discount_type: 'percent',
      tax_total: 680,
      adjustment: 0,
      total: 7480,
      amount_paid: 7480,
      notes: 'Final cleanup project invoice.',
      terms: 'Thank you for your partnership.',
      last_sent_at: timestampDaysFromNow(-15, 12),
      hash: 'inv000400000000000000000000000000000000000000000000000000000000',
      created_at: timestampDaysFromNow(-16, 9),
      updated_at: timestampDaysFromNow(-5, 11),
    },
    {
      id: INVOICE_IDS.overdue,
      tenant_id: TENANT_ID,
      number: 'INV-0005',
      customer_id: CUSTOMER_IDS.northstar,
      currency_id: CURRENCY_IDS.usd,
      assigned_to: USER_IDS.admin,
      status: 'overdue',
      date: daysFromToday(-28),
      due_date: daysFromToday(-7),
      reference: 'NS-STRAT-01',
      subtotal: 5200,
      discount: 0,
      discount_type: 'percent',
      tax_total: 520,
      adjustment: 0,
      total: 5720,
      amount_paid: 0,
      notes: 'Strategy and creative discovery workshop.',
      terms: 'Past due, please follow up.',
      last_sent_at: timestampDaysFromNow(-27, 10),
      hash: 'inv000500000000000000000000000000000000000000000000000000000000',
      created_at: timestampDaysFromNow(-28, 9),
      updated_at: timestampDaysFromNow(-7, 9),
    },
  ]);

  await upsertById(knex, 'invoice_items', [
    {
      id: '00000000-0000-0000-0000-000000000751',
      invoice_id: INVOICE_IDS.draft,
      description: 'Design milestone deposit',
      long_desc: 'Second milestone covering responsive page designs.',
      qty: 1,
      unit: 'project',
      rate: 3200,
      tax_id: TAX_IDS.vat10,
      discount: 0,
      discount_type: 'percent',
      line_total: 3200,
      sort_order: 1,
    },
    {
      id: '00000000-0000-0000-0000-000000000752',
      invoice_id: INVOICE_IDS.unpaid,
      description: 'Onboarding sprint hours',
      long_desc: 'Imported data, validated permissions, and staff enablement.',
      qty: 20,
      unit: 'hour',
      rate: 140,
      tax_id: TAX_IDS.vat10,
      discount: 0,
      discount_type: 'percent',
      line_total: 2800,
      sort_order: 1,
      task_id: TASK_IDS.import,
    },
    {
      id: '00000000-0000-0000-0000-000000000753',
      invoice_id: INVOICE_IDS.partial,
      description: 'Launch package phase 1',
      long_desc: 'Discovery, wireframes, and kickoff support.',
      qty: 1,
      unit: 'package',
      rate: 4500,
      tax_id: TAX_IDS.vat10,
      discount: 250,
      discount_type: 'fixed',
      line_total: 4250,
      sort_order: 1,
    },
    {
      id: '00000000-0000-0000-0000-000000000754',
      invoice_id: INVOICE_IDS.paid,
      description: 'Analytics cleanup project',
      long_desc: 'Completed data cleanup, QA, and dashboard sign-off.',
      qty: 1,
      unit: 'project',
      rate: 6800,
      tax_id: TAX_IDS.vat10,
      discount: 0,
      discount_type: 'percent',
      line_total: 6800,
      sort_order: 1,
      task_id: TASK_IDS.analytics,
      timesheet_id: TIMESHEET_IDS.four,
    },
    {
      id: '00000000-0000-0000-0000-000000000755',
      invoice_id: INVOICE_IDS.overdue,
      description: 'Strategy workshop and kickoff',
      long_desc: 'Facilitated positioning workshop and project kickoff session.',
      qty: 1,
      unit: 'engagement',
      rate: 5200,
      tax_id: TAX_IDS.vat10,
      discount: 0,
      discount_type: 'percent',
      line_total: 5200,
      sort_order: 1,
    },
  ]);

  await upsertById(knex, 'payments', [
    {
      id: '00000000-0000-0000-0000-000000000761',
      tenant_id: TENANT_ID,
      invoice_id: INVOICE_IDS.partial,
      customer_id: CUSTOMER_IDS.apex,
      amount: 2000,
      currency_id: CURRENCY_IDS.usd,
      exchange_rate: 1,
      payment_mode_id: PAYMENT_MODE_IDS.card,
      status: 'completed',
      date: daysFromToday(-2),
      note: 'Client paid deposit by card.',
      is_partial: true,
    },
    {
      id: '00000000-0000-0000-0000-000000000762',
      tenant_id: TENANT_ID,
      invoice_id: INVOICE_IDS.paid,
      customer_id: CUSTOMER_IDS.greenline,
      amount: 7480,
      currency_id: CURRENCY_IDS.eur,
      exchange_rate: 0.92,
      payment_mode_id: PAYMENT_MODE_IDS.bank,
      status: 'completed',
      date: daysFromToday(-5),
      note: 'Wire received in full.',
      is_partial: false,
    },
    {
      id: '00000000-0000-0000-0000-000000000763',
      tenant_id: TENANT_ID,
      invoice_id: INVOICE_IDS.partial,
      customer_id: CUSTOMER_IDS.apex,
      amount: 750,
      currency_id: CURRENCY_IDS.usd,
      exchange_rate: 1,
      payment_mode_id: PAYMENT_MODE_IDS.bank,
      status: 'completed',
      date: daysFromToday(-9),
      note: 'Early partial payment while scope was being finalized.',
      is_partial: true,
    },
  ]);

  await upsertById(knex, 'tickets', [
    {
      id: TICKET_IDS.hosting,
      tenant_id: TENANT_ID,
      number: 'TKT-0001',
      subject: 'Domain is still pointing to the old host',
      customer_id: CUSTOMER_IDS.northstar,
      contact_id: CONTACT_IDS.northstarOps,
      department_id: DEPARTMENT_IDS.support,
      service_id: SERVICE_IDS.hosting,
      status_id: TICKET_STATUS_IDS.waiting,
      priority_id: TICKET_PRIORITY_IDS.high,
      assigned_to: USER_IDS.support,
      last_reply_at: timestampDaysFromNow(-1, 12),
      last_reply_by: 'client',
      from_email: 'chris.ramos@northstarfitness.example',
      created_at: timestampDaysFromNow(-3, 9),
      updated_at: timestampDaysFromNow(-1, 12),
    },
    {
      id: TICKET_IDS.billing,
      tenant_id: TENANT_ID,
      number: 'TKT-0002',
      subject: 'Need split billing for Q2 retainer',
      customer_id: CUSTOMER_IDS.bluewave,
      contact_id: CONTACT_IDS.bluewaveFin,
      department_id: DEPARTMENT_IDS.billing,
      status_id: TICKET_STATUS_IDS.open,
      priority_id: TICKET_PRIORITY_IDS.medium,
      assigned_to: USER_IDS.admin,
      last_reply_at: timestampDaysFromNow(-2, 11),
      last_reply_by: 'staff',
      from_email: 'emma.price@bluewavedigital.example',
      created_at: timestampDaysFromNow(-4, 10),
      updated_at: timestampDaysFromNow(-2, 11),
    },
    {
      id: TICKET_IDS.analytics,
      tenant_id: TENANT_ID,
      number: 'TKT-0003',
      subject: 'Dashboard export is missing campaign names',
      customer_id: CUSTOMER_IDS.greenline,
      contact_id: CONTACT_IDS.greenlinePri,
      department_id: DEPARTMENT_IDS.support,
      service_id: SERVICE_IDS.onboarding,
      status_id: TICKET_STATUS_IDS.progress,
      priority_id: TICKET_PRIORITY_IDS.medium,
      assigned_to: USER_IDS.support,
      last_reply_at: timestampDaysFromNow(-1, 15),
      last_reply_by: 'staff',
      from_email: 'lena.voss@greenlinesolar.example',
      created_at: timestampDaysFromNow(-6, 8),
      updated_at: timestampDaysFromNow(-1, 15),
    },
    {
      id: TICKET_IDS.portal,
      tenant_id: TENANT_ID,
      number: 'TKT-0004',
      subject: 'Can we reopen the launch support checklist?',
      customer_id: CUSTOMER_IDS.apex,
      contact_id: CONTACT_IDS.apexPri,
      department_id: DEPARTMENT_IDS.support,
      service_id: SERVICE_IDS.onboarding,
      status_id: TICKET_STATUS_IDS.closed,
      priority_id: TICKET_PRIORITY_IDS.low,
      assigned_to: USER_IDS.support,
      last_reply_at: timestampDaysFromNow(-8, 13),
      last_reply_by: 'staff',
      closed_at: timestampDaysFromNow(-8, 13),
      from_email: 'ava@apexwellness.example',
      created_at: timestampDaysFromNow(-12, 9),
      updated_at: timestampDaysFromNow(-8, 13),
    },
  ]);

  await upsertById(knex, 'ticket_replies', [
    {
      id: '00000000-0000-0000-0000-000000000811',
      ticket_id: TICKET_IDS.hosting,
      reply_by_type: 'client',
      reply_by_id: USER_IDS.support,
      content: 'The DNS switch looks incomplete and members are seeing the old site.',
      is_initial: true,
      is_internal_note: false,
      created_at: timestampDaysFromNow(-3, 9),
      updated_at: timestampDaysFromNow(-3, 9),
    },
    {
      id: '00000000-0000-0000-0000-000000000812',
      ticket_id: TICKET_IDS.hosting,
      reply_by_type: 'staff',
      reply_by_id: USER_IDS.support,
      content: 'We updated the DNS records and are waiting for propagation to finish.',
      is_initial: false,
      is_internal_note: false,
      created_at: timestampDaysFromNow(-2, 10),
      updated_at: timestampDaysFromNow(-2, 10),
    },
    {
      id: '00000000-0000-0000-0000-000000000813',
      ticket_id: TICKET_IDS.hosting,
      reply_by_type: 'client',
      reply_by_id: USER_IDS.support,
      content: 'Thanks, still seeing mixed behavior on mobile networks this morning.',
      is_initial: false,
      is_internal_note: false,
      created_at: timestampDaysFromNow(-1, 12),
      updated_at: timestampDaysFromNow(-1, 12),
    },
    {
      id: '00000000-0000-0000-0000-000000000814',
      ticket_id: TICKET_IDS.billing,
      reply_by_type: 'staff',
      reply_by_id: USER_IDS.admin,
      content: 'We can split the retainer into separate department cost centers.',
      is_initial: true,
      is_internal_note: false,
      created_at: timestampDaysFromNow(-4, 10),
      updated_at: timestampDaysFromNow(-4, 10),
    },
    {
      id: '00000000-0000-0000-0000-000000000815',
      ticket_id: TICKET_IDS.analytics,
      reply_by_type: 'staff',
      reply_by_id: USER_IDS.support,
      content: 'We traced the export issue to a missing mapped field and shipped a fix.',
      is_initial: true,
      is_internal_note: false,
      created_at: timestampDaysFromNow(-6, 8),
      updated_at: timestampDaysFromNow(-6, 8),
    },
    {
      id: '00000000-0000-0000-0000-000000000816',
      ticket_id: TICKET_IDS.analytics,
      reply_by_type: 'staff',
      reply_by_id: USER_IDS.support,
      content: 'Internal note: add export regression to QA checklist before next release.',
      is_initial: false,
      is_internal_note: true,
      created_at: timestampDaysFromNow(-1, 15),
      updated_at: timestampDaysFromNow(-1, 15),
    },
    {
      id: '00000000-0000-0000-0000-000000000817',
      ticket_id: TICKET_IDS.portal,
      reply_by_type: 'staff',
      reply_by_id: USER_IDS.support,
      content: 'Checklist reopened and portal permissions confirmed.',
      is_initial: true,
      is_internal_note: false,
      created_at: timestampDaysFromNow(-12, 9),
      updated_at: timestampDaysFromNow(-12, 9),
    },
  ]);

  await upsertById(knex, 'contracts', [
    {
      id: CONTRACT_IDS.bluewave,
      tenant_id: TENANT_ID,
      number: 'CON-0001',
      subject: 'Bluewave Support Retainer',
      customer_id: CUSTOMER_IDS.bluewave,
      content: '<p>Quarterly support retainer with analytics QA and priority ticket handling.</p>',
      value: 6200,
      currency_id: CURRENCY_IDS.gbp,
      start_date: daysFromToday(-45),
      end_date: daysFromToday(12),
      status: 'active',
      signature_status: 'signed',
      signed_at: timestampDaysFromNow(-44, 12),
      signed_by_name: 'Oliver Grant',
      hash: 'con000100000000000000000000000000000000000000000000000000000000',
    },
    {
      id: CONTRACT_IDS.northstar,
      tenant_id: TENANT_ID,
      number: 'CON-0002',
      subject: 'Northstar Growth Retainer',
      customer_id: CUSTOMER_IDS.northstar,
      content: '<p>Ongoing optimization support after launch.</p>',
      value: 9000,
      currency_id: CURRENCY_IDS.usd,
      start_date: daysFromToday(-20),
      end_date: daysFromToday(26),
      status: 'active',
      signature_status: 'signed',
      signed_at: timestampDaysFromNow(-19, 10),
      signed_by_name: 'Maya Turner',
      hash: 'con000200000000000000000000000000000000000000000000000000000000',
    },
  ]);

  const goalsTableExists = await knex.schema.hasTable('goals');
  if (goalsTableExists) {
    await upsertById(knex, 'goals', [
      {
        id: GOAL_IDS.revenue,
        tenant_id: TENANT_ID,
        title: 'April Collected Revenue',
        type: 'invoiced_amount',
        start_date: daysFromToday(-14),
        end_date: daysFromToday(16),
        target_value: 15000,
        current_value: 0,
        is_active: true,
      },
      {
        id: GOAL_IDS.customers,
        tenant_id: TENANT_ID,
        title: 'New Customers This Month',
        type: 'new_customers',
        start_date: daysFromToday(-14),
        end_date: daysFromToday(16),
        target_value: 3,
        current_value: 0,
        is_active: true,
      },
      {
        id: GOAL_IDS.manual,
        tenant_id: TENANT_ID,
        title: 'Client Success Playbook Completion',
        type: 'manual',
        start_date: daysFromToday(-7),
        end_date: daysFromToday(21),
        target_value: 100,
        current_value: 72,
        is_active: true,
      },
    ]);
  }

  console.log('Seed complete. Login: admin@performex.local / Admin@123!');
}
