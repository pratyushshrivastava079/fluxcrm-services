import { z } from 'zod';

export const createTaskSchema = z.object({
  name:            z.string().min(1).max(255),
  project_id:      z.string().uuid().optional(),
  milestone_id:    z.string().uuid().optional(),
  status_id:       z.string().uuid(),
  description:     z.string().optional(),
  priority:        z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  start_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimated_hours: z.number().min(0).optional(),
  is_billable:     z.boolean().default(false),
  hourly_rate:     z.number().min(0).optional(),
  assignees:       z.array(z.string().uuid()).optional(),
  tags:            z.array(z.string()).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
