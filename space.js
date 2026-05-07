const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

const dpr = window.devicePixelRatio || 1;

function resize(){
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
resize();
window.addEventListener("resize", resize);

/* ===== STARFIELD ===== */
let stars = [];

for(let i=0;i<120;i++){
  stars.push({
    x:Math.random()*window.innerWidth,
    y:Math.random()*window.innerHeight,
    s:Math.random()*0.6
  });
}

/* ===== ICONS ===== */
const nodes = [
  { icon:"icons/youtube.png", url:"https://youtube.com/@9ojeez9", x:window.innerWidth*0.2 },
  { icon:"icons/twitter.png", url:"https://twitter.com/9ojeez9", x:window.innerWidth*0.35 },
  { icon:"icons/soundcloud.png", url:"https://soundcloud.com/9ojeez9", x:window.innerWidth*0.5 },
  { icon:"icons/spotify.png", url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL", x:window.innerWidth*0.65 },
  { icon:"icons/applemusic.png", url:"https://music.apple.com/tr/artist/9ojeez9/1702764220", x:window.innerWidth*0.8 }
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

/* ===== CLICK ===== */
canvas.addEventListener("click",(e)=>{
  const mx = e.clientX;

  nodes.forEach(n=>{
    const dy = window.innerHeight/2;
    const dx = mx - n.x;

    if(Math.abs(dx) < 30){
      window.open(n.url,"_blank");
    }
  });
});

/* ===== DRAW ===== */
function draw(){

  ctx.clearRect(0,0,window.innerWidth,window.innerHeight);

  /* STARFIELD */
  ctx.fillStyle="white";

  stars.forEach(s=>{
    ctx.fillRect(s.x,s.y,1.2,1.2);
    s.y += s.s;

    if(s.y>window.innerHeight){
      s.y=0;
      s.x=Math.random()*window.innerWidth;
    }
  });

  /* ICONS (SPACE BLEND) */
  nodes.forEach((n,i)=>{

    const img = load(n.icon);

    const x = n.x;
    const y = (window.innerHeight/2) + Math.sin(Date.now()*0.001 + i)*10;

    /* ===== SOFT SHADOW (space depth) ===== */
    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.25)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    /* ===== ICON DRAW ===== */
    if(img && img.complete){
      ctx.drawImage(img, x-26, y-26, 52, 52);
    }

    ctx.restore();

    /* ===== SUBTLE SPACE GLOW (very minimal) ===== */
    ctx.globalAlpha = 0.08;
    ctx.beginPath();
    ctx.arc(x,y,28,0,Math.PI*2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.globalAlpha = 1;

  });

  requestAnimationFrame(draw);
}

draw();
