import { Router } from 'express';
import { 
  getNotifications,
  markNotificationsRead,
  getNotificationById,
  markNotificationReadById,
  sendTestPushNotification
} from '../controllers/notifications.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.post('/read', markNotificationsRead);
router.get('/:id', getNotificationById);
router.post('/:id/read', markNotificationReadById);
router.post('/test-push', sendTestPushNotification);

export default router;
