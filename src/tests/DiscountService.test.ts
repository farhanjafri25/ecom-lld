import { Decimal } from 'decimal.js';
import { DiscountService } from '../services/DiscountService';
import { cartItems, customer, discounts, paymentInfo } from './fakeData';
import { describe, beforeEach, it, expect } from '@jest/globals';

describe('DiscountService', () => {
  let discountService: DiscountService;

  beforeEach(() => {
    discountService = new DiscountService(discounts);
  });

  describe('calculateCartDiscounts', () => {
    it('should apply all applicable discounts correctly', async () => {
      const result = await discountService.calculateCartDiscounts(
        cartItems,
        customer,
        paymentInfo
      );

      // Calculations:
      // Original price (currentPrice): 2000
      // Brand discount (40% on 2000): 800
      // Price after brand: 1200
      // Category discount (10% on 1200): 120
      // Price after category: 1080
      // Voucher discount (69% on 1080): 745.2
      // Price after voucher: 334.8
      // Bank discount (10% on 334.8): 33.48
      // Final price: 301.32

      expect(result.originalPrice).toBe(2000);
      expect(result.finalPrice).toBeCloseTo(301.32, 2);
      expect(result.appliedDiscounts).toEqual({
        'Brand Discount - PUMA (40%)': new Decimal(800),
        'Category Discount - T-shirts (10%)': new Decimal(120),
        'Voucher Discount - SUPER69 (69%)': new Decimal(745.2),
        'Bank Card Discount - ICICI (10%)': new Decimal(33.48),
      });
      expect(result.message).toContain('Brand Discount - PUMA (40%)');
      expect(result.message).toContain('Category Discount - T-shirts (10%)');
      expect(result.message).toContain('Voucher Discount - SUPER69 (69%)');
      expect(result.message).toContain('Bank Card Discount - ICICI (10%)');
    });
  });

  describe('validateDiscountCode', () => {
    it('should validate valid discount code', async () => {
      const isValid = await discountService.validateDiscountCode(
        'SUPER69',
        cartItems,
        customer
      );
      expect(isValid).toBe(true);
    });

    it('should reject invalid discount code', async () => {
      const isValid = await discountService.validateDiscountCode(
        'INVALID_CODE',
        cartItems,
        customer
      );
      expect(isValid).toBe(false);
    });
  });
});
