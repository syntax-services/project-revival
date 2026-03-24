import { describe, it, expect } from 'vitest';

// We mock the commission calculation logic from CheckoutFlow.tsx
const calculateCommission = (cartItems: { price: number; quantity: number; commissionPercent?: number }[]) => {
  const commissionAmountValue = cartItems.reduce((sum, item) => 
    sum + (item.price * item.quantity * (item.commissionPercent || 10) / 100), 0
  );
  return Math.round(commissionAmountValue);
};

describe('Commission Calculation', () => {
  it('should use default 10% commission when percent is not provided', () => {
    const items = [{ price: 1000, quantity: 2 }]; // Total 2000
    const result = calculateCommission(items);
    expect(result).toBe(200);
  });

  it('should calculate weighted commission for mixed items', () => {
    const items = [
      { price: 1000, quantity: 1, commissionPercent: 50 }, // 500 comm
      { price: 100, quantity: 10, commissionPercent: 10 }, // 100 comm
    ];
    // Simple average would be 30% of 2000 = 600
    // Weighted should be 500 + 100 = 600 (wait, in this case it's same because totals are equal)
    
    const items2 = [
      { price: 900, quantity: 1, commissionPercent: 50 }, // 450 comm
      { price: 100, quantity: 1, commissionPercent: 10 }, // 10 comm
    ];
    // Total subtotal = 1000. 
    // Simple average = 30% of 1000 = 300
    // Weighted = 450 + 10 = 460
    
    expect(calculateCommission(items2)).toBe(460);
  });

  it('should handle zero prices correctly', () => {
    const items = [{ price: 0, quantity: 5, commissionPercent: 20 }];
    expect(calculateCommission(items)).toBe(0);
  });

  it('should round the final amount to the nearest integer', () => {
    const items = [{ price: 105, quantity: 1, commissionPercent: 10 }]; // 10.5
    expect(calculateCommission(items)).toBe(11);
  });
});
