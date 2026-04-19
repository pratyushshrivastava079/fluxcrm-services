import { z } from 'zod';

export const createItemSchema = z.object({
  description:      z.string().min(1).max(500),
  long_description: z.string().optional(),
  rate:             z.number().min(0),
  unit:             z.string().max(50).optional(),
  tax_id:           z.string().uuid().nullable().optional(),
  tax2_id:          z.string().uuid().nullable().optional(),
  group_id:         z.string().uuid().nullable().optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const createGroupSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().optional(),
});

export const updateGroupSchema = createGroupSchema.partial();

export type CreateItemInput  = z.infer<typeof createItemSchema>;
export type UpdateItemInput  = z.infer<typeof updateItemSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
