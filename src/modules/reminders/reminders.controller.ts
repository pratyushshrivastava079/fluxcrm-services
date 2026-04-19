import { Request, Response } from 'express';
import { ok, created, noContent } from '../../core/utils/response';
import { createReminderSchema, updateReminderSchema } from './reminders.schema';
import * as svc from './reminders.service';

export async function list(req: Request, res: Response) {
  const filter = (req.query.filter as 'upcoming' | 'done' | 'all') || 'all';
  const data = await svc.listReminders(req.user.tenantId, req.user.id, filter);
  ok(res, data);
}

export async function create(req: Request, res: Response) {
  const input = createReminderSchema.parse(req.body);
  const data  = await svc.createReminder(req.user.tenantId, req.user.id, input);
  created(res, data);
}

export async function update(req: Request, res: Response) {
  const input = updateReminderSchema.parse(req.body);
  const data  = await svc.updateReminder(req.user.tenantId, req.user.id, req.params.id, input);
  ok(res, data);
}

export async function toggleDone(req: Request, res: Response) {
  const data = await svc.toggleReminderDone(req.user.tenantId, req.user.id, req.params.id);
  ok(res, data);
}

export async function remove(req: Request, res: Response) {
  await svc.deleteReminder(req.user.tenantId, req.user.id, req.params.id);
  noContent(res);
}
