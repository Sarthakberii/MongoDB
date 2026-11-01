import { Router } from 'express';
import { cancelBooking, createBooking, getBookings } from '../controllers/bookingController.js';

const router = Router();
router.get('/', getBookings);
router.post('/', createBooking);
router.delete('/:id', cancelBooking);
export default router;
