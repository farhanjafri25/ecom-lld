import { Decimal } from 'decimal.js';
import { CartItem, CustomerProfile, DiscountStrategy } from '../models/interface';

export class VoucherDiscountStrategy implements DiscountStrategy {
  private readonly code: string;
  private readonly discountPercentage: number;

  constructor(code: string, discountPercentage: number) {
    this.code = code;
    this.discountPercentage = discountPercentage;
  }

  async calculateDiscount(items: CartItem[]): Promise<Decimal> {
    const totalAmount = items.reduce((acc, item) => {
      return acc.plus(new Decimal(item.product.currentPrice).times(item.quantity));
    }, new Decimal(0));

    return totalAmount.times(this.discountPercentage).div(100);
  }

  getDiscountName(): string {
    return `Voucher Discount - ${this.code} (${this.discountPercentage}%)`;
  }

  async validate(items: CartItem[], customer: CustomerProfile): Promise<boolean> {
    // In a real implementation, this would validate against a database of valid vouchers
    // and check for any restrictions (e.g., customer tier, product exclusions, etc.)
    return true;
  }
} 