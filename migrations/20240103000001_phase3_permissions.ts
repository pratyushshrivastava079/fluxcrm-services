import { Knex } from 'knex';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

export async function up(knex: Knex): Promise<void> {
  // ── Permissions ──────────────────────────────────────────────────────────────
  const perms: Array<{ module: string; action: string; description: string }> = [
    // Invoices
    { module: 'invoices', action: 'view',   description: 'View invoices' },
    { module: 'invoices', action: 'create', description: 'Create invoices' },
    { module: 'invoices', action: 'edit',   description: 'Edit invoices' },
    { module: 'invoices', action: 'delete', description: 'Delete invoices' },
    { module: 'invoices', action: 'send',   description: 'Send invoices to clients' },
    { module: 'invoices', action: 'record_payment', description: 'Record invoice payments' },
    // Projects
    { module: 'projects', action: 'view',   description: 'View projects' },
    { module: 'projects', action: 'create', description: 'Create projects' },
    { module: 'projects', action: 'edit',   description: 'Edit projects' },
    { module: 'projects', action: 'delete', description: 'Delete projects' },
    // Tasks
    { module: 'tasks', action: 'view',   description: 'View tasks' },
    { module: 'tasks', action: 'create', description: 'Create tasks' },
    { module: 'tasks', action: 'edit',   description: 'Edit tasks' },
    { module: 'tasks', action: 'delete', description: 'Delete tasks' },
    // Timesheets
    { module: 'timesheets', action: 'view',   description: 'View timesheets' },
    { module: 'timesheets', action: 'create', description: 'Log time' },
    { module: 'timesheets', action: 'edit',   description: 'Edit time logs' },
    { module: 'timesheets', action: 'delete', description: 'Delete time logs' },
  ];

  await knex('permissions').insert(perms).onConflict(['module', 'action']).ignore();

  // Assign all new permissions to Admin role
  const ADMIN_ROLE = '00000000-0000-0000-0000-000000000010';
  const newPerms = await knex('permissions')
    .whereIn('module', ['invoices', 'projects', 'tasks', 'timesheets'])
    .select('id');

  await knex('role_permissions')
    .insert(newPerms.map((p: { id: string }) => ({ role_id: ADMIN_ROLE, permission_id: p.id })))
    .onConflict(['role_id', 'permission_id']).ignore();

  // ── Default task statuses ─────────────────────────────────────────────────────
  const taskStatuses = [
    { tenant_id: TENANT_ID, name: 'Not Started', color: '#94a3b8', sort_order: 0, is_default: true },
    { tenant_id: TENANT_ID, name: 'In Progress',  color: '#3b82f6', sort_order: 1 },
    { tenant_id: TENANT_ID, name: 'In Review',    color: '#f59e0b', sort_order: 2 },
    { tenant_id: TENANT_ID, name: 'Done',         color: '#22c55e', sort_order: 3, is_closed: true },
  ];

  await knex('task_statuses').insert(taskStatuses).onConflict(['tenant_id', 'name']).ignore();

  // ── Default currencies ────────────────────────────────────────────────────────
  await knex('currencies').insert([
    { tenant_id: TENANT_ID, code: 'USD', name: 'US Dollar',  symbol: '$', is_default: true },
    { tenant_id: TENANT_ID, code: 'EUR', name: 'Euro',       symbol: '€' },
    { tenant_id: TENANT_ID, code: 'GBP', name: 'Pound Sterling', symbol: '£' },
    { tenant_id: TENANT_ID, code: 'INR', name: 'Indian Rupee',   symbol: '₹' },
  ]).onConflict(['tenant_id', 'code']).ignore();

  // ── Default tax rates ─────────────────────────────────────────────────────────
  await knex('tax_rates').insert([
    { tenant_id: TENANT_ID, name: 'GST 18%', rate: 18.00 },
    { tenant_id: TENANT_ID, name: 'VAT 20%', rate: 20.00 },
    { tenant_id: TENANT_ID, name: 'No Tax',  rate: 0.00, is_default: true },
  ]).onConflict(['tenant_id', 'name']).ignore();

  // ── Default payment modes ──────────────────────────────────────────────────────
  await knex('payment_modes').insert([
    { tenant_id: TENANT_ID, name: 'Bank Transfer' },
    { tenant_id: TENANT_ID, name: 'Cash' },
    { tenant_id: TENANT_ID, name: 'Credit Card' },
    { tenant_id: TENANT_ID, name: 'PayPal' },
  ]).onConflict(['tenant_id', 'name']).ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex('permissions')
    .whereIn('module', ['invoices', 'projects', 'tasks', 'timesheets'])
    .delete();
  await knex('task_statuses').where({ tenant_id: TENANT_ID }).delete();
  await knex('currencies').where({ tenant_id: TENANT_ID }).delete();
  await knex('tax_rates').where({ tenant_id: TENANT_ID }).delete();
  await knex('payment_modes').where({ tenant_id: TENANT_ID }).delete();
}
