import { Request, Response } from 'express';
import * as svc from './subscriptions.service';
import { createSubscriptionSchema, updateSubscriptionSchema } from './subscriptions.schema';
import { ok, created, noContent } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';

export async function list(req: Request, res: Response) {
  const params = {
    ...parsePagination(req),
    status:      req.query.status      as string,
    customer_id: req.query.customer_id as string,
  };
  const result = await svc.listSubscriptions(req.user.tenantId, params);
  ok(res, result.data, result.meta);
}

export async function get(req: Request, res: Response) {
  ok(res, await svc.getSubscription(req.user.tenantId, req.params.id));
}

export async function create(req: Request, res: Response) {
  const input = createSubscriptionSchema.parse(req.body);
  created(res, await svc.createSubscription(req.user.tenantId, input));
}

export async function update(req: Request, res: Response) {
  const input = updateSubscriptionSchema.parse(req.body);
  ok(res, await svc.updateSubscription(req.user.tenantId, req.params.id, input));
}

export async function remove(req: Request, res: Response) {
  await svc.deleteSubscription(req.user.tenantId, req.params.id);
  noContent(res);
}

export async function changeStatus(req: Request, res: Response) {
  const { status } = req.body as {
    status: 'active' | 'trialing' | 'paused' | 'past_due' | 'cancelled' | 'expired';
  };
  ok(res, await svc.updateStatus(req.user.tenantId, req.params.id, status));
}

export async function stats(req: Request, res: Response) {
  ok(res, await svc.getSubscriptionStats(req.user.tenantId));
}
