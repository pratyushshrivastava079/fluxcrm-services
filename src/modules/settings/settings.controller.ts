import { Request, Response } from 'express';
import { ok, created, noContent } from '../../core/utils/response';
import {
  currencySchema, taxRateSchema, paymentModeSchema,
  emailTemplateSchema, generalSettingsSchema,
} from './settings.schema';
import * as svc from './settings.service';

const tid = (req: Request) => req.user!.tenantId;
const uid = (req: Request) => req.user!.id;

// ── General ───────────────────────────────────────────────────────────────────

export async function getGeneral(req: Request, res: Response) {
  ok(res, await svc.getGeneralSettings(tid(req)));
}

export async function updateGeneral(req: Request, res: Response) {
  const data = generalSettingsSchema.parse(req.body);
  await svc.upsertGeneralSettings(tid(req), data);
  ok(res, { saved: true });
}

// ── Currencies ────────────────────────────────────────────────────────────────

export async function listCurrencies(req: Request, res: Response) {
  ok(res, await svc.listCurrencies(tid(req)));
}

export async function createCurrency(req: Request, res: Response) {
  const input = currencySchema.parse(req.body);
  created(res, await svc.createCurrency(tid(req), input));
}

export async function updateCurrency(req: Request, res: Response) {
  const input = currencySchema.partial().parse(req.body);
  ok(res, await svc.updateCurrency(tid(req), req.params.id, input));
}

export async function deleteCurrency(req: Request, res: Response) {
  await svc.deleteCurrency(tid(req), req.params.id);
  noContent(res);
}

// ── Tax Rates ─────────────────────────────────────────────────────────────────

export async function listTaxRates(req: Request, res: Response) {
  ok(res, await svc.listTaxRates(tid(req)));
}

export async function createTaxRate(req: Request, res: Response) {
  const input = taxRateSchema.parse(req.body);
  created(res, await svc.createTaxRate(tid(req), input));
}

export async function updateTaxRate(req: Request, res: Response) {
  const input = taxRateSchema.partial().parse(req.body);
  ok(res, await svc.updateTaxRate(tid(req), req.params.id, input));
}

export async function deleteTaxRate(req: Request, res: Response) {
  await svc.deleteTaxRate(tid(req), req.params.id);
  noContent(res);
}

// ── Payment Modes ─────────────────────────────────────────────────────────────

export async function listPaymentModes(req: Request, res: Response) {
  ok(res, await svc.listPaymentModes(tid(req)));
}

export async function createPaymentMode(req: Request, res: Response) {
  const input = paymentModeSchema.parse(req.body);
  created(res, await svc.createPaymentMode(tid(req), input));
}

export async function updatePaymentMode(req: Request, res: Response) {
  const input = paymentModeSchema.partial().parse(req.body);
  ok(res, await svc.updatePaymentMode(tid(req), req.params.id, input));
}

export async function deletePaymentMode(req: Request, res: Response) {
  await svc.deletePaymentMode(tid(req), req.params.id);
  noContent(res);
}

// ── Email Templates ───────────────────────────────────────────────────────────

export async function listEmailTemplates(req: Request, res: Response) {
  ok(res, await svc.listEmailTemplates(tid(req)));
}

export async function getEmailTemplate(req: Request, res: Response) {
  ok(res, await svc.getEmailTemplate(tid(req), req.params.id));
}

export async function upsertEmailTemplate(req: Request, res: Response) {
  const input = emailTemplateSchema.parse(req.body);
  ok(res, await svc.upsertEmailTemplate(tid(req), input, uid(req)));
}

export async function updateEmailTemplate(req: Request, res: Response) {
  const input = emailTemplateSchema.partial().parse(req.body);
  ok(res, await svc.updateEmailTemplate(tid(req), req.params.id, input, uid(req)));
}

export async function deleteEmailTemplate(req: Request, res: Response) {
  await svc.deleteEmailTemplate(tid(req), req.params.id);
  noContent(res);
}
