import { z } from 'zod';

// ── Customer ──────────────────────────────────────────────────────────────────
// Helper: treat empty string as undefined for optional fields
const optStr = (max: number) => z.string().max(max).optional().or(z.literal(''));

export const createCustomerSchema = z.object({
  company_name:     z.string().min(1).max(255),
  vat_number:       optStr(100),
  website:          z.string().url().optional().or(z.literal('')),
  phone:            optStr(50),
  address_line1:    optStr(255),
  address_line2:    optStr(255),
  city:             optStr(100),
  state:            optStr(100),
  zip:              optStr(20),
  country:          optStr(100),          // accepts full name or ISO code
  default_currency: z.string().max(3).default('USD'),
  default_language: z.string().max(10).default('en'),
  assigned_to:      z.string().uuid().optional().or(z.literal('')),
  is_active:        z.boolean().default(true),
  portal_allowed:   z.boolean().default(true),
  notes:            z.string().optional().or(z.literal('')),
  custom_fields:    z.record(z.unknown()).default({}),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ── Contact ───────────────────────────────────────────────────────────────────
export const createContactSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().max(100).default(''),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
  job_title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  is_primary: z.boolean().default(false),
  do_not_contact: z.boolean().default(false),
  send_invoices: z.boolean().default(false),
  send_estimates: z.boolean().default(false),
  send_contracts: z.boolean().default(false),
  send_projects: z.boolean().default(false),
  notes: z.string().optional(),
  custom_fields: z.record(z.unknown()).default({}),
});

export const updateContactSchema = createContactSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
