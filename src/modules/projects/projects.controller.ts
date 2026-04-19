import { Request, Response } from 'express';
import * as svc from './projects.service';
import { createProjectSchema, updateProjectSchema } from './projects.schema';
import { ok, created, noContent } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';

export async function list(req: Request, res: Response) {
  const params = { ...parsePagination(req), status: req.query.status as string, customer_id: req.query.customer_id as string };
  const result = await svc.listProjects(req.user.tenantId, params);
  ok(res, result.projects, result.meta);
}

export async function get(req: Request, res: Response) {
  ok(res, await svc.getProject(req.user.tenantId, req.params.id));
}

export async function create(req: Request, res: Response) {
  const input = createProjectSchema.parse(req.body);
  created(res, await svc.createProject(req.user.tenantId, req.user.id, input));
}

export async function update(req: Request, res: Response) {
  const input = updateProjectSchema.parse(req.body);
  ok(res, await svc.updateProject(req.user.tenantId, req.params.id, input));
}

export async function remove(req: Request, res: Response) {
  await svc.deleteProject(req.user.tenantId, req.params.id);
  noContent(res);
}

export async function stats(req: Request, res: Response) {
  ok(res, await svc.getProjectStatusStats(req.user.tenantId));
}
