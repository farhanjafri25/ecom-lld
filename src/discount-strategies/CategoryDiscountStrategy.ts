import { Decimal } from 'decimal.js';
import { CartItem, CustomerProfile, DiscountStrategy } from '../models/interface';

export class CategoryDiscountStrategy implements DiscountStrategy {
  private readonly category: string;
  private readonly discountPercentage: number;

  constructor(category: string, discountPercentage: number) {
    this.category = category;
    this.discountPercentage = discountPercentage;
  }

  async calculateDiscount(items: CartItem[]): Promise<Decimal> {
    const categoryItems = items.filter(item => item.product.category === this.category);
    const totalDiscount = categoryItems.reduce((acc, item) => {
      const itemDiscount = new Decimal(item.product.basePrice)
        .times(item.quantity)
        .times(this.discountPercentage)
        .div(100);
      return acc.plus(itemDiscount);
    }, new Decimal(0));

    return totalDiscount;
  }

  getDiscountName(): string {
    return `Category Discount - ${this.category} (${this.discountPercentage}%)`;
  }

  async validate(items: CartItem[], customer: CustomerProfile): Promise<boolean> {
    return items.some(item => item.product.category === this.category);
  }
} 