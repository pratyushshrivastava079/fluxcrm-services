import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import * as ctrl from './reminders.controller';

const router = Router();
router.use(authenticate);

router.get('/',        ctrl.list);
router.post('/',       ctrl.create);
router.put('/:id',     ctrl.update);
router.patch('/:id/done', ctrl.toggleDone);
router.delete('/:id',  ctrl.remove);

export default router;
