import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './tickets.controller';

const router = Router();
router.use(authenticate);

router.get('/ref',        requirePerm('tickets.view'),   ctrl.refData);
router.get('/',           requirePerm('tickets.view'),   ctrl.list);
router.post('/',          requirePerm('tickets.create'), ctrl.create);
router.get('/:id',        requirePerm('tickets.view'),   ctrl.get);
router.put('/:id',        requirePerm('tickets.edit'),   ctrl.update);
router.post('/:id/reply', requirePerm('tickets.reply'),  ctrl.reply);
router.delete('/:id',     requirePerm('tickets.delete'), ctrl.remove);

export default router;
