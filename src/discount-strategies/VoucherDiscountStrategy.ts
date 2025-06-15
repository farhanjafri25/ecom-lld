import { Decimal } from 'decimal.js';
import { CartItem, CustomerProfile, DiscountStrategy, VoucherDiscountConfig, VoucherValidator } from '../models/interface';


/**
 * Default validator for vouchers (placeholder for database lookup)
 */
class DefaultVoucherValidator implements VoucherValidator {
  async validate(
    code: string,
    items: CartItem[],
    customer: CustomerProfile,
    config: VoucherDiscountConfig
  ): Promise<boolean> {
    // Simulate database check for voucher validity
    if (!items.length) {
      return false;
    }

    // Check customer tier if specified
    if (config.customerTiers && customer.tier && !config.customerTiers.includes(customer.tier)) {
      return false;
    }

    // Check validUntil if specified
    if (config.validUntil && config.validUntil < new Date()) {
      return false;
    }

    // In a real implementation, check code against a database
    return code.toUpperCase() === config.code.toUpperCase();
  }
}

/**
 * Voucher-specific discount strategy for e-commerce.
 * Supports extensible rules like minimum cart amount, exclusions, and customer tiers.
 */
export class VoucherDiscountStrategy implements DiscountStrategy {
  private readonly config: VoucherDiscountConfig;
  private readonly validator: VoucherValidator;
  private readonly PERCENTAGE_DIVISOR = new Decimal(100);
  private onDiscountApplied?: (discount: Decimal, name: string) => void; // Hook for logging/auditing

  constructor(
    config: VoucherDiscountConfig,
    validator: VoucherValidator = new DefaultVoucherValidator(),
    onDiscountApplied?: (discount: Decimal, name: string) => void
  ) {
    if (!config.code || typeof config.code !== 'string') {
      throw new Error('Invalid voucher code');
    }
    if (config.discountPercentage < 0 || config.discountPercentage > 100) {
      throw new Error('Invalid discount percentage');
    }
    if (config.minimumCartAmount && config.minimumCartAmount.lessThan(0)) {
      throw new Error('Invalid minimum cart amount');
    }
    if (config.maxDiscountCap && config.maxDiscountCap.lessThan(0)) {
      throw new Error('Invalid max discount cap');
    }
    this.config = {
      ...config,
      discountPercentage: Number(config.discountPercentage),
    };
    this.validator = validator;
    this.onDiscountApplied = onDiscountApplied;
  }

  async calculateDiscount(items: CartItem[], customer: CustomerProfile): Promise<Decimal> {
    if (!items.length || !(await this.validate(items, customer))) {
      console.debug(`No discount applied: Invalid conditions for voucher ${this.config.code}`);
      return new Decimal(0);
    }

    // Calculate total amount, excluding restricted brands/categories
    const totalAmount = items.reduce((acc, item) => {
      if (
        (this.config.excludedBrands && this.config.excludedBrands.includes(item.product.brand)) ||
        (this.config.excludedCategories && this.config.excludedCategories.includes(item.product.category))
      ) {
        return acc;
      }
      return acc.plus(new Decimal(item.product.currentPrice).times(item.quantity));
    }, new Decimal(0));

    // Check minimum cart amount
    if (this.config.minimumCartAmount && totalAmount.lessThan(this.config.minimumCartAmount)) {
      console.debug(`No discount applied: Cart total ${totalAmount} below minimum ${this.config.minimumCartAmount}`);
      return new Decimal(0);
    }

    let discount = totalAmount.times(this.config.discountPercentage).div(this.PERCENTAGE_DIVISOR);

    // Apply max discount cap if specified
    if (this.config.maxDiscountCap && discount.greaterThan(this.config.maxDiscountCap)) {
      discount = this.config.maxDiscountCap;
    }

    // Trigger callback if provided
    if (this.onDiscountApplied) {
      this.onDiscountApplied(discount, this.getDiscountName());
    }

    return discount;
  }

  getDiscountName(): string {
    return `Voucher Discount - ${this.config.code} (${this.config.discountPercentage}%)`;
  }


  async validate(items: CartItem[], customer: CustomerProfile): Promise<boolean> {
    return this.validator.validate(this.config.code, items, customer, this.config);
  }

  getPriority(): number {
    return 2; // Vouchers apply after brand/category, per assignment
  }
}