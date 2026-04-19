import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './payments.controller';

const router = Router();
router.use(authenticate);

router.get('/', requirePerm('invoices.view'), ctrl.list);

export default router;
