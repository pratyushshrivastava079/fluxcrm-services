import { Request, Response } from 'express';
import * as svc from './timesheets.service';
import { startTimerSchema, stopTimerSchema, logTimeSchema } from './timesheets.schema';
import { ok, created, noContent } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';

export async function activeTimer(req: Request, res: Response) {
  ok(res, await svc.getActiveTimer(req.user.tenantId, req.user.id));
}

export async function list(req: Request, res: Response) {
  const params = {
    ...parsePagination(req),
    project_id: req.query.project_id as string,
    task_id:    req.query.task_id    as string,
    user_id:    req.query.user_id    as string,
  };
  const result = await svc.listTimesheets(req.user.tenantId, params);
  ok(res, result.timesheets, result.meta);
}

export async function start(req: Request, res: Response) {
  const input = startTimerSchema.parse(req.body);
  created(res, await svc.startTimer(req.user.tenantId, req.user.id, input));
}

export async function stop(req: Request, res: Response) {
  const input = stopTimerSchema.parse(req.body);
  ok(res, await svc.stopTimer(req.user.tenantId, req.user.id, req.params.id, input));
}

export async function logTime(req: Request, res: Response) {
  const input = logTimeSchema.parse(req.body);
  created(res, await svc.logTime(req.user.tenantId, req.user.id, input));
}

export async function remove(req: Request, res: Response) {
  await svc.deleteTimesheet(req.user.tenantId, req.user.id, req.params.id, req.user.isAdmin);
  noContent(res);
}

export async function projectSummary(req: Request, res: Response) {
  ok(res, await svc.getProjectHoursSummary(req.user.tenantId, req.params.projectId));
}
