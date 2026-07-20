import { Router } from 'express';
import { getMyTrustStatus, getProfileTrustBadge, submitVerifyRequest, submitVerifyEvidence, getTrustChecklist, submitTrustAppeal } from '../controllers/trust.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/badge', getProfileTrustBadge);
router.get('/my-status', requireAuth, getMyTrustStatus);
router.post('/verify-request', requireAuth, submitVerifyRequest);
router.post('/verify-evidence', requireAuth, submitVerifyEvidence);
router.get('/checklist', requireAuth, getTrustChecklist);
router.post('/appeal', requireAuth, submitTrustAppeal);

export default router;
