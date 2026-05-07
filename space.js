const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

/* =========================
   STARFIELD (subtle)
========================= */
let stars = [];

for(let i=0;i<120;i++){
  stars.push({
    x: Math.random()*innerWidth,
    y: Math.random()*innerHeight,
    s: Math.random()*0.6
  });
}

/* =========================
   ICONS (NO BACKGROUND, NO TEXT)
========================= */
const nodes = [
  { icon:"icons/youtube.png", url:"https://youtube.com/@9ojeez9", x:innerWidth*0.2 },
  { icon:"icons/twitter.png", url:"https://twitter.com/9ojeez9", x:innerWidth*0.35 },
  { icon:"icons/soundcloud.png", url:"https://soundcloud.com/9ojeez9", x:innerWidth*0.5 },
  { icon:"icons/spotify.png", url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL", x:innerWidth*0.65 },
  { icon:"icons/applemusic.png", url:"https://music.apple.com", x:innerWidth*0.8 }
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
   CLICK
========================= */
canvas.addEventListener("click",(e)=>{
  const mx = e.clientX;

  nodes.forEach(n=>{
    if(Math.abs(mx - n.x) < 30){
      window.open(n.url,"_blank");
    }
  });
});

/* =========================
   DRAW
========================= */
function draw(){

  ctx.clearRect(0,0,innerWidth,innerHeight);

  /* STARFIELD */
  ctx.fillStyle="white";
  stars.forEach(s=>{
    ctx.fillRect(s.x,s.y,1.2,1.2);
    s.y += s.s;
    if(s.y>innerHeight){
      s.y=0;
      s.x=Math.random()*innerWidth;
    }
  });

  /* ICONS (CLEAN + BLEND) */
  nodes.forEach((n,i)=>{

    const img = load(n.icon);
    const x = n.x;
    const y = innerHeight/2 + Math.sin(Date.now()*0.001 + i)*10;

    /* soft space shadow */
    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.18)";
    ctx.shadowBlur = 16;

    if(img && img.complete){
      ctx.drawImage(img, x-30, y-30, 60, 60);
    }

    ctx.restore();

  });

  requestAnimationFrame(draw);
}

draw();
