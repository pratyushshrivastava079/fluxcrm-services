import { Knex } from 'knex';

const ADMIN_ROLE = '00000000-0000-0000-0000-000000000010';

export async function up(knex: Knex): Promise<void> {
  const perms = [
    { module: 'knowledge_base', action: 'view',   description: 'View knowledge base articles'   },
    { module: 'knowledge_base', action: 'create', description: 'Create knowledge base articles' },
    { module: 'knowledge_base', action: 'edit',   description: 'Edit knowledge base articles'   },
    { module: 'knowledge_base', action: 'delete', description: 'Delete knowledge base articles' },
  ];

  await knex('permissions').insert(perms).onConflict(['module', 'action']).ignore();

  const inserted = await knex('permissions')
    .where('module', 'knowledge_base')
    .select('id');

  await knex('role_permissions')
    .insert(inserted.map((p: { id: string }) => ({ role_id: ADMIN_ROLE, permission_id: p.id })))
    .onConflict(['role_id', 'permission_id']).ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex('permissions').where('module', 'knowledge_base').delete();
}
