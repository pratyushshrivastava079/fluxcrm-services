import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  phone: z.string().max(50).optional(),
  job_title: z.string().max(100).optional(),
  is_admin: z.boolean().default(false),
  role_ids: z.array(z.string().uuid()).optional(),
});

export const updateUserSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  phone: z.string().max(50).optional(),
  job_title: z.string().max(100).optional(),
  is_admin: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  role_ids: z.array(z.string().uuid()).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
