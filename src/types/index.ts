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