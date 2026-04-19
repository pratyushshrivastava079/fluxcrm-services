import { Knex } from 'knex';

/**
 * Adds custom_fields JSONB column to customers and contacts.
 * The initial schema (database/init.sql) already includes this column,
 * but this migration handles existing databases where init.sql ran without it.
 */
export async function up(knex: Knex): Promise<void> {
  const hasCustCol = await knex.schema.hasColumn('customers', 'custom_fields');
  if (!hasCustCol) {
    await knex.schema.alterTable('customers', (t) => {
      t.jsonb('custom_fields').notNullable().defaultTo('{}');
    });
  }

  const hasContCol = await knex.schema.hasColumn('contacts', 'custom_fields');
  if (!hasContCol) {
    await knex.schema.alterTable('contacts', (t) => {
      t.jsonb('custom_fields').notNullable().defaultTo('{}');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('customers', (t) => t.dropColumn('custom_fields'));
  await knex.schema.alterTable('contacts',  (t) => t.dropColumn('custom_fields'));
}
