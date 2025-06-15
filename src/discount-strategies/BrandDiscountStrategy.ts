import { Decimal } from 'decimal.js';
import { CartItem, CustomerProfile, DiscountStrategy } from '../models/interface';

export class BrandDiscountStrategy implements DiscountStrategy {
  private readonly brand: string;
  private readonly discountPercentage: number;

  constructor(brand: string, discountPercentage: number) {
    this.brand = brand;
    this.discountPercentage = discountPercentage;
  }

  async calculateDiscount(items: CartItem[]): Promise<Decimal> {
    const brandItems = items.filter(item => item.product.brand === this.brand);
    const totalDiscount = brandItems.reduce((acc, item) => {
      const itemDiscount = new Decimal(item.product.basePrice)
        .times(item.quantity)
        .times(this.discountPercentage)
        .div(100);
      return acc.plus(itemDiscount);
    }, new Decimal(0));

    return totalDiscount;
  }

  getDiscountName(): string {
    return `Brand Discount - ${this.brand} (${this.discountPercentage}%)`;
  }

  async validate(items: CartItem[], customer: CustomerProfile): Promise<boolean> {
    return items.some(item => item.product.brand === this.brand);
  }
} 