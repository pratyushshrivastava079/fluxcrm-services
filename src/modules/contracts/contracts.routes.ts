import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './contracts.controller';

const router = Router();
router.use(authenticate);

router.get('/stats',   requirePerm('contracts.view'),   ctrl.stats);
router.get('/types',   requirePerm('contracts.view'),   ctrl.types);
router.post('/types',  requirePerm('contracts.create'), ctrl.createType);
router.get('/',        requirePerm('contracts.view'),   ctrl.list);
router.post('/',       requirePerm('contracts.create'), ctrl.create);
router.get('/:id',     requirePerm('contracts.view'),   ctrl.get);
router.put('/:id',     requirePerm('contracts.edit'),   ctrl.update);
router.delete('/:id',  requirePerm('contracts.delete'), ctrl.remove);

export default router;
