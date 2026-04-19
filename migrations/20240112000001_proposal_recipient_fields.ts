import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add recipient contact/address fields to proposals
  await knex.schema.alterTable('proposals', (t) => {
    t.string('to_name', 255).nullable();
    t.string('to_email', 255).nullable();
    t.string('to_phone', 50).nullable();
    t.text('to_address').nullable();
    t.string('to_city', 100).nullable();
    t.string('to_state', 100).nullable();
    t.string('to_zip', 20).nullable();
    t.string('to_country', 100).nullable();
    t.decimal('adjustment', 14, 2).defaultTo(0).notNullable();
    t.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
  });

  // Add is_optional to proposal_items
  await knex.schema.alterTable('proposal_items', (t) => {
    t.boolean('is_optional').defaultTo(false).notNullable();
    t.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('proposals', (t) => {
    t.dropColumns('to_name', 'to_email', 'to_phone', 'to_address', 'to_city', 'to_state', 'to_zip', 'to_country', 'adjustment', 'created_by');
  });
  await knex.schema.alterTable('proposal_items', (t) => {
    t.dropColumns('is_optional', 'tenant_id');
  });
}
