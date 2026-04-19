import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './leads.controller';

const router = Router();

router.use(authenticate);

// ── Lookup (no specific perm needed beyond auth) ──────────────────────────────
router.get('/statuses',      ctrl.getStatuses);
router.get('/sources',       ctrl.getSources);
router.get('/status-stats',  requirePerm('leads.view'), ctrl.getStatusStats);
router.get('/board',         requirePerm('leads.view'), ctrl.getBoard);

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get('/',        requirePerm('leads.view'),   ctrl.listLeads);
router.post('/',       requirePerm('leads.create'), ctrl.createLead);
router.get('/:id',     requirePerm('leads.view'),   ctrl.getLead);
router.put('/:id',     requirePerm('leads.edit'),   ctrl.updateLead);
router.delete('/:id',  requirePerm('leads.delete'), ctrl.deleteLead);

// ── Special actions ───────────────────────────────────────────────────────────
router.patch('/:id/status',  requirePerm('leads.edit'),    ctrl.updateLeadStatus);
router.post('/:id/convert',  requirePerm('leads.convert'), ctrl.convertLead);

export default router;
