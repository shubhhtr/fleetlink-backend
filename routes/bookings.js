const express = require('express');
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const { calculateRideDuration, calculateEndTime, validateBookingTime } = require('../utils/rideCalculations');

const router = express.Router();

/**
 * POST /api/bookings
 * Book a vehicle for a specific route and time
 */
router.post('/', async (req, res) => {
  try {
    const { vehicleId, fromPincode, toPincode, startTime, customerId } = req.body;

    // Validate required fields
    if (!vehicleId || !fromPincode || !toPincode || !startTime || !customerId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'vehicleId, fromPincode, toPincode, startTime, and customerId are required'
      });
    }

    // Validate vehicleId format
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid vehicleId format'
      });
    }

    // Validate pincodes
    if (!/^\d{6}$/.test(fromPincode) || !/^\d{6}$/.test(toPincode)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Pincodes must be exactly 6 digits'
      });
    }

    // Parse and validate start time
    const bookingStartTime = new Date(startTime);
    if (isNaN(bookingStartTime.getTime())) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid startTime format. Use ISO date format (e.g., 2023-10-27T10:00:00Z)'
      });
    }

    // Validate booking time constraints
    const timeValidation = validateBookingTime(bookingStartTime);
    if (!timeValidation.isValid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: timeValidation.message
      });
    }

    // Check if vehicle exists and is active
    const vehicle = await Vehicle.findOne({ _id: vehicleId, isActive: true });
    if (!vehicle) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vehicle not found or inactive'
      });
    }

    // Calculate ride duration and end time
    const estimatedRideDurationHours = calculateRideDuration(fromPincode, toPincode);
    const bookingEndTime = calculateEndTime(bookingStartTime, estimatedRideDurationHours);

    // Use a transaction to ensure data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Re-verify vehicle availability (prevent race conditions)
      const conflictingBookings = await Booking.find({
        vehicleId: vehicleId,
        status: { $in: ['confirmed', 'in-progress'] },
        $or: [
          {
            startTime: { $lt: bookingEndTime },
            endTime: { $gt: bookingStartTime }
          }
        ]
      }).session(session);

      if (conflictingBookings.length > 0) {
        await session.abortTransaction();
        session.endSession();
        
        return res.status(409).json({
          error: 'Booking Conflict',
          message: 'Vehicle is already booked for an overlapping time slot',
          conflictingBookings: conflictingBookings.map(booking => ({
            id: booking._id,
            startTime: booking.startTime,
            endTime: booking.endTime,
            route: `${booking.fromPincode} → ${booking.toPincode}`
          }))
        });
      }

      // Create the booking
      const booking = new Booking({
        vehicleId,
        customerId: customerId.trim(),
        fromPincode,
        toPincode,
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        estimatedRideDurationHours
      });

      const savedBooking = await booking.save({ session });

      // Populate vehicle details for response
      await savedBooking.populate('vehicleId', 'name capacityKg tyres');

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        message: 'Booking created successfully',
        booking: savedBooking
      });

    } catch (transactionError) {
      await session.abortTransaction();
      session.endSession();
      throw transactionError;
    }

  } catch (error) {
    console.error('Error creating booking:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message,
        details: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create booking'
    });
  }
});

/**
 * GET /api/bookings
 * Get all bookings (with optional filtering)
 */
router.get('/', async (req, res) => {
  try {
    const { customerId, vehicleId, status, startDate, endDate } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (customerId) {
      filter.customerId = customerId;
    }
    
    if (vehicleId) {
      if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid vehicleId format'
        });
      }
      filter.vehicleId = vehicleId;
    }
    
    if (status) {
      if (!['confirmed', 'in-progress', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid status. Must be one of: confirmed, in-progress, completed, cancelled'
        });
      }
      filter.status = status;
    }
    
    // Date range filtering
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'Invalid startDate format'
          });
        }
        filter.startTime.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'Invalid endDate format'
          });
        }
        filter.startTime.$lte = end;
      }
    }

    const bookings = await Booking.find(filter)
      .populate('vehicleId', 'name capacityKg tyres')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Bookings retrieved successfully',
      count: bookings.length,
      bookings
    });

  } catch (error) {
    console.error('Error retrieving bookings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve bookings'
    });
  }
});

/**
 * GET /api/bookings/:id
 * Get a specific booking by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid booking ID format'
      });
    }

    const booking = await Booking.findById(id)
      .populate('vehicleId', 'name capacityKg tyres');

    if (!booking) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      message: 'Booking retrieved successfully',
      booking
    });

  } catch (error) {
    console.error('Error retrieving booking:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve booking'
    });
  }
});

/**
 * PATCH /api/bookings/:id/status
 * Update booking status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid booking ID format'
      });
    }

    if (!status || !['confirmed', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid status. Must be one of: confirmed, in-progress, completed, cancelled'
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('vehicleId', 'name capacityKg tyres');

    if (!booking) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      message: 'Booking status updated successfully',
      booking
    });

  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update booking status'
    });
  }
});

module.exports = router;
