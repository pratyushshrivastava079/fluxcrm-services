import { Request, Response } from 'express';
import { ok } from '../../core/utils/response';
import { BadRequestError } from '../../core/utils/response';
import { getCalendarEvents } from './calendar.service';

export async function events(req: Request, res: Response) {
  const year  = parseInt(req.query.year  as string);
  const month = parseInt(req.query.month as string);

  if (!year || !month || month < 1 || month > 12) {
    throw new BadRequestError('Query params year (YYYY) and month (1-12) are required');
  }

  const data = await getCalendarEvents(req.user.tenantId, req.user.id, year, month);
  ok(res, data);
}
