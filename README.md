# FleetLink Backend

Welcome to the FleetLink backend service! This is the heart of our logistics vehicle booking system, built to handle everything from vehicle management to booking operations with reliability and performance in mind.

## What This Does

FleetLink Backend is a RESTful API service that powers our vehicle booking platform. Whether you're managing a fleet of trucks, vans, or any other commercial vehicles, this backend handles the heavy lifting - from tracking vehicle availability to processing bookings and preventing double-bookings.

The system was designed with real-world logistics challenges in mind. We've tackled common issues like booking conflicts, data validation, and scalability from day one.

## Tech Stack

- **Node.js & Express.js** - Fast, lightweight server framework
- **MongoDB & Mongoose** - Flexible document database with robust ODM
- **Jest & Supertest** - Comprehensive testing suite
- **Docker** - Containerized deployment ready

## Getting Started

### Prerequisites

Make sure you have these installed:
- Node.js (v16 or higher)
- MongoDB (v5.0 or higher)
- npm or yarn

### Quick Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   
   Copy the example environment file and update it with your settings:
   ```bash
   cp .env.example .env
   ```
   
   Update these key variables in `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/fleetlink
   PORT=5000
   NODE_ENV=development
   ```

3. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

The server will be running at `http://localhost:5000`

## API Endpoints

### Vehicles

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/vehicles` | Get all vehicles |
| `POST` | `/api/vehicles` | Add a new vehicle |
| `GET` | `/api/vehicles/available` | Get available vehicles for specific route and time |

### Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/bookings` | Get all bookings |
| `POST` | `/api/bookings` | Create a new booking |
| `PATCH` | `/api/bookings/:id/status` | Update booking status |

### Example Usage

**Adding a new vehicle:**
```bash
curl -X POST http://localhost:5000/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleNumber": "MH01AB1234",
    "type": "Truck",
    "capacity": 1000,
    "driver": {
      "name": "John Doe",
      "phone": "9876543210",
      "license": "DL123456789"
    }
  }'
```

**Creating a booking:**
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "vehicle_id_here",
    "customerName": "Jane Smith",
    "customerPhone": "9876543210",
    "fromPincode": "400001",
    "toPincode": "411001",
    "pickupTime": "2024-01-15T10:00:00Z",
    "goodsType": "Electronics",
    "weight": 500
  }'
```

## Project Structure

```
backend/
├── models/           # Database schemas
│   ├── Vehicle.js    # Vehicle model with validation
│   └── Booking.js    # Booking model with conflict prevention
├── routes/           # API route handlers
│   ├── vehicles.js   # Vehicle management endpoints
│   └── bookings.js   # Booking management endpoints
├── tests/            # Test suites
│   ├── vehicles.test.js
│   ├── bookings.test.js
│   └── setup.js
├── utils/            # Helper functions
├── scripts/          # Database and utility scripts
├── server.js         # Main application entry point
└── healthcheck.js    # Docker health check
```

## Key Features

### Smart Booking System
- **Conflict Prevention**: Automatically detects and prevents double bookings
- **Real-time Availability**: Checks vehicle availability considering ongoing trips
- **Duration Calculation**: Smart algorithm for estimating trip duration based on pincode distance

### Data Validation
- **Input Sanitization**: All inputs are validated and sanitized
- **Business Rules**: Enforces capacity limits, valid pincodes, and logical time constraints
- **Error Handling**: Comprehensive error responses without exposing sensitive data

### Performance & Security
- **Rate Limiting**: Prevents API abuse
- **CORS Configuration**: Secure cross-origin requests
- **MongoDB Indexing**: Optimized database queries
- **Health Checks**: Built-in monitoring for containerized deployments

## Testing

We take testing seriously. Run the full test suite with:

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Run with coverage report
npm test -- --coverage
```

Our tests cover:
- API endpoint functionality
- Database operations
- Business logic validation
- Error handling scenarios
- Edge cases and race conditions

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/fleetlink` |
| `NODE_ENV` | Environment mode | `development` |

## Docker Support

The backend is fully containerized and ready for deployment:

```bash
# Build the image
docker build -t fleetlink-backend .

# Run the container
docker run -p 5000:5000 --env-file .env fleetlink-backend
```

For development with Docker Compose (from project root):
```bash
docker-compose up backend
```

## Common Issues & Solutions

**MongoDB Connection Issues**
- Ensure MongoDB is running locally or update `MONGODB_URI` with correct connection string
- Check if the database user has proper permissions

**Port Already in Use**
- Change the `PORT` in your `.env` file
- Kill any existing processes using the port: `lsof -ti:5000 | xargs kill -9`

**Test Failures**
- Make sure you're using a separate test database
- Clear any existing test data before running tests

## Contributing

When adding new features:

1. **Database Changes**: Update models with proper validation
2. **API Endpoints**: Follow RESTful conventions
3. **Testing**: Add comprehensive tests for new functionality
4. **Documentation**: Update this README with new endpoints or configuration

## Performance Notes

The system handles booking conflicts using MongoDB transactions and implements optimistic locking to prevent race conditions. For high-traffic scenarios, consider:

- Implementing connection pooling
- Adding Redis for caching frequently accessed data
- Setting up database read replicas for scaling reads

## License

MIT License - feel free to use this in your own projects!
