import { Request, Response } from 'express';
import * as svc from './contacts.service';
import { createContactSchema, updateContactSchema } from './customers.schema';
import { ok, created, noContent } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';

export async function list(req: Request, res: Response) {
  const params = parsePagination(req);
  const { contacts, meta } = await svc.listContacts(
    req.user.tenantId, req.params.customerId, params,
  );
  ok(res, contacts, meta);
}

export async function show(req: Request, res: Response) {
  const contact = await svc.getContact(
    req.user.tenantId, req.params.customerId, req.params.id,
  );
  ok(res, contact);
}

export async function create(req: Request, res: Response) {
  const input = createContactSchema.parse(req.body);
  const contact = await svc.createContact(req.user.tenantId, req.params.customerId, input);
  created(res, contact);
}

export async function update(req: Request, res: Response) {
  const input = updateContactSchema.parse(req.body);
  const contact = await svc.updateContact(
    req.user.tenantId, req.params.customerId, req.params.id, input,
  );
  ok(res, contact);
}

export async function destroy(req: Request, res: Response) {
  await svc.deleteContact(req.user.tenantId, req.params.customerId, req.params.id);
  noContent(res);
}
