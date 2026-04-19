import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './estimates.controller';

const router = Router();
router.use(authenticate);

// Reference data & stats
router.get('/tax-rates',  ctrl.taxRates);
router.get('/currencies', ctrl.currencies);
router.get('/stats',      requirePerm('estimates.view'), ctrl.stats);

// Estimates CRUD
router.get('/',    requirePerm('estimates.view'),   ctrl.list);
router.post('/',   requirePerm('estimates.create'), ctrl.create);
router.get('/:id', requirePerm('estimates.view'),   ctrl.get);
router.put('/:id', requirePerm('estimates.edit'),   ctrl.update);
router.delete('/:id', requirePerm('estimates.delete'), ctrl.remove);

// Actions
router.post('/:id/send',   requirePerm('estimates.send'), ctrl.send);
router.patch('/:id/status', requirePerm('estimates.edit'), ctrl.updateStatus);

export default router;
