import { BrandTier, CartItem, CustomerProfile, Discount, PaymentInfo, Product } from '../types';

// Sample Products
export const products: Product[] = [
  {
    id: '1',
    brand: 'PUMA',
    brandTier: BrandTier.PREMIUM,
    category: 'T-shirts',
    basePrice: 2000,
    currentPrice: 2000
  }
];

// Sample Cart Items
export const cartItems: CartItem[] = [
  {
    product: products[0],
    quantity: 1,
    size: 'M'
  }
];

// Sample Customer
export const customer: CustomerProfile = {
  id: '1',
  name: 'John Doe',
  tier: 'REGULAR',
  email: 'john@example.com'
};

// Sample Payment Info
export const paymentInfo: PaymentInfo = {
  method: 'CARD',
  bankName: 'ICICI',
  cardType: 'CREDIT'
};

// Sample Discounts
export const discounts: Discount[] = [
  {
    id: 'BRAND_PUMA_40',
    name: 'Min 40% off on PUMA',
    type: 'BRAND',
    value: 40,
    conditions: {
      brand: 'PUMA'
    },
    isActive: true
  },
  {
    id: 'CAT_TSHIRT_10',
    name: 'Extra 10% off on T-shirts',
    type: 'CATEGORY',
    value: 10,
    conditions: {
      category: 'T-shirts'
    },
    isActive: true
  },
  {
    id: 'BANK_ICICI_10',
    name: '10% instant discount on ICICI Bank cards',
    type: 'BANK',
    value: 10,
    conditions: {
      bankName: 'ICICI'
    },
    isActive: true
  },
  {
    id: 'SUPER69',
    name: 'SUPER69 - 69% off on any product',
    type: 'VOUCHER',
    value: 69,
    conditions: {
      minPurchase: 1000
    },
    isActive: true
  }
]; 