import { Knex } from 'knex';

const ADMIN_ROLE = '00000000-0000-0000-0000-000000000010';

export async function up(knex: Knex): Promise<void> {
  const perms = [
    // Expenses
    { module: 'expenses', action: 'view',   description: 'View expenses'   },
    { module: 'expenses', action: 'create', description: 'Create expenses' },
    { module: 'expenses', action: 'edit',   description: 'Edit expenses'   },
    { module: 'expenses', action: 'delete', description: 'Delete expenses' },
    // Estimates
    { module: 'estimates', action: 'view',   description: 'View estimates'   },
    { module: 'estimates', action: 'create', description: 'Create estimates' },
    { module: 'estimates', action: 'edit',   description: 'Edit estimates'   },
    { module: 'estimates', action: 'delete', description: 'Delete estimates' },
    { module: 'estimates', action: 'send',   description: 'Send estimates'   },
  ];

  await knex('permissions').insert(perms).onConflict(['module', 'action']).ignore();

  const inserted = await knex('permissions')
    .whereIn('module', ['expenses', 'estimates'])
    .select('id');

  await knex('role_permissions')
    .insert(inserted.map((p: { id: string }) => ({ role_id: ADMIN_ROLE, permission_id: p.id })))
    .onConflict(['role_id', 'permission_id']).ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex('permissions').whereIn('module', ['expenses', 'estimates']).delete();
}
