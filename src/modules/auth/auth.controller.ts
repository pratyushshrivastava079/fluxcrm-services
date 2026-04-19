import { Request, Response } from 'express';
import * as authService from './auth.service';
import { loginSchema, changePasswordSchema } from './auth.schema';
import { ok, noContent, UnauthorizedError } from '../../core/utils/response';

const REFRESH_COOKIE = 'prf_rt';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
};

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  const result = await authService.login(email, password);

  res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
  ok(res, { accessToken: result.accessToken, user: result.user });
}

export async function refresh(req: Request, res: Response) {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (!rawToken) throw new UnauthorizedError('No refresh token');

  const result = await authService.refreshTokens(rawToken);
  res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
  ok(res, { accessToken: result.accessToken, user: result.user });
}

export async function logout(req: Request, res: Response) {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (rawToken) await authService.logout(rawToken);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  noContent(res);
}

export async function me(req: Request, res: Response) {
  const user = await authService.getMe(req.user.id);
  ok(res, user);
}

export async function changePassword(req: Request, res: Response) {
  const { current_password, new_password } = changePasswordSchema.parse(req.body);
  await authService.changePassword(req.user.id, current_password, new_password);
  noContent(res);
}
