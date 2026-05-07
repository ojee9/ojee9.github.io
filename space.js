const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
window.addEventListener("resize", resize);

/* =========================
   STARFIELD (SPACE DEPTH)
========================= */
let stars = [];

for(let i=0;i<160;i++){
  stars.push({
    x: Math.random()*innerWidth,
    y: Math.random()*innerHeight,
    z: Math.random()*1
  });
}

/* =========================
   ICONS (TRANSPARENT PNG ONLY)
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
   HOVER STATE
========================= */
let hover = {
  active:false,
  text:"",
  x:0,
  y:0,
  t:0
};

/* =========================
   MOUSE EVENTS
========================= */
canvas.addEventListener("mousemove",(e)=>{

  const mx = e.clientX;
  const my = e.clientY;

  hover.active = false;

  nodes.forEach(n=>{

    const x = n.x * innerWidth;

    if(Math.abs(mx - x) < 45){

      hover.active = true;
      hover.text = n.name;
      hover.x = x;
      hover.y = innerHeight/2 - 60;
    }
  });

});

canvas.addEventListener("click",(e)=>{

  const mx = e.clientX;

  nodes.forEach(n=>{
    const x = n.x * innerWidth;

    if(Math.abs(mx - x) < 45){
      window.open(n.url,"_blank");
    }
  });

});

/* =========================
   DRAW LOOP
========================= */
function draw(){

  ctx.clearRect(0,0,innerWidth,innerHeight);

  /* ===== STARFIELD (DEPTH) ===== */
  ctx.fillStyle="rgba(255,255,255,0.9)";

  stars.forEach(s=>{
    const px = s.x;
    const py = s.y;

    ctx.fillRect(px,py,1.2,1.2);

    s.y += 0.6 + s.z;

    if(s.y > innerHeight){
      s.y = 0;
      s.x = Math.random()*innerWidth;
    }
  });

  /* ===== ICONS (SPACE BLEND) ===== */
  nodes.forEach((n,i)=>{

    const img = load(n.icon);

    const x = n.x * innerWidth;
    const y = innerHeight/2 + Math.sin(Date.now()*0.001 + i)*10;

    ctx.save();

    /* SPACE GLOW BLEND */
    ctx.shadowColor = "rgba(255,255,255,0.28)";
    ctx.shadowBlur = 25;

    ctx.globalAlpha = 0.95;

    if(img && img.complete){
      ctx.drawImage(img, x-34, y-34, 68, 68);
    }

    ctx.restore();

  });

  /* ===== HOVER TAG (SPACE FLOAT TEXT + FADE) ===== */
  if(hover.active){

    hover.t += 0.08;
    if(hover.t > 1) hover.t = 1;

    ctx.save();

    ctx.globalAlpha = hover.t;

    ctx.font = "13px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textAlign = "center";

    ctx.fillText(hover.text, hover.x, hover.y);

    ctx.restore();

  } else {
    hover.t *= 0.85;
  }

  requestAnimationFrame(draw);
}

draw();

/* =========================
   ESC -> MAIN MENU
========================= */
document.addEventListener("keydown",(e)=>{
  if(e.key === "Escape"){
    window.location.href = "index.html";
  }
});
