import { Decimal } from 'decimal.js';
import { DiscountService } from '../services/DiscountService';
import { cartItems, customer, discounts, paymentInfo } from './fakeData';
import { describe, beforeEach, it, expect } from '@jest/globals';
import { CartItem, CustomerProfile, PaymentInfo } from '../models/interface';
import { BrandTier } from '../models/interface';

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
      // Original price: 2000
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

    it('should throw error for empty cart', async () => {
      await expect(
        discountService.calculateCartDiscounts([], customer, paymentInfo)
      ).rejects.toThrow('Invalid cart items');
    });

    it('should throw error for invalid customer profile', async () => {
      await expect(
        discountService.calculateCartDiscounts(cartItems, null as any, paymentInfo)
      ).rejects.toThrow('Invalid customer profile');
    });

    it('should skip bank discount with null payment info', async () => {
      const result = await discountService.calculateCartDiscounts(
        cartItems,
        customer,
        undefined
      );

      // Calculations:
      // Original price: 2000
      // Brand discount (40%): 800 → 1200
      // Category discount (10%): 120 → 1080
      // Voucher discount (69%): 745.2 → 334.8
      // Bank discount: 0 (no payment info) → 334.8

      expect(result.originalPrice).toBe(2000);
      expect(result.finalPrice).toBeCloseTo(334.8, 2);
      expect(result.appliedDiscounts).toEqual({
        'Brand Discount - PUMA (40%)': new Decimal(800),
        'Category Discount - T-shirts (10%)': new Decimal(120),
        'Voucher Discount - SUPER69 (69%)': new Decimal(745.2),
      });
      expect(result.message).not.toContain('Bank Card Discount - ICICI (10%)');
    });

    it('should handle multiple items with partial discounts', async () => {
      const multiItems: CartItem[] = [
        ...cartItems,
        {
          product: {
            id: '2',
            brand: 'NIKE',
            brandTier: BrandTier.REGULAR, // Changed to REGULAR
            category: 'T-shirts',
            basePrice: new Decimal(1000),
            currentPrice: new Decimal(1000),
          },
          quantity: 2,
          size: 'L',
        },
      ];

      const result = await discountService.calculateCartDiscounts(
        multiItems,
        customer,
        paymentInfo
      );

      // Calculations:
      // Original price: 2000 (PUMA) + 1000*2 (NIKE) = 4000
      // Brand discount (40% on PUMA only): 800 → 3200
      // Category discount (10% on T-shirts, both items): 320 (10% of 3200) → 2880
      // Voucher discount (69% on 2880, minCartAmount=1000): 1987.2 → 892.8
      // Bank discount (10% on 892.8): 89.28 → 803.52

      expect(result.originalPrice).toBe(4000);
      expect(result.finalPrice).toBeCloseTo(803.52, 2);
      expect(result.appliedDiscounts).toEqual({
        'Brand Discount - PUMA (40%)': new Decimal(800),
        'Category Discount - T-shirts (10%)': new Decimal(320),
        'Voucher Discount - SUPER69 (69%)': new Decimal(1987.2),
        'Bank Card Discount - ICICI (10%)': new Decimal(89.28),
      });
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

    it('should reject valid code with insufficient cart amount', async () => {
      const lowValueItems: CartItem[] = [
        {
          product: {
            id: '5',
            brand: 'PUMA',
            brandTier: BrandTier.PREMIUM,
            category: 'T-shirts',
            basePrice: new Decimal(500),
            currentPrice: new Decimal(500),
          },
          quantity: 1,
          size: 'S',
        },
      ];

      const isValid = await discountService.validateDiscountCode(
        'SUPER69',
        lowValueItems,
        customer
      );
      expect(isValid).toBe(false); // SUPER69 requires minCartAmount=1000
    });

    it('should reject empty discount code', async () => {
      const isValid = await discountService.validateDiscountCode(
        '',
        cartItems,
        customer
      );
      expect(isValid).toBe(false);
    });
  });

});