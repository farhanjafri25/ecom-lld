import { CartItem, CustomerProfile, DiscountedPrice, PaymentInfo } from '../models/interface';
import { Decimal } from 'decimal.js';
import { DiscountStrategyFactory, StrategyConfig } from '../factories/DiscountStrategyFactory';
import { DiscountApplier } from '../discount-applier/DiscountApplier';

Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });

/**
 * Callback type for when a discount is applied
 */
type DiscountAppliedCallback = (discountName: string, amount: Decimal, cartItems: CartItem[]) => void;

/**
 * Main service class for handling discount calculations and validations.
 * Uses factory pattern to create and manage discount strategies.
 */
export class DiscountService {
  private readonly factory: DiscountStrategyFactory;
  private readonly onDiscountApplied?: DiscountAppliedCallback;

  /**
   * Creates a new instance of DiscountService
   * @param initialStrategies - Array of strategy configurations to initialize the service with
   * @param onDiscountApplied - Optional callback function that is called when a discount is applied
   */
  constructor(initialStrategies: StrategyConfig[] = [], onDiscountApplied?: DiscountAppliedCallback) {
    this.onDiscountApplied = onDiscountApplied;
    this.factory = DiscountStrategyFactory.getInstance();
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
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error('Invalid cart items');
    }
    if (!customer) {
      throw new Error('Invalid customer profile');
    }

    // Calculate original price before any modifications
    const originalPrice = this.calculateOriginalPrice(cartItems);

    // Deep copy cartItems, keep currentPrice as Decimal
    const clonedCartItems: CartItem[] = cartItems.map(item => ({
      ...item,
      product: { 
        ...item.product, 
        currentPrice: new Decimal(item.product.currentPrice)
      }
    }));

    const strategies = this.factory.getStrategies();
    const applier = new DiscountApplier(strategies);
    
    const { finalPrice, appliedDiscounts, messages } = await applier.applyDiscounts(
      clonedCartItems,
      customer,
      paymentInfo,
      this.onDiscountApplied
    );

    // If no discounts were applied, return original price
    if (appliedDiscounts.size === 0) {
      return {
        originalPrice: originalPrice.toNumber(),
        finalPrice: originalPrice.toNumber(),
        appliedDiscounts: {},
        message: 'No discounts applied'
      };
    }

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

    const strategies = this.factory.getStrategies();
    const voucherStrategy = strategies.find(
      strategy => strategy.getDiscountName().includes(code.toUpperCase())
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
   * Loads and initializes discount strategies from configuration
   * @param configs - Array of strategy configurations
   * @private
   */
  private loadStrategies(configs: StrategyConfig[]): void {
    for (const config of configs) {
      this.factory.createStrategy(config);
    }
  }

  /**
   * Calculates the original price of all items in the cart
   * @param cartItems - Array of items in the cart
   * @returns Decimal representing the total original price
   * @private
   */
  private calculateOriginalPrice(cartItems: CartItem[]): Decimal {
    return cartItems.reduce((acc, item) => {
      return acc.plus(new Decimal(item.product.currentPrice).times(item.quantity));
    }, new Decimal(0));
  }
}
