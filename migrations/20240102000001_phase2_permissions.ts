import { Knex } from 'knex';

const LEAD_PERMS = ['view', 'create', 'edit', 'delete', 'convert'].map((action) => ({
  module: 'leads',
  action,
  description: `${action} leads`,
}));

const PROPOSAL_PERMS = ['view', 'create', 'edit', 'delete', 'send'].map((action) => ({
  module: 'proposals',
  action,
  description: `${action} proposals`,
}));

export async function up(knex: Knex): Promise<void> {
  await knex('permissions')
    .insert([...LEAD_PERMS, ...PROPOSAL_PERMS])
    .onConflict(['module', 'action'])
    .ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex('permissions')
    .whereIn('module', ['leads', 'proposals'])
    .delete();
}
