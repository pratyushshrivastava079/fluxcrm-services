import type { Knex } from 'knex';

export async function up(knex: Knex) {
  await knex.schema.alterTable('expenses', t => {
    t.string('reference_no', 100).nullable();
    t.string('payment_mode', 100).nullable();
    t.uuid('invoice_id').nullable().references('id').inTable('invoices').onDelete('SET NULL');
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('expenses', t => {
    t.dropColumn('reference_no');
    t.dropColumn('payment_mode');
    t.dropColumn('invoice_id');
  });
}
