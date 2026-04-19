import { z } from 'zod';

export const currencySchema = z.object({
  code:            z.string().length(3).toUpperCase(),
  name:            z.string().min(1).max(100),
  symbol:          z.string().min(1).max(10),
  exchange_rate:   z.number().positive().default(1),
  decimal_places:  z.number().int().min(0).max(4).default(2),
  symbol_position: z.enum(['before', 'after']).default('before'),
  is_default:      z.boolean().optional(),
});

export const taxRateSchema = z.object({
  name:        z.string().min(1).max(100),
  rate:        z.number().min(0).max(100),
  is_compound: z.boolean().default(false),
  is_default:  z.boolean().default(false),
});

export const paymentModeSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().optional(),
  is_active:   z.boolean().default(true),
});

export const emailTemplateSchema = z.object({
  event_key: z.string().min(1).max(150),
  language:  z.string().default('en'),
  subject:   z.string().min(1).max(255),
  body:      z.string().min(1),
  is_active: z.boolean().default(true),
});

export const generalSettingsSchema = z.record(z.string(), z.string().nullable());

export type CurrencyInput      = z.infer<typeof currencySchema>;
export type TaxRateInput       = z.infer<typeof taxRateSchema>;
export type PaymentModeInput   = z.infer<typeof paymentModeSchema>;
export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;
export type GeneralSettings    = z.infer<typeof generalSettingsSchema>;
