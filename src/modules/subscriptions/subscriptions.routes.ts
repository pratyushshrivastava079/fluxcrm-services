import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './subscriptions.controller';

const router = Router();
router.use(authenticate);

router.get('/stats',       requirePerm('subscriptions.view'),   ctrl.stats);
router.get('/',            requirePerm('subscriptions.view'),   ctrl.list);
router.post('/',           requirePerm('subscriptions.create'), ctrl.create);
router.get('/:id',         requirePerm('subscriptions.view'),   ctrl.get);
router.put('/:id',         requirePerm('subscriptions.edit'),   ctrl.update);
router.delete('/:id',      requirePerm('subscriptions.delete'), ctrl.remove);
router.patch('/:id/status', requirePerm('subscriptions.edit'),  ctrl.changeStatus);

export default router;
