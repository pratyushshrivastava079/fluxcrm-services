import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as custCtrl from './customers.controller';
import * as contCtrl from './contacts.controller';

const router = Router();

router.use(authenticate);

// ── Customer routes ───────────────────────────────────────────────────────────
router.get('/stats',  requirePerm('customers.view'),   custCtrl.stats);
router.post('/import', requirePerm('customers.create'), custCtrl.uploadCSV, custCtrl.importCSV);
router.get('/',       requirePerm('customers.view'),   custCtrl.list);
router.post('/',    requirePerm('customers.create'), custCtrl.create);
router.get('/:id',  requirePerm('customers.view'),   custCtrl.show);
router.put('/:id',  requirePerm('customers.edit'),   custCtrl.update);
router.delete('/:id', requirePerm('customers.delete'), custCtrl.destroy);

// ── Contact routes (nested under customer) ────────────────────────────────────
router.get('/:customerId/contacts',     requirePerm('contacts.view'),   contCtrl.list);
router.post('/:customerId/contacts',    requirePerm('contacts.create'), contCtrl.create);
router.get('/:customerId/contacts/:id', requirePerm('contacts.view'),   contCtrl.show);
router.put('/:customerId/contacts/:id', requirePerm('contacts.edit'),   contCtrl.update);
router.delete('/:customerId/contacts/:id', requirePerm('contacts.delete'), contCtrl.destroy);

export default router;
