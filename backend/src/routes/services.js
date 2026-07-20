import { Router } from 'express';
import { 
  getProfileServices, 
  createProfileService, 
  updateProfileService, 
  deleteProfileService,
  getServicesMetadata,
  searchServices,
  getCategoryServices,
  setPrimaryProfileService,
  getFeaturedLocations,
  getHomeNearby,
  getServiceMedia,
  createServiceMedia,
  updateServiceMedia,
  deleteServiceMedia,
  unsetServiceMediaCover
} from '../controllers/services.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Public / Optional Auth Routes
router.get('/metadata', optionalAuth, getServicesMetadata);
router.get('/featured-locations', optionalAuth, getFeaturedLocations);
router.get('/home-nearby', optionalAuth, getHomeNearby);
router.get('/search', optionalAuth, searchServices);
router.get('/category/:slug', optionalAuth, getCategoryServices);

// Authenticated Routes
router.use(requireAuth);

router.get('/profile/:profileId', getProfileServices);
router.post('/profile/:profileId', createProfileService);
router.patch('/:id', updateProfileService);
router.put('/:id/primary', setPrimaryProfileService);
router.delete('/:id', deleteProfileService);

router.get('/media/:profileId', getServiceMedia);
router.post('/media', createServiceMedia);
router.patch('/media/:id', updateServiceMedia);
router.delete('/media/:id', deleteServiceMedia);
router.post('/media/unset-cover/:profileId', unsetServiceMediaCover);

export default router;
