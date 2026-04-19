import { Request, Response } from 'express';
import multer from 'multer';
import * as svc from './expenses.service';
import { createExpenseCategorySchema, createExpenseSchema, updateExpenseSchema } from './expenses.schema';
import { ok, created, noContent } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';

export const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── Categories ────────────────────────────────────────────────────────────────

export async function listCategories(req: Request, res: Response) {
  ok(res, await svc.listCategories(req.user.tenantId));
}

export async function createCategory(req: Request, res: Response) {
  const input = createExpenseCategorySchema.parse(req.body);
  created(res, await svc.createCategory(req.user.tenantId, input));
}

export async function deleteCategory(req: Request, res: Response) {
  await svc.deleteCategory(req.user.tenantId, req.params.id);
  noContent(res);
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function list(req: Request, res: Response) {
  const params = {
    ...parsePagination(req),
    status:      req.query.status      as string,
    customer_id: req.query.customer_id as string,
    category_id: req.query.category_id as string,
    billable:    req.query.billable    as string,
  };
  const result = await svc.listExpenses(req.user.tenantId, params);
  ok(res, result.data, result.meta);
}

export async function get(req: Request, res: Response) {
  ok(res, await svc.getExpense(req.user.tenantId, req.params.id));
}

export async function create(req: Request, res: Response) {
  const input = createExpenseSchema.parse(req.body);
  created(res, await svc.createExpense(req.user.tenantId, req.user.id, input));
}

export async function update(req: Request, res: Response) {
  const input = updateExpenseSchema.parse(req.body);
  ok(res, await svc.updateExpense(req.user.tenantId, req.params.id, input));
}

export async function remove(req: Request, res: Response) {
  await svc.deleteExpense(req.user.tenantId, req.params.id);
  noContent(res);
}

export async function stats(req: Request, res: Response) {
  ok(res, await svc.getExpenseStats(req.user.tenantId));
}

export async function importExpenses(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'CSV file is required' } });
    return;
  }
  const csv      = req.file.buffer.toString('utf-8');
  const simulate = req.body.simulate === 'true' || req.body.simulate === true;
  const rows     = svc.parseExpenseCsv(csv);

  if (rows.length === 0) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'CSV file is empty or has no data rows' } });
    return;
  }

  const result = await svc.importExpenses(req.user.tenantId, req.user.id, rows, simulate);
  ok(res, result);
}
