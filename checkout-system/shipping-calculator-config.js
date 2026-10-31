export const SHIPPING_CONFIG = {
  carrier: "PTT",
  currency: { products: "USD", operations: "TRY" },
  desiDivisor: 3000,
  carton: { clearancePerSideCm:null, tareWeightKg:null, maxLengthCm:null, maxSecondSideCm:null, maxThirdSideCm:null, maxActualWeightKg:null, maxDesi:null },
  tax: { defaultRate:0.20, priceMode:"added" },
  tariff: { intracity:{}, intercity:{}, extraPerDesi:{intracity:null,intercity:null}, rounding:"ceil" }
};
