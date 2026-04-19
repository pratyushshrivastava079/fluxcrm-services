import type { Knex } from 'knex';

export async function up(knex: Knex) {
  await knex.schema.alterTable('subscriptions', t => {
    t.uuid('tax2_id').nullable().references('id').inTable('tax_rates').onDelete('SET NULL');
    t.text('terms').nullable();
    t.boolean('include_description_in_invoice').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('subscriptions', t => {
    t.dropColumn('tax2_id');
    t.dropColumn('terms');
    t.dropColumn('include_description_in_invoice');
  });
}
