import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './settings.controller';

const router = Router();
router.use(authenticate);

const canView = requirePerm('settings.view');
const canEdit = requirePerm('settings.edit');

// General settings
router.get ('/general',     canView, ctrl.getGeneral);
router.put ('/general',     canEdit, ctrl.updateGeneral);

// Currencies
router.get   ('/currencies',     canView, ctrl.listCurrencies);
router.post  ('/currencies',     canEdit, ctrl.createCurrency);
router.put   ('/currencies/:id', canEdit, ctrl.updateCurrency);
router.delete('/currencies/:id', canEdit, ctrl.deleteCurrency);

// Tax rates
router.get   ('/tax-rates',     canView, ctrl.listTaxRates);
router.post  ('/tax-rates',     canEdit, ctrl.createTaxRate);
router.put   ('/tax-rates/:id', canEdit, ctrl.updateTaxRate);
router.delete('/tax-rates/:id', canEdit, ctrl.deleteTaxRate);

// Payment modes
router.get   ('/payment-modes',     canView, ctrl.listPaymentModes);
router.post  ('/payment-modes',     canEdit, ctrl.createPaymentMode);
router.put   ('/payment-modes/:id', canEdit, ctrl.updatePaymentMode);
router.delete('/payment-modes/:id', canEdit, ctrl.deletePaymentMode);

// Email templates
router.get   ('/email-templates',     canView, ctrl.listEmailTemplates);
router.post  ('/email-templates',     canEdit, ctrl.upsertEmailTemplate);
router.get   ('/email-templates/:id', canView, ctrl.getEmailTemplate);
router.put   ('/email-templates/:id', canEdit, ctrl.updateEmailTemplate);
router.delete('/email-templates/:id', canEdit, ctrl.deleteEmailTemplate);

export default router;
