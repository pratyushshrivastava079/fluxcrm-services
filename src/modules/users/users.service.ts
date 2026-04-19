import bcrypt from 'bcryptjs';
import { db } from '../../core/config/database';
import { redis, KEYS } from '../../core/config/redis';
import { buildMeta, PaginationParams } from '../../core/utils/pagination';
import { NotFoundError, ConflictError } from '../../core/utils/response';
import { CreateUserInput, UpdateUserInput } from './users.schema';

function safeUser(u: Record<string, unknown>) {
  const { password_hash, two_fa_secret, ...rest } = u;
  void password_hash; void two_fa_secret;
  return rest;
}

export async function listUsers(tenantId: string, params: PaginationParams) {
  const query = db('users')
    .where('tenant_id', tenantId)
    .whereNull('deleted_at');

  if (params.search) {
    query.where((b) =>
      b
        .whereILike('first_name', `%${params.search}%`)
        .orWhereILike('last_name', `%${params.search}%`)
        .orWhereILike('email', `%${params.search}%`),
    );
  }

  const [{ count }] = await query.clone().count('id as count');
  const total = Number(count);

  const users = await query
    .orderBy(params.sortBy ?? 'created_at', params.sortDir)
    .limit(params.perPage)
    .offset(params.offset)
    .select('id', 'email', 'first_name', 'last_name', 'phone', 'job_title',
      'status', 'is_admin', 'avatar_url', 'last_login_at', 'created_at');

  return { users, meta: buildMeta(total, params.page, params.perPage) };
}

export async function getUser(tenantId: string, userId: string) {
  const user = await db('users')
    .where({ id: userId, tenant_id: tenantId })
    .whereNull('deleted_at')
    .first();
  if (!user) throw new NotFoundError('User');

  // Load roles
  const roles = await db('roles as r')
    .join('user_roles as ur', 'ur.role_id', 'r.id')
    .where('ur.user_id', userId)
    .select('r.id', 'r.name', 'r.description');

  return { ...safeUser(user), roles };
}

export async function createUser(tenantId: string, input: CreateUserInput) {
  const existing = await db('users')
    .where({ tenant_id: tenantId, email: input.email.toLowerCase() })
    .whereNull('deleted_at')
    .first();
  if (existing) throw new ConflictError('A user with this email already exists');

  const password_hash = await bcrypt.hash(input.password, 12);

  const [user] = await db('users')
    .insert({
      tenant_id: tenantId,
      email: input.email.toLowerCase(),
      password_hash,
      first_name: input.first_name,
      last_name: input.last_name,
      phone: input.phone ?? null,
      job_title: input.job_title ?? null,
      is_admin: input.is_admin,
      status: 'active',
    })
    .returning('*');

  // Assign roles
  if (input.role_ids?.length) {
    await assignRoles(user.id, input.role_ids);
  }

  return safeUser(user);
}

export async function updateUser(tenantId: string, userId: string, input: UpdateUserInput) {
  const user = await db('users')
    .where({ id: userId, tenant_id: tenantId })
    .whereNull('deleted_at')
    .first();
  if (!user) throw new NotFoundError('User');

  const { role_ids, ...fields } = input;

  await db('users')
    .where('id', userId)
    .update({ ...fields, updated_at: db.fn.now() });

  if (role_ids !== undefined) {
    await db('user_roles').where('user_id', userId).delete();
    if (role_ids.length) await assignRoles(userId, role_ids);
    // Bust permission cache
    await redis.del(KEYS.userPerms(userId));
  }

  return getUser(tenantId, userId);
}

export async function deleteUser(tenantId: string, userId: string): Promise<void> {
  const user = await db('users')
    .where({ id: userId, tenant_id: tenantId })
    .whereNull('deleted_at')
    .first();
  if (!user) throw new NotFoundError('User');

  await db('users').where('id', userId).update({ deleted_at: db.fn.now() });
  await redis.del(KEYS.userPerms(userId));
}

async function assignRoles(userId: string, roleIds: string[]) {
  await db('user_roles').insert(roleIds.map((role_id) => ({ user_id: userId, role_id })));
}

export async function listStaff(tenantId: string) {
  return db('users')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .where('status', 'active')
    .orderBy('first_name')
    .select('id', 'first_name', 'last_name', 'email', 'avatar_url', 'job_title');
}

export async function listRoles(tenantId: string) {
  return db('roles').where('tenant_id', tenantId).orderBy('name');
}
