import { CartItem, CustomerProfile, DiscountStrategy, PaymentInfo } from '../models/interface';
import { Decimal } from 'decimal.js';

export class DiscountApplier {
  private strategies: DiscountStrategy[];

  constructor(strategies: DiscountStrategy[]) {
    this.strategies = [...strategies].sort((a, b) => a.getPriority() - b.getPriority());
  }

  public async applyDiscounts(
    cartItems: CartItem[],
    customer: CustomerProfile,
    paymentInfo?: PaymentInfo,
    onDiscountApplied?: (discountName: string, amount: Decimal, cartItems: CartItem[]) => void
  ): Promise<{
    finalPrice: Decimal;
    appliedDiscounts: Map<string, Decimal>;
    messages: string[];
  }> {
    const appliedDiscounts = new Map<string, Decimal>();
    const messages: string[] = [];
    let finalPrice = this.calculateOriginalPrice(cartItems);
    let shouldApplyDiscounts = true;

    // Check if any strategy should be applied
    for (const strategy of this.strategies) {
      try {
        if (await strategy.validate(cartItems, customer, paymentInfo)) {
          shouldApplyDiscounts = true;
          break;
        }
      } catch (error) {
        // Continue checking other strategies
      }
    }

    // If no strategies are applicable, return original price
    if (!shouldApplyDiscounts) {
      return {
        finalPrice,
        appliedDiscounts,
        messages
      };
    }

    for (const strategy of this.strategies) {
      try {
        const currentTotal = this.calculateOriginalPrice(cartItems);
        console.debug(`Validating ${strategy.getDiscountName()}, Current Cart Total: ${currentTotal}`);
        
        if (await strategy.validate(cartItems, customer, paymentInfo)) {
          const discount = await strategy.calculateDiscount(cartItems, customer, paymentInfo);
          console.debug(`Calculated ${strategy.getDiscountName()}: ${discount}, New Final Price: ${finalPrice.minus(discount)}`);
          
          if (discount.greaterThan(0)) {
            // Calculate what the new price would be
            const newPrice = finalPrice.minus(discount);
            
            // If the new price would be negative, cap the discount to prevent negative price
            if (newPrice.lessThan(0)) {
              console.debug(`Discount ${strategy.getDiscountName()} capped to prevent negative price`);
              // Cap the discount to leave a minimum price of 0
              const cappedDiscount = finalPrice;
              finalPrice = new Decimal(0);
              appliedDiscounts.set(strategy.getDiscountName(), cappedDiscount);
              messages.push(`Applied ${strategy.getDiscountName()} (capped)`);
              break;
            }

            finalPrice = newPrice;
            appliedDiscounts.set(strategy.getDiscountName(), discount);
            messages.push(`Applied ${strategy.getDiscountName()}`);

            // Update currentPrice proportionally
            const totalCurrentPrice = this.calculateOriginalPrice(cartItems);
            if (totalCurrentPrice.greaterThan(0)) {
              const discountRatio = discount.div(totalCurrentPrice);
              for (const item of cartItems) {
                const itemPrice = new Decimal(item.product.currentPrice).times(item.quantity);
                const itemDiscount = itemPrice.times(discountRatio);
                const newPrice = new Decimal(item.product.currentPrice).minus(itemDiscount.div(item.quantity));
                item.product.currentPrice = newPrice.greaterThan(0) ? newPrice : new Decimal(0);
              }
            }

            if (onDiscountApplied) {
              onDiscountApplied(strategy.getDiscountName(), discount, cartItems);
            }
          }
        }
      } catch (error: any) {
        console.debug(`Failed to apply ${strategy.getDiscountName()}: ${error.message}`);
      }
    }

    return {
      finalPrice,
      appliedDiscounts,
      messages
    };
  }

  private calculateOriginalPrice(cartItems: CartItem[]): Decimal {
    return cartItems.reduce((acc, item) => {
      return acc.plus(new Decimal(item.product.currentPrice).times(item.quantity));
    }, new Decimal(0));
  }
} 