import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { statsHandler } from './dashboard.controller';

const router = Router();

router.use(authenticate);

router.get('/stats', statsHandler);

export default router;
