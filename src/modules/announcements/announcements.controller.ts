import { Request, Response } from 'express';
import { ok, created, noContent } from '../../core/utils/response';
import { createAnnouncementSchema, updateAnnouncementSchema } from './announcements.schema';
import * as svc from './announcements.service';

export async function list(req: Request, res: Response) {
  const data = await svc.listAnnouncements(req.user.tenantId, req.user.id);
  ok(res, data);
}

export async function create(req: Request, res: Response) {
  const input = createAnnouncementSchema.parse(req.body);
  const data  = await svc.createAnnouncement(req.user.tenantId, req.user.id, req.user.isAdmin, input);
  created(res, data);
}

export async function update(req: Request, res: Response) {
  const input = updateAnnouncementSchema.parse(req.body);
  const data  = await svc.updateAnnouncement(req.user.tenantId, req.user.id, req.user.isAdmin, req.params.id, input);
  ok(res, data);
}

export async function remove(req: Request, res: Response) {
  await svc.deleteAnnouncement(req.user.tenantId, req.user.isAdmin, req.params.id);
  noContent(res);
}

export async function markRead(req: Request, res: Response) {
  await svc.markRead(req.params.id, req.user.id);
  ok(res, { ok: true });
}
