import { Request, Response } from 'express';
import { ok, created, noContent } from '../../core/utils/response';
import { createGoalSchema, updateGoalSchema } from './goals.schema';
import * as svc from './goals.service';

export async function list(req: Request, res: Response) {
  ok(res, await svc.listGoals(req.user.tenantId));
}

export async function create(req: Request, res: Response) {
  const input = createGoalSchema.parse(req.body);
  created(res, await svc.createGoal(req.user.tenantId, input));
}

export async function update(req: Request, res: Response) {
  const input = updateGoalSchema.parse(req.body);
  ok(res, await svc.updateGoal(req.user.tenantId, req.params.id, input));
}

export async function remove(req: Request, res: Response) {
  await svc.deleteGoal(req.user.tenantId, req.params.id);
  noContent(res);
}
