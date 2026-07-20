import { Router } from 'express';
import { 
  getMyProfile, 
  updateMyProfile, 
  updateMyProfileFull,
  getMyCounts,
  getProfileById, 
  createPublicProfile, 
  updatePublicProfile, 
  deletePublicProfile, 
  getMyPublicProfiles,
  getPrivacySettings,
  updatePrivacySettings,
  getProviderTrustStats,
  getFullProfile,
  getProviderAuxData,
  getPublicProfileBySlug,
  browseProfiles,
  getMyProfileDetails,
  getMyRoles,
  getMyPostAsOptions,
  getProviderContacts,
  getCustomerContacts,
  submitProfileReport,
  getSuspendedStatus,
  submitClaimRequest
} from '../controllers/profiles.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Open routes (public)
router.get('/public/:id', getProfileById);
router.get('/slug/:slug', getPublicProfileBySlug);
router.get('/browse', browseProfiles);
router.get('/public/:id/trust_stats', getProviderTrustStats);
router.get('/full/:id', getFullProfile);
router.get('/full/:id/aux', optionalAuth, getProviderAuxData);

// Protected routes
router.use(requireAuth);

// Private profile
router.get('/me', getMyProfile);
router.get('/me/counts', getMyCounts);
router.get('/me/roles', getMyRoles);
router.get('/me/post-as-options', getMyPostAsOptions);
router.get('/me/provider-contacts', getProviderContacts);
router.get('/me/customer-contacts', getCustomerContacts);
router.get('/me/public-profiles', getMyPublicProfiles);
router.get('/me/details', getMyProfileDetails);
router.get('/me/suspended', getSuspendedStatus);
router.put('/me', updateMyProfile);
router.put('/me/full', updateMyProfileFull);
router.delete('/public-profiles/:id', deletePublicProfile);

// Privacy settings
router.get('/me/privacy', getPrivacySettings);
router.put('/me/privacy', updatePrivacySettings);

// Public profiles management
router.get('/public/me', getMyPublicProfiles);
router.post('/public', createPublicProfile);
router.patch('/public/:id', updatePublicProfile);
router.delete('/public/:id', deletePublicProfile);
router.get('/public/:id', getProfileById); // Specific public profile

router.post('/reports', submitProfileReport);
router.post('/claim', submitClaimRequest);

export default router;
