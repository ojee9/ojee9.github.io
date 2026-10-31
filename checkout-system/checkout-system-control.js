import{cart,money}from"./checkout-data.js";import{state}from"./checkout-state.js";import{validEmail}from"./checkout-engine.js";import{render,updateShippingSummary,policy,close}from"./checkout-view.js";import{calculateCheckout}from"./shipping-calculator.js";
state.cart=cart();render(state.cart);
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
let shippingCalculationTimer;
const calculateOrderSummary=()=>{
 const city=normalizeShippingCity(cityInput.value);
 if(country.value!=="TR"||!turkishProvinces.has(city)){
  updateShippingSummary({shippingAndHandling:null,estimatedTaxes:null});
  return;
 }
 if(!state.cart.length){
  updateShippingSummary({shippingAndHandling:null,estimatedTaxes:null,shippingLabel:"Unavailable"});
  return;
 }
 const destinationType=city==="ankara"?"intracity":"intercity";
 try{
  const result=calculateCheckout(prepareShippingCart(state.cart),{destinationType});
  const estimatedTaxes=Number.isFinite(Number(result.estimatedTaxes?.amount))?Number(result.estimatedTaxes.amount):null;
  const shippingAndHandling=Number.isFinite(Number(result.shipping?.amount))&&Number.isFinite(Number(result.handling?.amount))
   ?Number(result.shipping.amount)+Number(result.handling.amount):null;
  updateShippingSummary({
   shippingAndHandling,
   estimatedTaxes,
   shippingLabel:shippingAndHandling===null?"Manual quote required":undefined
  });
 }catch(error){
  console.error("VN shipping calculation failed:",error);
  updateShippingSummary({shippingAndHandling:null,estimatedTaxes:null,shippingLabel:"Unable to calculate"});
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
form.addEventListener("submit",e=>{e.preventDefault();if(!form.reportValidity())return;if(country.value!=="TR"){showCountry();return}if(!validEmail(document.getElementById("email").value)){document.getElementById("email").focus();return}const data=Object.fromEntries(new FormData(form));data.updates=document.getElementById("updates").checked;try{sessionStorage.setItem("vn-checkout-information",JSON.stringify(data))}catch{}document.getElementById("discountmsg").textContent="Your shipping details are saved for the next step. Shipping rates and online payment are not connected yet."});
document.getElementById("discount").addEventListener("submit",e=>{e.preventDefault();document.getElementById("discountmsg").textContent="Discount codes are not available yet."});
document.getElementById("policies").addEventListener("click",()=>policy("refund"));document.getElementById("shipping").addEventListener("click",()=>policy("shipping"));document.getElementById("close").addEventListener("click",close);
policySelect.addEventListener("click",()=>{const open=policyOptions.hidden;policyOptions.hidden=!open;policySelect.setAttribute("aria-expanded",String(open))});
policyOptions.addEventListener("click",e=>{const button=e.target.closest("[data-p]");if(!button)return;policy(button.dataset.p);policyOptions.hidden=true;policySelect.setAttribute("aria-expanded","false")});
policyDialog.addEventListener("click",e=>{if(e.target===policyDialog)close()});
document.addEventListener("click",e=>{if(!e.target.closest(".policy-picker")&&!policyOptions.hidden){policyOptions.hidden=true;policySelect.setAttribute("aria-expanded","false")}});
document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(!countryDialog.hidden)hideCountry();else if(!policyDialog.hidden)close()});
document.getElementById("cookies").addEventListener("click",()=>{location.href="merch.html#cookie-choices"});
const email=document.getElementById("email");try{const savedEmail=localStorage.getItem("vn-account-email");if(savedEmail&&!email.value)email.value=savedEmail}catch{}
const items=document.getElementById("items"),hint=document.getElementById("scrollhint"),updateHint=()=>{const maxScroll=items.scrollHeight-items.clientHeight,overflow=maxScroll>2,remaining=maxScroll-items.scrollTop,fadeStart=72;hint.hidden=!overflow;hint.classList.toggle("is-fading",!overflow||remaining<=0);hint.style.opacity=overflow?String(Math.max(0,Math.min(1,remaining/fadeStart))):"0"};items.addEventListener("scroll",updateHint,{passive:true});window.addEventListener("resize",updateHint);requestAnimationFrame(updateHint);
