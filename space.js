const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

const dpr = window.devicePixelRatio || 1;

/* =========================
   SCALE FIX
========================= */
function resize(){
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
resize();
window.addEventListener("resize", resize);

/* =========================
   STARFIELD (UNCHANGED)
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
   ICONS
========================= */
const nodes = [
  { name:"YouTube", icon:"icons/youtube.png", url:"https://www.youtube.com/@9ojeez9", x:window.innerWidth*0.2 },
  { name:"Twitter", icon:"icons/twitter.png", url:"https://twitter.com/9ojeez9", x:window.innerWidth*0.35 },
  { name:"SoundCloud", icon:"icons/soundcloud.png", url:"https://soundcloud.com/9ojeez9", x:window.innerWidth*0.5 },
  { name:"Spotify", icon:"icons/spotify.png", url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL", x:window.innerWidth*0.65 },
  { name:"Apple Music", icon:"icons/applemusic.png", url:"https://music.apple.com/tr/artist/9ojeez9/1702764220", x:window.innerWidth*0.8 }
];

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
   CLICK SYSTEM
========================= */
canvas.addEventListener("click",(e)=>{
  const mx = e.clientX;

  nodes.forEach(n=>{
    const dx = mx - n.x;

    if(Math.abs(dx) < 35){
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
     ICONS (CLEAN BLEND MODE)
  ========================= */
  nodes.forEach((n,i)=>{

    const img = load(n.icon);

    const x = n.x;
    const y = (window.innerHeight/2) + Math.sin(Date.now()*0.001 + i)*10;

    /* ❌ NO BACKGROUND SHAPES
       ❌ NO CIRCLES
       ❌ NO BOXES
       ❌ NO STROKES
    */

    /* ===== SOFT SPACE SHADOW ===== */
    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.18)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    /* ===== ICON (BIGGER + CLEAR) ===== */
    if(img && img.complete){
      ctx.drawImage(img, x-30, y-30, 60, 60);
    }

    ctx.restore();

    /* ===== VERY SUBTLE GLOW (BLEND WITH SPACE) ===== */
    ctx.globalAlpha = 0.06;
    ctx.beginPath();
    ctx.arc(x,y,34,0,Math.PI*2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.globalAlpha = 1;

  });

  requestAnimationFrame(draw);
}

draw();
