import { Decimal } from 'decimal.js';
import { DiscountStrategy, CartItem, CustomerProfile, PaymentInfo, BrandDiscountConfig, BrandTier } from '../models/interface';

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
    if (!config.brand || typeof config.brand !== 'string') throw new Error('Invalid brand');
    if (config.discountPercentage!.lessThan(0) || config.discountPercentage!.greaterThan(100)) {
      throw new Error('Invalid discount percentage');
    }
    this.config = { ...config, discountPercentage: new Decimal(config.discountPercentage!) };
    this.validator = validator;
    this.onDiscountApplied = onDiscountApplied;
  }

  async calculateDiscount(
    items: CartItem[], customer: CustomerProfile,
    paymentInfo?: PaymentInfo
  ): Promise<Decimal> {
    if (!items.length || !(await this.validate(items, customer, paymentInfo))) {
      console.debug(`No discount applied: Invalid conditions for brand ${this.config.brand}`);
      return new Decimal(0);
    }

    const totalAmount = items.reduce((acc, item) => {
      if (
        item.product.brand === this.config.brand &&
        item.product.brandTier === BrandTier.PREMIUM && // Only PREMIUM brands
        (!this.config.eligibleCategories || this.config.eligibleCategories.includes(item.product.category))
      ) {
        return acc.plus(new Decimal(item.product.currentPrice).times(item.quantity));
      }
      return acc;
    }, new Decimal(0));

    console.debug(`Brand ${this.config.brand}: totalAmount=${totalAmount}, percentage=${this.config.discountPercentage}`);

    if (this.config.minimumCartAmount && totalAmount.lessThan(this.config.minimumCartAmount)) {
      console.debug(`No discount applied: Cart total ${totalAmount} below minimum ${this.config.minimumCartAmount}`);
      return new Decimal(0);
    }

    const discount = totalAmount.times(this.config.discountPercentage).div(this.PERCENTAGE_DIVISOR);

    console.debug(`Brand ${this.config.brand} discount: ${discount}`);

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
    const hasPremiumBrand = items.some(
      item => item.product.brand === this.config.brand && item.product.brandTier === BrandTier.PREMIUM
    );
    if (!hasPremiumBrand) {
      console.debug(`No premium brand found for ${this.config.brand}`);
      return false;
    }
    return this.validator.validate(items, customer, this.config);
  }

  getPriority(): number {
    return 1;
  }
}

export interface BrandValidator {
  validate(items: CartItem[], customer: CustomerProfile, config: BrandDiscountConfig): Promise<boolean>;
}

export class DefaultBrandValidator implements BrandValidator {
  async validate(items: CartItem[], customer: CustomerProfile, config: BrandDiscountConfig): Promise<boolean> {
    const totalAmount = items.reduce((acc, item) => {
      if (item.product.brand === config.brand && item.product.brandTier === BrandTier.PREMIUM) {
        return acc.plus(new Decimal(item.product.currentPrice).times(item.quantity));
      }
      return acc;
    }, new Decimal(0));

    console.debug(`BrandValidator: totalAmount=${totalAmount}, minCartAmount=${config.minimumCartAmount}`);
    if (config.minimumCartAmount && totalAmount.lessThan(config.minimumCartAmount)) {
      return false;
    }
    return true;
  }
}
