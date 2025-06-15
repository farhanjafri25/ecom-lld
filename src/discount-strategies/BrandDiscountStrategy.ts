
import { Decimal } from 'decimal.js';
import { BrandDiscountConfig, BrandValidator, CartItem, CustomerProfile, DiscountStrategy, PaymentInfo } from '../models/interface';

class DefaultBrandValidator implements BrandValidator {
  validate(
    items: CartItem[],
    customer: CustomerProfile,
    config: BrandDiscountConfig
  ): boolean {
    const hasBrandItems = items.some(item => item.product.brand.toLowerCase() === config.brand.toLowerCase());
    if (config.customerTiers && customer.tier && !config.customerTiers.includes(customer.tier)) {
      return false;
    }
    if (config.validUntil && config.validUntil < new Date()) {
      return false;
    }
    return hasBrandItems;
  }
}

export class BrandDiscountStrategy implements DiscountStrategy {
  private readonly config: BrandDiscountConfig;
  private readonly validator: BrandValidator;
  private readonly PERCENTAGE_DIVISOR = new Decimal(100);
  private onDiscountApplied?: (discount: Decimal, name: string) => void;

  constructor(
    config: BrandDiscountConfig,
    validator: BrandValidator = new DefaultBrandValidator(),
    onDiscountApplied?: (discount: Decimal, name: string) => void
  ) {
    if (!config.brand || typeof config.brand !== 'string') {
      throw new Error('Invalid brand name');
    }
    if (config.discountPercentage < 0 || config.discountPercentage > 100) {
      throw new Error('Invalid discount percentage');
    }
    if (config.minimumCartAmount && config.minimumCartAmount.lessThan(0)) {
      throw new Error('Invalid minimum cart amount');
    }
    this.config = { ...config, discountPercentage: Number(config.discountPercentage) };
    this.validator = validator;
    this.onDiscountApplied = onDiscountApplied;
  }

  async calculateDiscount(
    items: CartItem[],
    customer: CustomerProfile,
    paymentInfo?: PaymentInfo
  ): Promise<Decimal> {
    if (!items.length || !this.validate(items, customer)) {
      console.debug(`No discount applied: Invalid conditions for brand ${this.config.brand}`);
      return new Decimal(0);
    }

    const totalAmount = items.reduce((acc, item) => {
      if (
        item.product.brand.toLowerCase() === this.config.brand.toLowerCase() &&
        (!this.config.eligibleCategories || this.config.eligibleCategories.includes(item.product.category))
      ) {
        return acc.plus(new Decimal(item.product.basePrice).times(item.quantity));
      }
      return acc;
    }, new Decimal(0));

    if (this.config.minimumCartAmount && totalAmount.lessThan(this.config.minimumCartAmount)) {
      console.debug(`No discount applied: Cart total ${totalAmount} below minimum ${this.config.minimumCartAmount}`);
      return new Decimal(0);
    }

    const discount = totalAmount.times(this.config.discountPercentage).div(this.PERCENTAGE_DIVISOR);

    if (this.onDiscountApplied) {
      this.onDiscountApplied(discount, this.getDiscountName());
    }

    return discount;
  }

  getDiscountName(): string {
    return `Brand Discount - ${this.config.brand} (${this.config.discountPercentage}%)`;
  }

  async validate(
    items: CartItem[],
    customer: CustomerProfile,
    paymentInfo?: PaymentInfo
  ): Promise<boolean> {
    return this.validator.validate(items, customer, this.config);
  }

  getPriority(): number {
    return 1; // Brand discounts apply first
  }
}
