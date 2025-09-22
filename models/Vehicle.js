const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vehicle name is required'],
    trim: true,
    maxlength: [100, 'Vehicle name cannot exceed 100 characters']
  },
  capacityKg: {
    type: Number,
    required: [true, 'Vehicle capacity is required'],
    min: [1, 'Capacity must be at least 1 kg'],
    max: [50000, 'Capacity cannot exceed 50,000 kg']
  },
  tyres: {
    type: Number,
    required: [true, 'Number of tyres is required'],
    min: [2, 'Vehicle must have at least 2 tyres'],
    max: [18, 'Vehicle cannot have more than 18 tyres']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
vehicleSchema.index({ capacityKg: 1, isActive: 1 });

// Virtual for vehicle summary
vehicleSchema.virtual('summary').get(function() {
  return `${this.name} - ${this.capacityKg}kg capacity, ${this.tyres} tyres`;
});

// Ensure virtual fields are serialized
vehicleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
