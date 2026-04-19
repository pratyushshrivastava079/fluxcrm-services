import { Knex } from 'knex';

const ADMIN_ROLE = '00000000-0000-0000-0000-000000000010';

export async function up(knex: Knex): Promise<void> {
  // ── goals ──────────────────────────────────────────────────────────────────
  await knex.schema.createTable('goals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('title', 255).notNullable();
    // type drives how progress is auto-calculated
    t.string('type', 50).notNullable();
    // 'invoiced_amount' | 'new_customers' | 'new_contracts' | 'manual'
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.decimal('target_value', 15, 4).notNullable().defaultTo(0);
    // for manual goals, staff update this directly
    t.decimal('current_value', 15, 4).notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index(['tenant_id', 'is_active']);
  });

  // ── permissions ────────────────────────────────────────────────────────────
  const perms = [
    // Tickets
    { module: 'tickets',   action: 'view',   description: 'View tickets'   },
    { module: 'tickets',   action: 'create', description: 'Create tickets' },
    { module: 'tickets',   action: 'edit',   description: 'Edit tickets'   },
    { module: 'tickets',   action: 'delete', description: 'Delete tickets' },
    { module: 'tickets',   action: 'reply',  description: 'Reply to tickets' },
    // Contracts
    { module: 'contracts', action: 'view',   description: 'View contracts'   },
    { module: 'contracts', action: 'create', description: 'Create contracts' },
    { module: 'contracts', action: 'edit',   description: 'Edit contracts'   },
    { module: 'contracts', action: 'delete', description: 'Delete contracts' },
    // Goals
    { module: 'goals',     action: 'view',   description: 'View goals'   },
    { module: 'goals',     action: 'create', description: 'Create goals' },
    { module: 'goals',     action: 'edit',   description: 'Edit goals'   },
    { module: 'goals',     action: 'delete', description: 'Delete goals' },
  ];

  await knex('permissions').insert(perms).onConflict(['module', 'action']).ignore();

  const inserted = await knex('permissions')
    .whereIn('module', ['tickets', 'contracts', 'goals'])
    .select('id');

  await knex('role_permissions')
    .insert(inserted.map((p: { id: string }) => ({ role_id: ADMIN_ROLE, permission_id: p.id })))
    .onConflict(['role_id', 'permission_id']).ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('goals');
  await knex('permissions').whereIn('module', ['tickets', 'contracts', 'goals']).delete();
}
