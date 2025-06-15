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
   - Async/await pattern for future extensibility

2. **Discount Calculation Logic**
   - Sequential application of discounts (brand → category → bank → voucher)
   - Clear tracking of applied discounts and their amounts
   - Detailed messages for each applied discount

3. **Validation Rules**
   - Brand exclusions
   - Category restrictions
   - Minimum purchase requirements
   - Customer tier requirements

## Project Structure

```
src/
├── types/
│   └── index.ts         # Core type definitions
├── services/
│   ├── DiscountService.ts
│   └── __tests__/
│       └── DiscountService.test.ts
└── data/
    └── fakeData.ts      # Test data
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

## Assumptions and Technical Decisions

1. **Discount Stacking**
   - Discounts are applied in a specific order: brand → category → bank → voucher
   - Each subsequent discount is calculated on the price after previous discounts

2. **Price Handling**
   - All prices are handled as numbers (in the actual implementation, you might want to use a decimal library for precise calculations)
   - Discounts are stored as percentages

3. **Validation**
   - Basic validation rules are implemented
   - The system can be extended to include more complex validation rules

4. **Extensibility**
   - New discount types can be added by extending the Discount interface
   - The service is designed to be easily extended with new validation rules

## Future Improvements

1. Add support for fixed amount discounts
2. Implement maximum discount caps
3. Add support for time-based discounts
4. Implement more complex validation rules
5. Add support for customer-specific discounts
6. Implement proper decimal handling for prices