import { z } from 'zod';

export const createExpenseCategorySchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().optional(),
});

export const createExpenseSchema = z.object({
  name:         z.string().min(1).max(255),
  amount:       z.coerce.number().min(0),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split('T')[0]),
  currency_id:  z.string().uuid(),
  category_id:  z.string().uuid().optional().nullable(),
  customer_id:  z.string().uuid().optional().nullable(),
  project_id:   z.string().uuid().optional().nullable(),
  tax_id:       z.string().uuid().optional().nullable(),
  note:         z.string().optional(),
  is_billable:  z.boolean().default(false),
  receipt_url:  z.string().url().optional().nullable(),
  reference_no: z.string().max(100).optional().nullable(),
  payment_mode: z.string().max(100).optional().nullable(),
  invoice_id:   z.string().uuid().optional().nullable(),
  tags:         z.array(z.string()).default([]),
});

export const updateExpenseSchema = createExpenseSchema.partial().extend({
  status: z.enum(['pending', 'approved', 'invoiced']).optional(),
});

export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;
export type CreateExpenseInput         = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput         = z.infer<typeof updateExpenseSchema>;
