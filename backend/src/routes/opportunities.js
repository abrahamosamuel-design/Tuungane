import { Router } from 'express';
import { getJobOpportunities, createJobOpportunity, getJobOpportunityById, getJobRequests, createJobRequest, updateJobOpportunity, updateJobRequest } from '../controllers/opportunities.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/jobs', getJobOpportunities);
router.get('/jobs/:id', getJobOpportunityById);
router.post('/jobs', requireAuth, createJobOpportunity);
router.put('/jobs/:id', requireAuth, updateJobOpportunity);

router.get('/job-requests', getJobRequests);
router.post('/job-requests', requireAuth, createJobRequest);
router.put('/job-requests/:id', requireAuth, updateJobRequest);

export default router;
