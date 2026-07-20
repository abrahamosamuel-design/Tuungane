import { Router } from 'express';
import { 
  getFeedPosts, 
  getFeedServices, 
  getOfficialFeed,
  getOfficialPostById,
  addOfficialPostComment,
  getHomeFeed,
  getCommunityUpdates,
  getPopularCategories
} from '../controllers/feed.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getFeedPosts);
router.get('/home', optionalAuth, getHomeFeed);
router.get('/community-updates', getCommunityUpdates);
router.get('/popular-categories', getPopularCategories);
router.get('/posts', optionalAuth, getFeedPosts);
router.get('/services', optionalAuth, getFeedServices);
router.get('/official', optionalAuth, getOfficialFeed);
router.get('/official/:id', optionalAuth, getOfficialPostById);

router.post('/official/:id/comments', requireAuth, addOfficialPostComment);

export default router;
