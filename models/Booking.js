const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle ID is required']
  },
  customerId: {
    type: String,
    required: [true, 'Customer ID is required'],
    trim: true
  },
  fromPincode: {
    type: String,
    required: [true, 'From pincode is required'],
    trim: true,
    match: [/^\d{6}$/, 'Pincode must be exactly 6 digits']
  },
  toPincode: {
    type: String,
    required: [true, 'To pincode is required'],
    trim: true,
    match: [/^\d{6}$/, 'Pincode must be exactly 6 digits']
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Start time must be in the future'
    }
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required']
  },
  estimatedRideDurationHours: {
    type: Number,
    required: [true, 'Estimated ride duration is required'],
    min: [0.1, 'Ride duration must be at least 0.1 hours']
  },
  status: {
    type: String,
    enum: ['confirmed', 'in-progress', 'completed', 'cancelled'],
    default: 'confirmed'
  },
  totalCost: {
    type: Number,
    min: [0, 'Total cost cannot be negative']
  }
}, {
  timestamps: true
});

// Compound index for efficient overlap queries
bookingSchema.index({ vehicleId: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });

// Virtual for booking duration in readable format
bookingSchema.virtual('durationFormatted').get(function() {
  const hours = Math.floor(this.estimatedRideDurationHours);
  const minutes = Math.round((this.estimatedRideDurationHours - hours) * 60);
  return `${hours}h ${minutes}m`;
});

// Virtual for route summary
bookingSchema.virtual('routeSummary').get(function() {
  return `${this.fromPincode} → ${this.toPincode}`;
});

// Ensure virtual fields are serialized
bookingSchema.set('toJSON', { virtuals: true });

// Pre-save middleware to calculate end time
bookingSchema.pre('save', function(next) {
  if (this.startTime && this.estimatedRideDurationHours) {
    this.endTime = new Date(this.startTime.getTime() + (this.estimatedRideDurationHours * 60 * 60 * 1000));
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
