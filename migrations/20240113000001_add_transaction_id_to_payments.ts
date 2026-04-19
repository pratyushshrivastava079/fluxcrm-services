import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('payments', (t) => {
    t.string('transaction_id', 255).nullable().after('payment_mode_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('payments', (t) => {
    t.dropColumn('transaction_id');
  });
}
