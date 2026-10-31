import{cart}from"./checkout-data.js";import{state}from"./checkout-state.js";import{validEmail}from"./checkout-engine.js";import{render,policy,close}from"./checkout-view.js";
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
/* Country-scoped Google Places autocomplete with VN SHOP-owned suggestion UI. */
const addressInput=document.getElementById("address"),addressSuggestions=document.getElementById("address-suggestions");
const cityInput=document.getElementById("city"),stateInput=document.getElementById("state"),postalInput=document.getElementById("postal");
let placesReady=null,placesSession=null,suggestionRequest=0,activeSuggestion=-1,currentSuggestions=[];
const hideAddressSuggestions=()=>{addressSuggestions.hidden=true;addressInput.setAttribute("aria-expanded","false");addressInput.removeAttribute("aria-activedescendant");activeSuggestion=-1};
const clearAddressSuggestions=()=>{suggestionRequest++;currentSuggestions=[];addressSuggestions.replaceChildren();hideAddressSuggestions()};
const loadGooglePlaces=()=>{
 if(placesReady)return placesReady;
 const key=String(window.VN_GOOGLE_MAPS_API_KEY||"").trim();
 if(!key)return Promise.reject(new Error("Google Maps API key is not configured."));
 placesReady=new Promise((resolve,reject)=>{
  const callbackName="vnGooglePlacesReady";
  window[callbackName]=async()=>{try{resolve(await window.google.maps.importLibrary("places"))}catch(error){placesReady=null;reject(error)}};
  const script=document.createElement("script");
  script.src="https://maps.googleapis.com/maps/api/js?key="+encodeURIComponent(key)+"&v=weekly&loading=async&callback="+callbackName;
  script.async=true;script.onerror=()=>{placesReady=null;reject(new Error("Google Maps failed to load."))};document.head.appendChild(script);
 });
 return placesReady;
};
const componentValue=(components,type,short=false)=>{const item=components.find(component=>component.types.includes(type));return item?((short?item.shortText:item.longText)||""):""};
const fillAddressFromPlace=async prediction=>{
 const place=prediction.toPlace();await place.fetchFields({fields:["addressComponents","formattedAddress"]});placesSession=null;
 const components=place.addressComponents||[],countryCode=componentValue(components,"country",true).toUpperCase();
 if(countryCode&&countryCode!==country.value)return;
 const route=componentValue(components,"route"),number=componentValue(components,"street_number");
 const neighborhood=componentValue(components,"neighborhood")||componentValue(components,"sublocality_level_1")||componentValue(components,"sublocality");
 const street=[neighborhood,route,number].filter(Boolean).join(" ").trim(),isTurkey=country.value==="TR";
 const province=componentValue(components,"administrative_area_level_1"),district=componentValue(components,"administrative_area_level_2");
 const locality=componentValue(components,"locality")||componentValue(components,"postal_town")||district||province;
 addressInput.value=street||place.formattedAddress||"";
 cityInput.value=isTurkey?(province||locality):(locality||province);
 stateInput.value=isTurkey?(district||""):(province||"");
 postalInput.value=componentValue(components,"postal_code");
 [addressInput,cityInput,stateInput,postalInput].forEach(field=>{field.dispatchEvent(new Event("input",{bubbles:true}));field.dispatchEvent(new Event("change",{bubbles:true}))});
 hideAddressSuggestions();addressInput.blur();
};
const renderAddressSuggestions=predictions=>{
 currentSuggestions=predictions;addressSuggestions.replaceChildren();
 predictions.forEach((prediction,index)=>{
  const button=document.createElement("button");button.type="button";button.className="vn-ac-address-suggestion";button.id="address-suggestion-"+index;
  button.setAttribute("role","option");button.setAttribute("aria-selected",String(index===activeSuggestion));
  const main=document.createElement("span");main.textContent=prediction.text?.toString?.()||"";button.appendChild(main);
  button.addEventListener("mousedown",event=>event.preventDefault());
  button.addEventListener("click",async()=>{try{await fillAddressFromPlace(prediction)}catch(error){console.error("VN address selection failed:",error);hideAddressSuggestions()}});
  addressSuggestions.appendChild(button);
 });
 addressSuggestions.hidden=predictions.length===0;addressInput.setAttribute("aria-expanded",String(predictions.length>0));
};
const searchAddressSuggestions=async()=>{
 const query=addressInput.value.trim(),requestId=++suggestionRequest,region=country.value.toLowerCase();
 if(query.length<3||!region){clearAddressSuggestions();return}
 try{
  const places=await loadGooglePlaces();if(!places?.AutocompleteSuggestion)return;
  if(!placesSession)placesSession=new places.AutocompleteSessionToken();
  const result=await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({input:query,includedRegionCodes:[region],sessionToken:placesSession});
  if(requestId!==suggestionRequest||region!==country.value.toLowerCase()||query!==addressInput.value.trim())return;
  renderAddressSuggestions((result.suggestions||[]).filter(item=>item.placePrediction).map(item=>item.placePrediction));
 }catch(error){if(requestId===suggestionRequest)hideAddressSuggestions();console.warn("VN address autocomplete unavailable; manual entry remains enabled.",error)}
};
let addressSearchTimer;
addressInput.addEventListener("input",()=>{window.clearTimeout(addressSearchTimer);if(addressInput.value.trim().length<3){clearAddressSuggestions();return}addressSearchTimer=window.setTimeout(searchAddressSuggestions,260)});
addressInput.addEventListener("keydown",event=>{
 if(addressSuggestions.hidden)return;
 if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();activeSuggestion=(activeSuggestion+(event.key==="ArrowDown"?1:-1)+currentSuggestions.length)%currentSuggestions.length;[...addressSuggestions.children].forEach((node,index)=>node.setAttribute("aria-selected",String(index===activeSuggestion)));addressInput.setAttribute("aria-activedescendant","address-suggestion-"+activeSuggestion)}
 else if(event.key==="Enter"&&activeSuggestion>=0){event.preventDefault();addressSuggestions.children[activeSuggestion]?.click()}
 else if(event.key==="Escape")hideAddressSuggestions();
});
document.addEventListener("pointerdown",event=>{if(!event.target.closest(".vn-ac-autocomplete"))hideAddressSuggestions()});
const resetAddressAutocompleteForCountry=()=>{clearAddressSuggestions();placesSession=null};
loadGooglePlaces().catch(()=>{});


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
