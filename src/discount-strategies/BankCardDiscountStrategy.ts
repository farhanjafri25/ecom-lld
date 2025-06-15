import { Decimal } from 'decimal.js';
import { DiscountStrategy, CartItem, CustomerProfile, PaymentInfo, BankCardDiscountConfig } from '../models/interface';

export class BankCardDiscountStrategy implements DiscountStrategy {
  private readonly config: BankCardDiscountConfig;
  private readonly PERCENTAGE_DIVISOR = new Decimal(100);

  constructor(config: BankCardDiscountConfig) {
    if (!config.bankName || typeof config.bankName !== 'string') throw new Error('Invalid bank name');
    if (config.discountPercentage.lessThan(0) || config.discountPercentage.greaterThan(100)) {
      throw new Error('Invalid discount percentage');
    }
    this.config = { ...config, discountPercentage: new Decimal(config.discountPercentage) };
  }

  async calculateDiscount(
    items: CartItem[],
    customer: CustomerProfile,
    paymentInfo?: PaymentInfo
  ): Promise<Decimal> {
    if (!(await this.validate(items, customer, paymentInfo))) {
      console.debug(`No discount applied: Invalid conditions for bank ${this.config.bankName}`);
      return new Decimal(0);
    }

    const totalAmount = items.reduce(
      (acc, item) => acc.plus(item.product.currentPrice.times(item.quantity)),
      new Decimal(0)
    );

    const discount = totalAmount.times(this.config.discountPercentage).div(this.PERCENTAGE_DIVISOR);
    console.debug(`Bank ${this.config.bankName} discount: ${discount}`);
    return discount;
  }

  getDiscountName(): string {
    return `Bank Card Discount - ${this.config.bankName} (${this.config.discountPercentage}%)`;
  }

  async validate(
    items: CartItem[],
    customer: CustomerProfile,
    paymentInfo?: PaymentInfo
  ): Promise<boolean> {
    // Strict validation
    if (!paymentInfo || paymentInfo.method !== 'CARD' || paymentInfo.bankName !== this.config.bankName) {
      console.debug(`Bank validation failed: method=${paymentInfo?.method}, bankName=${paymentInfo?.bankName}`);
      return false;
    }

    const totalAmount = items.reduce(
      (acc, item) => acc.plus(item.product.currentPrice.times(item.quantity)),
      new Decimal(0)
    );

    if (this.config.minimumCartAmount && totalAmount.lessThan(this.config.minimumCartAmount)) {
      console.debug(`Bank ${this.config.bankName}: Cart total ${totalAmount} below minimum ${this.config.minimumCartAmount}`);
      return false;
    }

    if (this.config.eligibleCategories) {
      const hasEligibleCategory = items.some(item => this.config.eligibleCategories!.includes(item.product.category));
      if (!hasEligibleCategory) {
        console.debug(`Bank ${this.config.bankName}: No eligible categories found`);
        return false;
      }
    }

    return true;
  }

  getPriority(): number {
    return 4;
  }
}
