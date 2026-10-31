import { SHIPPING_CONFIG } from "./shipping-calculator-config.js";
import { PRODUCT_PROFILES, PRODUCT_ALIASES } from "./shipping-calculator-data.js";

const finite = value => Number.isFinite(Number(value)) && Number(value) >= 0;
const volume = d => d[0] * d[1] * d[2];
const permutations = d => {
  const out = [];
  for (const p of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]) {
    const v = p.map(i => d[i]);
    if (!out.some(x => x.every((n,i) => n === v[i]))) out.push(v);
  }
  return out;
};
const overlaps = (a,b) =>
  a.x < b.x+b.d[0] && a.x+a.d[0] > b.x &&
  a.y < b.y+b.d[1] && a.y+a.d[1] > b.y &&
  a.z < b.z+b.d[2] && a.z+a.d[2] > b.z;

function resolveProfile(item) {
  const product = item?.product || item || {};
  const explicit = item?.shippingProfile || product.shippingProfile || item?.sku || product.sku;
  if (explicit && PRODUCT_PROFILES[explicit]) return { key: explicit, profile: PRODUCT_PROFILES[explicit] };
  const name = String(product.name || item?.name || "").toUpperCase().replace(/[×*]/g,"X").replace(/\s+/g," ").trim();
  const alias = PRODUCT_ALIASES[name];
  return alias ? { key: alias, profile: PRODUCT_PROFILES[alias] } : null;
}

function packOneCarton(lines, config) {
  const units = [];
  for (const line of lines) {
    for (let i=0; i<line.quantity; i++) units.push({ key: line.profileKey, d: line.profile.dimensionsCm });
  }
  // Largest packages first; try every axis orientation at each candidate corner.
  units.sort((a,b) => volume(b.d)-volume(a.d));
  const placed = [];
  const points = [{x:0,y:0,z:0}];
  for (const unit of units) {
    let best = null;
    for (const point of points) {
      for (const d of permutations(unit.d)) {
        const candidate = {x:point.x,y:point.y,z:point.z,d,key:unit.key};
        if (placed.some(p => overlaps(candidate,p))) continue;
        const all = [...placed,candidate];
        const ext = [0,1,2].map(axis => Math.max(...all.map(p => [p.x,p.y,p.z][axis]+p.d[axis])));
        const score = ext[0]*ext[1]*ext[2] + ext[0]*ext[1]*0.0001 + ext[0]*0.000001;
        if (!best || score < best.score) best = {candidate,score};
      }
    }
    if (!best) return { feasible:false, reason:"PACKING_FAILED" };
    placed.push(best.candidate);
    const p=best.candidate;
    points.push({x:p.x+p.d[0],y:p.y,z:p.z},{x:p.x,y:p.y+p.d[1],z:p.z},{x:p.x,y:p.y,z:p.z+p.d[2]});
    // Remove points inside an already occupied package.
    for (let i=points.length-1;i>=0;i--) {
      if (placed.some(q => points[i].x>=q.x && points[i].x<q.x+q.d[0] && points[i].y>=q.y && points[i].y<q.y+q.d[1] && points[i].z>=q.z && points[i].z<q.z+q.d[2])) points.splice(i,1);
    }
  }
  const inner = [0,1,2].map(axis => Math.max(...placed.map(p => [p.x,p.y,p.z][axis]+p.d[axis])));
  const pad = config.carton.clearancePerSideCm*2;
  const outer = inner.map(n => n+pad);
  const actualWeightKg = lines.reduce((sum,l)=>sum+l.profile.weightKg*l.quantity,0)+config.carton.tareWeightKg;
  const desiExact = volume(outer)/config.desiDivisor;
  const billableDesi = Math.ceil(desiExact);
  const constraints = config.carton;
  const checks = [
    ["maxLengthCm",Math.max(...outer)],
    ["maxSecondSideCm",[...outer].sort((a,b)=>b-a)[1]],
    ["maxThirdSideCm",Math.min(...outer)],
    ["maxActualWeightKg",actualWeightKg],
    ["maxDesi",billableDesi]
  ];
  const failed = checks.filter(([key,value])=>constraints[key]!=null && value>constraints[key]).map(([key])=>key);
  return { feasible: !failed.length, reason: failed.length ? "CARRIER_LIMIT_EXCEEDED" : null, failedConstraints: failed,
    innerDimensionsCm: inner, outerDimensionsCm: outer, actualWeightKg, desiExact, billableDesi,
    billableWeightKg: Math.max(actualWeightKg,billableDesi) };
}

function tariffFor(desi, destinationType, config) {
  const table = config.tariff[destinationType];
  if (!table) return null;
  const keys = Object.keys(table).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  if (!keys.length) return null;
  const rounded = config.tariff.rounding === "ceil" ? Math.ceil(desi) : desi;
  const exact = table[rounded];
  if (Number.isFinite(exact)) return exact;
  const next = keys.find(k=>k>=rounded);
  if (next != null) return table[next];
  const max = keys[keys.length-1], extra = config.tariff.extraPerDesi[destinationType];
  if (extra == null) return null;
  return table[max] + Math.max(0,rounded-max)*extra;
}

/**
 * calculateCheckout(cart, options)
 * cart item supports { product:{name,price,sku}, quantity } or {name,price,quantity,sku}.
 * options.destinationType: "intracity" | "intercity".
 */
export function calculateCheckout(cart, options = {}) {
  const config = options.config || SHIPPING_CONFIG;
  const destinationType = options.destinationType || "intercity";
  if (!Array.isArray(cart) || !cart.length) return { status:"empty", items:[], subtotal:0, estimatedTaxes:0, handlingTotal:0, shipping:0, total:0 };
  const lines = [];
  for (const item of cart) {
    const quantity = Math.max(0,Math.floor(Number(item?.quantity ?? 1)));
    if (!quantity) continue;
    const found = resolveProfile(item);
    if (!found) return { status:"manual_quote", reason:"UNKNOWN_PRODUCT_PROFILE", product:item?.product?.name || item?.name || "Unknown product" };
    const rawPrice = item?.product?.price ?? item?.price ?? 0;
    const price = Number(String(rawPrice).replace(/[^0-9.-]/g,""));
    if (!Number.isFinite(price) || price<0) return { status:"manual_quote", reason:"INVALID_PRODUCT_PRICE" };
    const taxRate = found.profile.taxRate ?? config.tax.defaultRate;
    const taxBase = config.tax.priceMode === "included" ? price*quantity*taxRate/(1+taxRate) : price*quantity;
    const tax = config.tax.priceMode === "included" ? taxBase : taxBase*taxRate;
    lines.push({ profileKey:found.key, profile:found.profile, quantity, unitPrice:price, lineSubtotal:price*quantity, tax });
  }
  if (!lines.length) return { status:"empty", items:[], subtotal:0, estimatedTaxes:0, handlingTotal:0, shipping:0, total:0 };
  const packing = packOneCarton(lines,config);
  if (!packing.feasible) return { status:"manual_quote", reason:packing.reason, failedConstraints:packing.failedConstraints, packing };
  const subtotal = lines.reduce((s,l)=>s+l.lineSubtotal,0);
  const estimatedTaxes = lines.reduce((s,l)=>s+l.tax,0);
  const handlingTotal = lines.reduce((s,l)=>s+l.profile.handlingTRY*l.quantity,0);
  const shipping = tariffFor(packing.billableDesi,destinationType,config);
  if (shipping == null) return { status:"tariff_required", reason:"PTT_TARIFF_NOT_CONFIGURED", items:lines, subtotal, estimatedTaxes, handlingTotal, shipping:null, total:null, packing };
  const total = config.tax.priceMode === "included"
    ? subtotal + handlingTotal + shipping
    : subtotal + estimatedTaxes + handlingTotal + shipping;
  return { status:"ok", items:lines, subtotal, estimatedTaxes, handlingTotal, shipping, shippingAndHandling:shipping+handlingTotal, total, packing, destinationType, currency:"TRY" };
}
