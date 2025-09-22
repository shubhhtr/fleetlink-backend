const {
  calculateRideDuration,
  doTimeRangesOverlap,
  calculateEndTime,
  validateBookingTime
} = require('../utils/rideCalculations');

describe('Ride Calculations', () => {
  describe('calculateRideDuration', () => {
    test('should calculate duration correctly for valid pincodes', () => {
      expect(calculateRideDuration('110001', '110002')).toBe(1);
      expect(calculateRideDuration('110001', '110025')).toBe(24);
      expect(calculateRideDuration('110025', '110001')).toBe(24);
      expect(calculateRideDuration('400001', '400051')).toBe(50 % 24); // 2 hours
    });

    test('should return minimum duration of 0.5 hours', () => {
      expect(calculateRideDuration('110001', '110001')).toBe(0.5);
    });

    test('should throw error for invalid pincodes', () => {
      expect(() => calculateRideDuration('12345', '110001')).toThrow('Pincodes must be exactly 6 digits');
      expect(() => calculateRideDuration('110001', '1234567')).toThrow('Pincodes must be exactly 6 digits');
      expect(() => calculateRideDuration('abcdef', '110001')).toThrow('Pincodes must be exactly 6 digits');
    });

    test('should throw error for missing pincodes', () => {
      expect(() => calculateRideDuration('', '110001')).toThrow('Both from and to pincodes are required');
      expect(() => calculateRideDuration('110001', '')).toThrow('Both from and to pincodes are required');
      expect(() => calculateRideDuration(null, '110001')).toThrow('Both from and to pincodes are required');
    });
  });

  describe('doTimeRangesOverlap', () => {
    const baseDate = new Date('2023-10-27T10:00:00Z');
    
    test('should detect overlapping ranges', () => {
      const start1 = new Date(baseDate);
      const end1 = new Date(baseDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      const start2 = new Date(baseDate.getTime() + 1 * 60 * 60 * 1000); // +1 hour
      const end2 = new Date(baseDate.getTime() + 3 * 60 * 60 * 1000); // +3 hours
      
      expect(doTimeRangesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    test('should detect non-overlapping ranges', () => {
      const start1 = new Date(baseDate);
      const end1 = new Date(baseDate.getTime() + 1 * 60 * 60 * 1000); // +1 hour
      const start2 = new Date(baseDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      const end2 = new Date(baseDate.getTime() + 3 * 60 * 60 * 1000); // +3 hours
      
      expect(doTimeRangesOverlap(start1, end1, start2, end2)).toBe(false);
    });

    test('should handle adjacent ranges correctly', () => {
      const start1 = new Date(baseDate);
      const end1 = new Date(baseDate.getTime() + 1 * 60 * 60 * 1000); // +1 hour
      const start2 = new Date(baseDate.getTime() + 1 * 60 * 60 * 1000); // +1 hour (same as end1)
      const end2 = new Date(baseDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      
      expect(doTimeRangesOverlap(start1, end1, start2, end2)).toBe(false);
    });
  });

  describe('calculateEndTime', () => {
    test('should calculate end time correctly', () => {
      const startTime = new Date('2023-10-27T10:00:00Z');
      const duration = 2.5; // 2.5 hours
      const expectedEndTime = new Date('2023-10-27T12:30:00Z');
      
      expect(calculateEndTime(startTime, duration)).toEqual(expectedEndTime);
    });

    test('should handle fractional hours', () => {
      const startTime = new Date('2023-10-27T10:00:00Z');
      const duration = 0.5; // 30 minutes
      const expectedEndTime = new Date('2023-10-27T10:30:00Z');
      
      expect(calculateEndTime(startTime, duration)).toEqual(expectedEndTime);
    });
  });

  describe('validateBookingTime', () => {
    test('should accept future times', () => {
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
      const result = validateBookingTime(futureTime);
      
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Valid booking time');
    });

    test('should reject past times', () => {
      const pastTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const result = validateBookingTime(pastTime);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Start time must be in the future');
    });

    test('should reject times too far in the future', () => {
      const farFutureTime = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000); // 400 days from now
      const result = validateBookingTime(farFutureTime);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Cannot book more than 1 year in advance');
    });
  });
});
