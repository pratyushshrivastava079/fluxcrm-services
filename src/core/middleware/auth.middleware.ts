import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { redis, KEYS } from '../config/redis';
import { db } from '../config/database';
import { UnauthorizedError } from '../utils/response';

interface JWTPayload {
  sub: string;          // userId
  tid: string;          // tenantId
  email: string;
  adm: boolean;         // isAdmin
  iat: number;
  exp: number;
}

/** Verify access token, load user + permissions, attach to req.user */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('No access token provided');
  }

  const token = authHeader.slice(7);
  let payload: JWTPayload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }

  // Load permissions from Redis cache
  const permCacheKey = KEYS.userPerms(payload.sub);
  let permissions: string[] = [];

  const cached = await redis.get(permCacheKey);
  if (cached) {
    permissions = JSON.parse(cached);
  } else {
    // Load from DB and cache
    const rows = await db('user_roles as ur')
      .join('role_permissions as rp', 'rp.role_id', 'ur.role_id')
      .join('permissions as p', 'p.id', 'rp.permission_id')
      .where('ur.user_id', payload.sub)
      .select('p.module', 'p.action');

    permissions = rows.map((r) => `${r.module}.${r.action}`);
    await redis.setex(permCacheKey, 3600, JSON.stringify(permissions));
  }

  // Load tenant info
  const tenantKey = KEYS.tenant(payload.tid);
  let tenant = { id: payload.tid, name: '', slug: '' };
  const cachedTenant = await redis.get(tenantKey);
  if (cachedTenant) {
    tenant = JSON.parse(cachedTenant);
  } else {
    const t = await db('tenants').where('id', payload.tid).first();
    if (t) {
      tenant = { id: t.id, name: t.name, slug: t.slug };
      await redis.setex(tenantKey, 300, JSON.stringify(tenant));
    }
  }

  req.user = {
    id: payload.sub,
    tenantId: payload.tid,
    email: payload.email,
    firstName: '',   // hydrated when needed
    lastName: '',
    isAdmin: payload.adm,
    permissions,
  };
  req.tenant = tenant;

  next();
}

/** Alias: optional authentication (does not throw if no token) */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.headers.authorization) {
    return authenticate(req, res, next);
  }
  next();
}
