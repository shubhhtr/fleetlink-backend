const express = require('express');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const { calculateRideDuration, doTimeRangesOverlap, calculateEndTime } = require('../utils/rideCalculations');

const router = express.Router();

/**
 * POST /api/vehicles
 * Add a new vehicle to the fleet
 */
router.post('/', async (req, res) => {
  try {
    const { name, capacityKg, tyres } = req.body;

    // Validate required fields
    if (!name || !capacityKg || !tyres) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Name, capacityKg, and tyres are required fields'
      });
    }

    // Validate data types
    if (typeof name !== 'string' || typeof capacityKg !== 'number' || typeof tyres !== 'number') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid data types: name must be string, capacityKg and tyres must be numbers'
      });
    }

    // Create new vehicle
    const vehicle = new Vehicle({
      name: name.trim(),
      capacityKg,
      tyres
    });

    const savedVehicle = await vehicle.save();

    res.status(201).json({
      message: 'Vehicle added successfully',
      vehicle: savedVehicle
    });

  } catch (error) {
    console.error('Error adding vehicle:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message,
        details: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add vehicle'
    });
  }
});

/**
 * GET /api/vehicles/available
 * Find available vehicles based on capacity, route, and time
 */
router.get('/available', async (req, res) => {
  try {
    const { capacityRequired, fromPincode, toPincode, startTime } = req.query;

    // Validate required parameters
    if (!capacityRequired || !fromPincode || !toPincode || !startTime) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'capacityRequired, fromPincode, toPincode, and startTime are required'
      });
    }

    // Validate and parse parameters
    const capacity = parseFloat(capacityRequired);
    if (isNaN(capacity) || capacity <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'capacityRequired must be a positive number'
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
    const requestedStartTime = new Date(startTime);
    if (isNaN(requestedStartTime.getTime())) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid startTime format. Use ISO date format (e.g., 2023-10-27T10:00:00Z)'
      });
    }

    if (requestedStartTime <= new Date()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Start time must be in the future'
      });
    }

    // Calculate ride duration and end time
    const estimatedRideDurationHours = calculateRideDuration(fromPincode, toPincode);
    const requestedEndTime = calculateEndTime(requestedStartTime, estimatedRideDurationHours);

    // Find vehicles with sufficient capacity
    const eligibleVehicles = await Vehicle.find({
      capacityKg: { $gte: capacity },
      isActive: true
    });

    if (eligibleVehicles.length === 0) {
      return res.status(200).json({
        message: 'No vehicles found with sufficient capacity',
        availableVehicles: [],
        searchCriteria: {
          capacityRequired: capacity,
          fromPincode,
          toPincode,
          startTime: requestedStartTime,
          estimatedRideDurationHours
        }
      });
    }

    // Check availability for each eligible vehicle
    const availableVehicles = [];

    for (const vehicle of eligibleVehicles) {
      // Find overlapping bookings for this vehicle
      const overlappingBookings = await Booking.find({
        vehicleId: vehicle._id,
        status: { $in: ['confirmed', 'in-progress'] },
        $or: [
          {
            // Booking starts before our end time and ends after our start time
            startTime: { $lt: requestedEndTime },
            endTime: { $gt: requestedStartTime }
          }
        ]
      });

      // If no overlapping bookings, vehicle is available
      if (overlappingBookings.length === 0) {
        availableVehicles.push({
          ...vehicle.toJSON(),
          estimatedRideDurationHours,
          availableForRoute: {
            from: fromPincode,
            to: toPincode,
            startTime: requestedStartTime,
            endTime: requestedEndTime
          }
        });
      }
    }

    res.status(200).json({
      message: `Found ${availableVehicles.length} available vehicles`,
      availableVehicles,
      searchCriteria: {
        capacityRequired: capacity,
        fromPincode,
        toPincode,
        startTime: requestedStartTime,
        estimatedRideDurationHours
      }
    });

  } catch (error) {
    console.error('Error finding available vehicles:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to find available vehicles'
    });
  }
});

/**
 * GET /api/vehicles
 * Get all vehicles (for admin purposes)
 */
router.get('/', async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ isActive: true }).sort({ createdAt: -1 });
    
    res.status(200).json({
      message: 'Vehicles retrieved successfully',
      count: vehicles.length,
      vehicles
    });

  } catch (error) {
    console.error('Error retrieving vehicles:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve vehicles'
    });
  }
});

module.exports = router;
