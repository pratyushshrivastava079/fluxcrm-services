import type { Knex } from 'knex';

/**
 * Widen country columns from CHAR(2) to VARCHAR(100) so users can type full
 * country names (e.g. "United States") without hitting a length constraint.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('customers', (t) => {
    t.string('country', 100).alter();
  });
  await knex.schema.alterTable('leads', (t) => {
    t.string('country', 100).alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('customers', (t) => {
    t.specificType('country', 'CHAR(2)').alter();
  });
  await knex.schema.alterTable('leads', (t) => {
    t.specificType('country', 'CHAR(2)').alter();
  });
}
