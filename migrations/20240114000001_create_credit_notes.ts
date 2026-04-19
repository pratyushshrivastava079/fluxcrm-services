import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('credit_notes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
    t.uuid('invoice_id').nullable().references('id').inTable('invoices').onDelete('SET NULL');
    t.string('number', 50).notNullable();
    t.string('status', 30).notNullable().defaultTo('open'); // open | closed | void
    t.date('date').notNullable();
    t.string('reference', 255).nullable();
    t.decimal('subtotal', 14, 2).notNullable().defaultTo(0);
    t.decimal('tax_total', 14, 2).notNullable().defaultTo(0);
    t.decimal('discount', 14, 2).notNullable().defaultTo(0);
    t.string('discount_type', 10).notNullable().defaultTo('percent');
    t.decimal('adjustment', 14, 2).notNullable().defaultTo(0);
    t.decimal('total', 14, 2).notNullable().defaultTo(0);
    t.decimal('remaining_amount', 14, 2).notNullable().defaultTo(0);
    t.uuid('currency_id').nullable().references('id').inTable('currencies').onDelete('SET NULL');
    t.text('notes').nullable();
    t.text('terms').nullable();
    t.text('admin_note').nullable();
    t.timestamps(true, true);
    t.timestamp('deleted_at').nullable();
    t.unique(['tenant_id', 'number']);
  });

  await knex.schema.createTable('credit_note_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('credit_note_id').notNullable().references('id').inTable('credit_notes').onDelete('CASCADE');
    t.text('description').notNullable();
    t.text('long_desc').nullable();
    t.decimal('qty', 10, 3).notNullable().defaultTo(1);
    t.string('unit', 50).nullable();
    t.decimal('rate', 14, 2).notNullable().defaultTo(0);
    t.uuid('tax_id').nullable().references('id').inTable('tax_rates').onDelete('SET NULL');
    t.decimal('discount', 14, 2).notNullable().defaultTo(0);
    t.string('discount_type', 10).notNullable().defaultTo('percent');
    t.decimal('line_total', 14, 2).notNullable().defaultTo(0);
    t.integer('sort_order').notNullable().defaultTo(0);
  });

  // Add credit_notes permissions
  const ADMIN_ROLE = '00000000-0000-0000-0000-000000000010';
  const perms = [
    { module: 'credit_notes', action: 'view',   description: 'View credit notes'   },
    { module: 'credit_notes', action: 'create', description: 'Create credit notes' },
    { module: 'credit_notes', action: 'edit',   description: 'Edit credit notes'   },
    { module: 'credit_notes', action: 'delete', description: 'Delete credit notes' },
  ];

  await knex('permissions').insert(perms).onConflict(['module', 'action']).ignore();

  const inserted = await knex('permissions').where('module', 'credit_notes').select('id');
  await knex('role_permissions')
    .insert(inserted.map((p: { id: string }) => ({ role_id: ADMIN_ROLE, permission_id: p.id })))
    .onConflict(['role_id', 'permission_id']).ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('credit_note_items');
  await knex.schema.dropTableIfExists('credit_notes');
  await knex('permissions').where('module', 'credit_notes').delete();
}
