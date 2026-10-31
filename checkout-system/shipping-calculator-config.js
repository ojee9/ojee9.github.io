/**
 * VN SHOP — standalone shipping calculator configuration.
 * PTT tariff values intentionally remain unset until the current official tariff
 * is confirmed. Add exact per-desi rates or bands in PTT_TARIFF before quoting.
 */
export const SHIPPING_CONFIG = {
  carrier: "PTT",
  desiDivisor: 3000,
  carton: {
    // Added to the packed inner-package envelope on each side (cm).
    clearancePerSideCm: 1.5,
    // Outer carton weight (kg), added once per shipment.
    tareWeightKg: 0.35,
    // Carrier constraints are unknown; leave null rather than invent limits.
    maxLengthCm: null,
    maxSecondSideCm: null,
    maxThirdSideCm: null,
    maxActualWeightKg: null,
    maxDesi: null
  },
  tax: {
    defaultRate: 0.20,
    // Current calculator treats listed item prices as pre-tax and adds estimated tax.
    // Change to "included" if VN SHOP prices are VAT-inclusive.
    priceMode: "added"
  },
  tariff: {
    // Configure with confirmed values, e.g. { intracity: {3: 185, 9: 300}, intercity: {...} }
    intracity: {},
    intercity: {},
    // Optional incremental fee after the highest configured desi key.
    extraPerDesi: { intracity: null, intercity: null },
    rounding: "ceil"
  }
};
