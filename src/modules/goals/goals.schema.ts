import { z } from 'zod';

export const GOAL_TYPES = ['invoiced_amount', 'new_customers', 'new_contracts', 'manual'] as const;

export const createGoalSchema = z.object({
  title:        z.string().min(1).max(255),
  type:         z.enum(GOAL_TYPES),
  start_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  target_value: z.coerce.number().positive(),
  current_value: z.coerce.number().min(0).default(0),  // only used for manual goals
  is_active:    z.boolean().default(true),
});

export const updateGoalSchema = createGoalSchema.partial();

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
