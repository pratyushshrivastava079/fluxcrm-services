import { z } from 'zod';

export const createTicketSchema = z.object({
  subject:       z.string().min(1).max(255),
  customer_id:   z.string().uuid(),
  contact_id:    z.string().uuid().optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  service_id:    z.string().uuid().optional().nullable(),
  priority_id:   z.string().uuid(),
  assigned_to:   z.string().uuid().optional().nullable(),
  message:       z.string().min(1),          // initial reply content
});

export const updateTicketSchema = z.object({
  subject:       z.string().min(1).max(255).optional(),
  department_id: z.string().uuid().optional().nullable(),
  service_id:    z.string().uuid().optional().nullable(),
  status_id:     z.string().uuid().optional(),
  priority_id:   z.string().uuid().optional(),
  assigned_to:   z.string().uuid().optional().nullable(),
});

export const replyTicketSchema = z.object({
  content:          z.string().min(1),
  is_internal_note: z.boolean().default(false),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type ReplyTicketInput  = z.infer<typeof replyTicketSchema>;
