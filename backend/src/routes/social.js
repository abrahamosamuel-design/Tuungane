import { Router } from 'express';
import { 
  upsertReview,
  getFollowStatus,
  toggleFollow,
  getSavedProviderStatus,
  toggleSavedProvider,
  getPostById,
  getPostInteractions,
  getPostComments,
  togglePostLike,
  addPostComment,
  deletePostComment,
  deletePost,
  togglePostHidden,
  addPost,
  addRecommendation,
  updatePost,
  submitReport
} from '../controllers/social.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/posts/:id', optionalAuth, getPostById);
router.get('/posts/:id/interactions', optionalAuth, getPostInteractions);
router.get('/posts/:id/comments', getPostComments);

router.use(requireAuth);

router.post('/posts', addPost);
router.post('/posts/:id/likes', togglePostLike);
router.post('/posts/:id/comments', addPostComment);
router.put('/posts/:id', updatePost);
router.delete('/comments/:id', deletePostComment);
router.delete('/posts/:id', deletePost);
router.put('/posts/:id/hide', togglePostHidden);

router.post('/reports', submitReport);
router.post('/recommendations', addRecommendation);

router.post('/reviews', upsertReview);
router.get('/follows/:provider_id', getFollowStatus);
router.post('/follows/toggle', toggleFollow);
router.get('/saved_providers/:provider_id', getSavedProviderStatus);
router.post('/saved_providers/toggle', toggleSavedProvider);

export default router;
