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
  basePrice: Decimal;
  currentPrice: Decimal; // After brand/category discount
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
  appliedDiscounts: Record<string, Decimal>; // discount_name -> amount
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
  calculateDiscount(items: CartItem[], customer: CustomerProfile,  paymentInfo?: PaymentInfo): Promise<Decimal>;
  getDiscountName(): string;
  validate(items: CartItem[], customer: CustomerProfile,  paymentInfo?: PaymentInfo): Promise<boolean>;
  getPriority(): number 
}

export interface PaymentValidator {
  validate(paymentInfo: PaymentInfo, config: BankCardDiscountConfig): boolean;
}

// Configuration interface for flexibility
export interface BankCardDiscountConfig {
  bankName: string;
  discountPercentage: Decimal;
  minimumCartAmount?: Decimal;
  eligibleCategories?: string[]; 
}

// Configuration interface for brand discount
export interface BrandDiscountConfig {
  brand: string;
  discountPercentage: Decimal;
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


export interface VoucherDiscountConfig {
  code: string;
  discountPercentage: Decimal;
  minimumCartAmount?: Decimal;
  maxDiscountCap?: Decimal;
  excludedBrands?: string[];
  excludedCategories?: string[];
}

export interface VoucherValidator {
  validate(
    items: CartItem[],
    customer: CustomerProfile,
    config: VoucherDiscountConfig
  ): Promise<boolean>;
}

// StrategyConfig interface (for reference, ideally in DiscountService.ts)
export interface StrategyConfig {
  type: 'brand' | 'category' | 'voucher' | 'bank';
  config: any;
  validator?: any;
  onDiscountApplied?: (discount: Decimal, name: string) => void;
}