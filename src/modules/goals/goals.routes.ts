import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './goals.controller';

const router = Router();
router.use(authenticate);

router.get('/',       requirePerm('goals.view'),   ctrl.list);
router.post('/',      requirePerm('goals.create'), ctrl.create);
router.put('/:id',    requirePerm('goals.edit'),   ctrl.update);
router.delete('/:id', requirePerm('goals.delete'), ctrl.remove);

export default router;
