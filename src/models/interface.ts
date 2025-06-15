import { Decimal } from 'decimal.js';

export enum BrandTier {
  PREMIUM = "premium",
  REGULAR = "regular",
  BUDGET = "budget"
}

export interface Product {
  id: string;
  brand: string;
  brandTier: BrandTier;
  category: string;
  basePrice: number;
  currentPrice: number; // After brand/category discount
}

export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
}

export interface PaymentInfo {
  method: string; // CARD, UPI, etc
  bankName?: string;
  cardType?: string; // CREDIT, DEBIT
}

export interface DiscountedPrice {
  originalPrice: number;
  finalPrice: number;
  appliedDiscounts: Record<string, number>; // discount_name -> amount
  message: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  tier: string; // PREMIUM, REGULAR, etc
  email: string;
}

export interface Discount {
  id: string;
  name: string;
  type: 'BRAND' | 'CATEGORY' | 'BANK' | 'VOUCHER';
  value: number; // percentage or fixed amount
  conditions?: {
    brand?: string;
    category?: string;
    bankName?: string;
    minPurchase?: number;
    maxDiscount?: number;
  };
  isActive: boolean;
} 

export interface DiscountStrategy {
  calculateDiscount(items: CartItem[], customer: CustomerProfile): Promise<Decimal>;
  getDiscountName(): string;
  validate(items: CartItem[], customer: CustomerProfile): Promise<boolean>;
}

export interface PaymentValidator {
  validate(paymentInfo: PaymentInfo, config: BankCardDiscountConfig): boolean;
}

// Configuration interface for flexibility
export interface BankCardDiscountConfig {
  bankName: string;
  discountPercentage: number;
  minimumCartAmount?: Decimal;
  eligibleCategories?: string[]; 
}

// Configuration interface for brand discount
export interface BrandDiscountConfig {
  brand: string;
  discountPercentage: number;
  minimumCartAmount?: Decimal; 
  eligibleCategories?: string[]; 
  customerTiers?: string[];
  validUntil?: Date; 
}


export interface BrandValidator {
  validate(
    items: CartItem[],
    customer: CustomerProfile,
    config: BrandDiscountConfig
  ): boolean;
}


export interface CategoryDiscountConfig {
  category: string;
  discountPercentage: number;
  minimumCartAmount?: Decimal; 
  excludedBrands?: string[]; 
  customerTiers?: string[];
  validUntil?: Date; 
}

/**
 * Validator interface for modular validation logic
 */
export interface CategoryValidator {
  validate(
    items: CartItem[],
    customer: CustomerProfile,
    config: CategoryDiscountConfig
  ): boolean;
}

// Configuration interface for voucher discount
export interface VoucherDiscountConfig {
  code: string;
  discountPercentage: number;
  minimumCartAmount?: Decimal; 
  excludedBrands?: string[];
  excludedCategories?: string[]; 
  customerTiers?: string[]; 
  validUntil?: Date; 
  maxDiscountCap?: Decimal; 
}

/**
 * Validator interface for modular voucher validation
 */
export interface VoucherValidator {
  validate(
    code: string,
    items: CartItem[],
    customer: CustomerProfile,
    config: VoucherDiscountConfig
  ): Promise<boolean>;
}
