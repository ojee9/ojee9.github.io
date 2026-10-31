export const SHIPPING_CONFIG = {
  carrier: "PTT",
  tariffEffectiveDate: "2026-10-01",
  currency: { products: "USD", operations: "TRY" },
  desiDivisor: 3000,
  // Supplied product dimensions and weights already represent the prepared,
  // protected shipping unit. Do not add a second carton tare/clearance estimate.
  carton: {
    clearancePerSideCm: 0,
    tareWeightKg: 0,
    maxLengthCm: null,
    maxSecondSideCm: null,
    maxThirdSideCm: null,
    maxActualWeightKg: null,
    maxDesi: null
  },
  tax: { defaultRate: 0.20, priceMode: "added" },
  // PTT individual domestic tariff, TRY, VAT included (01.10.2026).
  // Sparse official tariff breakpoints are rounded UP to the next listed tier.
  tariff: {
    intracity: {
      0.5:160, 1:165, 2:180, 3:185, 4:210, 5:230,
      6:245, 7:260, 8:275, 9:300, 10:320,
      15:420, 20:560, 25:640, 30:750
    },
    intercity: {
      0.5:225, 1:230, 2:260, 3:280, 4:330, 5:360,
      6:390, 7:415, 8:440, 9:460, 10:500,
      15:630, 20:825, 25:950, 30:1120
    },
    extraPerDesi: { intracity:20, intercity:30 },
    rounding: "ceil"
  }
};
