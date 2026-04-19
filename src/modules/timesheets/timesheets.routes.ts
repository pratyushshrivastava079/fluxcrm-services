import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './timesheets.controller';

const router = Router();
router.use(authenticate);

router.get('/active',                     ctrl.activeTimer);
router.get('/project/:projectId/summary', requirePerm('timesheets.view'), ctrl.projectSummary);
router.get('/',    requirePerm('timesheets.view'),   ctrl.list);
router.post('/log', requirePerm('timesheets.create'), ctrl.logTime);
router.post('/start', requirePerm('timesheets.create'), ctrl.start);
router.put('/:id/stop', requirePerm('timesheets.create'), ctrl.stop);
router.delete('/:id', requirePerm('timesheets.delete'), ctrl.remove);

export default router;
