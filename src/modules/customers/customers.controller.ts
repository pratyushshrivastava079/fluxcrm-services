import { Request, Response } from 'express';
import multer from 'multer';
import * as svc from './customers.service';
import { createCustomerSchema, updateCustomerSchema } from './customers.schema';
import { ok, created, noContent, BadRequestError } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';

export const uploadCSV = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) cb(null, true);
    else cb(new Error('Only CSV files are allowed'));
  },
}).single('file');

export async function list(req: Request, res: Response) {
  const params = parsePagination(req);
  const { customers, meta } = await svc.listCustomers(req.user.tenantId, params);
  ok(res, customers, meta);
}

export async function stats(req: Request, res: Response) {
  const data = await svc.getCustomerStats(req.user.tenantId);
  ok(res, data);
}

export async function show(req: Request, res: Response) {
  const customer = await svc.getCustomer(req.user.tenantId, req.params.id);
  ok(res, customer);
}

export async function create(req: Request, res: Response) {
  const input = createCustomerSchema.parse(req.body);
  const customer = await svc.createCustomer(req.user.tenantId, input);
  created(res, customer);
}

export async function update(req: Request, res: Response) {
  const input = updateCustomerSchema.parse(req.body);
  const customer = await svc.updateCustomer(req.user.tenantId, req.params.id, input);
  ok(res, customer);
}

export async function destroy(req: Request, res: Response) {
  await svc.deleteCustomer(req.user.tenantId, req.params.id);
  noContent(res);
}

export async function importCSV(req: Request, res: Response) {
  if (!req.file) throw new BadRequestError('No CSV file uploaded');
  const csvText = req.file.buffer.toString('utf-8');
  const simulate = req.query.simulate === 'true';
  const result = await svc.importCustomers(req.user.tenantId, csvText, simulate);
  ok(res, result);
}
