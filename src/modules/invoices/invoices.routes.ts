import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './invoices.controller';

const router = Router();
router.use(authenticate);

// Reference data
router.get('/tax-rates',     ctrl.taxRates);
router.get('/currencies',    ctrl.currencies);
router.get('/payment-modes', ctrl.paymentModes);

// Invoices CRUD
router.get('/stats', requirePerm('invoices.view'), ctrl.stats);
router.get('/',    requirePerm('invoices.view'),   ctrl.list);
router.post('/',   requirePerm('invoices.create'), ctrl.create);
router.get('/:id', requirePerm('invoices.view'),   ctrl.get);
router.put('/:id', requirePerm('invoices.edit'),   ctrl.update);
router.delete('/:id', requirePerm('invoices.delete'), ctrl.remove);

// Actions
router.post('/:id/send',            requirePerm('invoices.send'),           ctrl.send);
router.post('/:id/payment',         requirePerm('invoices.record_payment'), ctrl.recordPayment);
router.get('/:id/pdf',              requirePerm('invoices.view'),           ctrl.downloadPdf);
router.post('/:id/stripe-intent',   requirePerm('invoices.view'),           ctrl.stripeIntent);

// Activity log & notes
router.get('/:id/activities',                    requirePerm('invoices.view'),   ctrl.listActivities);
router.post('/:id/notes',                        requirePerm('invoices.view'),   ctrl.addNote);
router.delete('/:id/activities/:activityId',     requirePerm('invoices.edit'),   ctrl.deleteActivity);

// Reminders
router.get('/:id/reminders',   requirePerm('invoices.view'),   ctrl.listInvoiceReminders);
router.post('/:id/reminders',  requirePerm('invoices.view'),   ctrl.createInvoiceReminder);

// Tasks
router.get('/:id/tasks',       requirePerm('invoices.view'),   ctrl.listInvoiceTasks);

export default router;
