const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

/* =========================
   STARFIELD (SPACE BACKGROUND)
========================= */
let stars = [];

for(let i=0;i<140;i++){
  stars.push({
    x: Math.random()*innerWidth,
    y: Math.random()*innerHeight,
    s: Math.random()*0.8
  });
}

/* =========================
   ICON NODES
========================= */
const nodes = [
  { name:"YouTube", icon:"icons/youtube.png", url:"https://youtube.com/@9ojeez9", x:0.2 },
  { name:"Twitter", icon:"icons/twitter.png", url:"https://twitter.com/9ojeez9", x:0.35 },
  { name:"SoundCloud", icon:"icons/soundcloud.png", url:"https://soundcloud.com/9ojeez9", x:0.5 },
  { name:"Spotify", icon:"icons/spotify.png", url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL", x:0.65 },
  { name:"Apple Music", icon:"icons/applemusic.png", url:"https://music.apple.com", x:0.8 }
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
   HOVER TAG STATE
========================= */
let hoverText = "";
let hoverX = 0;
let hoverY = 0;

/* =========================
   MOUSE INTERACTION
========================= */
canvas.addEventListener("mousemove",(e)=>{

  const mx = e.clientX;
  const my = e.clientY;

  hoverText = "";

  nodes.forEach(n=>{
    const x = n.x * innerWidth;
    const y = innerHeight/2;

    const dist = Math.abs(mx - x);

    if(dist < 40){
      hoverText = n.name;
      hoverX = x;
      hoverY = y - 60;
    }
  });

});

canvas.addEventListener("click",(e)=>{

  const mx = e.clientX;

  nodes.forEach(n=>{
    const x = n.x * innerWidth;

    if(Math.abs(mx - x) < 40){
      window.open(n.url,"_blank");
    }
  });

});

/* =========================
   DRAW LOOP
========================= */
function draw(){

  ctx.clearRect(0,0,innerWidth,innerHeight);

  /* ===== SPACE BACKGROUND ===== */
  ctx.fillStyle="white";

  stars.forEach(s=>{
    ctx.fillRect(s.x,s.y,1.2,1.2);

    s.y += s.s;

    if(s.y > innerHeight){
      s.y = 0;
      s.x = Math.random()*innerWidth;
    }
  });

  /* ===== ICONS (BLENDED FLOATING) ===== */
  nodes.forEach((n,i)=>{

    const img = load(n.icon);

    const x = n.x * innerWidth;
    const y = innerHeight/2 + Math.sin(Date.now()*0.001 + i)*12;

    ctx.save();

    /* blend glow */
    ctx.shadowColor = "rgba(255,255,255,0.25)";
    ctx.shadowBlur = 20;

    ctx.globalAlpha = 0.95;

    if(img && img.complete){
      ctx.drawImage(img, x-32, y-32, 64, 64);
    }

    ctx.restore();

  });

  /* ===== HOVER TAG (SPACE STYLE TEXT) ===== */
  if(hoverText){

    ctx.save();

    ctx.font = "14px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textAlign = "center";

    ctx.fillText(hoverText, hoverX, hoverY);

    ctx.restore();
  }

  requestAnimationFrame(draw);
}

draw();

/* =========================
   MENU BACK BUTTON (OPTIONAL)
========================= */
document.addEventListener("keydown",(e)=>{
  if(e.key === "Escape"){
    window.location.href = "index.html";
  }
});
