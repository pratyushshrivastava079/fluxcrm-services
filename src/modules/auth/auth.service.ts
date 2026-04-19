import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../core/config/database';
import { redis, KEYS, TTL } from '../../core/config/redis';
import { config } from '../../core/config';
import { sha256, randomHex } from '../../core/utils/hash';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../../core/utils/response';

interface JWTPayload {
  sub: string;
  tid: string;
  email: string;
  adm: boolean;
}

/** Sign a short-lived access token (15 min) */
function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/** Generate opaque refresh token, store hash in Redis */
async function createRefreshToken(userId: string): Promise<string> {
  const raw = randomHex(40);
  const hash = sha256(raw);
  await redis.setex(KEYS.refreshToken(hash), TTL.refreshToken, userId);
  return raw;
}

export async function login(email: string, password: string) {
  const user = await db('users')
    .where({ email: email.toLowerCase().trim() })
    .whereNull('deleted_at')
    .first();

  if (!user || !user.password_hash) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  if (user.status !== 'active') {
    throw new UnauthorizedError('Your account has been deactivated');
  }

  // Update last login
  await db('users').where('id', user.id).update({
    last_login_at: db.fn.now(),
    updated_at: db.fn.now(),
  });

  const jwtPayload: JWTPayload = {
    sub: user.id,
    tid: user.tenant_id,
    email: user.email,
    adm: user.is_admin,
  };

  const accessToken = signAccessToken(jwtPayload);
  const refreshToken = await createRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
}

export async function refreshTokens(rawToken: string) {
  const hash = sha256(rawToken);
  const key = KEYS.refreshToken(hash);
  const userId = await redis.get(key);

  if (!userId) throw new UnauthorizedError('Invalid or expired refresh token');

  const user = await db('users').where('id', userId).whereNull('deleted_at').first();
  if (!user || user.status !== 'active') {
    await redis.del(key);
    throw new UnauthorizedError('Account not found or deactivated');
  }

  // Rotate: delete old, issue new
  await redis.del(key);
  const newRefreshToken = await createRefreshToken(user.id);

  const accessToken = signAccessToken({
    sub: user.id,
    tid: user.tenant_id,
    email: user.email,
    adm: user.is_admin,
  });

  return { accessToken, refreshToken: newRefreshToken, user: sanitizeUser(user) };
}

export async function logout(rawToken: string): Promise<void> {
  const hash = sha256(rawToken);
  await redis.del(KEYS.refreshToken(hash));
}

export async function getMe(userId: string) {
  const user = await db('users').where('id', userId).whereNull('deleted_at').first();
  if (!user) throw new NotFoundError('User');
  return sanitizeUser(user);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await db('users').where('id', userId).first();
  if (!user) throw new NotFoundError('User');

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new BadRequestError('Current password is incorrect');

  const hash = await bcrypt.hash(newPassword, 12);
  await db('users').where('id', userId).update({ password_hash: hash, updated_at: db.fn.now() });

  // Invalidate permission cache
  await redis.del(KEYS.userPerms(userId));
}

function sanitizeUser(user: Record<string, unknown>) {
  const { password_hash, two_fa_secret, ...safe } = user;
  void password_hash;
  void two_fa_secret;
  return safe;
}
