import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';

import { config } from './core/config';
import { logger } from './core/utils/logger';
import { errorMiddleware } from './core/middleware/error.middleware';

// Module routes
import authRoutes      from './modules/auth/auth.routes';
import usersRoutes     from './modules/users/users.routes';
import customersRoutes from './modules/customers/customers.routes';
import leadsRoutes      from './modules/leads/leads.routes';
import proposalsRoutes  from './modules/proposals/proposals.routes';
import invoicesRoutes   from './modules/invoices/invoices.routes';
import projectsRoutes   from './modules/projects/projects.routes';
import tasksRoutes      from './modules/tasks/tasks.routes';
import timesheetsRoutes  from './modules/timesheets/timesheets.routes';
import dashboardRoutes      from './modules/dashboard/dashboard.routes';
import remindersRoutes     from './modules/reminders/reminders.routes';
import announcementsRoutes from './modules/announcements/announcements.routes';
import calendarRoutes      from './modules/calendar/calendar.routes';
import ticketsRoutes       from './modules/tickets/tickets.routes';
import contractsRoutes     from './modules/contracts/contracts.routes';
import goalsRoutes         from './modules/goals/goals.routes';
import expensesRoutes       from './modules/expenses/expenses.routes';
import estimatesRoutes      from './modules/estimates/estimates.routes';
import creditNotesRoutes    from './modules/credit_notes/credit_notes.routes';
import itemsRoutes          from './modules/items/items.routes';
import subscriptionsRoutes  from './modules/subscriptions/subscriptions.routes';
import kbRoutes             from './modules/kb/kb.routes';
import reportsRoutes        from './modules/reports/reports.routes';
import settingsRoutes       from './modules/settings/settings.routes';
import paymentsRoutes       from './modules/payments/payments.routes';

export function createApp() {
  const app = express();

  // ── Security & transport ──────────────────────────────────────────────────
  app.use(helmet());
  const allowedOrigin =
    config.NODE_ENV === 'development'
      ? (origin: string | undefined, cb: (e: null, allow: boolean) => void) =>
          cb(null, !origin || /^https?:\/\/localhost(:\d+)?$/.test(origin))
      : config.APP_URL;

  app.use(cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Logging ───────────────────────────────────────────────────────────────
  app.use(pinoHttp({ logger, autoLogging: config.NODE_ENV !== 'test' }));

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', env: config.NODE_ENV, ts: new Date().toISOString() });
  });

  // ── API routes ────────────────────────────────────────────────────────────
  const api = express.Router();
  api.use('/auth',       authRoutes);
  api.use('/users',      usersRoutes);
  api.use('/customers',  customersRoutes);
  api.use('/leads',       leadsRoutes);
  api.use('/proposals',   proposalsRoutes);
  api.use('/invoices',    invoicesRoutes);
  api.use('/projects',    projectsRoutes);
  api.use('/tasks',       tasksRoutes);
  api.use('/timesheets',  timesheetsRoutes);
  api.use('/dashboard',      dashboardRoutes);
  api.use('/reminders',      remindersRoutes);
  api.use('/announcements',  announcementsRoutes);
  api.use('/calendar',       calendarRoutes);
  api.use('/tickets',        ticketsRoutes);
  api.use('/contracts',      contractsRoutes);
  api.use('/goals',          goalsRoutes);
  api.use('/expenses',       expensesRoutes);
  api.use('/estimates',      estimatesRoutes);
  api.use('/credit-notes',   creditNotesRoutes);
  api.use('/items',          itemsRoutes);
  api.use('/subscriptions',  subscriptionsRoutes);
  api.use('/kb',             kbRoutes);
  api.use('/reports',        reportsRoutes);
  api.use('/settings',       settingsRoutes);
  api.use('/payments',       paymentsRoutes);

  app.use('/api/v1', api);

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  // ── Error handler (must be last) ──────────────────────────────────────────
  app.use(errorMiddleware);

  return app;
}
