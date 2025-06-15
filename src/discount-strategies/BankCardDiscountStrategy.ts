import { Decimal } from 'decimal.js';
import { CartItem, CustomerProfile, DiscountStrategy, PaymentInfo } from '../models/interface';

export class BankCardDiscountStrategy implements DiscountStrategy {
  private readonly bankName: string;
  private readonly discountPercentage: number;
  private readonly paymentInfo: PaymentInfo;

  constructor(bankName: string, discountPercentage: number, paymentInfo: PaymentInfo) {
    this.bankName = bankName;
    this.discountPercentage = discountPercentage;
    this.paymentInfo = paymentInfo;
  }

  async calculateDiscount(items: CartItem[]): Promise<Decimal> {
    if (!this.isValidPaymentMethod()) {
      return new Decimal(0);
    }

    const totalAmount = items.reduce((acc, item) => {
      return acc.plus(new Decimal(item.product.currentPrice).times(item.quantity));
    }, new Decimal(0));

    return totalAmount.times(this.discountPercentage).div(100);
  }

  getDiscountName(): string {
    return `Bank Card Discount - ${this.bankName} (${this.discountPercentage}%)`;
  }

  async validate(items: CartItem[], customer: CustomerProfile): Promise<boolean> {
    return this.isValidPaymentMethod();
  }

  private isValidPaymentMethod(): boolean {
    return (
      this.paymentInfo.method === 'CARD' &&
      this.paymentInfo.bankName === this.bankName
    );
  }
} 