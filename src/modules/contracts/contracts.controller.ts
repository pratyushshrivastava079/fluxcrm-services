import { Request, Response } from 'express';
import { ok, created, noContent } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';
import { createContractSchema, updateContractSchema } from './contracts.schema';
import * as svc from './contracts.service';

export async function stats(req: Request, res: Response) {
  ok(res, await svc.getContractStats(req.user.tenantId));
}

export async function types(req: Request, res: Response) {
  ok(res, await svc.listContractTypes(req.user.tenantId));
}

export async function createType(req: Request, res: Response) {
  const { name } = req.body;
  if (!name?.trim()) { res.status(400).json({ message: 'Name is required' }); return; }
  created(res, await svc.createContractType(req.user.tenantId, name.trim()));
}

export async function list(req: Request, res: Response) {
  const params = {
    ...parsePagination(req),
    status:      req.query.status      as string | undefined,
    customer_id: req.query.customer_id as string | undefined,
  };
  const data = await svc.listContracts(req.user.tenantId, params);
  ok(res, data.contracts, data.meta);
}

export async function get(req: Request, res: Response) {
  ok(res, await svc.getContractById(req.user.tenantId, req.params.id));
}

export async function create(req: Request, res: Response) {
  const input = createContractSchema.parse(req.body);
  created(res, await svc.createContract(req.user.tenantId, input));
}

export async function update(req: Request, res: Response) {
  const input = updateContractSchema.parse(req.body);
  ok(res, await svc.updateContract(req.user.tenantId, req.params.id, input));
}

export async function remove(req: Request, res: Response) {
  await svc.deleteContract(req.user.tenantId, req.params.id);
  noContent(res);
}
