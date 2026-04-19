import { z } from 'zod';

export const createReminderSchema = z.object({
  title:        z.string().min(1).max(255),
  description:  z.string().optional(),
  remind_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  remind_time:  z.string().regex(/^\d{2}:\d{2}$/).optional(),
  related_type: z.enum(['lead', 'customer', 'invoice', 'project', 'task']).optional(),
  related_id:   z.string().uuid().optional(),
});

export const updateReminderSchema = createReminderSchema.partial().extend({
  is_done: z.boolean().optional(),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
