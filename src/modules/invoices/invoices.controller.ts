import { Request, Response } from 'express';
import * as svc from './invoices.service';
import {
  createInvoiceSchema, updateInvoiceSchema, recordPaymentSchema,
} from './invoices.schema';
import { ok, created, noContent } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';

export async function stats(req: Request, res: Response) {
  ok(res, await svc.getInvoiceStats(req.user.tenantId));
}

export async function list(req: Request, res: Response) {
  const params = { ...parsePagination(req), status: req.query.status as string, customer_id: req.query.customer_id as string };
  const result = await svc.listInvoices(req.user.tenantId, params);
  ok(res, result.invoices, result.meta);
}

export async function get(req: Request, res: Response) {
  const data = await svc.getInvoice(req.user.tenantId, req.params.id);
  ok(res, data);
}

export async function create(req: Request, res: Response) {
  const input = createInvoiceSchema.parse(req.body);
  const data  = await svc.createInvoice(req.user.tenantId, req.user.id, input);
  created(res, data);
}

export async function update(req: Request, res: Response) {
  const input = updateInvoiceSchema.parse(req.body);
  const data  = await svc.updateInvoice(req.user.tenantId, req.params.id, input);
  ok(res, data);
}

export async function remove(req: Request, res: Response) {
  await svc.deleteInvoice(req.user.tenantId, req.params.id);
  noContent(res);
}

export async function send(req: Request, res: Response) {
  const data = await svc.sendInvoice(req.user.tenantId, req.params.id);
  ok(res, data);
}

export async function recordPayment(req: Request, res: Response) {
  const input = recordPaymentSchema.parse(req.body);
  await svc.recordPayment(req.user.tenantId, req.params.id, input);
  noContent(res);
}

export async function downloadPdf(req: Request, res: Response) {
  const pdf = await svc.generateInvoicePdf(req.user.tenantId, req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.id}.pdf"`);
  res.send(pdf);
}

export async function stripeIntent(req: Request, res: Response) {
  const data = await svc.createStripePaymentIntent(req.user.tenantId, req.params.id);
  ok(res, data);
}

export async function taxRates(req: Request, res: Response) {
  ok(res, await svc.getTaxRates(req.user.tenantId));
}

export async function currencies(req: Request, res: Response) {
  ok(res, await svc.getCurrencies(req.user.tenantId));
}

export async function paymentModes(req: Request, res: Response) {
  ok(res, await svc.getPaymentModes(req.user.tenantId));
}

// ── Activity log ──────────────────────────────────────────────────────────────

export async function listActivities(req: Request, res: Response) {
  ok(res, await svc.listInvoiceActivities(req.user.tenantId, req.params.id));
}

export async function addNote(req: Request, res: Response) {
  const { description } = req.body;
  if (!description?.trim()) { res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'description required' } }); return; }
  created(res, await svc.addInvoiceNote(req.user.tenantId, req.user.id, req.params.id, description));
}

export async function deleteActivity(req: Request, res: Response) {
  await svc.deleteInvoiceActivity(req.user.tenantId, req.params.activityId);
  noContent(res);
}

// ── Reminders ─────────────────────────────────────────────────────────────────

export async function listInvoiceReminders(req: Request, res: Response) {
  ok(res, await svc.listInvoiceReminders(req.user.tenantId, req.params.id));
}

export async function createInvoiceReminder(req: Request, res: Response) {
  const { title, description, remind_date, remind_time } = req.body;
  created(res, await svc.createInvoiceReminder(req.user.tenantId, req.user.id, req.params.id, { title, description, remind_date, remind_time }));
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function listInvoiceTasks(req: Request, res: Response) {
  ok(res, await svc.listInvoiceTasks(req.user.tenantId, req.params.id));
}
