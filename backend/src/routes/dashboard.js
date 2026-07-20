import { Router } from 'express';
import { getDashboardStats, updateServiceProfile, getDashboardFeed } from '../controllers/dashboard.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/stats', getDashboardStats);
router.post('/service-profile', updateServiceProfile);
router.get('/feed', getDashboardFeed);

export default router;
