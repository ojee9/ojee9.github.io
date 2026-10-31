/**
 * VN SHOP prepared-shipping-unit profiles.
 * Dimensions and weights are the user's supplied estimates for the protected
 * product package; weights deliberately use the upper end of each range.
 * HandlingTRY is the user's fixed budgeting amount per item, not carrier cost.
 */
export const PRODUCT_PROFILES = {
  CD: { dimensionsCm: [27, 27, 12], weightKg: 1.1, handlingTRY: 2300, taxRate: 0.20 },
  POSTER_30x45: { dimensionsCm: [42, 57, 11], weightKg: 2.9, handlingTRY: 3000, taxRate: 0.20 },
  POSTER_40x30: { dimensionsCm: [52, 42, 11], weightKg: 2.8, handlingTRY: 2800, taxRate: 0.20 },
  POSTER_45x60: { dimensionsCm: [57, 72, 11], weightKg: 4.3, handlingTRY: 4200, taxRate: 0.20 },
  POSTER_60x90: { dimensionsCm: [72, 102, 12], weightKg: 7.5, handlingTRY: 5700, taxRate: 0.20 },
  POSTER_80x60: { dimensionsCm: [92, 72, 12], weightKg: 6.8, handlingTRY: 6000, taxRate: 0.20 },
  POSTER_80x120: { dimensionsCm: [92, 132, 13], weightKg: 12, handlingTRY: 9000, taxRate: 0.20 },
  POSTER_120x80: { dimensionsCm: [132, 92, 13], weightKg: 12, handlingTRY: 9000, taxRate: 0.20 }
};

export const PRODUCT_ALIASES = {
  "CD": "CD",
  "POSTER 30X45": "POSTER_30x45",
  "POSTER 40X30": "POSTER_40x30",
  "POSTER 45X60": "POSTER_45x60",
  "POSTER 60X90": "POSTER_60x90",
  "POSTER 80X60": "POSTER_80x60",
  "POSTER 80X120": "POSTER_80x120",
  "POSTER 120X80": "POSTER_120x80"
};
