# E-commerce Discount Service

A TypeScript implementation of a discount service for an e-commerce platform that handles various types of discounts including brand-specific, category-specific, bank offers, and vouchers.

## Features

- Brand-specific discounts (e.g., "Min 40% off on PUMA")
- Category-specific deals (e.g., "Extra 10% off on T-shirts")
- Bank card offers (e.g., "10% instant discount on ICICI Bank cards")
- Vouchers (e.g., 'SUPER69' for 69% off on any product)

## Technical Implementation

The service is built with TypeScript and follows these key principles:

1. **Clean Architecture**
   - Separation of concerns between types, services, and data
   - Type-safe implementation using TypeScript interfaces
   - Strategy pattern for different discount types
   - Async/await pattern for future extensibility

2. **Discount Calculation Logic**
   - Sequential application of discounts (brand → category → bank → voucher)
   - Clear tracking of applied discounts and their amounts
   - Detailed messages for each applied discount
   - Precise decimal calculations using decimal.js

3. **Validation Rules**
   - Brand exclusions
   - Category restrictions
   - Minimum purchase requirements
   - Customer tier requirements
   - Bank card validation
   - Voucher code validation

## Project Structure

```
src/
├── models/
│   └── interface.ts     # Core type definitions and interfaces
├── services/
│   └── DiscountService.ts  # Main discount calculation service
├── discount-strategies/
│   ├── BankCardDiscountStrategy.ts
│   ├── BrandDiscountStrategy.ts
│   ├── CategoryDiscountStrategy.ts
│   └── VoucherDiscountStrategy.ts
└── tests/
    └── DiscountService.test.ts
```

## API Documentation

### DiscountService

The main service class that handles discount calculations and validations.

```typescript
const discountService = new DiscountService(strategyConfigs, onDiscountApplied);
```

#### Methods

1. `calculateCartDiscounts(cartItems, customer, paymentInfo)`
   - Calculates all applicable discounts for a cart
   - Returns `DiscountedPrice` object with original price, final price, and applied discounts

2. `validateDiscountCode(code, cartItems, customer)`
   - Validates if a voucher code is applicable
   - Returns boolean indicating validity

3. `addDiscountStrategy(strategy)`
   - Adds a new discount strategy to the service

### Data Structures

1. **CartItem**
```typescript
interface CartItem {
  product: Product;
  quantity: number;
  size: string;
}
```

2. **Product**
```typescript
interface Product {
  id: string;
  brand: string;
  brandTier: BrandTier;
  category: string;
  basePrice: Decimal;
  currentPrice: Decimal;
}
```

3. **DiscountedPrice**
```typescript
interface DiscountedPrice {
  originalPrice: number;
  finalPrice: number;
  appliedDiscounts: Record<string, Decimal>;
  message: string;
}
```

## Setup and Running

1. Install dependencies:
```bash
npm install
```

2. Run tests:
```bash
npm test
```

## Usage Example

```typescript
// Initialize discount service with strategies
const discountService = new DiscountService([
  {
    type: 'brand',
    config: {
      brand: 'PUMA',
      discountPercentage: 40,
      minimumCartAmount: new Decimal(1000)
    }
  },
  {
    type: 'bank',
    config: {
      bankName: 'ICICI',
      discountPercentage: 10
    }
  }
]);

// Calculate discounts
const result = await discountService.calculateCartDiscounts(
  cartItems,
  customerProfile,
  paymentInfo
);
```

## Assumptions and Technical Decisions

1. **Discount Stacking**
   - Discounts are applied in a specific order: brand → category → bank → voucher
   - Each subsequent discount is calculated on the price after previous discounts
   - Negative prices are prevented by capping discounts

2. **Price Handling**
   - All prices are handled using decimal.js for precise calculations
   - Discounts are stored as percentages
   - Price updates are proportional across cart items

3. **Validation**
   - Modular validation system with separate validators for each discount type
   - Support for complex validation rules including customer tiers and time-based validity

4. **Extensibility**
   - New discount types can be added by implementing the DiscountStrategy interface
   - Custom validators can be injected for each discount type
   - Callback system for tracking applied discounts

## Future Improvements

1. Add support for fixed amount discounts
2. Implement maximum discount caps
3. Add support for time-based discounts
4. Implement more complex validation rules
5. Add support for customer-specific discounts
6. Add support for bundle discounts
7. Implement caching for frequently used discount calculations
8. Add support for geographic-based discounts