import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './projects.controller';

const router = Router();
router.use(authenticate);

router.get('/stats', requirePerm('projects.view'), ctrl.stats);
router.get('/',      requirePerm('projects.view'), ctrl.list);
router.post('/',   requirePerm('projects.create'), ctrl.create);
router.get('/:id', requirePerm('projects.view'),   ctrl.get);
router.put('/:id', requirePerm('projects.edit'),   ctrl.update);
router.delete('/:id', requirePerm('projects.delete'), ctrl.remove);

export default router;
