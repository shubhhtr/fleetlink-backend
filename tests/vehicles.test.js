const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');

// Test database
const MONGODB_TEST_URI = 'mongodb://localhost:27017/fleetlink_test';

describe('Vehicle API', () => {
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
  });

  afterAll(async () => {
    // Clean up and close connection
    await Vehicle.deleteMany({});
    await Booking.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/vehicles', () => {
    test('should create a new vehicle with valid data', async () => {
      const vehicleData = {
        name: 'Test Truck',
        capacityKg: 5000,
        tyres: 6
      };

      const response = await request(app)
        .post('/api/vehicles')
        .send(vehicleData)
        .expect(201);

      expect(response.body.message).toBe('Vehicle added successfully');
      expect(response.body.vehicle.name).toBe(vehicleData.name);
      expect(response.body.vehicle.capacityKg).toBe(vehicleData.capacityKg);
      expect(response.body.vehicle.tyres).toBe(vehicleData.tyres);
    });

    test('should reject vehicle with missing required fields', async () => {
      const incompleteData = {
        name: 'Test Truck'
        // Missing capacityKg and tyres
      };

      const response = await request(app)
        .post('/api/vehicles')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    test('should reject vehicle with invalid data types', async () => {
      const invalidData = {
        name: 'Test Truck',
        capacityKg: 'invalid', // Should be number
        tyres: 6
      };

      const response = await request(app)
        .post('/api/vehicles')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    test('should reject vehicle with invalid capacity range', async () => {
      const invalidData = {
        name: 'Test Truck',
        capacityKg: -100, // Invalid negative capacity
        tyres: 6
      };

      const response = await request(app)
        .post('/api/vehicles')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /api/vehicles/available', () => {
    let testVehicle1, testVehicle2;

    beforeEach(async () => {
      // Create test vehicles
      testVehicle1 = await Vehicle.create({
        name: 'Small Truck',
        capacityKg: 1000,
        tyres: 4
      });

      testVehicle2 = await Vehicle.create({
        name: 'Large Truck',
        capacityKg: 5000,
        tyres: 6
      });
    });

    test('should find available vehicles with sufficient capacity', async () => {
      const queryParams = {
        capacityRequired: 800,
        fromPincode: '110001',
        toPincode: '110002',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
      };

      const response = await request(app)
        .get('/api/vehicles/available')
        .query(queryParams)
        .expect(200);

      expect(response.body.availableVehicles).toHaveLength(2); // Both vehicles should be available
      expect(response.body.searchCriteria.estimatedRideDurationHours).toBe(1);
    });

    test('should filter vehicles by capacity requirement', async () => {
      const queryParams = {
        capacityRequired: 3000, // Only large truck should qualify
        fromPincode: '110001',
        toPincode: '110002',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .get('/api/vehicles/available')
        .query(queryParams)
        .expect(200);

      expect(response.body.availableVehicles).toHaveLength(1);
      expect(response.body.availableVehicles[0].name).toBe('Large Truck');
    });

    test('should exclude vehicles with conflicting bookings', async () => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      // Create a booking for testVehicle1
      await Booking.create({
        vehicleId: testVehicle1._id,
        customerId: 'test-customer',
        fromPincode: '110001',
        toPincode: '110003',
        startTime: startTime,
        endTime: endTime,
        estimatedRideDurationHours: 2,
        status: 'confirmed'
      });

      const queryParams = {
        capacityRequired: 500,
        fromPincode: '110001',
        toPincode: '110002',
        startTime: startTime.toISOString()
      };

      const response = await request(app)
        .get('/api/vehicles/available')
        .query(queryParams)
        .expect(200);

      // Only testVehicle2 should be available
      expect(response.body.availableVehicles).toHaveLength(1);
      expect(response.body.availableVehicles[0].name).toBe('Large Truck');
    });

    test('should reject request with missing parameters', async () => {
      const response = await request(app)
        .get('/api/vehicles/available')
        .query({
          capacityRequired: 1000
          // Missing other required parameters
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    test('should reject request with invalid pincode format', async () => {
      const queryParams = {
        capacityRequired: 1000,
        fromPincode: '12345', // Invalid - should be 6 digits
        toPincode: '110002',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .get('/api/vehicles/available')
        .query(queryParams)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    test('should reject request with past start time', async () => {
      const queryParams = {
        capacityRequired: 1000,
        fromPincode: '110001',
        toPincode: '110002',
        startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
      };

      const response = await request(app)
        .get('/api/vehicles/available')
        .query(queryParams)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /api/vehicles', () => {
    test('should retrieve all active vehicles', async () => {
      // Create test vehicles
      await Vehicle.create({
        name: 'Truck 1',
        capacityKg: 1000,
        tyres: 4
      });

      await Vehicle.create({
        name: 'Truck 2',
        capacityKg: 2000,
        tyres: 6
      });

      const response = await request(app)
        .get('/api/vehicles')
        .expect(200);

      expect(response.body.vehicles).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    test('should return empty array when no vehicles exist', async () => {
      const response = await request(app)
        .get('/api/vehicles')
        .expect(200);

      expect(response.body.vehicles).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });
  });
});
