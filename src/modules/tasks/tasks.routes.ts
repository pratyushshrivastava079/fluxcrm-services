import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './tasks.controller';

const router = Router();
router.use(authenticate);

router.get('/statuses', ctrl.statuses);
router.get('/stats',   requirePerm('tasks.view'), ctrl.stats);
router.get('/',    requirePerm('tasks.view'),   ctrl.list);
router.post('/',   requirePerm('tasks.create'), ctrl.create);
router.get('/:id', requirePerm('tasks.view'),   ctrl.get);
router.put('/:id', requirePerm('tasks.edit'),   ctrl.update);
router.delete('/:id', requirePerm('tasks.delete'), ctrl.remove);

export default router;
