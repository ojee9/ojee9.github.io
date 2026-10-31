# VN SHOP — Shipping Calculator

Standalone ES module; does not modify or import the live checkout UI.

~~~js
import { calculateCheckout } from "./shipping-calculator.js";
const result = calculateCheckout(cart, { destinationType: "intercity" });
~~~

Accepts the current cart shape: { product: { name: "CD", price: 24.99, sku: "CD" }, quantity: 1 }. Prefer an explicit sku or shippingProfile. Supported profiles: CD, POSTER_30x45, POSTER_40x30, POSTER_45x60, POSTER_60x90, POSTER_80x60, POSTER_80x120, POSTER_120x80.

Product prices and tax are USD; handling and shipping are TRY. Currencies are never added directly. Supply exchangeRate (TRY per USD) only with a current trusted rate; otherwise grandTotal remains null. Tax defaults to 20% added to product prices; use priceMode "included" only if displayed prices already include VAT.

PTT tariff, carton clearance, tare weight and carrier limits are intentionally unset until verified. The calculator returns carton_configuration_required or tariff_required rather than inventing a shipping fee. Packing is a one-carton heuristic, not a physical packing certificate; it never splits shipments. Handling is per unit and shipping once per carton.
