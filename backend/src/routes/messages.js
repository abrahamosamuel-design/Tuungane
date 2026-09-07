import { Router } from 'express';
import { 
  getConversations,
  getConversationById,
  sendMessage,
  reportConversation,
  blockUser,
  startOrGetConversation,
  startDirectConversation,
  startHireContact,
  markConversationRead,
  getUnreadCount
} from '../controllers/messages.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/unread-count', getUnreadCount);
router.post('/start', startOrGetConversation);
router.post('/start-direct', startDirectConversation);
router.post('/hire-contact', startHireContact);
router.get('/', getConversations);
router.get('/:id', getConversationById);
router.post('/:id/messages', sendMessage);
router.post('/:id/read', markConversationRead);
router.post('/:id/report', reportConversation);
router.post('/blocks', blockUser);

export default router;
