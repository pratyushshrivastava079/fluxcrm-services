import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './credit_notes.controller';

const router = Router();
router.use(authenticate);

// Reference data & stats (before /:id)
router.get('/tax-rates',  ctrl.taxRates);
router.get('/currencies', ctrl.currencies);
router.get('/stats',      requirePerm('credit_notes.view'), ctrl.stats);

// CRUD
router.get('/',    requirePerm('credit_notes.view'),   ctrl.list);
router.post('/',   requirePerm('credit_notes.create'), ctrl.create);
router.get('/:id', requirePerm('credit_notes.view'),   ctrl.get);
router.put('/:id', requirePerm('credit_notes.edit'),   ctrl.update);
router.delete('/:id', requirePerm('credit_notes.delete'), ctrl.remove);

// Actions
router.patch('/:id/status', requirePerm('credit_notes.edit'), ctrl.updateStatus);

export default router;
