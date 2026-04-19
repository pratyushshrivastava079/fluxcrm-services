import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  customer_id:      z.string().uuid(),
  name:             z.string().min(1).max(255),
  description:      z.string().optional(),
  quantity:         z.coerce.number().positive().default(1),
  unit_price:       z.coerce.number().min(0),
  currency_id:      z.string().uuid(),
  tax_id:           z.string().uuid().optional().nullable(),
  tax2_id:          z.string().uuid().optional().nullable(),
  recurrence_type:  z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'biannual', 'annual']),
  start_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes:            z.string().optional(),
  terms:            z.string().optional().nullable(),
  include_description_in_invoice: z.boolean().optional().default(false),
});

export const updateSubscriptionSchema = createSubscriptionSchema.partial().extend({
  status: z.enum(['active', 'trialing', 'paused', 'past_due', 'cancelled', 'expired']).optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
