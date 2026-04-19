import { Request, Response } from 'express';
import * as usersService from './users.service';
import { createUserSchema, updateUserSchema } from './users.schema';
import { ok, created, noContent } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';

export async function list(req: Request, res: Response) {
  const params = parsePagination(req);
  const { users, meta } = await usersService.listUsers(req.user.tenantId, params);
  ok(res, users, meta);
}

export async function show(req: Request, res: Response) {
  const user = await usersService.getUser(req.user.tenantId, req.params.id);
  ok(res, user);
}

export async function create(req: Request, res: Response) {
  const input = createUserSchema.parse(req.body);
  const user = await usersService.createUser(req.user.tenantId, input);
  created(res, user);
}

export async function update(req: Request, res: Response) {
  const input = updateUserSchema.parse(req.body);
  const user = await usersService.updateUser(req.user.tenantId, req.params.id, input);
  ok(res, user);
}

export async function destroy(req: Request, res: Response) {
  await usersService.deleteUser(req.user.tenantId, req.params.id);
  noContent(res);
}

export async function staff(req: Request, res: Response) {
  const users = await usersService.listStaff(req.user.tenantId);
  ok(res, users);
}

export async function roles(req: Request, res: Response) {
  const list = await usersService.listRoles(req.user.tenantId);
  ok(res, list);
}
