import { z } from 'zod';

export const invoiceItemSchema = z.object({
  id:            z.string().uuid().optional(),
  description:   z.string().min(1),
  long_desc:     z.string().nullable().optional(),
  qty:           z.number().positive().default(1),
  unit:          z.string().max(50).nullable().optional(),
  rate:          z.number().min(0).default(0),
  tax_id:        z.string().uuid().nullable().optional(),
  tax2_id:       z.string().uuid().nullable().optional(),
  discount:      z.number().min(0).default(0),
  discount_type: z.enum(['percent', 'fixed']).default('percent'),
  sort_order:    z.number().int().default(0),
});

export const createInvoiceSchema = z.object({
  customer_id:   z.string().uuid(),
  project_id:    z.string().uuid().nullable().optional(),
  currency_id:   z.string().uuid(),
  assigned_to:   z.string().uuid().nullable().optional(),
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reference:     z.string().max(100).optional(),
  discount:      z.number().min(0).default(0),
  discount_type: z.enum(['percent', 'fixed']).default('percent'),
  adjustment:    z.number().default(0),
  notes:         z.string().optional(),
  terms:         z.string().optional(),
  admin_note:    z.string().optional(),
  is_recurring:  z.boolean().optional(),
  tags:          z.array(z.string()).default([]),
  items:         z.array(invoiceItemSchema).min(1),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export const recordPaymentSchema = z.object({
  amount:          z.number().positive(),
  date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payment_mode_id: z.string().uuid().optional(),
  transaction_id:  z.string().max(255).optional(),
  note:            z.string().optional(),
});

export type CreateInvoiceInput  = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput  = z.infer<typeof updateInvoiceSchema>;
export type RecordPaymentInput  = z.infer<typeof recordPaymentSchema>;
export type InvoiceItemInput    = z.infer<typeof invoiceItemSchema>;
