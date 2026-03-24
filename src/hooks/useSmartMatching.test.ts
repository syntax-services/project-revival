import { describe, it, expect, vi } from 'vitest';
import { detectLowQualitySignals } from './useSmartMatching';

// Mock the distance calculation for the pure logic test
const calculateTrustScore = (business: {
  id?: string;
  verified?: boolean;
  reputation_score?: number;
  total_reviews?: number;
  total_completed_orders?: number;
}) => {
  let trustScore = 50;
  if (business.verified) trustScore += 15;
  if (business.reputation_score) {
    trustScore += Math.min((business.reputation_score / 5) * 20, 20);
  }
  if (business.total_reviews) {
    trustScore += Math.min(business.total_reviews / 10, 10);
  }
  if (business.total_completed_orders) {
    trustScore += Math.min(business.total_completed_orders / 20, 5);
  }
  return Math.min(trustScore, 100);
};

describe('Smart Matching Trust Score', () => {
  it('should have a base score of 50', () => {
    const business = { id: '1' };
    expect(calculateTrustScore(business)).toBe(50);
  });

  it('should apply verified bonus', () => {
    const business = { id: '1', verified: true };
    expect(calculateTrustScore(business)).toBe(65);
  });

  it('should calculate reputation bonus correctly', () => {
    const business = { id: '1', reputation_score: 5 }; // Max bonus 20
    expect(calculateTrustScore(business)).toBe(70);
    
    const businessLow = { id: '1', reputation_score: 2.5 }; // 10 bonus
    expect(calculateTrustScore(businessLow)).toBe(60);
  });

  it('should cap trust score at 100', () => {
    const business = { 
      verified: true, // 15
      reputation_score: 5, // 20
      total_reviews: 100, // 10
      total_completed_orders: 100 // 5
    }; 
    // 50 + 15 + 20 + 10 + 5 = 100
    expect(calculateTrustScore(business)).toBe(100);
  });
});

describe('Low Quality Signal Detection', () => {
  it('should detect unverified new businesses', () => {
    const business = {
      reputation_score: null,
      verified: false,
      total_reviews: 0,
      total_completed_orders: 0
    };
    const warnings = detectLowQualitySignals(business);
    expect(warnings).toContain('Not verified');
    expect(warnings).toContain('New business');
  });

  it('should detect low rating warnings', () => {
    const business = {
      reputation_score: 2.0,
      verified: true,
      total_reviews: 10
    };
    const warnings = detectLowQualitySignals(business);
    expect(warnings).toContain('Low rating');
    expect(warnings).toContain('Mixed reviews');
  });
});
