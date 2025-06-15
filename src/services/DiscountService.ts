import { BankCardDiscountStrategy } from '../discount-strategies/BankCardDiscountStrategy';
import { BrandDiscountStrategy } from '../discount-strategies/BrandDiscountStrategy';
import { CategoryDiscountStrategy } from '../discount-strategies/CategoryDiscountStrategy';
import { VoucherDiscountStrategy } from '../discount-strategies/VoucherDiscountStrategy';
import { CartItem, CustomerProfile, Discount, DiscountedPrice, DiscountStrategy, PaymentInfo } from '../models/interface';
import { Decimal } from 'decimal.js';

export class DiscountService {
 
//   private discounts: Discount[]; Not needed as strategies are used instead
  private readonly brandAndCategoryStrategies: DiscountStrategy[] = [];
  private readonly voucherStrategies: DiscountStrategy[] = [];
  private readonly bankCardStrategies: DiscountStrategy[] = [];


  constructor() {
  }

  //Apply the strategies to the cart items and return the discounted price
  async calculateCartDiscounts(
    cartItems: CartItem[],
    customer: CustomerProfile,
    paymentInfo?: PaymentInfo
  ): Promise<DiscountedPrice> {
    let originalPrice = this.calculateOriginalPrice(cartItems);
    let finalPrice = originalPrice;
    const appliedDiscounts = new Map<string, number>();
    const messages: string[] = [];

    const strategiesToProcess = [
        ...this.brandAndCategoryStrategies,
        ...this.voucherStrategies,
        ...(paymentInfo ? this.bankCardStrategies : [])
      ];

      for (const strategy of strategiesToProcess) {
        if (await strategy.validate(cartItems, customer)) {
          const discount = await strategy.calculateDiscount(cartItems);
          if (discount.greaterThan(0)) {
            finalPrice = finalPrice.minus(discount);
            appliedDiscounts.set(strategy.getDiscountName(), discount.toNumber());
            messages.push(`Applied ${strategy.getDiscountName()}`);
          }
        }
      }
    
    return {
      originalPrice: originalPrice.toNumber(),
      finalPrice: finalPrice.toNumber(),
      appliedDiscounts: Object.fromEntries(appliedDiscounts),
      message: messages.join(', ')
    };
  }

  //Validate the discount code
  async validateDiscountCode(
    code: string,
    cartItems: CartItem[],
    customer: CustomerProfile
  ): Promise<boolean> {
    const voucherStrategy = this.voucherStrategies.find(
        strategy => strategy.getDiscountName().includes(code)
      );
  
      if (!voucherStrategy) {
        return false;
      }
  
      return voucherStrategy.validate(cartItems, customer);
  }

  //Add a new discount strategy
  addDiscountStrategy(strategy: DiscountStrategy): void {
    if (strategy instanceof BrandDiscountStrategy || strategy instanceof CategoryDiscountStrategy) {
      this.brandAndCategoryStrategies.push(strategy);
    } else if (strategy instanceof VoucherDiscountStrategy) {
      this.voucherStrategies.push(strategy);
    } else if (strategy instanceof BankCardDiscountStrategy) {
      this.bankCardStrategies.push(strategy);
    }
  }

  private calculateOriginalPrice(cartItems: CartItem[]): Decimal {
    return cartItems.reduce((acc, item) => {
      return acc.plus(new Decimal(item.product.basePrice).times(item.quantity));
    }, new Decimal(0));
  }

} 