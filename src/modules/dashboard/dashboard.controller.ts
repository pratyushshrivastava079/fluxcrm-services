import { Request, Response } from 'express';
import { ok } from '../../core/utils/response';
import { getDashboardStats } from './dashboard.service';

export async function statsHandler(req: Request, res: Response): Promise<void> {
  const stats = await getDashboardStats(req.user.tenantId, req.user.id);
  ok(res, stats);
}
