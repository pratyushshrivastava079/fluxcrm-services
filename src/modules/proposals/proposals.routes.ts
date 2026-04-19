import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './proposals.controller';

const router = Router();

// ── Public (no auth) ─────────────────────────────────────────────────────────
router.get('/public/:hash',       ctrl.getPublicProposal);
router.post('/public/:hash/sign', ctrl.signPublicProposal);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.use(authenticate);

router.get('/',        requirePerm('proposals.view'),   ctrl.listProposals);
router.post('/',       requirePerm('proposals.create'), ctrl.createProposal);
router.get('/:id',     requirePerm('proposals.view'),   ctrl.getProposal);
router.put('/:id',     requirePerm('proposals.edit'),   ctrl.updateProposal);
router.delete('/:id',  requirePerm('proposals.delete'), ctrl.deleteProposal);
router.post('/:id/send', requirePerm('proposals.send'), ctrl.sendProposal);

export default router;
