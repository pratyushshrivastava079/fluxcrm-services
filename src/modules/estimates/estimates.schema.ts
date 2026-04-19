import { z } from 'zod';

export const estimateItemSchema = z.object({
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

export const createEstimateSchema = z.object({
  customer_id:   z.string().uuid(),
  project_id:    z.string().uuid().nullable().optional(),
  currency_id:   z.string().uuid(),
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split('T')[0]),
  expiry_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reference:     z.string().max(100).optional(),
  discount:      z.number().min(0).default(0),
  discount_type: z.enum(['percent', 'fixed']).default('percent'),
  adjustment:    z.number().default(0),
  notes:         z.string().optional(),
  terms:         z.string().optional(),
  tags:          z.array(z.string()).default([]),
  items:         z.array(estimateItemSchema).min(1),
});

export const updateEstimateSchema = createEstimateSchema.partial();

export type EstimateItemInput  = z.infer<typeof estimateItemSchema>;
export type CreateEstimateInput = z.infer<typeof createEstimateSchema>;
export type UpdateEstimateInput = z.infer<typeof updateEstimateSchema>;
