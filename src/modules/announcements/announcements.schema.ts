import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title:     z.string().min(1).max(255),
  content:   z.string().optional(),
  is_active: z.boolean().default(true),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
