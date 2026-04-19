import { z } from 'zod';

export const createContractSchema = z.object({
  subject:     z.string().min(1).max(255),
  customer_id: z.string().uuid(),
  type_id:     z.string().uuid().optional().nullable(),
  currency_id: z.string().uuid().optional().nullable(),
  value:       z.coerce.number().min(0).optional().nullable(),
  content:     z.string().default(''),
  start_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  end_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status:      z.enum(['draft', 'active', 'expired', 'terminated', 'renewed']).default('draft'),
  not_visible_to_client: z.boolean().default(false),
});

export const updateContractSchema = createContractSchema.partial();

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
