import { z } from 'zod';

export const createProjectSchema = z.object({
  name:           z.string().min(1).max(255),
  description:    z.string().optional(),
  customer_id:    z.string().uuid().optional(),
  billing_type:   z.enum(['fixed_cost', 'project_hours', 'task_hours', 'not_billable']).default('not_billable'),
  fixed_rate:     z.number().min(0).optional(),
  hourly_rate:    z.number().min(0).optional(),
  currency_id:    z.string().uuid().optional(),
  status:         z.enum(['not_started', 'in_progress', 'on_hold', 'cancelled', 'finished']).default('not_started'),
  start_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  deadline:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimated_hours: z.number().min(0).optional(),
  budget_amount:  z.number().min(0).optional(),
  color:          z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  members:        z.array(z.object({ user_id: z.string().uuid(), is_project_manager: z.boolean().default(false) })).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
