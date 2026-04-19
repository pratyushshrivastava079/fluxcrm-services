import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './items.controller';

const router = Router();
router.use(authenticate);

// CSV Import
router.post('/import', requirePerm('items.create'), ctrl.csvUpload.single('file'), ctrl.importItems);

// Reference data
router.get('/tax-rates', ctrl.taxRates);

// Groups
router.get('/groups',         requirePerm('items.view'),   ctrl.listGroups);
router.post('/groups',        requirePerm('items.create'), ctrl.createGroup);
router.put('/groups/:id',     requirePerm('items.edit'),   ctrl.updateGroup);
router.delete('/groups/:id',  requirePerm('items.delete'), ctrl.deleteGroup);

// Items CRUD
router.get('/',           requirePerm('items.view'),   ctrl.list);
router.post('/',          requirePerm('items.create'), ctrl.create);
router.post('/bulk-delete', requirePerm('items.delete'), ctrl.bulkDelete);
router.get('/:id',        requirePerm('items.view'),   ctrl.get);
router.put('/:id',        requirePerm('items.edit'),   ctrl.update);
router.delete('/:id',     requirePerm('items.delete'), ctrl.remove);

export default router;
