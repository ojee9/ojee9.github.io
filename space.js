const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

const DEBUG = false;

/* =========================
   RESIZE FIX
========================= */
function resize(){
  const dpr = window.devicePixelRatio || 1;

  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  ctx.setTransform(dpr,0,0,dpr,0,0);
}
resize();
window.addEventListener("resize", resize);

/* =========================
   STARFIELD
========================= */
let stars = [];

for(let i=0;i<120;i++){
  stars.push({
    x:Math.random()*window.innerWidth,
    y:Math.random()*window.innerHeight,
    s:Math.random()*0.6
  });
}

/* =========================
   ICON NODES
========================= */
const nodes = [
  { name:"YouTube", icon:"icons/youtube.png", url:"https://www.youtube.com/@9ojeez9", x:window.innerWidth*0.2 },
  { name:"Twitter", icon:"icons/twitter.png", url:"https://www.twitter.com/9ojeez9", x:window.innerWidth*0.35 },
  { name:"SoundCloud", icon:"icons/soundcloud.png", url:"https://soundcloud.com/9ojeez9", x:window.innerWidth*0.5 },
  { name:"Spotify", icon:"icons/spotify.png", url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL", x:window.innerWidth*0.65 },
  { name:"Apple Music", icon:"icons/applemusic.png", url:"https://music.apple.com/tr/artist/9ojeez9/1702764220", x:window.innerWidth*0.8 }
];

/* =========================
   IMAGE CACHE
========================= */
const cache = {};

function load(src){
  if(!cache[src]){
    const img = new Image();
    img.src = src;
    cache[src] = img;
  }
  return cache[src];
}

/* =========================
   CLICK
========================= */
canvas.addEventListener("click",(e)=>{
  const mx = e.clientX;
  const my = e.clientY;

  nodes.forEach(n=>{
    const dx = mx - n.x;
    const dy = my - window.innerHeight/2;

    const dist = Math.sqrt(dx*dx + dy*dy);

    if(dist < 30){
      window.open(n.url,"_blank");
    }
  });
});

/* =========================
   DRAW LOOP
========================= */
function draw(){

  ctx.clearRect(0,0,window.innerWidth,window.innerHeight);

  /* ===== STARFIELD ===== */
  ctx.fillStyle="white";

  stars.forEach(s=>{
    ctx.fillRect(s.x,s.y,1.2,1.2);

    s.y += s.s;
    if(s.y>window.innerHeight){
      s.y=0;
      s.x=Math.random()*window.innerWidth;
    }
  });

  /* =========================
     ICON RENDER (CLEAN)
  ========================= */
  nodes.forEach((n,i)=>{

    const img = load(n.icon);

    const x = n.x;
    const y = (window.innerHeight/2) + Math.sin(Date.now()*0.001 + i)*10;

    /* ❌ NO BACKGROUND
       ❌ NO CIRCLE
       ❌ NO STROKE
       ❌ NO GLOW
    */

    if(img && img.complete){
      ctx.drawImage(img, x-28, y-28, 56, 56);
    }

    /* LABEL (hover feel yerine always visible light) */
    ctx.fillStyle="rgba(255,255,255,0.7)";
    ctx.font="12px Arial";
    ctx.textAlign="center";
    ctx.fillText(n.name, x, y+55);

  });

  requestAnimationFrame(draw);
}

draw();
