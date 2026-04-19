import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('credit_notes', (t) => {
    t.uuid('project_id').nullable().references('id').inTable('projects').onDelete('SET NULL');
    t.specificType('tags', 'text[]').notNullable().defaultTo('{}');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('credit_notes', (t) => {
    t.dropColumn('project_id');
    t.dropColumn('tags');
  });
}
