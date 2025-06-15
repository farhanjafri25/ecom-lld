import { DiscountService } from '../DiscountService';
import { cartItems, customer, discounts, paymentInfo } from '../../data/fakeData';

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

      // Original price: 2000
      // Brand discount (40%): 800
      // Category discount (10%): 120
      // Bank discount (10%): 108
      // Final price should be: 972

      expect(result.originalPrice).toBe(2000);
      expect(result.finalPrice).toBe(972);
      expect(result.appliedDiscounts).toEqual({
        'Min 40% off on PUMA': 800,
        'Extra 10% off on T-shirts': 120,
        '10% instant discount on ICICI Bank cards': 108
      });
      expect(result.message).toContain('Min 40% off on PUMA');
      expect(result.message).toContain('Extra 10% off on T-shirts');
      expect(result.message).toContain('10% instant discount on ICICI Bank cards');
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