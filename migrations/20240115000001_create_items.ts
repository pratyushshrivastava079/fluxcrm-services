import type { Knex } from 'knex';

const ADMIN_ROLE = '00000000-0000-0000-0000-000000000010';

export async function up(knex: Knex): Promise<void> {
  // Item groups
  await knex.schema.createTable('item_groups', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('name', 100).notNullable();
    t.text('description').nullable();
    t.timestamps(true, true);
    t.unique(['tenant_id', 'name']);
  });

  // Items (product/service catalog)
  await knex.schema.createTable('items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('group_id').nullable().references('id').inTable('item_groups').onDelete('SET NULL');
    t.string('description', 500).notNullable();
    t.text('long_description').nullable();
    t.decimal('rate', 14, 2).notNullable().defaultTo(0);
    t.string('unit', 50).nullable();
    t.uuid('tax_id').nullable().references('id').inTable('tax_rates').onDelete('SET NULL');
    t.uuid('tax2_id').nullable().references('id').inTable('tax_rates').onDelete('SET NULL');
    t.timestamps(true, true);
    t.timestamp('deleted_at').nullable();
  });

  // Permissions
  const perms = [
    { module: 'items', action: 'view',   description: 'View items'   },
    { module: 'items', action: 'create', description: 'Create items' },
    { module: 'items', action: 'edit',   description: 'Edit items'   },
    { module: 'items', action: 'delete', description: 'Delete items' },
  ];
  await knex('permissions').insert(perms).onConflict(['module', 'action']).ignore();
  const inserted = await knex('permissions').where('module', 'items').select('id');
  await knex('role_permissions')
    .insert(inserted.map((p: { id: string }) => ({ role_id: ADMIN_ROLE, permission_id: p.id })))
    .onConflict(['role_id', 'permission_id']).ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('items');
  await knex.schema.dropTableIfExists('item_groups');
  await knex('permissions').where('module', 'items').delete();
}
