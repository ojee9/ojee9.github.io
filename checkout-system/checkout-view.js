import{safe,price,money}from"./checkout-data.js";
import{subtotal,count}from"./checkout-engine.js";
import{CONFIG}from"./checkout-config.js";

export function render(items){
  const element=document.getElementById("items");
  element.innerHTML=items.map(item=>{
    const product=item.product||{};
    const image=product.image||(product.images||[])[0]||"";
    const variant=item.variant||item.size||item.version||"";
    return '<article class="item"><div class="thumb">'+(image?'<img src="'+safe(image)+'" alt="'+safe(product.name||"Product")+'">':"")+'<span class="qty">'+Number(item.quantity||0)+'</span></div><div><div class="iname">'+safe(product.name||"Product")+'</div>'+(variant?'<div class="variant">'+safe(variant)+'</div>':"")+'</div><span class="price">'+money(price(item)*Number(item.quantity||0))+'</span></article>';
  }).join("");
  const updateHint=()=>{document.getElementById("scrollhint").hidden=element.scrollHeight<=element.clientHeight+2};
  requestAnimationFrame(updateHint);
  const amount=subtotal(items);
  document.getElementById("subtotal-label").textContent="Subtotal · "+count(items)+" items";
  document.getElementById("subtotal").textContent=money(amount);
  document.getElementById("total").textContent=money(amount);
}
const urls={privacy:"policies/privacy-policy.html",terms:"policies/terms-of-use.html",sell:"policies/legal-notice.html"};
export function policy(key){
  const names={refund:"Refund Policy",shipping:"Shipping",privacy:"Privacy Policy",terms:"Terms of Use",sale:"Terms and Conditions of Sale",sell:"Do Not Sell My Information"};
  if(!names[key])return;
  document.getElementById("ptitle").textContent=names[key];
  document.querySelectorAll("[data-p]").forEach(button=>button.classList.toggle("active",button.dataset.p===key));
  document.getElementById("pcontent").innerHTML=urls[key]?'<iframe title="'+names[key]+'" src="'+urls[key]+'"></iframe>':CONFIG.temporaryPolicy;
  document.getElementById("modal").hidden=false;
}
export const close=()=>document.getElementById("modal").hidden=true;
