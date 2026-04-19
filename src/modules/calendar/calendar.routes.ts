import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { events } from './calendar.controller';

const router = Router();
router.use(authenticate);

router.get('/events', events);

export default router;
