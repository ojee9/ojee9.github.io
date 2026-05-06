const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

/* ===== SCALE FIX (CRITICAL) ===== */
function resize(){
  const dpr = window.devicePixelRatio || 1;

  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  ctx.setTransform(dpr,0,0,dpr,0,0);
}
resize();
window.addEventListener("resize", resize);

/* ===== STARFIELD (UNCHANGED) ===== */
let stars = [];

for(let i=0;i<120;i++){
  stars.push({
    x:Math.random()*window.innerWidth,
    y:Math.random()*window.innerHeight,
    s:Math.random()*0.6
  });
}

/* ===== ICONS ===== */
const icons = [
  { name:"SoundCloud", icon:"icons/soundcloud.png", url:"https://soundcloud.com/9ojeez9", x:window.innerWidth*0.25 },
  { name:"Spotify", icon:"icons/spotify.png", url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL", x:window.innerWidth*0.4 },
  { name:"Apple Music", icon:"icons/applemusic.png", url:"https://music.apple.com/tr/artist/9ojeez9/1702764220", x:window.innerWidth*0.55 },
  { name:"YouTube", icon:"icons/youtube.png", url:"https://www.youtube.com/@9ojeez9", x:window.innerWidth*0.7 },
  { name:"Twitter", icon:"icons/twitter.png", url:"https://www.twitter.com/9ojeez9", x:window.innerWidth*0.85 }
];

/* ===== IMAGE CACHE ===== */
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
  const my = e.clientY;

  icons.forEach(i=>{
    let dx = mx - i.x;
    let dy = my - (window.innerHeight/2);

    if(Math.sqrt(dx*dx+dy*dy)<35){
      window.open(i.url,"_blank");
    }
  });
});

/* ===== DRAW LOOP ===== */
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

  /* ICONS */
  icons.forEach((i,index)=>{

    const img = load(i.icon);

    /* WEIGHTLESS FLOAT */
    const floatY = (window.innerHeight/2) + Math.sin(Date.now()*0.001 + index)*10;

    const x = i.x;
    const y = floatY;

    /* glow base */
    ctx.beginPath();
    ctx.arc(x,y,32,0,Math.PI*2);
    ctx.fillStyle="rgba(255,230,150,0.04)";
    ctx.fill();

    /* border */
    ctx.beginPath();
    ctx.arc(x,y,32,0,Math.PI*2);
    ctx.strokeStyle="rgba(255,230,150,0.2)";
    ctx.stroke();

    /* icon */
    if(img.complete){
      ctx.drawImage(img,x-26,y-26,52,52);
    }

    /* label hover simple */
    ctx.fillStyle="rgba(255,255,255,0.7)";
    ctx.font="12px Arial";
    ctx.textAlign="center";
    ctx.fillText(i.name,x,y+55);

  });

  requestAnimationFrame(draw);
}

draw();
