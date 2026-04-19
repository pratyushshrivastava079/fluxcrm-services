import { Request, Response } from 'express';
import { ok } from '../../core/utils/response';
import { listPaymentsSchema } from './payments.schema';
import * as svc from './payments.service';

export async function list(req: Request, res: Response) {
  const params = listPaymentsSchema.parse({
    page:        req.query.page,
    per_page:    req.query.per_page,
    search:      req.query.search,
    customer_id: req.query.customer_id,
    sort_by:     req.query.sort_by,
    sort_dir:    req.query.sort_dir,
  });
  const result = await svc.listPayments(req.user.tenantId, params);
  ok(res, result.data, result.meta);
}
