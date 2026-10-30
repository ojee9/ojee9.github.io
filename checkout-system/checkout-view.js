import{safe,price,money}from"./checkout-data.js";
import{subtotal,count}from"./checkout-engine.js";
import{CONFIG}from"./checkout-config.js";
export function render(items){
 const element=document.getElementById("items");
 element.innerHTML=items.map(item=>{
  const product=item.product||{};
  const image=product.image||(product.images||[])[0]||item.image||"";
  const name=product.name||item.name||"Product";
  const variant=item.variant||item.size||item.version||"";
  const quantity=Math.max(0,Number(item.quantity||1));
  return '<article class="item"><div class="thumb">'+(image?'<img src="'+safe(image)+'" alt="'+safe(name)+'">':"")+'<span class="qty">'+quantity+'</span></div><div><div class="iname">'+safe(name)+'</div>'+(variant?'<div class="variant">'+safe(variant)+'</div>':"")+'</div><span class="price">'+money(price(item)*quantity)+'</span></article>';
 }).join("");
 const updateHint=()=>{const hint=document.getElementById("scrollhint");hint.hidden=element.scrollHeight<=element.clientHeight+2};
 requestAnimationFrame(updateHint);
 const amount=subtotal(items);
 document.getElementById("subtotal-label").textContent="Subtotal · "+count(items)+" items";
 document.getElementById("subtotal").textContent=money(amount);
 document.getElementById("total").textContent=money(amount);
}
const urls={privacy:"policies/privacy-policy.html",terms:"policies/terms-of-use.html",sell:"policies/legal-notice.html"};
const names={refund:"Refund Policy",shipping:"Shipping",privacy:"Privacy Policy",terms:"Terms of Use",sale:"Terms and Conditions of Sale",sell:"Do Not Sell My Information"};
const placeholders={
 refund:"<div class='policy-placeholder'><p>Refund and return information is included in the VN SHOP purchase terms. Please review the Terms and Conditions of Sale.</p><p><a href='policies/terms-of-use.html'>Open Terms and Conditions of Sale</a></p></div>",
 shipping:"<div class='policy-placeholder'><p>Shipping availability, delivery methods, charges and estimated delivery details are shown during checkout and confirmed before an order is placed.</p><p>Shipping &amp; Handling is not yet connected to a live rate calculator.</p></div>",
 sale:"<div class='policy-placeholder'><p>VN SHOP's Terms and Conditions of Sale are not currently available as a separate published page.</p><p>Please review the published Terms of Use for the current store terms.</p></div>"
};
export function policy(key){
 if(!names[key])return;
 document.getElementById("ptitle").textContent=names[key];
 const selector=document.getElementById("policy-select");
 if(selector)selector.firstChild.textContent=names[key];
 const content=document.getElementById("pcontent");
 content.classList.add("is-changing");
 document.querySelectorAll("[data-p]").forEach(button=>button.classList.toggle("active",button.dataset.p===key));
 if(urls[key]){
  content.innerHTML='<iframe title="'+names[key]+'" src="'+urls[key]+'"></iframe>';
  const frame=content.querySelector("iframe");
  frame.addEventListener("load",()=>{try{const doc=frame.contentDocument;doc.querySelector(".header-actions")?.remove();doc.querySelector(".footer")?.remove();doc.body.style.background="#000";doc.querySelector(".policy-page")?.style.setProperty("min-height","0")}catch{}});
 }else content.innerHTML=placeholders[key]||CONFIG.temporaryPolicy;
 document.getElementById("modal").hidden=false;
 requestAnimationFrame(()=>document.getElementById("modal").classList.add("is-open"));
 requestAnimationFrame(()=>content.classList.remove("is-changing"));
}
export const close=()=>{const modal=document.getElementById("modal");modal.classList.remove("is-open");window.setTimeout(()=>{modal.hidden=true;},240);};
