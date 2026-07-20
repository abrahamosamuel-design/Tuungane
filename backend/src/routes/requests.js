import { Router } from 'express';
import { 
  getRequests, 
  getRequestById, 
  createRequest, 
  updateRequest, 
  deleteRequest, 
  getMyRequests,
  getRequestDetail,
  getCompletionCode,
  getProviderContact,
  confirmCompletion,
  confirmCompletionCustomer,
  getRequestResponses,
  createResponse,
  updateResponse,
  browseRequests,
  checkContactGate,
  logContactClick,
  logContactReveal,
  submitFeedback,
  getMatchingRequests,
  openDispute
} from '../controllers/requests.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/browse', optionalAuth, browseRequests);

router.use(requireAuth);

router.get('/', getRequests);
router.get('/me', getMyRequests);
router.get('/me/matching', getMatchingRequests);

// Sub-resources and actions
router.get('/provider_contact/:provider_id', getProviderContact);
router.get('/:id/detail', getRequestDetail);
router.get('/:id/completion_code', getCompletionCode);
router.post('/:id/confirm_completion', confirmCompletion);
router.post('/:id/confirm_completion_customer', confirmCompletionCustomer);
router.get('/:id/responses', getRequestResponses);
router.post('/:id/responses', createResponse);
router.patch('/responses/:response_id', updateResponse);
router.post('/:id/dispute', openDispute);
router.post('/:id/feedback', submitFeedback);

// Contact Logging & Gates
router.get('/contact_gate/:providerId', checkContactGate);
router.post('/log_contact_click', logContactClick);
router.post('/log_contact_reveal', logContactReveal);

// Basic CRUD
router.get('/:id', getRequestById);
router.post('/', createRequest);
router.patch('/:id', updateRequest);
router.delete('/:id', deleteRequest);

export default router;
