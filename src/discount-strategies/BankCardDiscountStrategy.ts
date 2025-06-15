import { Decimal } from 'decimal.js';
import { CartItem, CustomerProfile, DiscountStrategy, PaymentInfo } from '../models/interface';

Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });

interface PaymentValidator {
  validate(paymentInfo: PaymentInfo | undefined, config: BankCardDiscountConfig): boolean;
}

class BankCardValidator implements PaymentValidator {
  validate(paymentInfo: PaymentInfo | undefined, config: BankCardDiscountConfig): boolean {
    console.debug(`BankCardValidator: paymentInfo=${JSON.stringify(paymentInfo)}, config=${JSON.stringify(config)}`);
    const isValid = (
      paymentInfo?.method === 'CARD' &&
      paymentInfo?.bankName?.toLowerCase() === config.bankName.toLowerCase()
    );
    console.debug(`BankCardValidator result: ${isValid}`);
    return isValid;
  }
}

interface BankCardDiscountConfig {
  bankName: string;
  discountPercentage: Decimal;
  minimumCartAmount?: Decimal;
  eligibleCategories?: string[];
}

export class BankCardDiscountStrategy implements DiscountStrategy {
  private readonly config: BankCardDiscountConfig;
  private readonly validator: PaymentValidator;
  private readonly PERCENTAGE_DIVISOR = new Decimal(100);
  private onDiscountApplied?: (discount: Decimal, name: string) => void;

  constructor(
    config: BankCardDiscountConfig,
    validator: PaymentValidator = new BankCardValidator(),
    onDiscountApplied?: (discount: Decimal, name: string) => void
  ) {
    if (!config.bankName || typeof config.bankName !== 'string') {
      throw new Error('Invalid bank name');
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
    if (!items.length || !await this.validate(items, customer, paymentInfo)) {
      console.debug(`No discount applied: Invalid conditions for bank ${this.config.bankName}`);
      return new Decimal(0);
    }

    const totalAmount = items.reduce((acc, item) => {
      if (this.config.eligibleCategories && !this.config.eligibleCategories.includes(item.product.category)) {
        return acc;
      }
      return acc.plus(new Decimal(item.product.currentPrice).times(item.quantity));
    }, new Decimal(0));

    console.debug(`Bank ${this.config.bankName}: totalAmount=${totalAmount}, percentage=${this.config.discountPercentage}`);

    if (this.config.minimumCartAmount && totalAmount.lessThan(this.config.minimumCartAmount)) {
      console.debug(`No discount applied: Cart amount ${totalAmount} below minimum ${this.config.minimumCartAmount}`);
      return new Decimal(0);
    }

    const discount = totalAmount.times(this.config.discountPercentage).div(this.PERCENTAGE_DIVISOR);

    console.debug(`Bank discount: ${discount}`);

    if (this.onDiscountApplied) {
      this.onDiscountApplied(discount, this.getDiscountName());
    }

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
    return this.validator.validate(paymentInfo, this.config);
  }

  getPriority(): number {
    return 3; // Bank discounts apply last
  }
}
