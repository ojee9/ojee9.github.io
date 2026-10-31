# VN SHOP — Shipping Calculator

Standalone calculation module. It does not modify or import the live checkout UI.

## Files
- `shipping-calculator-data.js`: product package dimensions, conservative maximum weights, handling costs and tax rates.
- `shipping-calculator-config.js`: carton allowances, tax display mode and PTT tariff table.
- `shipping-calculator.js`: cart normalization, single-carton packing estimate, desi and checkout totals.

## Usage
```js
import { calculateCheckout } from "./shipping-calculator.js";

const result = calculateCheckout(cart, { destinationType: "intercity" });
```

Cart items can use the existing checkout shape:
```js
{ product: { name: "CD", price: 24.99 }, quantity: 1 }
```

For reliable profile matching, set `product.sku` or `product.shippingProfile` to one of:
`CD`, `POSTER_30x45`, `POSTER_40x30`, `POSTER_45x60`, `POSTER_60x90`, `POSTER_80x60`, `POSTER_80x120`, `POSTER_120x80`.

## Important configuration
PTT tariff values are intentionally blank. Until configured from a confirmed tariff, the result status is `tariff_required` rather than inventing a shipping amount.

The packing routine is a conservative heuristic, not a validated physical carton design. Its output must be checked against a real carton and PTT's current parcel acceptance limits before being used to charge customers. Carrier limits are unset until confirmed.

Tax mode defaults to `added` (20% calculated on top of item prices, matching the current checkout calculation plan). Set `priceMode: "included"` if displayed product prices already include VAT; in that mode VAT is extracted from the item price and not added again to the total.

Handling cost is charged per product unit. Shipping is charged once for the single combined outer carton. If a product profile is missing or the one-carton pack cannot be computed, the module returns a manual-quote status rather than splitting the shipment.
