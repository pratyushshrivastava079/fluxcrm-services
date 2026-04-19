import { Request, Response } from 'express';
import multer from 'multer';
import * as svc from './items.service';
import { createItemSchema, updateItemSchema, createGroupSchema, updateGroupSchema } from './items.schema';
import { ok, created, noContent } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';

export const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── Items ─────────────────────────────────────────────────────────────────────

export async function list(req: Request, res: Response) {
  const result = await svc.listItems(req.user.tenantId, {
    ...parsePagination(req),
    group_id: req.query.group_id as string,
  });
  ok(res, result.data, result.meta);
}

export async function get(req: Request, res: Response) {
  ok(res, await svc.getItem(req.user.tenantId, req.params.id));
}

export async function create(req: Request, res: Response) {
  const input = createItemSchema.parse(req.body);
  created(res, await svc.createItem(req.user.tenantId, input));
}

export async function update(req: Request, res: Response) {
  const input = updateItemSchema.parse(req.body);
  ok(res, await svc.updateItem(req.user.tenantId, req.params.id, input));
}

export async function remove(req: Request, res: Response) {
  await svc.deleteItem(req.user.tenantId, req.params.id);
  noContent(res);
}

export async function bulkDelete(req: Request, res: Response) {
  const { ids } = req.body as { ids: string[] };
  await svc.bulkDeleteItems(req.user.tenantId, ids);
  noContent(res);
}

// ── Groups ────────────────────────────────────────────────────────────────────

export async function listGroups(req: Request, res: Response) {
  ok(res, await svc.listGroups(req.user.tenantId));
}

export async function createGroup(req: Request, res: Response) {
  const input = createGroupSchema.parse(req.body);
  created(res, await svc.createGroup(req.user.tenantId, input));
}

export async function updateGroup(req: Request, res: Response) {
  const input = updateGroupSchema.parse(req.body);
  ok(res, await svc.updateGroup(req.user.tenantId, req.params.id, input));
}

export async function deleteGroup(req: Request, res: Response) {
  await svc.deleteGroup(req.user.tenantId, req.params.id);
  noContent(res);
}

// ── Reference ─────────────────────────────────────────────────────────────────

export async function taxRates(req: Request, res: Response) {
  ok(res, await svc.getTaxRates(req.user.tenantId));
}

// ── CSV Import ─────────────────────────────────────────────────────────────────

export async function importItems(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'CSV file is required' } });
    return;
  }
  const csv      = req.file.buffer.toString('utf-8');
  const simulate = req.body.simulate === 'true' || req.body.simulate === true;
  const rows     = svc.parseCsv(csv);

  if (rows.length === 0) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'CSV file is empty or has no data rows' } });
    return;
  }

  const result = await svc.importItems(req.user.tenantId, rows, simulate);
  ok(res, result);
}
