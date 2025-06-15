import { BankCardDiscountStrategy } from '../discount-strategies/BankCardDiscountStrategy';
import { BrandDiscountStrategy } from '../discount-strategies/BrandDiscountStrategy';
import { CategoryDiscountStrategy } from '../discount-strategies/CategoryDiscountStrategy';
import { VoucherDiscountStrategy } from '../discount-strategies/VoucherDiscountStrategy';
import { CartItem, CustomerProfile, DiscountedPrice, DiscountStrategy, PaymentInfo } from '../models/interface';
import { Decimal } from 'decimal.js';

Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });

/**
 * Configuration interface for discount strategies
 */
interface StrategyConfig {
  type: 'brand' | 'category' | 'voucher' | 'bank';
  config: any;
  validator?: any;
  onDiscountApplied?: (discount: Decimal, name: string) => void;
}

/**
 * Callback type for when a discount is applied
 */
type DiscountAppliedCallback = (discountName: string, amount: Decimal, cartItems: CartItem[]) => void;

/**
 * Main service class for handling discount calculations and validations.
 * Implements a strategy pattern to handle different types of discounts.
 */
export class DiscountService {
  private readonly strategies: DiscountStrategy[] = [];
  private readonly onDiscountApplied?: DiscountAppliedCallback;

  /**
   * Creates a new instance of DiscountService
   * @param initialStrategies - Array of strategy configurations to initialize the service with
   * @param onDiscountApplied - Optional callback function that is called when a discount is applied
   */
  constructor(initialStrategies: StrategyConfig[] = [], onDiscountApplied?: DiscountAppliedCallback) {
    this.onDiscountApplied = onDiscountApplied;
    this.loadStrategies(initialStrategies);
  }

  /**
   * Calculates all applicable discounts for a cart of items
   * @param cartItems - Array of items in the cart
   * @param customer - Customer profile information
   * @param paymentInfo - Optional payment information
   * @returns Promise resolving to a DiscountedPrice object containing original price, final price, and applied discounts
   * @throws Error if cartItems is invalid or customer profile is missing
   */
  async calculateCartDiscounts(
    cartItems: CartItem[],
    customer: CustomerProfile,
    paymentInfo?: PaymentInfo
  ): Promise<DiscountedPrice> {
    if (!cartItems || !Array.isArray(cartItems)) {
      throw new Error('Invalid cart items');
    }
    if (!customer) {
      throw new Error('Invalid customer profile');
    }

    // Deep copy cartItems, keep currentPrice as Decimal
    const clonedCartItems: CartItem[] = cartItems.map(item => ({
      ...item,
      product: { 
        ...item.product, 
        currentPrice: new Decimal(item.product.currentPrice)
      }
    }));

    const originalPrice = this.calculateOriginalPrice(clonedCartItems);
    let finalPrice = originalPrice;
    const appliedDiscounts = new Map<string, Decimal>();
    const messages: string[] = [];

    const sortedStrategies = [...this.strategies].sort((a, b) => a.getPriority() - b.getPriority());

    for (const strategy of sortedStrategies) {
      try {
        const currentTotal = this.calculateOriginalPrice(clonedCartItems);
        console.debug(`Validating ${strategy.getDiscountName()}, Current Cart Total: ${currentTotal}`);
        if (await strategy.validate(clonedCartItems, customer, paymentInfo)) {
          const discount = await strategy.calculateDiscount(clonedCartItems, customer, paymentInfo);
          console.debug(`Calculated ${strategy.getDiscountName()}: ${discount}, New Final Price: ${finalPrice.minus(discount)}`);
          if (discount.greaterThan(0)) {
            if (finalPrice.minus(discount).lessThan(0)) {
              console.debug(`Discount ${strategy.getDiscountName()} capped to prevent negative price`);
              break;
            }
            finalPrice = finalPrice.minus(discount);
            appliedDiscounts.set(strategy.getDiscountName(), discount);
            messages.push(`Applied ${strategy.getDiscountName()}`);

            // Update currentPrice proportionally
            const totalCurrentPrice = this.calculateOriginalPrice(clonedCartItems);
            console.debug(`Total Current Price before update: ${totalCurrentPrice}`);
            if (totalCurrentPrice.greaterThan(0)) {
              const discountRatio = discount.div(totalCurrentPrice);
              for (const item of clonedCartItems) {
                const itemPrice = new Decimal(item.product.currentPrice).times(item.quantity);
                const itemDiscount = itemPrice.times(discountRatio);
                const newPrice = new Decimal(item.product.currentPrice).minus(itemDiscount.div(item.quantity));
                item.product.currentPrice = newPrice.greaterThan(0) ? newPrice : new Decimal(0);
                console.debug(`Updated ${item.product.id} currentPrice: ${item.product.currentPrice}`);
              }
              // Verify update
              const updatedTotal = this.calculateOriginalPrice(clonedCartItems);
              console.debug(`Total Current Price after update: ${updatedTotal}`);
            }

            if (this.onDiscountApplied) {
              this.onDiscountApplied(strategy.getDiscountName(), discount, clonedCartItems);
            }
          }
        }
      } catch (error: any) {
        console.debug(`Failed to apply ${strategy.getDiscountName()}: ${error.message}`);
      }
    }

    console.debug(`Final appliedDiscounts: ${JSON.stringify(Object.fromEntries(appliedDiscounts))}`);
    return {
      originalPrice: originalPrice.toNumber(),
      finalPrice: finalPrice.toNumber(),
      appliedDiscounts: Object.fromEntries(appliedDiscounts),
      message: messages.length ? messages.join(', ') : 'No discounts applied'
    };
  }

  /**
   * Validates if a voucher code is applicable to the current cart
   * @param code - The voucher code to validate
   * @param cartItems - Array of items in the cart
   * @param customer - Customer profile information
   * @returns Promise resolving to a boolean indicating if the voucher is valid
   */
  async validateDiscountCode(
    code: string,
    cartItems: CartItem[],
    customer: CustomerProfile
  ): Promise<boolean> {
    if (!code || typeof code !== 'string') {
      return false;
    }

    const voucherStrategy = this.strategies.find(
      strategy => strategy instanceof VoucherDiscountStrategy && strategy.getDiscountName().includes(code.toUpperCase())
    );

    if (!voucherStrategy) {
      console.debug(`Voucher code ${code} not found`);
      return false;
    }

    try {
      return await voucherStrategy.validate(cartItems, customer);
    } catch (error: any) {
      console.debug(`Validation failed for voucher ${code}: ${error.message}`);
      return false;
    }
  }

  /**
   * Adds a new discount strategy to the service
   * @param strategy - The discount strategy to add
   * @throws Error if strategy is invalid
   */
  addDiscountStrategy(strategy: DiscountStrategy): void {
    if (!strategy) {
      throw new Error('Invalid discount strategy');
    }
    this.strategies.push(strategy);
  }

  /**
   * Loads and initializes discount strategies from configuration
   * @param configs - Array of strategy configurations
   * @private
   */
  private loadStrategies(configs: StrategyConfig[]): void {
    for (const config of configs) {
      let strategy: DiscountStrategy;
      switch (config.type) {
        case 'brand':
          strategy = new BrandDiscountStrategy(config.config, config.validator, config.onDiscountApplied);
          break;
        case 'category':
          strategy = new CategoryDiscountStrategy(config.config, config.validator, config.onDiscountApplied);
          break;
        case 'voucher':
          strategy = new VoucherDiscountStrategy(config.config, config.validator, config.onDiscountApplied);
          break;
        case 'bank':
          strategy = new BankCardDiscountStrategy(config.config, config.validator, config.onDiscountApplied);
          break;
        default:
          console.debug(`Unknown strategy type: ${config.type}`);
          continue;
      }
      this.addDiscountStrategy(strategy);
    }
  }

  /**
   * Calculates the original price of all items in the cart
   * @param cartItems - Array of items in the cart
   * @returns Decimal representing the total original price
   * @private
   */
  private calculateOriginalPrice(cartItems: CartItem[]): Decimal {
    const total = cartItems.reduce((acc, item) => {
      return acc.plus(new Decimal(item.product.currentPrice).times(item.quantity));
    }, new Decimal(0));
    console.debug(`Calculated original price: ${total}`);
    return total;
  }
}
