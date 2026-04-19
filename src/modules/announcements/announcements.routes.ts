import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import * as ctrl from './announcements.controller';

const router = Router();
router.use(authenticate);

router.get('/',             ctrl.list);
router.post('/',            ctrl.create);
router.put('/:id',          ctrl.update);
router.delete('/:id',       ctrl.remove);
router.post('/:id/read',    ctrl.markRead);

export default router;
