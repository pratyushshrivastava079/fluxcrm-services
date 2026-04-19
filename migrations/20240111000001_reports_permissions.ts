import { Knex } from 'knex';

const ADMIN_ROLE = '00000000-0000-0000-0000-000000000010';

export async function up(knex: Knex): Promise<void> {
  const perms = [
    { module: 'reports', action: 'view', description: 'View reports and analytics' },
  ];

  await knex('permissions').insert(perms).onConflict(['module', 'action']).ignore();

  const inserted = await knex('permissions')
    .where('module', 'reports')
    .select('id');

  await knex('role_permissions')
    .insert(inserted.map((p: { id: string }) => ({ role_id: ADMIN_ROLE, permission_id: p.id })))
    .onConflict(['role_id', 'permission_id']).ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex('permissions').where('module', 'reports').delete();
}
