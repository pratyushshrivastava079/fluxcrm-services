import { z } from 'zod';

export const listPaymentsSchema = z.object({
  page:        z.coerce.number().int().positive().default(1),
  per_page:    z.coerce.number().int().positive().max(100).default(25),
  search:      z.string().optional(),
  customer_id: z.string().uuid().optional(),
  sort_by:     z.enum(['date', 'amount', 'created_at']).default('created_at'),
  sort_dir:    z.enum(['asc', 'desc']).default('desc'),
});

export type ListPaymentsInput = z.infer<typeof listPaymentsSchema>;
