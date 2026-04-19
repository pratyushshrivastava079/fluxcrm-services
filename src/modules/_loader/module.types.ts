/**
 * Performex CRM — Module System Type Definitions
 *
 * Every module (built-in or plugin) must conform to these interfaces.
 * The ModuleLoader discovers modules by reading their module.json manifests,
 * then calls registerRoutes() and registerHooks() on each active module.
 */

import { Express } from 'express';

// ---------------------------------------------------------------------------
// Module Manifest (module.json schema)
// ---------------------------------------------------------------------------
export interface ModuleManifest {
  /** Unique snake_case identifier — matches modules_registry.module_key */
  key: string;

  /** Human-readable display name */
  name: string;

  /** Short description shown in the admin module manager */
  description: string;

  /** Semantic version */
  version: string;

  /** Author or team */
  author: string;

  /**
   * Core modules ship with the CRM and cannot be disabled.
   * Plugin modules can be toggled per tenant via modules_registry.
   */
  core: boolean;

  /**
   * Other module keys this module depends on.
   * The loader validates these before activating the module.
   */
  dependencies: string[];

  /**
   * API route prefix. E.g., '/leads' → all routes mount at /api/v1/leads
   * Leave empty for modules that only register hooks (e.g., an audit plugin).
   */
  routePrefix: string;
}

// ---------------------------------------------------------------------------
// Module Implementation Interface
// ---------------------------------------------------------------------------
export interface CRMModule {
  /** Must match the manifest key */
  readonly key: string;

  /**
   * Called once on application startup.
   * Mount Express Router(s) onto the app.
   */
  registerRoutes(app: Express): void;

  /**
   * Called once on application startup.
   * Subscribe to the event bus for cross-module communication.
   * Example: listen for 'invoice.paid' to send a notification.
   */
  registerHooks(bus: EventBus): void;

  /**
   * Called when a tenant enables this module via the admin panel.
   * Use to create tenant-specific defaults (e.g., default task statuses).
   */
  onTenantEnable?(tenantId: string): Promise<void>;

  /**
   * Called when a tenant disables this module.
   */
  onTenantDisable?(tenantId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Event Bus (pub/sub for cross-module communication)
// ---------------------------------------------------------------------------
export type EventPayload = Record<string, unknown>;

export interface EventBus {
  /**
   * Publish an event to all registered listeners.
   * Events are synchronous within the same process.
   * For async fan-out, listeners can enqueue jobs via BullMQ.
   *
   * @example bus.emit('invoice.paid', { invoiceId, tenantId, amount })
   */
  emit(event: string, payload: EventPayload): void;

  /**
   * Register a listener for a specific event.
   *
   * @example bus.on('lead.converted', async ({ leadId, customerId, tenantId }) => { ... })
   */
  on(event: string, handler: (payload: EventPayload) => void | Promise<void>): void;

  /**
   * Remove a specific listener.
   */
  off(event: string, handler: (payload: EventPayload) => void | Promise<void>): void;
}

// ---------------------------------------------------------------------------
// Recognized Event Keys (emit these via bus.emit() from any module)
// ---------------------------------------------------------------------------
export const CRM_EVENTS = {
  // Leads
  LEAD_CREATED:           'lead.created',
  LEAD_UPDATED:           'lead.updated',
  LEAD_CONVERTED:         'lead.converted',
  LEAD_DELETED:           'lead.deleted',
  // Customers
  CUSTOMER_CREATED:       'customer.created',
  CUSTOMER_UPDATED:       'customer.updated',
  // Invoices
  INVOICE_CREATED:        'invoice.created',
  INVOICE_SENT:           'invoice.sent',
  INVOICE_VIEWED:         'invoice.viewed',
  INVOICE_PAID:           'invoice.paid',
  INVOICE_OVERDUE:        'invoice.overdue',
  INVOICE_CANCELLED:      'invoice.cancelled',
  // Estimates
  ESTIMATE_SENT:          'estimate.sent',
  ESTIMATE_ACCEPTED:      'estimate.accepted',
  ESTIMATE_DECLINED:      'estimate.declined',
  // Proposals
  PROPOSAL_SENT:          'proposal.sent',
  PROPOSAL_ACCEPTED:      'proposal.accepted',
  PROPOSAL_DECLINED:      'proposal.declined',
  PROPOSAL_SIGNED:        'proposal.signed',
  // Projects
  PROJECT_CREATED:        'project.created',
  PROJECT_STATUS_CHANGED: 'project.status_changed',
  PROJECT_COMPLETED:      'project.completed',
  // Tasks
  TASK_CREATED:           'task.created',
  TASK_ASSIGNED:          'task.assigned',
  TASK_COMPLETED:         'task.completed',
  TASK_COMMENT_ADDED:     'task.comment_added',
  // Support Tickets
  TICKET_CREATED:         'ticket.created',
  TICKET_ASSIGNED:        'ticket.assigned',
  TICKET_REPLIED:         'ticket.replied',
  TICKET_CLOSED:          'ticket.closed',
  // Contracts
  CONTRACT_SENT:          'contract.sent',
  CONTRACT_SIGNED:        'contract.signed',
  CONTRACT_EXPIRING:      'contract.expiring',  // Emitted by cron, N days before end_date
  // Subscriptions
  SUBSCRIPTION_RENEWED:   'subscription.renewed',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  // Users / Auth
  USER_CREATED:           'user.created',
  USER_LOGIN:             'user.login',
  USER_PASSWORD_RESET:    'user.password_reset',
  // Portal
  PORTAL_USER_REGISTERED: 'portal_user.registered',
} as const;

export type CRMEventKey = typeof CRM_EVENTS[keyof typeof CRM_EVENTS];

// ---------------------------------------------------------------------------
// Module Loader Interface
// ---------------------------------------------------------------------------
export interface ModuleLoader {
  /**
   * Discover and load all modules from:
   *   - src/modules/**\/module.json  (built-in)
   *   - src/plugins/**\/module.json  (third-party)
   */
  discover(): Promise<ModuleManifest[]>;

  /** Activate a loaded module (register routes + hooks) */
  activate(module: CRMModule): void;

  /** Return all registered module keys */
  getActiveKeys(): string[];

  /** Check if a module is active (globally or per-tenant) */
  isActive(moduleKey: string, tenantId?: string): boolean;
}
