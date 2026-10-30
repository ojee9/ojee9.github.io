const read=(storage,key)=>{
  try{
    const value=JSON.parse(storage.getItem(key)||"[]");
    return Array.isArray(value)?value:[];
  }catch{return[]}
};
export const cart=()=>{
  const saved=read(localStorage,"vn-shop-cart");
  const transferred=read(sessionStorage,"vn-shop-checkout-cart");
  const selected=saved.length?saved:transferred;
  if(selected.length){
    try{
      localStorage.setItem("vn-shop-cart",JSON.stringify(selected));
      sessionStorage.setItem("vn-shop-checkout-cart",JSON.stringify(selected));
    }catch{}
  }
  return selected;
};
export const safe=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
export const price=item=>{
  const raw=item?.product?.price??item?.price??0;
  const amount=Number(String(raw).replace(/[^0-9.-]/g,""));
  return Number.isFinite(amount)?amount:0;
};
export const money=amount=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(amount||0);
