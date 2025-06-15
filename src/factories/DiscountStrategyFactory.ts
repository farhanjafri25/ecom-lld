import { DiscountStrategy } from '../models/interface';
import { BankCardDiscountStrategy } from '../discount-strategies/BankCardDiscountStrategy';
import { BrandDiscountStrategy } from '../discount-strategies/BrandDiscountStrategy';
import { CategoryDiscountStrategy } from '../discount-strategies/CategoryDiscountStrategy';
import { VoucherDiscountStrategy } from '../discount-strategies/VoucherDiscountStrategy';

export interface StrategyConfig {
  type: 'brand' | 'category' | 'voucher' | 'bank';
  config: any;
  validator?: any;
  onDiscountApplied?: (discount: any, name: string) => void;
  priority?: number;
}

export class DiscountStrategyFactory {
  private static instance: DiscountStrategyFactory;
  private strategies: Map<string, DiscountStrategy> = new Map();

  private constructor() {}

  public static getInstance(): DiscountStrategyFactory {
    if (!DiscountStrategyFactory.instance) {
      DiscountStrategyFactory.instance = new DiscountStrategyFactory();
    }
    return DiscountStrategyFactory.instance;
  }

  public createStrategy(config: StrategyConfig): DiscountStrategy {
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
        strategy = new BankCardDiscountStrategy(config.config);
        break;
      default:
        throw new Error(`Unknown strategy type: ${config.type}`);
    }

    this.strategies.set(strategy.getDiscountName(), strategy);
    return strategy;
  }

  public getStrategies(): DiscountStrategy[] {
    return Array.from(this.strategies.values());
  }

  public clearStrategies(): void {
    this.strategies.clear();
  }
} 