import { Decimal } from 'decimal.js';
import { CartItem, CustomerProfile, DiscountStrategy, VoucherDiscountConfig, PaymentInfo, VoucherValidator } from '../models/interface';

Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });


class DefaultVoucherValidator implements VoucherValidator {
  async validate(
    items: CartItem[],
    customer: CustomerProfile,
    config: VoucherDiscountConfig
  ): Promise<boolean> {
    const totalAmount = items.reduce((acc, item) => {
      return acc.plus(new Decimal(item.product.currentPrice).times(item.quantity));
    }, new Decimal(0));

    console.debug(`VoucherValidator: totalAmount=${totalAmount}, minCartAmount=${config.minimumCartAmount}`);
    if (config.minimumCartAmount && totalAmount.lessThan(config.minimumCartAmount)) {
      return false;
    }
    return true;
  }
}

export class VoucherDiscountStrategy implements DiscountStrategy {
  private readonly config: VoucherDiscountConfig;
  private readonly validator: VoucherValidator;
  private readonly PERCENTAGE_DIVISOR = new Decimal(100);
  private onDiscountApplied?: (discount: Decimal, name: string) => void;

  constructor(
    config: VoucherDiscountConfig,
    validator: VoucherValidator = new DefaultVoucherValidator(),
    onDiscountApplied?: (discount: Decimal, name: string) => void
  ) {
    if (!config.code || typeof config.code !== 'string') {
      throw new Error('Invalid voucher code');
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
      console.debug(`No discount applied: Invalid conditions for voucher ${this.config.code}`);
      return new Decimal(0);
    }

    console.debug(`Voucher ${this.config.code} items: ${JSON.stringify(items.map(i => ({ id: i.product.id, price: i.product.currentPrice.toString(), qty: i.quantity })))}`);

    const totalAmount = items.reduce((acc, item) => {
      if (
        (this.config.excludedBrands && this.config.excludedBrands.includes(item.product.brand)) ||
        (this.config.excludedCategories && this.config.excludedCategories.includes(item.product.category))
      ) {
        return acc;
      }
      return acc.plus(new Decimal(item.product.currentPrice).times(item.quantity));
    }, new Decimal(0));

    console.debug(`Voucher ${this.config.code}: totalAmount=${totalAmount}, percentage=${this.config.discountPercentage}`);

    if (this.config.minimumCartAmount && totalAmount.lessThan(this.config.minimumCartAmount)) {
      console.debug(`No discount applied: Cart total ${totalAmount} below minimum ${this.config.minimumCartAmount}`);
      return new Decimal(0);
    }

    let discount = totalAmount.times(this.config.discountPercentage).div(this.PERCENTAGE_DIVISOR);

    if (this.config.maxDiscountCap && discount.greaterThan(this.config.maxDiscountCap)) {
      discount = this.config.maxDiscountCap;
    }

    console.debug(`Voucher ${this.config.code} discount: ${discount}`);

    if (this.onDiscountApplied) {
      this.onDiscountApplied(discount, this.getDiscountName());
    }

    return discount;
  }

  getDiscountName(): string {
    return `Voucher Discount - ${this.config.code} (${this.config.discountPercentage}%)`;
  }

  async validate(
    items: CartItem[],
    customer: CustomerProfile,
    paymentInfo?: PaymentInfo
  ): Promise<boolean> {
    return this.validator.validate(items, customer, this.config);
  }

  getPriority(): number {
    return 2; // Vouchers apply after brand/category
  }
}
