# VN SHOP — Shipping Calculator

Standalone ES module. It is deliberately separate from the live checkout until the calculator is tested.

## Use

```js
import { calculateCheckout } from "./shipping-calculator.js";
const result = calculateCheckout(cart, {
  destinationType: "intercity", // "intracity" for Ankara-to-Ankara
  exchangeRate: 42 // optional current TRY per USD
});
```

Cart shape: `{ product: { name: "CD", price: 24.99, sku: "CD" }, quantity: 1 }`.
Supported profiles: CD, POSTER_30x45, POSTER_40x30, POSTER_45x60, POSTER_60x90, POSTER_80x60, POSTER_80x120, POSTER_120x80.

## User-supplied product estimates

| Profile | Prepared package (cm) | Weight used | Handling budget |
|---|---:|---:|---:|
| CD | 27 × 27 × 12 | 1.1 kg | 2,300 TL |
| Poster 30 × 45 | 42 × 57 × 11 | 2.9 kg | 3,000 TL |
| Poster 40 × 30 | 52 × 42 × 11 | 2.8 kg | 2,800 TL |
| Poster 45 × 60 | 57 × 72 × 11 | 4.3 kg | 4,200 TL |
| Poster 60 × 90 | 72 × 102 × 12 | 7.5 kg | 5,700 TL |
| Poster 80 × 60 | 92 × 72 × 12 | 6.8 kg | 6,000 TL |
| Poster 80 × 120 | 92 × 132 × 13 | 12 kg | 9,000 TL |
| Poster 120 × 80 | 132 × 92 × 13 | 12 kg | 9,000 TL |

The upper end of each supplied weight range is used automatically. Handling budget is per unit and remains separate from carrier shipping.

## PTT

PTT individual domestic tariff effective 1 October 2026; published rates are VAT-inclusive. Ankara-to-Ankara uses intracity; other Turkish destinations use intercity. Billable units are the greater of estimated actual kg and volumetric desi (cm³ / 3000), rounded up. Where the public tariff table gives a breakpoint rather than every single desi, the estimate rounds up to the next published breakpoint; above 30, the configured per-desi increment is applied.

The product package dimensions/weights supplied by the user are treated as the prepared shipping unit, so the calculator does not ask for per-order weighing or add another guessed carton tare. Multiple units are combined with a best-effort geometric packing estimate. This remains an estimate, not a physical packing certificate; unusually large or irregular multi-item combinations may need a manual check.

Product prices and tax are USD; handling and shipping are TRY. The calculator never adds unlike currencies. Supply a current trusted `exchangeRate` (TRY per USD) to calculate a TRY grand total; otherwise `grandTotal` remains null. Tax defaults to 20% added to product prices.
