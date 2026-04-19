import { z } from 'zod';

const itemSchema = z.object({
  description:   z.string().min(1),
  long_desc:     z.string().nullable().optional(),
  qty:           z.number().positive(),
  unit:          z.string().max(50).nullable().optional(),
  rate:          z.number().min(0),
  tax_id:        z.string().uuid().nullable().optional(),
  discount:      z.number().min(0).default(0),
  discount_type: z.enum(['percent', 'fixed']).default('percent'),
  sort_order:    z.number().int().default(0),
});

export const createCreditNoteSchema = z.object({
  customer_id:   z.string().uuid(),
  invoice_id:    z.string().uuid().nullable().optional(),
  currency_id:   z.string().uuid().optional(),
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  reference:     z.string().max(255).optional(),
  discount:      z.number().min(0).default(0),
  discount_type: z.enum(['percent', 'fixed']).default('percent'),
  adjustment:    z.number().default(0),
  notes:         z.string().optional(),
  terms:         z.string().optional(),
  admin_note:    z.string().optional(),
  project_id:    z.string().uuid().nullable().optional(),
  tags:          z.array(z.string()).default([]),
  items:         z.array(itemSchema).min(1),
});

export const updateCreditNoteSchema = createCreditNoteSchema.partial();

export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>;
export type UpdateCreditNoteInput = z.infer<typeof updateCreditNoteSchema>;
