const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

const DEBUG = true;

/* =========================
   RESIZE + SCALE FIX
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
   NODES (ICONS SYSTEM)
========================= */
const nodes = [
  { name:"YouTube", icon:"icons/youtube.png", url:"https://www.youtube.com/@9ojeez9", x:window.innerWidth*0.2 },
  { name:"Twitter", icon:"icons/twitter.png", url:"https://www.twitter.com/9ojeez9", x:window.innerWidth*0.35 },
  { name:"SoundCloud", icon:"icons/soundcloud.png", url:"https://soundcloud.com/9ojeez9", x:window.innerWidth*0.5 },
  { name:"Spotify", icon:"icons/spotify.png", url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL", x:window.innerWidth*0.65 },
  { name:"Apple Music", icon:"icons/applemusic.png", url:"https://music.apple.com/tr/artist/9ojeez9/1702764220", x:window.innerWidth*0.8 }
];

/* =========================
   IMAGE LOADER
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
   CLICK SYSTEM
========================= */
canvas.addEventListener("click",(e)=>{
  const mx = e.clientX;
  const my = e.clientY;

  nodes.forEach(n=>{
    const dy = window.innerHeight/2;

    const dx = mx - n.x;
    const dy2 = my - dy;

    const dist = Math.sqrt(dx*dx + dy2*dy2);

    if(dist < 35){
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
     NODES RENDER
  ========================= */
  nodes.forEach((n,i)=>{

    const img = load(n.icon);

    const x = n.x;

    const y = (window.innerHeight/2) + Math.sin(Date.now()*0.001 + i)*10;

    /* DEBUG HITBOX */
    if(DEBUG){
      ctx.beginPath();
      ctx.arc(x,y,38,0,Math.PI*2);
      ctx.strokeStyle="rgba(255,0,0,0.5)";
      ctx.stroke();
    }

    /* CENTER DOT */
    if(DEBUG){
      ctx.beginPath();
      ctx.arc(x,y,3,0,Math.PI*2);
      ctx.fillStyle="yellow";
      ctx.fill();
    }

    /* ICON */
    if(img && img.complete){
      ctx.drawImage(img,x-26,y-26,52,52);
    } else {
      /* PLACEHOLDER */
      ctx.fillStyle="rgba(255255255,0.2)";
      ctx.fillRect(x-20,y-20,40,40);
    }

    /* LABEL */
    ctx.fillStyle="white";
    ctx.font="12px Arial";
    ctx.textAlign="center";
    ctx.fillText(n.name,x,y+55);

    /* COORD DEBUG */
    if(DEBUG){
      ctx.fillStyle="rgba(255,255,255,0.4)";
      ctx.fillText(`${Math.round(x)},${Math.round(y)}`,x,y-45);
    }

  });

  requestAnimationFrame(draw);
}

draw();
