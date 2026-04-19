import { z } from 'zod';

export const proposalItemSchema = z.object({
  id:            z.string().uuid().optional(),
  description:   z.string().min(1),
  long_desc:     z.string().optional().nullable(),
  qty:           z.number().positive().default(1),
  unit:          z.string().max(50).optional().nullable(),
  rate:          z.number().min(0).default(0),
  tax_id:        z.string().uuid().nullable().optional(),
  tax2_id:       z.string().uuid().nullable().optional(),
  discount:      z.number().min(0).default(0),
  discount_type: z.enum(['percent', 'fixed']).default('percent'),
  is_optional:   z.boolean().default(false),
  sort_order:    z.number().int().default(0),
});

export const CreateProposalSchema = z.object({
  subject:        z.string().min(1).max(255),
  to_type:        z.enum(['lead', 'customer']),
  to_id:          z.string().uuid(),
  to_name:        z.string().max(255).optional().nullable(),
  to_email:       z.string().max(255).optional().nullable(),
  to_phone:       z.string().max(50).optional().nullable(),
  to_address:     z.string().optional().nullable(),
  to_city:        z.string().max(100).optional().nullable(),
  to_state:       z.string().max(100).optional().nullable(),
  to_zip:         z.string().max(20).optional().nullable(),
  to_country:     z.string().max(100).optional().nullable(),
  content:        z.string().default(''),
  date:           z.string().optional(),
  open_till:      z.string().optional().nullable(),
  discount:       z.coerce.number().min(0).default(0),
  discount_type:  z.enum(['percent', 'fixed']).default('percent'),
  adjustment:     z.coerce.number().default(0),
  total:          z.coerce.number().min(0).default(0),
  currency_id:    z.string().uuid().optional().nullable(),
  assigned_to:    z.string().uuid().optional().nullable(),
  allow_comments: z.boolean().default(false),
  items:          z.array(proposalItemSchema).optional(),
});

export const UpdateProposalSchema = CreateProposalSchema.partial();

export const SignProposalSchema = z.object({
  signer_name:    z.string().min(1).max(255),
  signature_data: z.string().min(1),
});

export type ProposalItemInput   = z.infer<typeof proposalItemSchema>;
export type CreateProposalInput = z.infer<typeof CreateProposalSchema>;
export type UpdateProposalInput = z.infer<typeof UpdateProposalSchema>;
export type SignProposalInput   = z.infer<typeof SignProposalSchema>;
