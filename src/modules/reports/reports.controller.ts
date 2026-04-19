import { Request, Response } from 'express';
import { ok } from '../../core/utils/response';
import * as svc from './reports.service';

// Default: last 6 months
function defaultRange() {
  const to   = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 5);
  from.setDate(1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { from: fmt(from), to: fmt(to) };
}

function getRange(req: Request) {
  const def = defaultRange();
  const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : def.from;
  const to   = typeof req.query.to   === 'string' && req.query.to   ? req.query.to   : def.to;
  return { from, to };
}

export async function revenueReport(req: Request, res: Response) {
  const { from, to } = getRange(req);
  const data = await svc.getRevenueReport(req.user!.tenantId, from, to);
  ok(res, data);
}

export async function expensesReport(req: Request, res: Response) {
  const { from, to } = getRange(req);
  const data = await svc.getExpensesReport(req.user!.tenantId, from, to);
  ok(res, data);
}

export async function projectsReport(req: Request, res: Response) {
  const { from, to } = getRange(req);
  const data = await svc.getProjectsReport(req.user!.tenantId, from, to);
  ok(res, data);
}

export async function ticketsReport(req: Request, res: Response) {
  const { from, to } = getRange(req);
  const data = await svc.getTicketsReport(req.user!.tenantId, from, to);
  ok(res, data);
}
