import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './reports.controller';

const router = Router();
router.use(authenticate);
router.use(requirePerm('reports.view'));

router.get('/revenue',  ctrl.revenueReport);
router.get('/expenses', ctrl.expensesReport);
router.get('/projects', ctrl.projectsReport);
router.get('/tickets',  ctrl.ticketsReport);

export default router;
