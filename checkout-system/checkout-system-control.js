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

country.onchange=()=>{
  let note=document.getElementById("international-note");
  if(country.value!=="TR"){
    if(!note){note=document.createElement("p");note.id="international-note";note.textContent="We're currently trying to reach our premium products to your country right now. Please try again later. — VN Shop";country.after(note)}
  }else note?.remove();
};

form.onsubmit=event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  if(country.value!=="TR"){alert("We're currently trying to reach our premium products to your country right now. Please try again later. — VN Shop");return}
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
document.getElementById("modal").onclick=event=>{if(event.target.id==="modal")close()};
document.addEventListener("keydown",event=>{if(event.key==="Escape")close()});
document.getElementById("cookies").onclick=()=>location.href="merch.html#cookie-choices";

const items=document.getElementById("items");
const scrollHint=document.getElementById("scrollhint");
const updateScrollHint=()=>{scrollHint.hidden=items.scrollHeight<=items.clientHeight+2};
items.addEventListener("scroll",updateScrollHint,{passive:true});
window.addEventListener("resize",updateScrollHint);
requestAnimationFrame(updateScrollHint);

// Keep checkout on this document when reloaded; cart data is hydrated from persistent storage.
if(!location.pathname.endsWith("/checkout.html")&&!location.pathname.endsWith("checkout.html")){
  history.replaceState(null,"",new URL("checkout.html",location.href).pathname);
}
