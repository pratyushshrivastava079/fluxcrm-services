import type { Knex } from 'knex';

export async function up(knex: Knex) {
  await knex.schema.alterTable('contracts', t => {
    t.uuid('project_id').nullable().references('id').inTable('projects').onDelete('SET NULL');
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('contracts', t => {
    t.dropColumn('project_id');
  });
}
