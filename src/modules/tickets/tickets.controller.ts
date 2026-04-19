import { Request, Response } from 'express';
import { ok, created, noContent } from '../../core/utils/response';
import { createTicketSchema, updateTicketSchema, replyTicketSchema } from './tickets.schema';
import * as svc from './tickets.service';

export async function refData(req: Request, res: Response) {
  const [statuses, priorities, departments] = await Promise.all([
    svc.listStatuses(req.user.tenantId),
    svc.listPriorities(req.user.tenantId),
    svc.listDepartments(req.user.tenantId),
  ]);
  ok(res, { statuses, priorities, departments });
}

export async function list(req: Request, res: Response) {
  const params = {
    page:          Number(req.query.page)     || 1,
    perPage:       Number(req.query.per_page) || 25,
    search:        req.query.search as string | undefined,
    status_id:     req.query.status_id     as string | undefined,
    department_id: req.query.department_id as string | undefined,
    assigned_to:   req.query.assigned_to   as string | undefined,
  };
  const data = await svc.listTickets(req.user.tenantId, params);
  ok(res, data.tickets, data.meta);
}

export async function get(req: Request, res: Response) {
  const data = await svc.getTicketById(req.user.tenantId, req.params.id);
  ok(res, data);
}

export async function create(req: Request, res: Response) {
  const input = createTicketSchema.parse(req.body);
  const data  = await svc.createTicket(req.user.tenantId, req.user.id, input);
  created(res, data);
}

export async function update(req: Request, res: Response) {
  const input = updateTicketSchema.parse(req.body);
  const data  = await svc.updateTicket(req.user.tenantId, req.params.id, input);
  ok(res, data);
}

export async function reply(req: Request, res: Response) {
  const input = replyTicketSchema.parse(req.body);
  const data  = await svc.replyToTicket(req.user.tenantId, req.params.id, req.user.id, input);
  created(res, data);
}

export async function remove(req: Request, res: Response) {
  await svc.deleteTicket(req.user.tenantId, req.params.id);
  noContent(res);
}
