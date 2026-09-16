import { Router } from 'express';
import { 
  createDirectBooking, 
  getMyDirectBookings, 
  updateDirectBooking,
  getDirectBookingById
} from '../controllers/direct_bookings.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/me', getMyDirectBookings);
router.get('/:id', getDirectBookingById);
router.post('/', createDirectBooking);
router.patch('/:id', updateDirectBooking);

export default router;
