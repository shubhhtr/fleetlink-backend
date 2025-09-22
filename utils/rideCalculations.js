/**
 * Calculate estimated ride duration based on pincodes
 * Note: This is a simplified placeholder logic as specified in requirements
 * In a real-world scenario, this would integrate with mapping services
 * 
 * @param {string} fromPincode - Starting pincode (6 digits)
 * @param {string} toPincode - Destination pincode (6 digits)
 * @returns {number} Estimated ride duration in hours
 */
function calculateRideDuration(fromPincode, toPincode) {
  // Validate input
  if (!fromPincode || !toPincode) {
    throw new Error('Both from and to pincodes are required');
  }
  
  if (!/^\d{6}$/.test(fromPincode) || !/^\d{6}$/.test(toPincode)) {
    throw new Error('Pincodes must be exactly 6 digits');
  }
  
  // Simplified logic: absolute difference modulo 24
  const fromNum = parseInt(fromPincode);
  const toNum = parseInt(toPincode);
  const duration = Math.abs(toNum - fromNum) % 24;
  
  // Ensure minimum duration of 0.5 hours (30 minutes)
  return Math.max(duration, 0.5);
}

/**
 * Check if two time ranges overlap
 * 
 * @param {Date} start1 - Start time of first range
 * @param {Date} end1 - End time of first range
 * @param {Date} start2 - Start time of second range
 * @param {Date} end2 - End time of second range
 * @returns {boolean} True if ranges overlap
 */
function doTimeRangesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

/**
 * Calculate end time based on start time and duration
 * 
 * @param {Date} startTime - Start time
 * @param {number} durationHours - Duration in hours
 * @returns {Date} End time
 */
function calculateEndTime(startTime, durationHours) {
  return new Date(startTime.getTime() + (durationHours * 60 * 60 * 1000));
}

/**
 * Validate booking time constraints
 * 
 * @param {Date} startTime - Proposed start time
 * @returns {object} Validation result with isValid and message
 */
function validateBookingTime(startTime) {
  const now = new Date();
  const maxAdvanceBooking = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year ahead
  
  if (startTime <= now) {
    return {
      isValid: false,
      message: 'Start time must be in the future'
    };
  }
  
  if (startTime > maxAdvanceBooking) {
    return {
      isValid: false,
      message: 'Cannot book more than 1 year in advance'
    };
  }
  
  return {
    isValid: true,
    message: 'Valid booking time'
  };
}

module.exports = {
  calculateRideDuration,
  doTimeRangesOverlap,
  calculateEndTime,
  validateBookingTime
};
