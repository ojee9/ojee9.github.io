/* VN SHOP shared notice layer.
   Use: VNNotice.show(message,{type,anchor,placement,duration,dismissible});
        VNNotice.update(message,options); VNNotice.hide();
   The notice is mounted outside forms so it never changes field or focus-frame geometry. */
(()=>{
 "use strict";
 if(window.VNNotice)return;
 const STYLE_ID="vn-notice-shared-styles";
 if(!document.getElementById(STYLE_ID)){
  const style=document.createElement("style");
  style.id=STYLE_ID;
  style.textContent=`
   #vn-notice-layer{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;color:inherit!important;overflow:visible!important;pointer-events:none!important;z-index:2147483647!important;display:none}
   #vn-notice-layer:popover-open{display:block!important}
   #vn-notice-layer.vn-notice-fallback{display:block!important}
   #vn-notice-bubble{position:fixed!important;box-sizing:border-box!important;display:flex!important;align-items:flex-start!important;gap:10px!important;width:max-content!important;max-width:min(310px,calc(100vw - 28px))!important;margin:0!important;padding:11px 13px!important;border:1px solid #5b554b!important;border-left:3px solid #b8ad9b!important;border-radius:5px!important;background:#171717!important;color:#f3f1ec!important;box-shadow:0 8px 24px rgba(0,0,0,.48)!important;font:11px/1.5 Arial,sans-serif!important;letter-spacing:.01em!important;text-align:left!important;white-space:normal!important;opacity:1!important;visibility:visible!important;transform:none!important;pointer-events:auto!important}
   #vn-notice-bubble[data-type=error]{border-left-color:#d36b63!important}
   #vn-notice-bubble[data-type=success]{border-left-color:#8eae8a!important}
   #vn-notice-bubble[data-type=warning]{border-left-color:#d3ad69!important}
   #vn-notice-bubble[data-type=info]{border-left-color:#9aa8b5!important}
   #vn-notice-message{display:block!important;min-width:0!important}
   #vn-notice-close{flex:none!important;margin:-2px -3px 0 2px!important;padding:0 2px!important;border:0!important;background:transparent!important;color:#aaa!important;font:16px/1 Arial,sans-serif!important;cursor:pointer!important}
   #vn-notice-close:hover{color:#fff!important}
  `;
  document.head.appendChild(style);
 }
 const layer=document.createElement("div");
 layer.id="vn-notice-layer";
 layer.setAttribute("popover","manual");
 layer.setAttribute("aria-label","VN SHOP notifications");
 const bubble=document.createElement("div");
 bubble.id="vn-notice-bubble";
 bubble.setAttribute("role","alert");
 bubble.setAttribute("aria-live","assertive");
 const message=document.createElement("span");
 message.id="vn-notice-message";
 const close=document.createElement("button");
 close.id="vn-notice-close";
 close.type="button";
 close.setAttribute("aria-label","Dismiss notification");
 close.textContent="×";
 bubble.append(message,close);
 layer.appendChild(bubble);
 document.body.appendChild(layer);
 let anchor=null,timer=0,resizeObserver=null,usingPopover=false;
 const position=()=>{
  if(!bubble.isConnected)return;
  const gap=10,margin=14,rect=anchor?.isConnected?anchor.getBoundingClientRect():null;
  const b=bubble.getBoundingClientRect(),w=b.width,h=b.height;
  let left,top;
  if(rect){
   const below=rect.bottom+gap+h<=window.innerHeight-margin;
   top=below?rect.bottom+gap:Math.max(margin,rect.top-gap-h);
   left=Math.min(Math.max(margin,rect.left),window.innerWidth-w-margin);
   const arrow=Math.min(Math.max(12,rect.left+Math.min(rect.width/2,24)-left),w-20);
   bubble.dataset.placement=below?"below":"above";
   bubble.style.setProperty("--vn-notice-arrow-left",arrow+"px");
  }else{
   left=Math.max(margin,(window.innerWidth-w)/2);
   top=margin+8;
   delete bubble.dataset.placement;
  }
  bubble.style.left=left+"px";
  bubble.style.top=top+"px";
 };
 const hide=()=>{
  window.clearTimeout(timer);timer=0;
  if(resizeObserver){resizeObserver.disconnect();resizeObserver=null}
  anchor=null;
  if(usingPopover&&typeof layer.hidePopover==="function"){try{layer.hidePopover()}catch{}}
  layer.classList.remove("vn-notice-fallback");
  layer.style.display="none";
 };
 const show=(text,options={})=>{
  window.clearTimeout(timer);
  if(resizeObserver){resizeObserver.disconnect();resizeObserver=null}
  anchor=options.anchor instanceof Element?options.anchor:null;
  message.textContent=String(text??"");
  bubble.dataset.type=["error","success","warning","info"].includes(options.type)?options.type:"info";
  close.hidden=options.dismissible===false;
  layer.style.display="block";
  usingPopover=typeof layer.showPopover==="function";
  if(usingPopover){
   try{if(!layer.matches(":popover-open"))layer.showPopover();layer.classList.remove("vn-notice-fallback")}
   catch(error){usingPopover=false;layer.classList.add("vn-notice-fallback");console.warn("VN Notice popover fallback:",error)}
  }else layer.classList.add("vn-notice-fallback");
  position();
  if(anchor&&typeof ResizeObserver!=="undefined"){
   resizeObserver=new ResizeObserver(position);
   resizeObserver.observe(anchor);
  }
  if(Number(options.duration)>0)timer=window.setTimeout(hide,Number(options.duration));
  return{hide};
 };
 close.addEventListener("click",hide);
 window.addEventListener("scroll",position,true);
 window.addEventListener("resize",position);
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&layer.style.display!=="none")hide()});
 window.VNNotice=Object.freeze({
  show,
  update:(text,options={})=>show(text,{...options}),
  hide,
  isVisible:()=>layer.style.display!=="none"
 });
})();