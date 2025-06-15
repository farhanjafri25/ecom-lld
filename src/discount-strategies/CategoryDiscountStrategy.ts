import { Decimal } from 'decimal.js';
import { CartItem, CategoryDiscountConfig, CategoryValidator, CustomerProfile, DiscountStrategy } from '../models/interface';

/**
 * Default validator for category discounts
 */
class DefaultCategoryValidator implements CategoryValidator {
  validate(
    items: CartItem[],
    customer: CustomerProfile,
    config: CategoryDiscountConfig
  ): boolean {
    // Check if any item matches the category
    const hasCategoryItems = items.some(
      item => item.product.category.toLowerCase() === config.category.toLowerCase()
    );

    // Check customer tier if specified
    if (config.customerTiers && customer.tier && !config.customerTiers.includes(customer.tier)) {
      return false;
    }

    // Check validUntil if specified
    if (config.validUntil && config.validUntil < new Date()) {
      return false;
    }

    return hasCategoryItems;
  }
}

/**
 * Category-specific discount strategy for e-commerce.
 * Supports extensible rules like minimum cart amount, brand exclusions, and customer tiers.
 */
export class CategoryDiscountStrategy implements DiscountStrategy {
  private readonly config: CategoryDiscountConfig;
  private readonly validator: CategoryValidator;
  private readonly PERCENTAGE_DIVISOR = new Decimal(100);
  private onDiscountApplied?: (discount: Decimal, name: string) => void; // Hook for logging/auditing

  constructor(
    config: CategoryDiscountConfig,
    validator: CategoryValidator = new DefaultCategoryValidator(),
    onDiscountApplied?: (discount: Decimal, name: string) => void
  ) {
    if (!config.category || typeof config.category !== 'string') {
      throw new Error('Invalid category name');
    }
    if (config.discountPercentage < 0 || config.discountPercentage > 100) {
      throw new Error('Invalid discount percentage');
    }
    if (config.minimumCartAmount && config.minimumCartAmount.lessThan(0)) {
      throw new Error('Invalid minimum cart amount');
    }
    this.config = {
      ...config,
      discountPercentage: Number(config.discountPercentage),
    };
    this.validator = validator;
    this.onDiscountApplied = onDiscountApplied;
  }

  async calculateDiscount(items: CartItem[], customer: CustomerProfile): Promise<Decimal> {
    if (!items.length || !this.validate(items, customer)) {
      console.debug(`No discount applied: Invalid conditions for category ${this.config.category}`);
      return new Decimal(0);
    }

    // Single pass to filter and calculate total
    const totalAmount = items.reduce((acc, item) => {
      if (
        item.product.category.toLowerCase() === this.config.category.toLowerCase() &&
        (!this.config.excludedBrands || !this.config.excludedBrands.includes(item.product.brand))
      ) {
        return acc.plus(new Decimal(item.product.basePrice).times(item.quantity));
      }
      return acc;
    }, new Decimal(0));

    // Check minimum cart amount
    if (this.config.minimumCartAmount && totalAmount.lessThan(this.config.minimumCartAmount)) {
      console.debug(`No discount applied: Cart total ${totalAmount} below minimum ${this.config.minimumCartAmount}`);
      return new Decimal(0);
    }

    const discount = totalAmount.times(this.config.discountPercentage).div(this.PERCENTAGE_DIVISOR);

    // Trigger callback if provided
    if (this.onDiscountApplied) {
      this.onDiscountApplied(discount, this.getDiscountName());
    }

    return discount;
  }

  getDiscountName(): string {
    return `Category Discount - ${this.config.category} (${this.config.discountPercentage}%)`;
  }

  async validate(items: CartItem[], customer: CustomerProfile): Promise <boolean> {
    return this.validator.validate(items, customer, this.config);
  }

  getPriority(): number {
    return 1; // Category discounts apply first, per assignment
  }
}