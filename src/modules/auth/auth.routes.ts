import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import * as ctrl from './auth.controller';

const router = Router();

// Public
router.post('/login',   ctrl.login);
router.post('/refresh', ctrl.refresh);

// Authenticated
router.post('/logout',          authenticate, ctrl.logout);
router.get('/me',               authenticate, ctrl.me);
router.post('/change-password', authenticate, ctrl.changePassword);

export default router;
