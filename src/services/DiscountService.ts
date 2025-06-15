import { CartItem, CustomerProfile, Discount, DiscountedPrice, PaymentInfo } from '../models/types';

export class DiscountService {
  private discounts: Discount[];

  constructor(discounts: Discount[]) {
    this.discounts = discounts;
  }

  async calculateCartDiscounts(
    cartItems: CartItem[],
    customer: CustomerProfile,
    paymentInfo?: PaymentInfo
  ): Promise<DiscountedPrice> {
    let originalPrice = this.calculateOriginalPrice(cartItems);
    let finalPrice = originalPrice;
    const appliedDiscounts: Record<string, number> = {};
    const messages: string[] = [];

    // Apply brand and category discounts first
    for (const item of cartItems) {
      const brandDiscount = this.findBrandDiscount(item.product.brand);
      const categoryDiscount = this.findCategoryDiscount(item.product.category);

      if (brandDiscount) {
        const discountAmount = this.calculateDiscountAmount(
          item.product.currentPrice * item.quantity,
          brandDiscount.value
        );
        finalPrice -= discountAmount;
        appliedDiscounts[brandDiscount.name] = discountAmount;
        messages.push(`${brandDiscount.name} applied`);
      }

      if (categoryDiscount) {
        const discountAmount = this.calculateDiscountAmount(
          item.product.currentPrice * item.quantity,
          categoryDiscount.value
        );
        finalPrice -= discountAmount;
        appliedDiscounts[categoryDiscount.name] = discountAmount;
        messages.push(`${categoryDiscount.name} applied`);
      }
    }

    // Apply bank offer if applicable
    if (paymentInfo?.bankName) {
      const bankDiscount = this.findBankDiscount(paymentInfo.bankName);
      if (bankDiscount) {
        const discountAmount = this.calculateDiscountAmount(finalPrice, bankDiscount.value);
        finalPrice -= discountAmount;
        appliedDiscounts[bankDiscount.name] = discountAmount;
        messages.push(`${bankDiscount.name} applied`);
      }
    }

    return {
      originalPrice,
      finalPrice,
      appliedDiscounts,
      message: messages.join(', ')
    };
  }

  async validateDiscountCode(
    code: string,
    cartItems: CartItem[],
    customer: CustomerProfile
  ): Promise<boolean> {
    const voucher = this.discounts.find(d => d.type === 'VOUCHER' && d.id === code);
    
    if (!voucher || !voucher.isActive) {
      return false;
    }

    // Check if any product is excluded
    const hasExcludedBrand = cartItems.some(item => 
      voucher.conditions?.brand && item.product.brand === voucher.conditions.brand
    );

    if (hasExcludedBrand) {
      return false;
    }

    // Check minimum purchase if specified
    if (voucher.conditions?.minPurchase) {
      const totalAmount = this.calculateOriginalPrice(cartItems);
      if (totalAmount < voucher.conditions.minPurchase) {
        return false;
      }
    }

    return true;
  }

  private calculateOriginalPrice(cartItems: CartItem[]): number {
    return cartItems.reduce(
      (total, item) => total + item.product.currentPrice * item.quantity,
      0
    );
  }

  private calculateDiscountAmount(price: number, discountPercentage: number): number {
    return (price * discountPercentage) / 100;
  }

  private findBrandDiscount(brand: string): Discount | undefined {
    return this.discounts.find(
      d => d.type === 'BRAND' && d.conditions?.brand === brand && d.isActive
    );
  }

  private findCategoryDiscount(category: string): Discount | undefined {
    return this.discounts.find(
      d => d.type === 'CATEGORY' && d.conditions?.category === category && d.isActive
    );
  }

  private findBankDiscount(bankName: string): Discount | undefined {
    return this.discounts.find(
      d => d.type === 'BANK' && d.conditions?.bankName === bankName && d.isActive
    );
  }
} 