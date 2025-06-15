import { Decimal } from 'decimal.js';
import { CartItem, CustomerProfile, DiscountStrategy, PaymentInfo } from '../models/interface';

Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });

interface CategoryDiscountConfig {
  category: string;
  discountPercentage: Decimal;
  minimumCartAmount?: Decimal;
  eligibleBrands?: string[];
}

interface CategoryValidator {
  validate(items: CartItem[], customer: CustomerProfile, config: CategoryDiscountConfig): Promise<boolean>;
}

class DefaultCategoryValidator implements CategoryValidator {
  async validate(items: CartItem[], customer: CustomerProfile, config: CategoryDiscountConfig): Promise<boolean> {
    const totalAmount = items.reduce((acc, item) => {
      if (item.product.category === config.category) {
        return acc.plus(new Decimal(item.product.currentPrice).times(item.quantity));
      }
      return acc;
    }, new Decimal(0));

    console.debug(`CategoryValidator: totalAmount=${totalAmount}, minCartAmount=${config.minimumCartAmount}`);
    if (config.minimumCartAmount && totalAmount.lessThan(config.minimumCartAmount)) {
      return false;
    }
    return true;
  }
}

export class CategoryDiscountStrategy implements DiscountStrategy {
  private readonly config: CategoryDiscountConfig;
  private readonly validator: CategoryValidator;
  private readonly PERCENTAGE_DIVISOR = new Decimal(100);
  private onDiscountApplied?: (discount: Decimal, name: string) => void;

  constructor(
    config: CategoryDiscountConfig,
    validator: CategoryValidator = new DefaultCategoryValidator(),
    onDiscountApplied?: (discount: Decimal, name: string) => void
  ) {
    if (!config.category || typeof config.category !== 'string') {
      throw new Error('Invalid category');
    }
    if (config.discountPercentage.lessThan(0) || config.discountPercentage.greaterThan(100)) {
      throw new Error('Invalid discount percentage');
    }
    if (config.minimumCartAmount && config.minimumCartAmount.lessThan(0)) {
      throw new Error('Invalid minimum cart amount');
    }
    this.config = { ...config, discountPercentage: new Decimal(config.discountPercentage) };
    this.validator = validator;
    this.onDiscountApplied = onDiscountApplied;
  }

  async calculateDiscount(
    items: CartItem[],
    customer: CustomerProfile,
    paymentInfo?: PaymentInfo
  ): Promise<Decimal> {
    if (!items.length || !(await this.validate(items, customer, paymentInfo))) {
      console.debug(`No discount applied: Invalid conditions for category ${this.config.category}`);
      return new Decimal(0);
    }

    const totalAmount = items.reduce((acc, item) => {
      if (
        item.product.category === this.config.category &&
        (!this.config.eligibleBrands || this.config.eligibleBrands.includes(item.product.brand))
      ) {
        return acc.plus(new Decimal(item.product.currentPrice).times(item.quantity));
      }
      return acc;
    }, new Decimal(0));

    console.debug(`Category ${this.config.category}: totalAmount=${totalAmount}, percentage=${this.config.discountPercentage}`);

    if (this.config.minimumCartAmount && totalAmount.lessThan(this.config.minimumCartAmount)) {
      console.debug(`No discount applied: Cart total ${totalAmount} below minimum ${this.config.minimumCartAmount}`);
      return new Decimal(0);
    }

    const discount = totalAmount.times(this.config.discountPercentage).div(this.PERCENTAGE_DIVISOR);

    console.debug(`Category ${this.config.category} discount: ${discount}`);

    if (this.onDiscountApplied) {
      this.onDiscountApplied(discount, this.getDiscountName());
    }

    return discount;
  }

  getDiscountName(): string {
    return `Category Discount - ${this.config.category} (${this.config.discountPercentage}%)`;
  }

  async validate(
    items: CartItem[],
    customer: CustomerProfile,
    paymentInfo?: PaymentInfo
  ): Promise<boolean> {
    return this.validator.validate(items, customer, this.config);
  }

  getPriority(): number {
    return 1; // Brand and category discounts apply first
  }
}
