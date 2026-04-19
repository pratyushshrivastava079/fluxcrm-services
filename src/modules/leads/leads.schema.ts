import { z } from 'zod';

// Coerce empty string → null so optional string fields work with HTML forms
const nullableStr = (inner: z.ZodString) =>
  z.preprocess((v) => (v === '' ? null : v), inner.optional().nullable());

export const CreateLeadSchema = z.object({
  first_name:           z.string().min(1).max(100),
  last_name:            z.string().max(100).default(''),
  email:                nullableStr(z.string().email()),
  phone:                nullableStr(z.string().max(50)),
  company:              nullableStr(z.string().max(255)),
  website:              nullableStr(z.string().url()),
  address:              nullableStr(z.string().max(500)),
  city:                 nullableStr(z.string().max(100)),
  state:                nullableStr(z.string().max(100)),
  zip:                  nullableStr(z.string().max(20)),
  country:              nullableStr(z.string().length(2)),
  value:                z.coerce.number().min(0).default(0),
  currency:             z.string().length(3).default('USD'),
  description:          nullableStr(z.string()),
  status_id:            z.string().uuid().optional(),
  source_id:            z.string().uuid().optional().nullable(),
  assigned_to:          z.string().uuid().optional().nullable(),
  expected_close_date:  nullableStr(z.string()),
});

export const UpdateLeadSchema = CreateLeadSchema.partial();

export const UpdateLeadStatusSchema = z.object({
  status_id:       z.string().uuid(),
  kanban_position: z.number().int().min(0).optional(),
});

export type CreateLeadInput       = z.infer<typeof CreateLeadSchema>;
export type UpdateLeadInput       = z.infer<typeof UpdateLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof UpdateLeadStatusSchema>;
