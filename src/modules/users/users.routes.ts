import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requireAdmin, requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './users.controller';

const router = Router();

// All users routes require authentication
router.use(authenticate);

router.get('/roles', ctrl.roles);                          // Any authenticated user
router.get('/staff', ctrl.staff);                          // Any authenticated user (for member selects)

router.get('/',     requireAdmin, ctrl.list);
router.post('/',    requireAdmin, ctrl.create);
router.get('/:id',  requirePerm('users.view'), ctrl.show);
router.put('/:id',  requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.destroy);

export default router;
