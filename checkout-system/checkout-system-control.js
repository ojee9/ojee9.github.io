import{cart,money}from"./checkout-data.js";import{state}from"./checkout-state.js";import{validEmail}from"./checkout-engine.js";import{render,updateShippingSummary,policy,close}from"./checkout-view.js";import{calculateCheckout}from"./shipping-calculator.js";
state.cart=cart();render(state.cart);
const roundCurrency=value=>Math.round((Number(value)+Number.EPSILON)*100)/100;
const formatTRY=value=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY"}).format(roundCurrency(value));
let checkoutAmounts={subtotalUSD:Number(document.getElementById("subtotal")?.dataset.amount||0),shippingTRY:null,shippingUSD:null,shippingDisplayTRY:null,shippingPaymentTRY:null,taxesUSD:null,fxRate:null,fxUpdatedAt:null,fxProvider:null,subtotalTRY:null,taxesTRY:null,totalTRY:null};
const form=document.getElementById("info"),country=document.getElementById("country"),phoneCountry=document.getElementById("phoneCountry"),countryDialog=document.getElementById("country-modal"),policyDialog=document.getElementById("modal"),policyOptions=document.getElementById("policy-options"),policySelect=document.getElementById("policy-select");
const dial=()=>{const m=phoneCountry.selectedOptions[0]?.textContent.match(/\+(\d{1,4})/);return m?"+"+m[1]:""};
const updatePhone=()=>{const option=phoneCountry.selectedOptions[0],code=phoneCountry.value.toLowerCase();document.querySelector("[data-phone-dial]").textContent=dial();const flag=document.querySelector(".vn-ac-phone-flag");if(flag){flag.onerror=()=>{flag.hidden=true};flag.onload=()=>{flag.hidden=false};flag.src="https://flagcdn.com/24x18/"+code+".png";flag.alt="Country flag";flag.hidden=false;phoneCountry.setAttribute("aria-label","Phone country: "+(option?.textContent||phoneCountry.value))}};
const showCountry=()=>{const selected=country.selectedOptions[0]?.textContent||"this country";document.getElementById("country-dialog-message").textContent="We're currently trying to reach our premium products to "+selected+" right now. Please try again later. — VN Shop";countryDialog.hidden=false;requestAnimationFrame(()=>countryDialog.classList.add("is-open"));document.body.style.overflow="hidden"};
const hideCountry=()=>{countryDialog.classList.remove("is-open");setTimeout(()=>{countryDialog.hidden=true;if(policyDialog.hidden)document.body.style.overflow=""},210)};
const saved=(()=>{try{return JSON.parse(sessionStorage.getItem("vn-checkout-information")||"{}")}catch{return{}}})();
for(const [key,value]of Object.entries(saved)){const field=form.elements.namedItem(key);if(field&&typeof value==="string")field.value=value}
if(saved.updates===true)document.getElementById("updates").checked=true;
if(saved.phoneCountry&&phoneCountry.querySelector('option[value="'+saved.phoneCountry+'"]'))phoneCountry.value=saved.phoneCountry;
updatePhone();if(country.value!=="TR")showCountry();
/* Country-scoped Geoapify autocomplete with VN SHOP-owned suggestion UI. */
const addressInput=document.getElementById("address"),addressSuggestions=document.getElementById("address-suggestions");
const cityInput=document.getElementById("city"),stateInput=document.getElementById("state"),postalInput=document.getElementById("postal");

/* Live shipping estimate is displayed in the order summary only. */
const normalizeShippingCity=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("tr-TR").replace(/ı/g,"i").replace(/\s+/g," ").trim();
const turkishProvinces=new Set("adana adiyaman afyonkarahisar agri amasya ankara antalya artvin aydin balikesir bilecik bingol bitlis bolu burdur bursa canakkale cankiri corum denizli diyarbakir edirne elazig erzincan erzurum eskisehir gaziantep giresun gumushane hakkari hatay igdir isparta istanbul izmir kahramanmaras karabuk karaman kars kastamonu kayseri kilis kirikkale kirklareli kirsehir kocaeli konya kutahya malatya manisa mardin mersin mugla mus nevsehir nigde ordu osmaniye rize sakarya samsun siirt sinop sivas sanliurfa sirnak tekirdag tokat trabzon tunceli usak van yalova yozgat zonguldak".split(" "));
const profileForPoster=(product,variant)=>{
 const size=String(variant||"").replace(/[×*]/g,"x").replace(/cm/gi,"").replace(/\s+/g,"").toLowerCase();
 const id=String(product?.id||"").toLowerCase();
 if(id==="gta-love-poster-1")return({"40x30":"POSTER_40x30","80x60":"POSTER_80x60","120x80":"POSTER_120x80"})[size]||null;
 if(id==="gta-love-poster-2")return({"30x45":"POSTER_30x45","45x60":"POSTER_45x60","60x90":"POSTER_60x90"})[size]||null;
 return({"45x60":"POSTER_45x60","60x90":"POSTER_60x90","80x120":"POSTER_80x120"})[size]||null;
};
const prepareShippingCart=items=>items.map(line=>{
 const product=line?.product||line||{};
 const category=String(product.category||"").toUpperCase();
 const type=String(product.type||"").toUpperCase();
 const variant=line?.variant??line?.size??line?.version??"";
 let shippingProfile=null;
 if(category==="CD"||type.includes("CD"))shippingProfile="CD";
 else if(type==="POSTER"||String(product.name||"").toUpperCase().includes("POSTER"))shippingProfile=profileForPoster(product,variant);
 return{...line,shippingProfile};
});
let shippingCalculationTimer,shippingCalculationRequest=0;
const resolveTurkishProvince=(...values)=>{
 const candidates=values.map(normalizeShippingCity).filter(Boolean);
 for(const candidate of candidates){
  if(turkishProvinces.has(candidate))return candidate;
  const tokens=candidate.split(/[^a-z]+/).filter(Boolean);
  const matched=tokens.find(token=>turkishProvinces.has(token));
  if(matched)return matched;
  const embedded=[...turkishProvinces].find(province=>new RegExp("(?:^|[^a-z])"+province+"(?:$|[^a-z])").test(candidate));
  if(embedded)return embedded;
 }
 return null;
};
const calculateOrderSummary=async()=>{
 const request=++shippingCalculationRequest;
 const city=normalizeShippingCity(cityInput.value);
 const province=resolveTurkishProvince(cityInput.value,stateInput.value);
 if(country.value!=="TR"||!city){
  checkoutAmounts={...checkoutAmounts,shippingTRY:null,shippingUSD:null,shippingDisplayTRY:null,shippingPaymentTRY:null,taxesUSD:null,fxRate:null,fxUpdatedAt:null,fxProvider:null};
  updateShippingSummary({shippingAndHandlingUSD:null,estimatedTaxes:null});
  return;
 }
 if(!state.cart.length){
  checkoutAmounts={...checkoutAmounts,shippingTRY:null,shippingUSD:null,shippingDisplayTRY:null,shippingPaymentTRY:null,taxesUSD:null};
  updateShippingSummary({shippingAndHandlingUSD:null,estimatedTaxes:null,shippingLabel:"Unavailable"});
  return;
 }
 // City is sufficient to estimate. Resolve province from City or State when available;
 // district-only/manual City entries still receive the intercity estimate.
 const destinationType=province==="ankara"?"intracity":"intercity";
 try{
  const result=calculateCheckout(prepareShippingCart(state.cart),{destinationType});
  const estimatedTaxes=result?.estimatedTaxes?.amount!=null&&Number.isFinite(Number(result.estimatedTaxes.amount))
   ?Number(result.estimatedTaxes.amount):null;
  const carrierShipping=result?.status==="ok"&&result.shipping?.amount!=null?Number(result.shipping.amount):null;
  const handling=result?.handling?.amount!=null?Number(result.handling.amount):null;
  const shippingAndHandling=Number.isFinite(carrierShipping)&&Number.isFinite(handling)
   ?carrierShipping+handling:null;
  if(shippingAndHandling===null){
   checkoutAmounts={...checkoutAmounts,subtotalUSD:Number(document.getElementById("subtotal")?.dataset.amount||0),shippingTRY:null,shippingUSD:null,shippingDisplayTRY:null,shippingPaymentTRY:null,taxesUSD:estimatedTaxes};
   updateShippingSummary({shippingAndHandlingUSD:null,estimatedTaxes,shippingLabel:"Manual quote required"});
   return;
  }
  const fx=await getUsdTryRate();
  if(request!==shippingCalculationRequest)return;
  const shippingUSD=roundCurrency(shippingAndHandling/fx.rate);
  const shippingDisplayTRY=roundCurrency(shippingUSD*fx.rate);
  checkoutAmounts={...checkoutAmounts,subtotalUSD:Number(document.getElementById("subtotal")?.dataset.amount||0),shippingTRY:shippingAndHandling,shippingUSD,shippingDisplayTRY,shippingPaymentTRY:null,taxesUSD:estimatedTaxes,fxRate:fx.rate,fxUpdatedAt:fx.updatedAt,fxProvider:fx.provider};
  updateShippingSummary({shippingAndHandlingUSD:shippingUSD,estimatedTaxes});
 }catch(error){
  if(request!==shippingCalculationRequest)return;
  console.error("VN shipping / USD-TRY estimate failed:",error);
  checkoutAmounts={...checkoutAmounts,shippingTRY:null,shippingUSD:null,shippingDisplayTRY:null,shippingPaymentTRY:null,taxesUSD:null,fxRate:null,fxUpdatedAt:null,fxProvider:null};
  updateShippingSummary({shippingAndHandlingUSD:null,estimatedTaxes:null,shippingLabel:"Unable to calculate"});
 }
};
const scheduleShippingCalculation=()=>{
 window.clearTimeout(shippingCalculationTimer);
 shippingCalculationTimer=window.setTimeout(calculateOrderSummary,350);
};
[cityInput,country].forEach(field=>{
 field.addEventListener("input",scheduleShippingCalculation);
 field.addEventListener("change",scheduleShippingCalculation);
});
window.requestAnimationFrame(scheduleShippingCalculation);

let suggestionRequest=0,activeSuggestion=-1,currentSuggestions=[],isApplyingSuggestion=false;
const hideAddressSuggestions=()=>{addressSuggestions.hidden=true;addressInput.setAttribute("aria-expanded","false");addressInput.removeAttribute("aria-activedescendant");activeSuggestion=-1};
const clearAddressSuggestions=()=>{suggestionRequest++;currentSuggestions=[];addressSuggestions.replaceChildren();hideAddressSuggestions()};
const geoapifyAddress=result=>result?.properties||result||{};
const addressSuggestionLabel=result=>{
 const p=geoapifyAddress(result);
 return p.formatted||p.address_line1||p.name||[p.street,p.housenumber].filter(Boolean).join(" ")||p.address_line2||"";
};
const renderAddressSuggestions=results=>{
 results=results.filter(result=>addressSuggestionLabel(result));
 currentSuggestions=results;addressSuggestions.replaceChildren();activeSuggestion=-1;
 results.forEach((result,index)=>{
  const button=document.createElement("button");button.type="button";button.className="vn-ac-address-suggestion";button.id="address-suggestion-"+index;
  button.setAttribute("role","option");button.setAttribute("aria-selected","false");
  const main=document.createElement("span");main.textContent=addressSuggestionLabel(result);button.appendChild(main);
  button.addEventListener("mousedown",event=>event.preventDefault());
  button.addEventListener("click",()=>fillAddressFromGeoapify(result));
  addressSuggestions.appendChild(button);
 });
 addressSuggestions.hidden=results.length===0;addressInput.setAttribute("aria-expanded",String(results.length>0));
};
const fillAddressFromGeoapify=result=>{
 const p=geoapifyAddress(result),isTurkey=country.value==="TR";
 const streetName=p.street||p.address_line1||p.name||"";
 const normalizedStreet=isTurkey?streetName.replace(/\bSokağı\b/gi,"Sokak"):streetName;
 const street=[normalizedStreet,p.housenumber].filter(Boolean).join(" ")||p.formatted||"";
 const provinceCandidates=[p.city,p.town,p.village,p.municipality,p.state].filter(Boolean);
 const matchedProvince=isTurkey?provinceCandidates.find(value=>turkishProvinces.has(normalizeShippingCity(value))):null;
 const city=isTurkey?(matchedProvince||p.city||p.town||p.village||p.municipality||p.state||""):(p.city||p.town||p.village||p.municipality||p.state||"");
 const district=isTurkey?(p.county||p.district||p.suburb||""):(p.state||p.county||"");
 window.clearTimeout(addressSearchTimer);
 clearAddressSuggestions();
 addressInput.value=street;
 cityInput.value=city;
 stateInput.value=district;
 postalInput.value=p.postcode||"";
 isApplyingSuggestion=true;
 [addressInput,cityInput,stateInput,postalInput].forEach(field=>{field.dispatchEvent(new Event("input",{bubbles:true}));field.dispatchEvent(new Event("change",{bubbles:true}))});
 isApplyingSuggestion=false;
 addressInput.blur();
};
const searchAddressSuggestions=async()=>{
 const query=addressInput.value.trim(),requestId=++suggestionRequest,region=country.value.toLowerCase(),key=String(window.VN_GEOAPIFY_API_KEY||"").trim();
 if(query.length<3||!region||!key){clearAddressSuggestions();return}
 try{
  const params=new URLSearchParams({text:query,apiKey:key,filter:"countrycode:"+region,format:"json",limit:"6"});
  const response=await fetch("https://api.geoapify.com/v1/geocode/autocomplete?"+params.toString(),{headers:{Accept:"application/json"}});
  if(!response.ok)throw new Error("Geoapify request failed: "+response.status);
  const data=await response.json();
  if(requestId!==suggestionRequest||region!==country.value.toLowerCase()||query!==addressInput.value.trim())return;
  if(!Array.isArray(data.results))throw new Error("Geoapify returned an unexpected response.");
  const results=data.results.filter(item=>{
   const resultCountry=String(geoapifyAddress(item).country_code||"").toLowerCase();
   return !resultCountry||resultCountry===region;
  });
  renderAddressSuggestions(results);
 }catch(error){if(requestId===suggestionRequest)hideAddressSuggestions();console.warn("VN address autocomplete unavailable; manual entry remains enabled.",error)}
};
let addressSearchTimer;
addressInput.addEventListener("input",()=>{if(isApplyingSuggestion)return;window.clearTimeout(addressSearchTimer);if(addressInput.value.trim().length<3){clearAddressSuggestions();return}addressSearchTimer=window.setTimeout(searchAddressSuggestions,350)});
addressInput.addEventListener("keydown",event=>{
 if(addressSuggestions.hidden)return;
 if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();activeSuggestion=(activeSuggestion+(event.key==="ArrowDown"?1:-1)+currentSuggestions.length)%currentSuggestions.length;[...addressSuggestions.children].forEach((node,index)=>node.setAttribute("aria-selected",String(index===activeSuggestion)));addressInput.setAttribute("aria-activedescendant","address-suggestion-"+activeSuggestion)}
 else if(event.key==="Enter"&&activeSuggestion>=0){event.preventDefault();addressSuggestions.children[activeSuggestion]?.click()}
 else if(event.key==="Escape")hideAddressSuggestions();
});
document.addEventListener("pointerdown",event=>{if(!event.target.closest(".vn-ac-autocomplete"))hideAddressSuggestions()});
const resetAddressAutocompleteForCountry=()=>{clearAddressSuggestions()};
country.addEventListener("change",()=>{if(phoneCountry.querySelector('option[value="'+country.value+'"]'))phoneCountry.value=country.value;updatePhone();if(country.value!=="TR")showCountry()});phoneCountry.addEventListener("change",updatePhone);country.addEventListener("change",resetAddressAutocompleteForCountry);
document.getElementById("country-understand").addEventListener("click",hideCountry);
countryDialog.addEventListener("click",e=>{if(e.target===countryDialog)hideCountry()});
const addressConfirmation=document.getElementById("address-confirmation"),addressConfirmationDetails=document.getElementById("address-confirmation-details"),shippingStep=document.getElementById("shipping-step"),paymentStep=document.getElementById("payment-step"),progressInformation=document.getElementById("progress-information"),progressShipping=document.getElementById("progress-shipping"),progressPayment=document.getElementById("progress-payment"),continueShipping=document.getElementById("continue-to-shipping");
const setProgressLocked=(link,locked)=>{link.classList.toggle("is-locked",locked);if(locked){link.setAttribute("aria-disabled","true");link.setAttribute("tabindex","-1")}else{link.removeAttribute("aria-disabled");link.removeAttribute("tabindex")}};
setProgressLocked(progressShipping,true);setProgressLocked(progressPayment,true);
let addressConfirmed=false;
const collectInformation=()=>{const data=Object.fromEntries(new FormData(form));data.updates=document.getElementById("updates").checked;try{sessionStorage.setItem("vn-checkout-information",JSON.stringify(data))}catch{}return data};
const addressLines=data=>[data.address,data.apartment,data.city,data.state,data.postal,country.selectedOptions[0]?.textContent||data.country].map(value=>String(value||"").trim()).filter(Boolean);
const renderAddressConfirmation=data=>{addressConfirmationDetails.textContent=addressLines(data).join("\n")};
const addBusinessDays=(date,count)=>{const result=new Date(date);let added=0;while(added<count){result.setDate(result.getDate()+1);if(result.getDay()!==0&&result.getDay()!==6)added++}return result};
const showShippingStep=async data=>{
 await calculateOrderSummary();
 if(!Number.isFinite(checkoutAmounts.shippingUSD)||!Number.isFinite(checkoutAmounts.fxRate)){
  alert("We couldn't calculate the USD shipping estimate with a verified exchange rate. Please check your address and try again.");
  return;
 }
 document.getElementById("shipping-contact-summary").textContent=data.email||"";
 document.getElementById("shipping-address-summary").textContent=[data.firstName,data.lastName].filter(Boolean).join(" ")+"\n"+addressLines(data).join("\n");
 const dispatchDate=addBusinessDays(new Date(),3);
 document.getElementById("shipping-dispatch-date").textContent="Ships by "+new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric",year:"numeric"}).format(dispatchDate);
 document.getElementById("shipping-method-price").textContent=formatTRY(checkoutAmounts.shippingDisplayTRY);
 form.hidden=true;shippingStep.hidden=false;addressConfirmation.hidden=true;document.body.classList.add("checkout-after-information");
 progressInformation.classList.remove("is-current");progressInformation.removeAttribute("aria-current");progressInformation.classList.add("is-complete");
 setProgressLocked(progressShipping,false);setProgressLocked(progressPayment,true);
 progressShipping.classList.add("is-current");progressShipping.setAttribute("aria-current","step");
 document.getElementById("shipping-payment-notice").hidden=true;paymentStep.hidden=true;
 window.scrollTo({top:0,behavior:"smooth"});
};
const returnToInformation=()=>{restoreShippingCurrencySummary();shippingStep.hidden=true;paymentStep.hidden=true;form.hidden=false;document.body.classList.remove("checkout-after-information");progressShipping.classList.remove("is-current","is-complete");progressShipping.removeAttribute("aria-current");setProgressLocked(progressShipping,true);progressPayment.classList.remove("is-current","is-complete");progressPayment.removeAttribute("aria-current");setProgressLocked(progressPayment,true);progressInformation.classList.remove("is-complete");progressInformation.classList.add("is-current");progressInformation.setAttribute("aria-current","step");window.scrollTo({top:0,behavior:"smooth"})};
form.addEventListener("input",()=>{if(!addressConfirmation.hidden){addressConfirmation.hidden=true;addressConfirmed=false}});
form.addEventListener("change",()=>{if(!addressConfirmation.hidden){addressConfirmation.hidden=true;addressConfirmed=false}});
form.addEventListener("submit",e=>{e.preventDefault();if(!form.reportValidity())return;if(country.value!=="TR"){showCountry();return}if(!validEmail(document.getElementById("email").value)){document.getElementById("email").focus();return}const data=collectInformation();if(!addressConfirmed){renderAddressConfirmation(data);addressConfirmation.hidden=false;addressConfirmed=true;addressConfirmation.scrollIntoView({behavior:"smooth",block:"nearest"});return}showShippingStep(data)});
document.querySelectorAll("[data-return-information]").forEach(button=>button.addEventListener("click",returnToInformation));
document.getElementById("return-to-information").addEventListener("click",returnToInformation);

const FX_CACHE_KEY="vn-shop-usd-try-reference-rate";
const isFreshFxRate=value=>{
 const updatedAt=Number(value?.updatedAt);
 return Number.isFinite(Number(value?.rate))&&Number(value.rate)>0&&Number.isFinite(updatedAt)&&updatedAt<=Date.now()+5*60*1000&&Date.now()-updatedAt<=48*60*60*1000;
};
let fxRatePromise=null;
const getUsdTryRate=async()=>{
 if(fxRatePromise)return fxRatePromise;
 fxRatePromise=(async()=>{
  let cached=null;
  try{cached=JSON.parse(sessionStorage.getItem(FX_CACHE_KEY)||"null")}catch{}
  if(isFreshFxRate(cached)&&Date.now()-Number(cached.updatedAt)<20*60*60*1000)return cached;
  const fetchJson=async url=>{
   const controller=new AbortController();
   const timeout=window.setTimeout(()=>controller.abort(),10000);
   try{
    const response=await fetch(url,{cache:"no-store",signal:controller.signal,headers:{Accept:"application/json"}});
    if(!response.ok)throw new Error("Exchange-rate service returned HTTP "+response.status);
    return await response.json();
   }finally{window.clearTimeout(timeout)}
  };
  try{
   const data=await fetchJson("https://open.er-api.com/v6/latest/USD");
   const updatedAt=Number(data.time_last_update_unix)*1000;
   const rate=Number(data.rates?.TRY??data.conversion_rates?.TRY);
   const result={rate,updatedAt,updatedAtUTC:data.time_last_update_utc||"",provider:"ExchangeRate-API"};
   if(data.result!=="success"||data.base_code!=="USD"||!isFreshFxRate(result))throw new Error("ExchangeRate-API returned an invalid USD/TRY rate.");
   try{sessionStorage.setItem(FX_CACHE_KEY,JSON.stringify(result))}catch{}
   return result;
  }catch(primaryError){
   try{
    const data=await fetchJson("https://api.frankfurter.dev/v2/rate/usd/try");
    const rate=Number(data.rate);
    const updatedAt=Date.parse(String(data.date||"")+"T12:00:00Z");
    const result={rate,updatedAt,updatedAtUTC:data.date||"",provider:"Frankfurter"};
    if(!isFreshFxRate(result)||String(data.base||"").toUpperCase()!=="USD"||String(data.quote||"").toUpperCase()!=="TRY")throw new Error("Frankfurter returned an invalid USD/TRY rate.");
    try{sessionStorage.setItem(FX_CACHE_KEY,JSON.stringify(result))}catch{}
    return result;
   }catch(fallbackError){
    if(isFreshFxRate(cached))return cached;
    throw new Error("USD/TRY rate unavailable from primary and fallback services.",{cause:fallbackError||primaryError});
   }
  }
 })().finally(()=>{fxRatePromise=null});
 return fxRatePromise;
};
const restoreShippingCurrencySummary=()=>{
 document.getElementById("subtotal").textContent=money(checkoutAmounts.subtotalUSD);
 document.getElementById("shipping-estimate").textContent=checkoutAmounts.shippingUSD===null?"Calculated at next step":money(checkoutAmounts.shippingUSD);
 document.getElementById("shipping-method-price").textContent=Number.isFinite(checkoutAmounts.shippingDisplayTRY)?formatTRY(checkoutAmounts.shippingDisplayTRY):"Manual quote required";
 const taxRow=document.getElementById("estimated-taxes-row");
 taxRow.hidden=checkoutAmounts.taxesUSD===null;
 if(checkoutAmounts.taxesUSD!==null)document.getElementById("estimated-taxes").textContent=money(checkoutAmounts.taxesUSD);
 document.getElementById("total").textContent=money(checkoutAmounts.subtotalUSD+(checkoutAmounts.shippingUSD||0)+(checkoutAmounts.taxesUSD||0));
 document.querySelector(".total-currency-code").textContent="USD";
 const currencyHelpToggle=document.getElementById("currency-help-toggle");
 if(currencyHelpToggle.lastChild)currencyHelpToggle.lastChild.textContent="WHY USD?";
 document.getElementById("fx-attribution").hidden=true;
};
const showPaymentStep=async()=>{
 const selectedShipping=document.querySelector('input[name="shipping-method"]:checked');
 const notice=document.getElementById("shipping-payment-notice");
 if(!selectedShipping){notice.textContent="Please select a shipping method to continue.";notice.hidden=false;return}
 if(!Number.isFinite(checkoutAmounts.shippingUSD)||!Number.isFinite(checkoutAmounts.fxRate)||!Number.isFinite(checkoutAmounts.taxesUSD)||!Number.isFinite(checkoutAmounts.subtotalUSD)){
  notice.textContent="The order totals are not ready yet. Please check the shipping estimate and try again.";notice.hidden=false;return;
 }
 const continueButton=document.getElementById("continue-to-payment");
 if(continueButton.disabled)return;
 continueButton.disabled=true;
 continueButton.textContent="Checking exchange rate…";
 try{
  const fx={rate:checkoutAmounts.fxRate,updatedAt:checkoutAmounts.fxUpdatedAt,provider:checkoutAmounts.fxProvider};
  const subtotalTRY=roundCurrency(checkoutAmounts.subtotalUSD*fx.rate);
  const shippingTRY=roundCurrency(checkoutAmounts.shippingUSD*fx.rate);
  const taxesTRY=roundCurrency(checkoutAmounts.taxesUSD*fx.rate);
  const totalTRY=roundCurrency(subtotalTRY+shippingTRY+taxesTRY);
  checkoutAmounts={...checkoutAmounts,shippingPaymentTRY:shippingTRY,subtotalTRY,taxesTRY,totalTRY};
  const contact=document.getElementById("shipping-contact-summary").textContent;
  const address=document.getElementById("shipping-address-summary").textContent;
  document.getElementById("payment-contact-summary").textContent=contact;
  document.getElementById("payment-address-summary").textContent=address;
  document.getElementById("payment-shipping-price").textContent=formatTRY(shippingTRY);
  document.getElementById("subtotal").textContent=formatTRY(subtotalTRY);
  document.getElementById("shipping-estimate").textContent=formatTRY(shippingTRY);
  document.getElementById("estimated-taxes").textContent=formatTRY(taxesTRY);
  document.getElementById("estimated-taxes-row").hidden=false;
  document.getElementById("total").textContent=formatTRY(totalTRY);
  document.querySelector(".total-currency-code").textContent="TRY";
  const currencyHelpToggle=document.getElementById("currency-help-toggle");
  if(currencyHelpToggle.lastChild)currencyHelpToggle.lastChild.textContent="WHY TRY?";
  const updated=new Date(fx.updatedAt);
  document.getElementById("fx-updated-at").textContent=new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Istanbul"}).format(updated)+" (Türkiye time)";
  const providerLink=document.getElementById("fx-provider-link");
  if(fx.provider==="Frankfurter"){providerLink.href="https://frankfurter.dev/";providerLink.textContent="Frankfurter"}
  else{providerLink.href="https://www.exchangerate-api.com";providerLink.textContent="Rates By Exchange Rate API"}
  document.getElementById("fx-attribution").hidden=false;
  shippingStep.hidden=true;paymentStep.hidden=false;document.body.classList.add("checkout-after-information");
  progressShipping.classList.remove("is-current");progressShipping.removeAttribute("aria-current");progressShipping.classList.add("is-complete");
  setProgressLocked(progressShipping,false);setProgressLocked(progressPayment,true);
  progressPayment.classList.add("is-current");progressPayment.setAttribute("aria-current","step");
  notice.hidden=true;
  window.scrollTo({top:0,behavior:"smooth"});
 }catch(error){
  console.error("VN SHOP USD/TRY conversion failed:",error);
  notice.textContent="We couldn't verify the current USD/TRY reference rate. Please try again in a moment.";
  notice.hidden=false;
 }finally{
  continueButton.disabled=false;
  continueButton.textContent="Continue to payment";
 }
};
const returnToShipping=()=>{restoreShippingCurrencySummary();paymentStep.hidden=true;shippingStep.hidden=false;document.body.classList.add("checkout-after-information");progressPayment.classList.remove("is-current","is-complete");progressPayment.removeAttribute("aria-current");setProgressLocked(progressPayment,true);progressShipping.classList.remove("is-complete");progressShipping.classList.add("is-current");progressShipping.setAttribute("aria-current","step");window.scrollTo({top:0,behavior:"smooth"})};
document.getElementById("continue-to-payment").addEventListener("click",showPaymentStep);
progressInformation.addEventListener("click",event=>{event.preventDefault();if(!form.hidden)return;returnToInformation()});
progressShipping.addEventListener("click",event=>{event.preventDefault();if(paymentStep.hidden||progressShipping.classList.contains("is-locked"))return;returnToShipping()});
progressPayment.addEventListener("click",event=>event.preventDefault());

document.getElementById("return-to-shipping").addEventListener("click",returnToShipping);
document.getElementById("change-shipping").addEventListener("click",returnToShipping);
const paymentOptions=[...document.querySelectorAll("[data-payment-option]")];
const paymentCardFields=document.getElementById("payment-card-fields");
const syncPaymentMethod=()=>{
 const selected=document.querySelector('input[name="payment-method"]:checked')?.value||"card";
 paymentOptions.forEach(option=>{const active=option.dataset.paymentOption===selected;option.classList.toggle("is-selected",active);const note=option.querySelector(".payment-method-note");if(note)note.hidden=!active});
 paymentCardFields.hidden=selected!=="card";
};
document.querySelectorAll('input[name="payment-method"]').forEach(input=>input.addEventListener("change",syncPaymentMethod));

const paymentCardNumber=document.getElementById("payment-card-number");
const acceptedCardBrands=document.getElementById("accepted-card-brands");
acceptedCardBrands.addEventListener("click",event=>{
 event.preventDefault();
 event.stopPropagation();
});
const detectPaymentCardBrand=value=>{
 const digits=value.replace(/\\D/g,"");
 if(!digits)return null;
 const starts=(prefix)=>digits.startsWith(prefix);
 const inRange=(prefix,length,min,max)=>{
  if(digits.length<length)return false;
  const n=Number(digits.slice(0,length));return n>=min&&n<=max;
 };
 if(starts("4"))return "visa";
 if(starts("34")||starts("37"))return "amex";
 if(starts("6011")||starts("65")||inRange("644",3,644,649)||inRange("622",6,622126,622925))return "discover";
 if(["401178","401179","431274","438935","451416","457393","504175","5067","509","627780","636297","636368","650","6516","6550"].some(prefix=>digits.startsWith(prefix)))return "elo";
 if(inRange("3528",4,3528,3589))return "jcb";
 if(starts("62"))return "unionpay";
 if(inRange("51",2,51,55)||inRange("2221",4,2221,2720))return "mastercard";
 return null;
};
paymentCardNumber.addEventListener("input",()=>{
 const brand=detectPaymentCardBrand(paymentCardNumber.value);
 acceptedCardBrands.querySelectorAll("[data-card-brand]").forEach(mark=>{
  mark.hidden=Boolean(brand)&&mark.dataset.cardBrand!==brand;
 });
 acceptedCardBrands.classList.toggle("has-detected-brand",Boolean(brand));
 acceptedCardBrands.classList.toggle("detected-extra-brand",Boolean(brand)&&["discover","elo","unionpay","jcb"].includes(brand));
});

syncPaymentMethod();
document.querySelectorAll('input[name="billing-address-choice"]').forEach(input=>input.addEventListener("change",()=>{document.getElementById("billing-fields").hidden=input.value!=="different"||!input.checked}));
document.getElementById("billing-country").innerHTML=country.innerHTML;
document.getElementById("billing-country").value=country.value;
/* Billing address autocomplete mirrors the Information address suggestions. */
const billingCountry=document.getElementById("billing-country");
const billingAddress=document.getElementById("billing-address");
const billingSuggestions=document.getElementById("billing-address-suggestions");
const billingCity=document.getElementById("billing-city"),billingState=document.getElementById("billing-state"),billingPostal=document.getElementById("billing-postal");
let billingSuggestionRequest=0,billingSearchTimer,billingCurrentSuggestions=[];
const hideBillingSuggestions=()=>{billingSuggestions.hidden=true;billingAddress.setAttribute("aria-expanded","false");billingAddress.removeAttribute("aria-activedescendant")};
const clearBillingSuggestions=()=>{billingSuggestionRequest++;billingCurrentSuggestions=[];billingSuggestions.replaceChildren();hideBillingSuggestions()};
const renderBillingSuggestions=results=>{
 billingCurrentSuggestions=results;billingSuggestions.replaceChildren();
 results.forEach((result,index)=>{
  const button=document.createElement("button");button.type="button";button.className="vn-ac-address-suggestion";button.id="billing-address-suggestion-"+index;button.setAttribute("role","option");button.setAttribute("aria-selected","false");
  const label=document.createElement("span");label.textContent=addressSuggestionLabel(result);button.appendChild(label);
  button.addEventListener("mousedown",event=>event.preventDefault());
  button.addEventListener("click",()=>{
   const p=geoapifyAddress(result),isTurkey=billingCountry.value==="TR",streetName=p.street||p.address_line1||p.name||"";
   const normalizedStreet=isTurkey?streetName.replace(/\\bSokağı\\b/gi,"Sokak"):streetName;
   billingAddress.value=[normalizedStreet,p.housenumber].filter(Boolean).join(" ")||p.formatted||"";
   billingCity.value=isTurkey?(p.city||p.town||p.village||p.municipality||p.state||""):(p.city||p.town||p.village||p.municipality||p.state||"");
   billingState.value=isTurkey?(p.county||p.district||p.suburb||""):(p.state||p.county||"");
   billingPostal.value=p.postcode||"";
   [billingAddress,billingCity,billingState,billingPostal].forEach(field=>{field.dispatchEvent(new Event("input",{bubbles:true}));field.dispatchEvent(new Event("change",{bubbles:true}))});
   clearBillingSuggestions();billingAddress.blur();
  });
  billingSuggestions.appendChild(button);
 });
 billingSuggestions.hidden=results.length===0;billingAddress.setAttribute("aria-expanded",String(results.length>0));
};
const searchBillingSuggestions=async()=>{
 const query=billingAddress.value.trim(),requestId=++billingSuggestionRequest,region=billingCountry.value.toLowerCase(),key=String(window.VN_GEOAPIFY_API_KEY||"").trim();
 if(query.length<3||!region||!key){clearBillingSuggestions();return}
 try{
  const params=new URLSearchParams({text:query,apiKey:key,filter:"countrycode:"+region,format:"json",limit:"6"});
  const response=await fetch("https://api.geoapify.com/v1/geocode/autocomplete?"+params.toString(),{headers:{Accept:"application/json"}});
  if(!response.ok)throw new Error("Geoapify request failed: "+response.status);
  const data=await response.json();
  if(requestId!==billingSuggestionRequest||region!==billingCountry.value.toLowerCase()||query!==billingAddress.value.trim())return;
  renderBillingSuggestions((data.results||[]).filter(item=>{const code=String(geoapifyAddress(item).country_code||"").toLowerCase();return !code||code===region}));
 }catch(error){if(requestId===billingSuggestionRequest)hideBillingSuggestions();console.warn("VN billing autocomplete unavailable; manual entry remains enabled.",error)}
};
billingAddress.addEventListener("input",()=>{window.clearTimeout(billingSearchTimer);if(billingAddress.value.trim().length<3){clearBillingSuggestions();return}billingSearchTimer=window.setTimeout(searchBillingSuggestions,350)});
billingAddress.addEventListener("keydown",event=>{
 if(billingSuggestions.hidden)return;
 if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();const index=Number(billingAddress.getAttribute("aria-activedescendant")?.split("-").pop()||-1);const next=(index+(event.key==="ArrowDown"?1:-1)+billingCurrentSuggestions.length)%billingCurrentSuggestions.length;[...billingSuggestions.children].forEach((node,i)=>node.setAttribute("aria-selected",String(i===next)));billingAddress.setAttribute("aria-activedescendant","billing-address-suggestion-"+next)}
 else if(event.key==="Enter"){const index=Number(billingAddress.getAttribute("aria-activedescendant")?.split("-").pop()||-1);if(index>=0){event.preventDefault();billingSuggestions.children[index]?.click()}}
 else if(event.key==="Escape")hideBillingSuggestions();
});
billingCountry.addEventListener("change",clearBillingSuggestions);
document.addEventListener("pointerdown",event=>{if(!event.target.closest(".billing-autocomplete"))hideBillingSuggestions()});
const saveChoiceButton=document.getElementById("not-now");
let shopSaveOptOut=false;
saveChoiceButton.addEventListener("click",()=>{
 shopSaveOptOut=!shopSaveOptOut;
 saveChoiceButton.textContent=shopSaveOptOut?"SAVE":"NOT NOW";
 saveChoiceButton.setAttribute("aria-pressed",String(shopSaveOptOut));
});
document.getElementById("pay-now").addEventListener("click",async()=>{
 const button=document.getElementById("pay-now");
 if(button.disabled)return;
 button.disabled=true;
 const originalLabel=button.textContent;
 button.textContent="Submitting order…";
 try{
  const isAdminOrder=await (window.VN_CHECKOUT_ADMIN_CHECK||Promise.resolve(false));
  const information=collectInformation();
  const readCart=(storage,key)=>{try{const value=JSON.parse(storage.getItem(key)||"[]");return Array.isArray(value)?value:[]}catch{return[]}};
  const orderCart=readCart(sessionStorage,"vn-shop-checkout-cart");
  const fallbackCart=readCart(localStorage,"vn-shop-cart");
  const items=orderCart.length?orderCart:fallbackCart;
  if(!items.length)throw new Error("Your cart is empty. Return to the shop and add a product before placing an order.");
  if(!validEmail(information.email||""))throw new Error("Enter a valid email address before placing your order.");
  if(information.country!=="TR")throw new Error("Checkout is currently available for Türkiye only.");
  const cartSubtotalUSD=items.reduce((sum,line)=>{const product=line.product||line;const price=Number(String(product.price??line.price??0).replace(/[^0-9.-]/g,""))||0;return sum+price*Math.max(1,Number(line.quantity||line.qty||1))},0);
  if(Math.abs(cartSubtotalUSD-checkoutAmounts.subtotalUSD)>0.01)throw new Error("Your cart changed after the totals were calculated. Return to shipping and refresh the estimate.");
  if(!Number.isFinite(checkoutAmounts.fxRate)||!Number.isFinite(checkoutAmounts.subtotalTRY)||!Number.isFinite(checkoutAmounts.shippingTRY)||!Number.isFinite(checkoutAmounts.shippingPaymentTRY)||!Number.isFinite(checkoutAmounts.taxesTRY)||!Number.isFinite(checkoutAmounts.totalTRY))throw new Error("The verified TRY order total is unavailable. Return to shipping and refresh the estimate.");
  const selectedShipping=document.querySelector('input[name="shipping-method"]:checked');
  const selectedPayment=document.querySelector('input[name="payment-method"]:checked');
  if(!selectedShipping)throw new Error("Select a shipping method before placing your order.");
  const paymentLabels={card:"Credit card",apple:"Apple Pay",paypal:"PayPal",later:"Pay over time"};
  const customer={firstName:information.firstName||"",lastName:information.lastName||"",email:information.email||"",phone:[information.phoneCountry,information.phone].filter(Boolean).join(" "),address:[information.address,information.apartment,information.city,information.state,information.postal,information.country].filter(Boolean).join(", ")};
  const payload={customer,items,subtotal:checkoutAmounts.subtotalTRY,shipping:checkoutAmounts.shippingPaymentTRY,taxes:checkoutAmounts.taxesTRY,total:checkoutAmounts.totalTRY,currency:"TRY",countryCode:"TR",originalSubtotalUSD:checkoutAmounts.subtotalUSD,originalShippingUSD:checkoutAmounts.shippingUSD,originalTaxesUSD:checkoutAmounts.taxesUSD,exchangeRateProvider:checkoutAmounts.fxProvider,exchangeRateTRYPerUSD:checkoutAmounts.fxRate,exchangeRateUpdatedAt:new Date(checkoutAmounts.fxUpdatedAt).toISOString(),shippingMethod:selectedShipping.value==="standard"?"Standard Shipping":selectedShipping.value,paymentMethod:paymentLabels[selectedPayment?.value]||"Credit card",paymentStatus:isAdminOrder?"Not Required":"Pending",paymentStatusLabel:isAdminOrder?"Payment not required":"Payment pending",status:"received",...(isAdminOrder?{isAdminOrder:true,adminOrder:true,adminExempt:true,adminPaymentExempt:true,adminStockExempt:true}:{isAdminOrder:false,adminExempt:false,adminPaymentExempt:false,adminStockExempt:false})};
  let idempotencyKey=sessionStorage.getItem("vn-shop-order-idempotency-key");
  if(!idempotencyKey){idempotencyKey=crypto.randomUUID();sessionStorage.setItem("vn-shop-order-idempotency-key",idempotencyKey)}
  const token=sessionStorage.getItem("vn_account_session")||"";
  const endpoint=isAdminOrder?"/api/operations/admin-orders":"/api/orders";
  const headers={"Content-Type":"application/json","Idempotency-Key":idempotencyKey};
  if(token)headers.Authorization="Bearer "+token;
  const response=await fetch("https://vn-shop-account-api.9ojeez9.workers.dev"+endpoint,{method:"POST",cache:"no-store",headers,body:JSON.stringify(payload)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||"The order could not be recorded ("+response.status+").");
  const order=result.order||result.admin_order||result;
  if(!order||!(order.id||order.order_id||order.orderNumber||order.order_number))throw new Error("The order service did not return a confirmed order reference. Please contact support before retrying.");
  const receiptRecord={...payload,...order,customer:order.customer||customer,items:Array.isArray(order.items)?order.items:items,isAdminOrder,adminOrder:isAdminOrder,createdAt:order.createdAt||order.created_at||new Date().toISOString(),paymentStatus:order.paymentStatus||order.payment_status||payload.paymentStatus};
  sessionStorage.setItem("vn-shop-order-complete",JSON.stringify(receiptRecord));
  sessionStorage.setItem("vn-shop-checkout-cart",JSON.stringify(items));
  sessionStorage.setItem("vn-checkout-information",JSON.stringify(information));
  sessionStorage.removeItem("vn-shop-order-idempotency-key");
  window.location.href="order-complete.html";
 }catch(error){
  console.error("VN SHOP order submission failed:",error);
  alert(error.message||"Your order could not be submitted. Please try again.");
 }finally{
  button.disabled=false;
  button.textContent=originalLabel;
 }
});
document.getElementById("discount").addEventListener("submit",e=>{e.preventDefault();document.getElementById("discountmsg").textContent="Discount codes are not available yet."});
const currencyHelpToggle=document.getElementById("currency-help-toggle"),currencyHelpMessage=document.getElementById("currency-help-message");
currencyHelpToggle.addEventListener("click",()=>{const expanded=currencyHelpToggle.getAttribute("aria-expanded")==="true";currencyHelpToggle.setAttribute("aria-expanded",String(!expanded));currencyHelpMessage.hidden=expanded});
document.getElementById("policies").addEventListener("click",()=>policy("refund"));document.getElementById("shipping").addEventListener("click",()=>policy("shipping"));document.getElementById("close").addEventListener("click",close);
policySelect.addEventListener("click",()=>{const open=policyOptions.hidden;policyOptions.hidden=!open;policySelect.setAttribute("aria-expanded",String(open))});
policyOptions.addEventListener("click",e=>{const button=e.target.closest("[data-p]");if(!button)return;policy(button.dataset.p);policyOptions.hidden=true;policySelect.setAttribute("aria-expanded","false")});
policyDialog.addEventListener("click",e=>{if(e.target===policyDialog)close()});
document.addEventListener("click",e=>{if(!e.target.closest(".policy-picker")&&!policyOptions.hidden){policyOptions.hidden=true;policySelect.setAttribute("aria-expanded","false")}});
document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(!countryDialog.hidden)hideCountry();else if(!policyDialog.hidden)close()});
document.getElementById("cookies").addEventListener("click",()=>{location.href="merch.html#cookie-choices"});
const email=document.getElementById("email");try{const savedEmail=localStorage.getItem("vn-account-email");if(savedEmail&&!email.value)email.value=savedEmail}catch{}
const items=document.getElementById("items"),hint=document.getElementById("scrollhint"),updateHint=()=>{const maxScroll=items.scrollHeight-items.clientHeight,overflow=maxScroll>2,remaining=maxScroll-items.scrollTop,fadeStart=72;hint.hidden=!overflow;hint.classList.toggle("is-fading",!overflow||remaining<=0);hint.style.opacity=overflow?String(Math.max(0,Math.min(1,remaining/fadeStart))):"0"};items.addEventListener("scroll",updateHint,{passive:true});window.addEventListener("resize",updateHint);requestAnimationFrame(updateHint);
