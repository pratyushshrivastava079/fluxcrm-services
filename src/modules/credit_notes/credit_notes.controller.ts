import { Request, Response } from 'express';
import * as svc from './credit_notes.service';
import { createCreditNoteSchema, updateCreditNoteSchema } from './credit_notes.schema';
import { ok, created, noContent } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';

export async function list(req: Request, res: Response) {
  const params = {
    ...parsePagination(req),
    status:      req.query.status      as string,
    customer_id: req.query.customer_id as string,
  };
  const result = await svc.listCreditNotes(req.user.tenantId, params);
  ok(res, result.data, result.meta);
}

export async function get(req: Request, res: Response) {
  ok(res, await svc.getCreditNote(req.user.tenantId, req.params.id));
}

export async function create(req: Request, res: Response) {
  const input = createCreditNoteSchema.parse(req.body);
  created(res, await svc.createCreditNote(req.user.tenantId, req.user.id, input));
}

export async function update(req: Request, res: Response) {
  const input = updateCreditNoteSchema.parse(req.body);
  ok(res, await svc.updateCreditNote(req.user.tenantId, req.params.id, input));
}

export async function remove(req: Request, res: Response) {
  await svc.deleteCreditNote(req.user.tenantId, req.params.id);
  noContent(res);
}

export async function updateStatus(req: Request, res: Response) {
  const { status } = req.body as { status: 'open' | 'closed' | 'void' };
  ok(res, await svc.updateCreditNoteStatus(req.user.tenantId, req.params.id, status));
}

export async function stats(req: Request, res: Response) {
  ok(res, await svc.getCreditNoteStats(req.user.tenantId));
}

export async function taxRates(req: Request, res: Response) {
  ok(res, await svc.getTaxRates(req.user.tenantId));
}

export async function currencies(req: Request, res: Response) {
  ok(res, await svc.getCurrencies(req.user.tenantId));
}
