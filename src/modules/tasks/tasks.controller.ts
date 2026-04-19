import { Request, Response } from 'express';
import * as svc from './tasks.service';
import { createTaskSchema, updateTaskSchema } from './tasks.schema';
import { ok, created, noContent } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';

export async function statuses(req: Request, res: Response) {
  ok(res, await svc.listTaskStatuses(req.user.tenantId));
}

export async function stats(req: Request, res: Response) {
  ok(res, await svc.getTaskStatusStats(req.user.tenantId));
}

export async function list(req: Request, res: Response) {
  const params = {
    ...parsePagination(req),
    project_id:  req.query.project_id  as string,
    status_id:   req.query.status_id   as string,
    assigned_to: req.query.assigned_to as string,
    priority:    req.query.priority    as string,
  };
  const result = await svc.listTasks(req.user.tenantId, params);
  ok(res, result.tasks, result.meta);
}

export async function get(req: Request, res: Response) {
  ok(res, await svc.getTask(req.user.tenantId, req.params.id));
}

export async function create(req: Request, res: Response) {
  const input = createTaskSchema.parse(req.body);
  created(res, await svc.createTask(req.user.tenantId, req.user.id, input));
}

export async function update(req: Request, res: Response) {
  const input = updateTaskSchema.parse(req.body);
  ok(res, await svc.updateTask(req.user.tenantId, req.params.id, input));
}

export async function remove(req: Request, res: Response) {
  await svc.deleteTask(req.user.tenantId, req.params.id);
  noContent(res);
}
