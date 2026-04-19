import { z } from 'zod';

export const startTimerSchema = z.object({
  task_id:     z.string().uuid(),
  project_id:  z.string().uuid(),
  note:        z.string().optional(),
  is_billable: z.boolean().default(false),
  hourly_rate: z.number().min(0).default(0),
});

export const stopTimerSchema = z.object({
  note: z.string().optional(),
});

export const logTimeSchema = z.object({
  task_id:     z.string().uuid(),
  project_id:  z.string().uuid(),
  start_time:  z.string().datetime(),
  end_time:    z.string().datetime(),
  note:        z.string().optional(),
  is_billable: z.boolean().default(false),
  hourly_rate: z.number().min(0).default(0),
});

export type StartTimerInput = z.infer<typeof startTimerSchema>;
export type StopTimerInput  = z.infer<typeof stopTimerSchema>;
export type LogTimeInput    = z.infer<typeof logTimeSchema>;
