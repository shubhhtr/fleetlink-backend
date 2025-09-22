const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');

// Test database
const MONGODB_TEST_URI = 'mongodb://localhost:27017/fleetlink_test';

describe('Booking API', () => {
  let testVehicle;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(MONGODB_TEST_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  beforeEach(async () => {
    // Clean up database before each test
    await Vehicle.deleteMany({});
    await Booking.deleteMany({});

    // Create a test vehicle
    testVehicle = await Vehicle.create({
      name: 'Test Truck',
      capacityKg: 5000,
      tyres: 6
    });
  });

  afterAll(async () => {
    // Clean up and close connection
    await Vehicle.deleteMany({});
    await Booking.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/bookings', () => {
    test('should create a booking with valid data', async () => {
      const bookingData = {
        vehicleId: testVehicle._id.toString(),
        customerId: 'test-customer-123',
        fromPincode: '110001',
        toPincode: '110002',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingData)
        .expect(201);

      expect(response.body.message).toBe('Booking created successfully');
      expect(response.body.booking.customerId).toBe(bookingData.customerId);
      expect(response.body.booking.fromPincode).toBe(bookingData.fromPincode);
      expect(response.body.booking.toPincode).toBe(bookingData.toPincode);
      expect(response.body.booking.estimatedRideDurationHours).toBe(1);
      expect(response.body.booking.status).toBe('confirmed');
    });

    test('should reject booking with missing required fields', async () => {
      const incompleteData = {
        vehicleId: testVehicle._id.toString(),
        customerId: 'test-customer-123'
        // Missing fromPincode, toPincode, startTime
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    test('should reject booking with invalid vehicle ID', async () => {
      const bookingData = {
        vehicleId: 'invalid-vehicle-id',
        customerId: 'test-customer-123',
        fromPincode: '110001',
        toPincode: '110002',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    test('should reject booking for non-existent vehicle', async () => {
      const nonExistentVehicleId = new mongoose.Types.ObjectId();
      const bookingData = {
        vehicleId: nonExistentVehicleId.toString(),
        customerId: 'test-customer-123',
        fromPincode: '110001',
        toPincode: '110002',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingData)
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });

    test('should reject booking with invalid pincode format', async () => {
      const bookingData = {
        vehicleId: testVehicle._id.toString(),
        customerId: 'test-customer-123',
        fromPincode: '12345', // Invalid - should be 6 digits
        toPincode: '110002',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    test('should reject booking with past start time', async () => {
      const bookingData = {
        vehicleId: testVehicle._id.toString(),
        customerId: 'test-customer-123',
        fromPincode: '110001',
        toPincode: '110002',
        startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    test('should reject booking with conflicting time slot', async () => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Create first booking
      const firstBookingData = {
        vehicleId: testVehicle._id.toString(),
        customerId: 'customer-1',
        fromPincode: '110001',
        toPincode: '110003',
        startTime: startTime.toISOString()
      };

      await request(app)
        .post('/api/bookings')
        .send(firstBookingData)
        .expect(201);

      // Try to create overlapping booking
      const overlappingBookingData = {
        vehicleId: testVehicle._id.toString(),
        customerId: 'customer-2',
        fromPincode: '110001',
        toPincode: '110002',
        startTime: new Date(startTime.getTime() + 30 * 60 * 1000).toISOString() // 30 minutes later
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(overlappingBookingData)
        .expect(409);

      expect(response.body.error).toBe('Booking Conflict');
    });

    test('should allow non-overlapping bookings', async () => {
      const firstStartTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const secondStartTime = new Date(firstStartTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours later
      
      // Create first booking (1 hour duration: 110001 -> 110002)
      const firstBookingData = {
        vehicleId: testVehicle._id.toString(),
        customerId: 'customer-1',
        fromPincode: '110001',
        toPincode: '110002',
        startTime: firstStartTime.toISOString()
      };

      await request(app)
        .post('/api/bookings')
        .send(firstBookingData)
        .expect(201);

      // Create second booking after first one ends
      const secondBookingData = {
        vehicleId: testVehicle._id.toString(),
        customerId: 'customer-2',
        fromPincode: '110003',
        toPincode: '110004',
        startTime: secondStartTime.toISOString()
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(secondBookingData)
        .expect(201);

      expect(response.body.message).toBe('Booking created successfully');
    });
  });

  describe('GET /api/bookings', () => {
    beforeEach(async () => {
      // Create test bookings
      await Booking.create({
        vehicleId: testVehicle._id,
        customerId: 'customer-1',
        fromPincode: '110001',
        toPincode: '110002',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        estimatedRideDurationHours: 1,
        status: 'confirmed'
      });

      await Booking.create({
        vehicleId: testVehicle._id,
        customerId: 'customer-2',
        fromPincode: '110003',
        toPincode: '110004',
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
        estimatedRideDurationHours: 1,
        status: 'confirmed'
      });
    });

    test('should retrieve all bookings', async () => {
      const response = await request(app)
        .get('/api/bookings')
        .expect(200);

      expect(response.body.bookings).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    test('should filter bookings by customer ID', async () => {
      const response = await request(app)
        .get('/api/bookings')
        .query({ customerId: 'customer-1' })
        .expect(200);

      expect(response.body.bookings).toHaveLength(1);
      expect(response.body.bookings[0].customerId).toBe('customer-1');
    });

    test('should filter bookings by vehicle ID', async () => {
      const response = await request(app)
        .get('/api/bookings')
        .query({ vehicleId: testVehicle._id.toString() })
        .expect(200);

      expect(response.body.bookings).toHaveLength(2);
    });

    test('should filter bookings by status', async () => {
      const response = await request(app)
        .get('/api/bookings')
        .query({ status: 'confirmed' })
        .expect(200);

      expect(response.body.bookings).toHaveLength(2);
      response.body.bookings.forEach(booking => {
        expect(booking.status).toBe('confirmed');
      });
    });
  });

  describe('GET /api/bookings/:id', () => {
    let testBooking;

    beforeEach(async () => {
      testBooking = await Booking.create({
        vehicleId: testVehicle._id,
        customerId: 'test-customer',
        fromPincode: '110001',
        toPincode: '110002',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        estimatedRideDurationHours: 1,
        status: 'confirmed'
      });
    });

    test('should retrieve specific booking by ID', async () => {
      const response = await request(app)
        .get(`/api/bookings/${testBooking._id}`)
        .expect(200);

      expect(response.body.booking._id).toBe(testBooking._id.toString());
      expect(response.body.booking.customerId).toBe('test-customer');
    });

    test('should return 404 for non-existent booking', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/bookings/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });

    test('should return 400 for invalid booking ID format', async () => {
      const response = await request(app)
        .get('/api/bookings/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('PATCH /api/bookings/:id/status', () => {
    let testBooking;

    beforeEach(async () => {
      testBooking = await Booking.create({
        vehicleId: testVehicle._id,
        customerId: 'test-customer',
        fromPincode: '110001',
        toPincode: '110002',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        estimatedRideDurationHours: 1,
        status: 'confirmed'
      });
    });

    test('should update booking status', async () => {
      const response = await request(app)
        .patch(`/api/bookings/${testBooking._id}/status`)
        .send({ status: 'in-progress' })
        .expect(200);

      expect(response.body.booking.status).toBe('in-progress');
    });

    test('should reject invalid status', async () => {
      const response = await request(app)
        .patch(`/api/bookings/${testBooking._id}/status`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    test('should return 404 for non-existent booking', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .patch(`/api/bookings/${nonExistentId}/status`)
        .send({ status: 'completed' })
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });
});
