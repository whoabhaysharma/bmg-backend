import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, CreateBookingInput } from '../types/index.js';

const prisma = new PrismaClient();

export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const bookingData: CreateBookingInput = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if gym exists
    const gym = await prisma.gym.findUnique({
      where: { id: bookingData.gymId }
    });

    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Check for overlapping bookings
    const overlappingBooking = await prisma.booking.findFirst({
      where: {
        gymId: bookingData.gymId,
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(bookingData.startDate) } },
              { endDate: { gte: new Date(bookingData.startDate) } }
            ]
          },
          {
            AND: [
              { startDate: { lte: new Date(bookingData.endDate) } },
              { endDate: { gte: new Date(bookingData.endDate) } }
            ]
          }
        ]
      }
    });

    if (overlappingBooking) {
      return res.status(400).json({ message: 'Gym is already booked for these dates' });
    }

    const booking = await prisma.booking.create({
      data: {
        ...bookingData,
        userId,
        startDate: new Date(bookingData.startDate),
        endDate: new Date(bookingData.endDate),
        status: 'PENDING'
      }
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Error creating booking' });
  }
};

export const getBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        gym: true,
        user: {
          select: {
            id: true,
            name: true,
            mobileNumber: true
          }
        },
        payment: true
      }
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only allow user to view their own bookings or gym owners to view bookings for their gyms
    if (booking.userId !== userId && req.userRole !== 'OWNER') {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: 'Error fetching booking' });
  }
};

export const updateBookingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.userId;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        gym: true
      }
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only allow gym owners to update booking status
    if (booking.gym.ownerId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status }
    });

    res.json(updatedBooking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ message: 'Error updating booking' });
  }
};