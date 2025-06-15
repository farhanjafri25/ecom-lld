import { Decimal } from 'decimal.js';
import { CartItem, CustomerProfile, PaymentInfo, StrategyConfig, BrandTier } from '../models/interface';

export const cartItems: CartItem[] = [
  {
    product: {
      id: '1',
      brand: 'PUMA',
      brandTier: BrandTier.PREMIUM,
      category: 'T-shirts',
      basePrice: new Decimal(2000),
      currentPrice: new Decimal(2000),
    },
    quantity: 1,
    size: 'M',
  },
];

export const customer: CustomerProfile = {
  id: '12345',
  name: 'John Doe',
  tier: 'REGULAR',
  email: 'john.doe@example.com',
};

export const paymentInfo: PaymentInfo = {
  method: 'CARD',
  bankName: 'ICICI',
  cardType: 'CREDIT',
};

export const discounts: StrategyConfig[] = [
  {
    type: 'brand',
    config: {
      brand: 'PUMA',
      discountPercentage: new Decimal(40),
    },
  },
  {
    type: 'category',
    config: {
      category: 'T-shirts',
      discountPercentage: new Decimal(10),
    },
  },
  {
    type: 'voucher',
    config: {
      code: 'SUPER69',
      discountPercentage: new Decimal(69),
      minimumCartAmount: new Decimal(1000),
    },
  },
  {
    type: 'bank',
    config: {
      bankName: 'ICICI',
      discountPercentage: new Decimal(10),
    },
  },
];
