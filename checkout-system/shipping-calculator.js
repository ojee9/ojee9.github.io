import { SHIPPING_CONFIG } from "./shipping-calculator-config.js";
import { PRODUCT_PROFILES, PRODUCT_ALIASES } from "./shipping-calculator-data.js";

const volume = d => d[0] * d[1] * d[2];
const permutations = d => {
  const out = [];
  for (const p of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]) {
    const v = p.map(i => d[i]);
    if (!out.some(x => x.every((n,j) => n === v[j]))) out.push(v);
  }
  return out;
};
const overlaps = (a,b) => a.x < b.x+b.d[0] && a.x+a.d[0] > b.x &&
  a.y < b.y+b.d[1] && a.y+a.d[1] > b.y &&
  a.z < b.z+b.d[2] && a.z+a.d[2] > b.z;

function resolveProfile(item) {
  const p = item?.product || item || {};
  const explicit = item?.shippingProfile || p.shippingProfile || item?.sku || p.sku;
  if (explicit && PRODUCT_PROFILES[explicit]) return { key: explicit, profile: PRODUCT_PROFILES[explicit] };
  const name = String(p.name || item?.name || "").toUpperCase()
    .replace(/[×*]/g,"X").replace(/\s+/g," ").trim();
  const alias = PRODUCT_ALIASES[name];
  return alias ? { key: alias, profile: PRODUCT_PROFILES[alias] } : null;
}

// Estimate one combined parcel from the supplied prepared-unit dimensions.
// This is an operational estimate, not a physical packing certification.
function packOneCarton(lines) {
  const units = [];
  for (const line of lines) for (let i=0;i<line.quantity;i++)
    units.push({ key: line.profileKey, d: line.profile.dimensionsCm });
  units.sort((a,b) => volume(b.d)-volume(a.d));
  const placed = [], points = [{x:0,y:0,z:0}];
  for (const unit of units) {
    let best = null;
    for (const point of points) for (const d of permutations(unit.d)) {
      const candidate = {x:point.x,y:point.y,z:point.z,d,key:unit.key};
      if (placed.some(p => overlaps(candidate,p))) continue;
      const all = [...placed,candidate];
      const extent = [0,1,2].map(a => Math.max(...all.map(p => [p.x,p.y,p.z][a]+p.d[a])));
      const score = volume(extent);
      if (!best || score < best.score) best = {candidate,score};
    }
    if (!best) return {feasible:false,method:"estimate",reason:"PACKING_NOT_FOUND"};
    placed.push(best.candidate);
    const p = best.candidate;
    points.push({x:p.x+p.d[0],y:p.y,z:p.z},{x:p.x,y:p.y+p.d[1],z:p.z},{x:p.x,y:p.y,z:p.z+p.d[2]});
    for (let i=points.length-1;i>=0;i--) if (placed.some(q =>
      points[i].x>=q.x&&points[i].x<q.x+q.d[0]&&points[i].y>=q.y&&points[i].y<q.y+q.d[1]&&
      points[i].z>=q.z&&points[i].z<q.z+q.d[2])) points.splice(i,1);
  }
  const dimensionsCm = [0,1,2].map(a => Math.max(...placed.map(p => [p.x,p.y,p.z][a]+p.d[a])));
  const actualWeightKg = lines.reduce((s,l) => s+l.profile.weightKg*l.quantity,0);
  return {feasible:true,method:"estimated-combined-carton",verified:false,dimensionsCm,actualWeightKg};
}

function calculateParcel(p, config) {
  const c = config.carton;
  const outerDimensionsCm = p.dimensionsCm.map(n => n + 2*c.clearancePerSideCm);
  const actualWeightKg = p.actualWeightKg + c.tareWeightKg;
  const desiExact = volume(outerDimensionsCm) / config.desiDivisor;
  // PTT charges by the greater of actual kg and volumetric desi.
  const billableExact = Math.max(actualWeightKg,desiExact);
  const billableDesi = Math.ceil(billableExact);
  const sorted = [...outerDimensionsCm].sort((a,b)=>b-a);
  const checks = [["maxLengthCm",sorted[0]],["maxSecondSideCm",sorted[1]],
    ["maxThirdSideCm",sorted[2]],["maxActualWeightKg",actualWeightKg],["maxDesi",billableDesi]];
  const failedConstraints = checks.filter(([k,v])=>c[k]!=null&&v>c[k]).map(([k])=>k);
  return {...p,outerDimensionsCm,actualWeightKg,desiExact,billableExact,billableDesi,
    readyForCarrierQuote:failedConstraints.length===0,failedConstraints};
}

function tariff(desi,type,config) {
  const table = config.tariff[type];
  const keys = Object.keys(table).map(Number).sort((a,b)=>a-b);
  const tier = keys.find(k=>k>=desi);
  if (tier!=null) return {amount:table[tier],tier,roundedUp:tier!==desi};
  const max = keys[keys.length-1];
  const extra = config.tariff.extraPerDesi[type];
  return extra==null ? null : {amount:table[max]+(desi-max)*extra,tier:max,extraDesi:desi-max};
}

export function calculateCheckout(cartItems, options={}) {
  const config = options.config || SHIPPING_CONFIG;
  const destinationType = options.destinationType || "intercity";
  if (!Array.isArray(cartItems) || !cartItems.length) return {status:"empty"};
  if (!["intracity","intercity"].includes(destinationType)) return {status:"invalid_destination"};
  const items = [];
  for (const item of cartItems) {
    const quantity = Number(item?.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity<0) return {status:"manual_quote",reason:"INVALID_QUANTITY"};
    if (!quantity) continue;
    const match = resolveProfile(item);
    if (!match) return {status:"manual_quote",reason:"UNKNOWN_PRODUCT_PROFILE",product:item?.product?.name||item?.name||"Unknown product"};
    const rawPrice = item?.product?.price ?? item?.price;
    const price = typeof rawPrice==="number" ? rawPrice : Number(String(rawPrice??"").replace(/[^0-9.-]/g,""));
    if (!Number.isFinite(price)||price<0) return {status:"manual_quote",reason:"INVALID_PRODUCT_PRICE"};
    const rate = match.profile.taxRate ?? config.tax.defaultRate;
    const subtotal = price*quantity;
    const tax = config.tax.priceMode==="included" ? subtotal*rate/(1+rate) : subtotal*rate;
    items.push({profileKey:match.key,quantity,unitPriceUSD:price,lineSubtotalUSD:subtotal,taxUSD:tax,
      handlingTRY:match.profile.handlingTRY*quantity,profile:match.profile});
  }
  if (!items.length) return {status:"empty"};
  const subtotalUSD = items.reduce((s,l)=>s+l.lineSubtotalUSD,0);
  const taxUSD = items.reduce((s,l)=>s+l.taxUSD,0);
  const handlingTRY = items.reduce((s,l)=>s+l.handlingTRY,0);
  const goodsUSD = config.tax.priceMode==="included" ? subtotalUSD : subtotalUSD+taxUSD;
  const packed = packOneCarton(items);
  const packing = packed.feasible ? calculateParcel(packed,config) : packed;
  const base = {items,destinationType,subtotal:{amount:subtotalUSD,currency:"USD"},
    estimatedTaxes:{amount:taxUSD,currency:"USD"},handling:{amount:handlingTRY,currency:"TRY"},
    shipping:{amount:null,currency:"TRY"},
    totals:{goodsAndTax:{amount:goodsUSD,currency:"USD"},shippingAndHandling:{amount:null,currency:"TRY"},grandTotal:null},
    packing};
  if (!packed.feasible) return {...base,status:"manual_quote",reason:packed.reason};
  if (!packing.readyForCarrierQuote) return {...base,status:"manual_quote",reason:"CARRIER_LIMIT_EXCEEDED"};
  const quote = tariff(packing.billableDesi,destinationType,config);
  if (!quote) return {...base,status:"tariff_required",reason:"PTT_TARIFF_NOT_CONFIGURED"};
  const operationsTRY = handlingTRY+quote.amount;
  const fx = Number(options.exchangeRate);
  return {...base,status:"ok",
    shipping:{amount:quote.amount,currency:"TRY",carrier:config.carrier,tariffTier:quote.tier},
    totals:{goodsAndTax:{amount:goodsUSD,currency:"USD"},
      shippingAndHandling:{amount:operationsTRY,currency:"TRY"},
      grandTotal:Number.isFinite(fx)&&fx>0?{amount:goodsUSD*fx+operationsTRY,currency:"TRY",exchangeRateTRYPerUSD:fx}:null}};
}
