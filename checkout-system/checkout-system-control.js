import{cart,money}from"./checkout-data.js";import{state}from"./checkout-state.js";import{validEmail}from"./checkout-engine.js";import{render,updateShippingSummary,policy,close}from"./checkout-view.js";import{calculateCheckout}from"./shipping-calculator.js";
state.cart=cart();render(state.cart);
const paymentTestMode=new URLSearchParams(window.location.search).get("payment-test")==="1";
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
const calculateOrderSummary=()=>{
 const city=normalizeShippingCity(cityInput.value);
 const province=resolveTurkishProvince(cityInput.value,stateInput.value);
 if(country.value!=="TR"||!city){
  updateShippingSummary({shippingAndHandling:null,estimatedTaxes:null});
  return;
 }
 if(!state.cart.length){
  updateShippingSummary({shippingAndHandling:null,estimatedTaxes:null,shippingLabel:"Unavailable"});
  return;
 }
 // City is sufficient to estimate. Resolve province from City or State when available;
 // district-only/manual City entries still receive the intercity estimate.
 const destinationType=province==="ankara"?"intracity":"intercity";
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
const addressConfirmation=document.getElementById("address-confirmation"),addressConfirmationDetails=document.getElementById("address-confirmation-details"),shippingStep=document.getElementById("shipping-step"),paymentStep=document.getElementById("payment-step"),progressInformation=document.getElementById("progress-information"),progressShipping=document.getElementById("progress-shipping"),progressPayment=document.getElementById("progress-payment"),continueShipping=document.getElementById("continue-to-shipping");
const setProgressLocked=(link,locked)=>{link.classList.toggle("is-locked",locked);if(locked){link.setAttribute("aria-disabled","true");link.setAttribute("tabindex","-1")}else{link.removeAttribute("aria-disabled");link.removeAttribute("tabindex")}};
setProgressLocked(progressShipping,true);setProgressLocked(progressPayment,true);
let addressConfirmed=false;
const collectInformation=()=>{const data=Object.fromEntries(new FormData(form));data.updates=document.getElementById("updates").checked;try{sessionStorage.setItem("vn-checkout-information",JSON.stringify(data))}catch{}return data};
const addressLines=data=>[data.address,data.apartment,data.city,data.state,data.postal,country.selectedOptions[0]?.textContent||data.country].map(value=>String(value||"").trim()).filter(Boolean);
const renderAddressConfirmation=data=>{addressConfirmationDetails.textContent=addressLines(data).join("\n")};
const addBusinessDays=(date,count)=>{const result=new Date(date);let added=0;while(added<count){result.setDate(result.getDate()+1);if(result.getDay()!==0&&result.getDay()!==6)added++}return result};
const showShippingStep=data=>{
 document.getElementById("shipping-contact-summary").textContent=data.email||"";
 document.getElementById("shipping-address-summary").textContent=[data.firstName,data.lastName].filter(Boolean).join(" ")+"\n"+addressLines(data).join("\n");
 const dispatchDate=addBusinessDays(new Date(),3);
 document.getElementById("shipping-dispatch-date").textContent="Ships by "+new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric",year:"numeric"}).format(dispatchDate);
 const estimate=document.getElementById("shipping-estimate").textContent.trim();
 document.getElementById("shipping-method-price").textContent=estimate;
 form.hidden=true;shippingStep.hidden=false;addressConfirmation.hidden=true;document.body.classList.add("checkout-after-information");
 progressInformation.classList.remove("is-current");progressInformation.removeAttribute("aria-current");progressInformation.classList.add("is-complete");
 setProgressLocked(progressShipping,false);setProgressLocked(progressPayment,true);
 progressShipping.classList.add("is-current");progressShipping.setAttribute("aria-current","step");
 document.getElementById("shipping-payment-notice").hidden=true;paymentStep.hidden=true;
 window.scrollTo({top:0,behavior:"smooth"});
};
const returnToInformation=()=>{shippingStep.hidden=true;paymentStep.hidden=true;form.hidden=false;document.body.classList.remove("checkout-after-information");progressShipping.classList.remove("is-current","is-complete");progressShipping.removeAttribute("aria-current");setProgressLocked(progressShipping,true);progressPayment.classList.remove("is-current","is-complete");progressPayment.removeAttribute("aria-current");setProgressLocked(progressPayment,true);progressInformation.classList.remove("is-complete");progressInformation.classList.add("is-current");progressInformation.setAttribute("aria-current","step");window.scrollTo({top:0,behavior:"smooth"})};
form.addEventListener("input",()=>{if(!addressConfirmation.hidden){addressConfirmation.hidden=true;addressConfirmed=false}});
form.addEventListener("change",()=>{if(!addressConfirmation.hidden){addressConfirmation.hidden=true;addressConfirmed=false}});
form.addEventListener("submit",e=>{e.preventDefault();if(!form.reportValidity())return;if(country.value!=="TR"){showCountry();return}if(!validEmail(document.getElementById("email").value)){document.getElementById("email").focus();return}const data=collectInformation();if(!addressConfirmed){renderAddressConfirmation(data);addressConfirmation.hidden=false;addressConfirmed=true;addressConfirmation.scrollIntoView({behavior:"smooth",block:"nearest"});return}showShippingStep(data)});
document.querySelectorAll("[data-return-information]").forEach(button=>button.addEventListener("click",returnToInformation));
document.getElementById("return-to-information").addEventListener("click",returnToInformation);

const showPaymentStep=()=>{
 const selectedShipping=document.querySelector('input[name="shipping-method"]:checked');
 if(!selectedShipping){document.getElementById("shipping-payment-notice").textContent="Please select a shipping method to continue.";document.getElementById("shipping-payment-notice").hidden=false;return}
 const contact=document.getElementById("shipping-contact-summary").textContent;
 const address=document.getElementById("shipping-address-summary").textContent;
 document.getElementById("payment-contact-summary").textContent=contact;
 document.getElementById("payment-address-summary").textContent=address;
 document.getElementById("payment-shipping-price").textContent=document.getElementById("shipping-method-price").textContent;
 shippingStep.hidden=true;paymentStep.hidden=false;document.body.classList.add("checkout-after-information");
 progressShipping.classList.remove("is-current");progressShipping.removeAttribute("aria-current");progressShipping.classList.add("is-complete");
 setProgressLocked(progressShipping,false);setProgressLocked(progressPayment,true);
 progressPayment.classList.add("is-current");progressPayment.setAttribute("aria-current","step");
 document.getElementById("shipping-payment-notice").hidden=true;
 window.scrollTo({top:0,behavior:"smooth"});
};
const returnToShipping=()=>{paymentStep.hidden=true;shippingStep.hidden=false;document.body.classList.add("checkout-after-information");progressPayment.classList.remove("is-current","is-complete");progressPayment.removeAttribute("aria-current");setProgressLocked(progressPayment,true);progressShipping.classList.remove("is-complete");progressShipping.classList.add("is-current");progressShipping.setAttribute("aria-current","step");window.scrollTo({top:0,behavior:"smooth"})};
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
const paymentTestConfirmation=document.getElementById("payment-test-confirmation");
const returnFromPaymentTest=()=>{
 paymentTestConfirmation.hidden=true;paymentStep.hidden=false;
 progressPayment.classList.remove("is-complete");progressPayment.classList.add("is-current");progressPayment.setAttribute("aria-current","step");
 window.scrollTo({top:0,behavior:"smooth"});
};
document.getElementById("return-to-payment-from-test").addEventListener("click",returnFromPaymentTest);
document.getElementById("pay-now").addEventListener("click",()=>{
 const information=collectInformation();
 const readCart=(storage,key)=>{try{const value=JSON.parse(storage.getItem(key)||"[]");return Array.isArray(value)?value:[]}catch{return[]}};
 const orderCart=readCart(sessionStorage,"vn-shop-checkout-cart");
 const fallbackCart=readCart(localStorage,"vn-shop-cart");
 const items=orderCart.length?orderCart:fallbackCart;
 const now=new Date();
 const pad=value=>String(value).padStart(2,"0");
 const stamp=now.getFullYear()+pad(now.getMonth()+1)+pad(now.getDate());
 const alphabet="0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
 const random=length=>{const bytes=crypto.getRandomValues(new Uint8Array(length));return Array.from(bytes,value=>alphabet[value%alphabet.length]).join("")};
 const orderNumber="VN-"+stamp+"-"+random(6);
 const vnCode="VN-"+random(4)+"-"+random(4);
 const subtotal=items.reduce((sum,line)=>{const product=line.product||line;const price=Number(String(product.price??line.price??0).replace(/[^0-9.-]/g,""))||0;return sum+price*Math.max(1,Number(line.quantity||line.qty||1))},0);
 const customer={
  firstName:information.firstName||"",
  lastName:information.lastName||"",
  email:information.email||"",
  phone:[information.phoneCountry,information.phone].filter(Boolean).join(" "),
  address:[information.address,information.apartment,information.city,information.state,information.postal,information.country].filter(Boolean).join(", ")
 };
 const orderRecord={orderNumber,vnCode,createdAt:now.toISOString(),customer,items,subtotal,status:"reference_created",paymentStatus:"not_processed"};
 try{
  localStorage.setItem("vn-shop-order-complete",JSON.stringify(orderRecord));
  sessionStorage.setItem("vn-shop-order-complete",JSON.stringify(orderRecord));
  sessionStorage.setItem("vn-shop-checkout-cart",JSON.stringify(items));
  sessionStorage.setItem("vn-checkout-information",JSON.stringify(information));
 }catch(error){
  console.error("VN receipt could not save order details:",error);
  alert("Your order reference could not be saved in this browser. Please try again.");
  return;
 }
 window.location.href="order-complete.html";
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
