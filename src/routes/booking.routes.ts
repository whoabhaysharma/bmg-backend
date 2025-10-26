import express from 'express';
import { createBooking, getBooking, updateBookingStatus } from '../controllers/booking.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate); // All booking routes require authentication

router.post('/', createBooking);
router.get('/:id', getBooking);
router.patch('/:id/status', updateBookingStatus);

export default router;