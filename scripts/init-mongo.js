// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

db = db.getSiblingDB('fleetlink');

// Create collections with validation
db.createCollection('vehicles', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'capacityKg', 'tyres'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Vehicle name is required and must be a string'
        },
        capacityKg: {
          bsonType: 'number',
          minimum: 1,
          maximum: 50000,
          description: 'Capacity must be a number between 1 and 50000'
        },
        tyres: {
          bsonType: 'number',
          minimum: 2,
          maximum: 18,
          description: 'Tyres must be a number between 2 and 18'
        },
        isActive: {
          bsonType: 'bool',
          description: 'Active status must be a boolean'
        }
      }
    }
  }
});

db.createCollection('bookings', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['vehicleId', 'customerId', 'fromPincode', 'toPincode', 'startTime', 'endTime', 'estimatedRideDurationHours'],
      properties: {
        vehicleId: {
          bsonType: 'objectId',
          description: 'Vehicle ID is required and must be an ObjectId'
        },
        customerId: {
          bsonType: 'string',
          description: 'Customer ID is required and must be a string'
        },
        fromPincode: {
          bsonType: 'string',
          pattern: '^[0-9]{6}$',
          description: 'From pincode must be exactly 6 digits'
        },
        toPincode: {
          bsonType: 'string',
          pattern: '^[0-9]{6}$',
          description: 'To pincode must be exactly 6 digits'
        },
        startTime: {
          bsonType: 'date',
          description: 'Start time is required and must be a date'
        },
        endTime: {
          bsonType: 'date',
          description: 'End time is required and must be a date'
        },
        estimatedRideDurationHours: {
          bsonType: 'number',
          minimum: 0.1,
          description: 'Estimated ride duration must be at least 0.1 hours'
        },
        status: {
          bsonType: 'string',
          enum: ['confirmed', 'in-progress', 'completed', 'cancelled'],
          description: 'Status must be one of the allowed values'
        }
      }
    }
  }
});

// Create indexes for better performance
db.vehicles.createIndex({ capacityKg: 1, isActive: 1 });
db.vehicles.createIndex({ createdAt: -1 });

db.bookings.createIndex({ vehicleId: 1, startTime: 1, endTime: 1 });
db.bookings.createIndex({ customerId: 1, createdAt: -1 });
db.bookings.createIndex({ status: 1 });
db.bookings.createIndex({ startTime: 1, endTime: 1 });

// Insert sample data for testing
db.vehicles.insertMany([
  {
    name: 'Tata Ace - Sample Vehicle 1',
    capacityKg: 1000,
    tyres: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Mahindra Bolero Pickup - Sample Vehicle 2',
    capacityKg: 1500,
    tyres: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Ashok Leyland Dost - Sample Vehicle 3',
    capacityKg: 2000,
    tyres: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('FleetLink database initialized successfully with sample data!');
