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
   #vn-notice-bubble{position:fixed!important;box-sizing:border-box!important;display:flex!important;align-items:flex-start!important;gap:10px!important;width:max-content!important;max-width:min(310px,calc(100vw - 28px))!important;margin:0!important;padding:12px 14px!important;border:1px solid #5b554b!important;border-left:3px solid #b8ad9b!important;border-radius:7px!important;background:linear-gradient(145deg,#202020 0%,#171717 68%,#141414 100%)!important;color:#f3f1ec!important;box-shadow:0 12px 32px rgba(0,0,0,.52),0 2px 7px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.055)!important;font:11px/1.55 Arial,sans-serif!important;letter-spacing:.015em!important;text-align:left!important;white-space:normal!important;opacity:0!important;visibility:hidden!important;transform:translate3d(0,7px,0) scale(.985)!important;transform-origin:top left!important;transition:opacity .19s ease,transform .22s cubic-bezier(.2,.8,.2,1),visibility .19s ease!important;pointer-events:auto!important}
   #vn-notice-bubble.vn-notice-visible{opacity:1!important;visibility:visible!important;transform:translate3d(0,0,0) scale(1)!important}
   #vn-notice-bubble:before{content:"";display:block;flex:none;width:7px;height:7px;margin:4px 1px 0 0;border-radius:50%;background:#b8ad9b;box-shadow:0 0 0 3px rgba(184,173,155,.12),0 0 10px rgba(184,173,155,.24)}
   #vn-notice-bubble[data-type=error]{border-left-color:#d36b63!important;border-color:#5d4947!important}
   #vn-notice-bubble[data-type=error]:before{background:#d36b63;box-shadow:0 0 0 3px rgba(211,107,99,.12),0 0 10px rgba(211,107,99,.24)}
   #vn-notice-bubble[data-type=success]{border-left-color:#8eae8a!important;border-color:#4c594b!important}
   #vn-notice-bubble[data-type=success]:before{background:#8eae8a;box-shadow:0 0 0 3px rgba(142,174,138,.12),0 0 10px rgba(142,174,138,.24)}
   #vn-notice-bubble[data-type=warning]{border-left-color:#d3ad69!important;border-color:#5c5140!important}
   #vn-notice-bubble[data-type=warning]:before{background:#d3ad69;box-shadow:0 0 0 3px rgba(211,173,105,.12),0 0 10px rgba(211,173,105,.24)}
   #vn-notice-bubble[data-type=info]{border-left-color:#9aa8b5!important;border-color:#4b555e!important}
   #vn-notice-bubble[data-type=info]:before{background:#9aa8b5;box-shadow:0 0 0 3px rgba(154,168,181,.12),0 0 10px rgba(154,168,181,.24)}
   #vn-notice-message{display:block!important;min-width:0!important}
   #vn-notice-close{flex:none!important;margin:-2px -3px 0 2px!important;padding:0 2px!important;border:0!important;background:transparent!important;color:#aaa!important;font:18px/1 Arial,sans-serif!important;cursor:pointer!important;transition:color .16s ease,transform .16s ease!important}
   #vn-notice-close:hover{color:#fff!important;transform:scale(1.12)!important}
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
 let anchor=null,timer=0,hideTimer=0,resizeObserver=null,usingPopover=false,noticeSequence=0;
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
 const finishHide=()=>{
  if(usingPopover&&typeof layer.hidePopover==="function"){try{layer.hidePopover()}catch{}}
  layer.classList.remove("vn-notice-fallback");
  layer.style.display="none";
 };
 const hide=()=>{
  noticeSequence++;
  window.clearTimeout(timer);timer=0;
  window.clearTimeout(hideTimer);hideTimer=0;
  bubble.classList.remove("vn-notice-visible");
  if(resizeObserver){resizeObserver.disconnect();resizeObserver=null}
  anchor=null;
  hideTimer=window.setTimeout(finishHide,190);
 };
 const show=(text,options={})=>{
  window.clearTimeout(timer);
  window.clearTimeout(hideTimer);hideTimer=0;
  const sequence=++noticeSequence;
  bubble.classList.remove("vn-notice-visible");
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
  requestAnimationFrame(()=>{if(sequence===noticeSequence)bubble.classList.add("vn-notice-visible")});
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