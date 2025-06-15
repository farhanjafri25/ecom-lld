import { Decimal } from 'decimal.js';
import { BankCardDiscountConfig, CartItem, CustomerProfile, DiscountStrategy, PaymentInfo, PaymentValidator } from '../models/interface';


// Default validator for bank card
class BankCardValidator implements PaymentValidator {
  validate(paymentInfo: PaymentInfo, config: BankCardDiscountConfig): boolean {
    return (
      paymentInfo.method === 'CARD' &&
      paymentInfo.bankName?.toLowerCase() === config.bankName.toLowerCase()
    );
  }
}



export class BankCardDiscountStrategy implements DiscountStrategy {
  private readonly config: BankCardDiscountConfig;
  private readonly paymentInfo: PaymentInfo;
  private readonly validator: PaymentValidator;
  private readonly PERCENTAGE_DIVISOR = new Decimal(100);
  private onDiscountApplied?: (discount: Decimal, name: string) => void; // Hook for logging/auditing

  constructor(
    config: BankCardDiscountConfig,
    paymentInfo: PaymentInfo,
    validator: PaymentValidator = new BankCardValidator(),
    onDiscountApplied?: (discount: Decimal, name: string) => void
  ) {
    if (!config.bankName || typeof config.bankName !== 'string') {
      throw new Error('Invalid bank name');
    }
    if (config.discountPercentage < 0 || config.discountPercentage > 100) {
      throw new Error('Invalid discount percentage');
    }
    if (!paymentInfo || !paymentInfo.method || !paymentInfo.bankName) {
      throw new Error('Invalid payment info');
    }
    if (config.minimumCartAmount && config.minimumCartAmount.lessThan(0)) {
      throw new Error('Invalid minimum cart amount');
    }
    this.config = { ...config, discountPercentage: config.discountPercentage };
    this.paymentInfo = paymentInfo;
    this.validator = validator;
    this.onDiscountApplied = onDiscountApplied;
  }

  async calculateDiscount(items: CartItem[]): Promise<Decimal> {
    if (!items.length || !this.validate(items, {} as CustomerProfile)) {
      console.debug(`No discount applied: Empty cart or invalid conditions for bank ${this.config.bankName}`);
      return new Decimal(0);
    }

    const totalAmount = items.reduce((acc, item) => {
      // Check if item is in eligible categories (if specified)
      if (this.config.eligibleCategories && !this.config.eligibleCategories.includes(item.product.category)) {
        return acc;
      }
      return acc.plus(new Decimal(item.product.currentPrice).times(item.quantity));
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
    return `Bank Card Discount - ${this.config.bankName} (${this.config.discountPercentage}%)`;
  }

  async validate(items: CartItem[], customer: CustomerProfile):Promise <boolean> {
    return this.validator.validate(this.paymentInfo, this.config);
  }
}