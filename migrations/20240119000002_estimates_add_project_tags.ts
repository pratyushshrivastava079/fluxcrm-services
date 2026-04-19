import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('estimates', table => {
    table.uuid('project_id').nullable().references('id').inTable('projects').onDelete('SET NULL');
    table.specificType('tags', 'text[]').notNullable().defaultTo('{}');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('estimates', table => {
    table.dropColumn('project_id');
    table.dropColumn('tags');
  });
}
