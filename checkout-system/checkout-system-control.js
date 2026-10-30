import{cart}from"./checkout-data.js";
import{state}from"./checkout-state.js";
import{validEmail}from"./checkout-engine.js";
import{render,policy,close}from"./checkout-view.js";

state.cart=cart();
render(state.cart);

const form=document.getElementById("info");
const country=document.getElementById("country");
const savedInfo=(()=>{try{return JSON.parse(sessionStorage.getItem("vn-checkout-information")||"{}")}catch{return{}}})();
for(const [key,value] of Object.entries(savedInfo)){const field=form.elements.namedItem(key);if(field&&typeof value==="string")field.value=value}
if(savedInfo.updates===true)document.getElementById("updates").checked=true;
if(savedInfo.phoneCountry){phoneCountry.value=savedInfo.phoneCountry;updatePhoneCountry();}
updateInternationalPanel();

const internationalMessage="We're currently trying to reach our premium products to your country right now. Please try again later. — VN Shop";
const dialCodes={"AD":"+376","AE":"+971","AF":"+93","AG":"+1","AI":"+1","AL":"+355","AM":"+374","AO":"+244","AQ":"+672","AR":"+54","AS":"+1","AT":"+43","AU":"+61","AW":"+297","AX":"+358","AZ":"+994","BA":"+387","BB":"+1","BD":"+880","BE":"+32","BF":"+226","BG":"+359","BH":"+973","BI":"+257","BJ":"+229","BL":"+590","BM":"+1","BN":"+673","BO":"+591","BQ":"+599","BR":"+55","BS":"+1","BT":"+975","BV":"+47","BW":"+267","BY":"+375","BZ":"+501","CA":"+1","CC":"+61","CD":"+243","CF":"+236","CG":"+242","CH":"+41","CI":"+225","CK":"+682","CL":"+56","CM":"+237","CN":"+86","CO":"+57","CR":"+506","CU":"+53","CV":"+238","CW":"+599","CX":"+61","CY":"+357","CZ":"+420","DE":"+49","DJ":"+253","DK":"+45","DM":"+1","DO":"+1","DZ":"+213","EC":"+593","EE":"+372","EG":"+20","EH":"+212","ER":"+291","ES":"+34","ET":"+251","FI":"+358","FJ":"+679","FK":"+500","FM":"+691","FO":"+298","FR":"+33","GA":"+241","GB":"+44","GD":"+1","GE":"+995","GF":"+594","GG":"+44","GH":"+233","GI":"+350","GL":"+299","GM":"+220","GN":"+224","GP":"+590","GQ":"+240","GR":"+30","GT":"+502","GU":"+1","GW":"+245","GY":"+592","HK":"+852","HN":"+504","HR":"+385","HT":"+509","HU":"+36","ID":"+62","IE":"+353","IL":"+972","IM":"+44","IN":"+91","IO":"+246","IQ":"+964","IR":"+98","IS":"+354","IT":"+39","JE":"+44","JM":"+1","JO":"+962","JP":"+81","KE":"+254","KG":"+996","KH":"+855","KI":"+686","KM":"+269","KN":"+1","KP":"+850","KR":"+82","KW":"+965","KY":"+1","KZ":"+7","LA":"+856","LB":"+961","LC":"+1","LI":"+423","LK":"+94","LR":"+231","LS":"+266","LT":"+370","LU":"+352","LV":"+371","LY":"+218","MA":"+212","MC":"+377","MD":"+373","ME":"+382","MF":"+590","MG":"+261","MH":"+692","MK":"+389","ML":"+223","MM":"+95","MN":"+976","MO":"+853","MP":"+1","MQ":"+596","MR":"+222","MS":"+1","MT":"+356","MU":"+230","MV":"+960","MW":"+265","MX":"+52","MY":"+60","MZ":"+258","NA":"+264","NC":"+687","NE":"+227","NF":"+672","NG":"+234","NI":"+505","NL":"+31","NO":"+47","NP":"+977","NR":"+674","NU":"+683","NZ":"+64","OM":"+968","PA":"+507","PE":"+51","PF":"+689","PG":"+675","PH":"+63","PK":"+92","PL":"+48","PM":"+508","PN":"+64","PR":"+1","PS":"+970","PT":"+351","PW":"+680","PY":"+595","QA":"+974","RE":"+262","RO":"+40","RS":"+381","RU":"+7","RW":"+250","SA":"+966","SB":"+677","SC":"+248","SD":"+249","SE":"+46","SG":"+65","SH":"+290","SI":"+386","SJ":"+47","SK":"+421","SL":"+232","SM":"+378","SN":"+221","SO":"+252","SR":"+597","SS":"+211","ST":"+239","SV":"+503","SX":"+1","SY":"+963","SZ":"+268","TC":"+1","TD":"+235","TG":"+228","TH":"+66","TJ":"+992","TK":"+690","TL":"+670","TM":"+993","TN":"+216","TO":"+676","TR":"+90","TT":"+1","TV":"+688","TW":"+886","TZ":"+255","UA":"+380","UG":"+256","UM":"+1","US":"+1","UY":"+598","UZ":"+998","VA":"+39","VC":"+1","VE":"+58","VG":"+1","VI":"+1","VN":"+84","VU":"+678","WF":"+681","WS":"+685","YE":"+967","YT":"+262","ZA":"+27","ZM":"+260","ZW":"+263"};
function updatePhoneCountry(){
 const code=phoneCountry.value;
 document.querySelector("[data-phone-dial]").textContent=dialCodes[code]||"";
 document.querySelector(".vn-ac-phone-flag").src="https://flagcdn.com/w40/"+code.toLowerCase()+".png";
}
function updateInternationalPanel(){
 let panel=document.getElementById("international-note");
 if(country.value!=="TR"){
  if(!panel){panel=document.createElement("aside");panel.id="international-note";panel.className="international-panel";panel.setAttribute("role","status");panel.innerHTML='<span class="panel-mark" aria-hidden="true">!</span><div><strong>Shipping availability</strong><p>'+internationalMessage+'</p></div>';country.closest(".vn-ac-address-control").insertAdjacentElement("afterend",panel);}
 }else panel?.remove();
}
const phoneCountry=document.getElementById("phoneCountry");
phoneCountry.onchange=updatePhoneCountry;
country.onchange=()=>{
 updateInternationalPanel();
 phoneCountry.value=country.value;
 updatePhoneCountry();
 const region=document.getElementById("region");
 const values=country.value==="TR"?["Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın","Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Isparta","Mersin","İstanbul","İzmir","Kars","Kastamonu","Kayseri","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş","Nevşehir","Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat","Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray","Bayburt","Karaman","Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük","Kilis","Osmaniye","Düzce"]:["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New","Hampshire","New","Jersey","New","Mexico","New","York","North","Carolina","North","Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode","Island","South","Carolina","South","Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West","Virginia","Wisconsin","Wyoming"];
 region.innerHTML='<option value="">State / Province</option>'+values.map(value=>'<option value="'+value+'">'+value+'</option>').join("");
};


form.onsubmit=event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  if(country.value!=="TR"){updateInternationalPanel();document.getElementById("international-note").scrollIntoView({behavior:"smooth",block:"center"});return}
  if(!validEmail(document.getElementById("email").value)){document.getElementById("email").focus();return}
  const data=Object.fromEntries(new FormData(form));
  data.updates=document.getElementById("updates").checked;
  try{sessionStorage.setItem("vn-checkout-information",JSON.stringify(data))}catch{}
  alert("Shipping & Handling calculation will be added in the next step. Online payment is not connected yet.");
};

document.getElementById("discount").onsubmit=event=>{
  event.preventDefault();
  document.getElementById("discountmsg").textContent="Discount codes are not available yet.";
};
document.getElementById("policies").onclick=()=>policy("refund");
document.getElementById("shipping").onclick=()=>policy("shipping");
document.getElementById("tabs").onclick=event=>{
  const button=event.target.closest("[data-p]");
  if(button)policy(button.dataset.p);
};
document.getElementById("close").onclick=close;
document.getElementById("policy-select").onclick=()=>{const menu=document.getElementById("policy-options");const open=menu.hidden;menu.hidden=!open;document.getElementById("policy-select").setAttribute("aria-expanded",String(open));};
document.getElementById("policy-options").onclick=event=>{const button=event.target.closest("[data-p]");if(button){policy(button.dataset.p);document.getElementById("policy-options").hidden=true;document.getElementById("policy-select").setAttribute("aria-expanded","false");document.getElementById("policy-select").querySelector("span").textContent="⌄";document.getElementById("policy-select").firstChild.textContent=button.textContent;}};
document.getElementById("modal").onclick=event=>{if(event.target.id==="modal")close()};
document.addEventListener("keydown",event=>{if(event.key==="Escape")close()});
document.getElementById("cookies").onclick=()=>location.href="merch.html#cookie-choices";
const emailField=document.getElementById("email");
const savedEmail=(()=>{try{return localStorage.getItem("vn-account-email")||""}catch{return""}})();
if(savedEmail&&!emailField.value)emailField.value=savedEmail;

const items=document.getElementById("items");
const scrollHint=document.getElementById("scrollhint");
const updateScrollHint=()=>{scrollHint.hidden=items.scrollHeight<=items.clientHeight+2};
items.addEventListener("scroll",updateScrollHint,{passive:true});
window.addEventListener("resize",updateScrollHint);
requestAnimationFrame(updateScrollHint);
