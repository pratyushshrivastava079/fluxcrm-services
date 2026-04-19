import { Knex } from 'knex';

const ADMIN_ROLE = '00000000-0000-0000-0000-000000000010';

export async function up(knex: Knex): Promise<void> {
  // ── reminders ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('reminders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title', 255).notNullable();
    t.text('description').nullable();
    t.date('remind_date').notNullable();
    t.time('remind_time').nullable();
    t.boolean('is_done').notNullable().defaultTo(false);
    // optional link to any entity
    t.string('related_type', 50).nullable(); // lead | customer | invoice | project | task
    t.uuid('related_id').nullable();
    t.timestamps(true, true);
    t.index(['tenant_id', 'user_id']);
    t.index(['tenant_id', 'user_id', 'remind_date']);
  });

  // ── announcements ──────────────────────────────────────────────────────────
  await knex.schema.createTable('announcements', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.string('title', 255).notNullable();
    t.text('content').nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index(['tenant_id', 'is_active']);
  });

  // ── announcement_reads (who dismissed/read each announcement) ─────────────
  await knex.schema.createTable('announcement_reads', (t) => {
    t.uuid('announcement_id').notNullable().references('id').inTable('announcements').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('read_at').notNullable().defaultTo(knex.fn.now());
    t.primary(['announcement_id', 'user_id']);
  });

  // ── permissions ────────────────────────────────────────────────────────────
  const perms = [
    { module: 'reminders',     action: 'view',   description: 'View own reminders' },
    { module: 'reminders',     action: 'create', description: 'Create reminders' },
    { module: 'reminders',     action: 'edit',   description: 'Edit reminders' },
    { module: 'reminders',     action: 'delete', description: 'Delete reminders' },
    { module: 'announcements', action: 'view',   description: 'View announcements' },
    { module: 'announcements', action: 'create', description: 'Create announcements' },
    { module: 'announcements', action: 'edit',   description: 'Edit announcements' },
    { module: 'announcements', action: 'delete', description: 'Delete announcements' },
  ];

  await knex('permissions').insert(perms).onConflict(['module', 'action']).ignore();

  // Assign all to admin role
  const inserted = await knex('permissions')
    .whereIn('module', ['reminders', 'announcements'])
    .select('id');

  await knex('role_permissions')
    .insert(inserted.map((p: { id: string }) => ({ role_id: ADMIN_ROLE, permission_id: p.id })))
    .onConflict(['role_id', 'permission_id']).ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('announcement_reads');
  await knex.schema.dropTableIfExists('announcements');
  await knex.schema.dropTableIfExists('reminders');
  await knex('permissions').whereIn('module', ['reminders', 'announcements']).delete();
}
