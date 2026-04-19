import { z } from 'zod';

export const createGroupSchema = z.object({
  name:             z.string().min(1).max(255),
  description:      z.string().optional(),
  icon:             z.string().max(100).optional(),
  sort_order:       z.coerce.number().int().default(0),
  is_active:        z.boolean().default(true),
  visible_to_client: z.boolean().default(true),
});

export const updateGroupSchema = createGroupSchema.partial();

export const createArticleSchema = z.object({
  group_id:         z.string().uuid(),
  title:            z.string().min(1).max(255),
  content:          z.string().min(1),
  slug:             z.string().max(255).optional(), // auto-generated if omitted
  is_active:        z.boolean().default(true),
  visible_to_client: z.boolean().default(true),
  sort_order:       z.coerce.number().int().default(0),
});

export const updateArticleSchema = createArticleSchema.partial();

export type CreateGroupInput   = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput   = z.infer<typeof updateGroupSchema>;
export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
