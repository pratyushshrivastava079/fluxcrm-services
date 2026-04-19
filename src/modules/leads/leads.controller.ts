import { Request, Response } from 'express';
import { parsePagination } from '../../core/utils/pagination';
import { ok, created, noContent } from '../../core/utils/response';
import * as svc from './leads.service';
import { CreateLeadSchema, UpdateLeadSchema, UpdateLeadStatusSchema } from './leads.schema';

export async function listLeads(req: Request, res: Response) {
  const params = parsePagination(req);
  const status_id = req.query.status_id ? String(req.query.status_id) : undefined;
  const data = await svc.listLeads(req.tenant.id, { ...params, status_id });
  ok(res, data);
}

export async function getStatusStats(req: Request, res: Response) {
  const data = await svc.getLeadStatusStats(req.tenant.id);
  ok(res, data);
}

export async function getBoard(req: Request, res: Response) {
  const data = await svc.getLeadBoardData(req.tenant.id);
  ok(res, data);
}

export async function getLead(req: Request, res: Response) {
  const data = await svc.getLeadById(req.tenant.id, req.params.id);
  ok(res, data);
}

export async function getStatuses(req: Request, res: Response) {
  const data = await svc.listLeadStatuses(req.tenant.id);
  ok(res, data);
}

export async function getSources(req: Request, res: Response) {
  const data = await svc.listLeadSources(req.tenant.id);
  ok(res, data);
}

export async function createLead(req: Request, res: Response) {
  const input = CreateLeadSchema.parse(req.body);
  const data = await svc.createLead(req.tenant.id, req.user.id, input);
  created(res, data);
}

export async function updateLead(req: Request, res: Response) {
  const input = UpdateLeadSchema.parse(req.body);
  const data = await svc.updateLead(req.tenant.id, req.params.id, input);
  ok(res, data);
}

export async function updateLeadStatus(req: Request, res: Response) {
  const input = UpdateLeadStatusSchema.parse(req.body);
  const data = await svc.updateLeadStatus(req.tenant.id, req.params.id, input);
  ok(res, data);
}

export async function deleteLead(req: Request, res: Response) {
  await svc.deleteLead(req.tenant.id, req.params.id);
  noContent(res);
}

export async function convertLead(req: Request, res: Response) {
  const data = await svc.convertLeadToCustomer(req.tenant.id, req.params.id, req.user.id);
  ok(res, data);
}
