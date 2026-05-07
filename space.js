const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

window.addEventListener("resize",()=>{
  canvas.width = innerWidth;
  canvas.height = innerHeight;
});

/* =========================
   STARFIELD
========================= */
let stars = [];

for(let i=0;i<200;i++){
  stars.push({
    x: Math.random()*innerWidth,
    y: Math.random()*innerHeight,
    s: 0.5 + Math.random()*1.2
  });
}

/* =========================
   ICONS (TRANSPARENT PNG)
========================= */
const nodes = [
  { name:"YouTube", icon:"icons/youtube.png", url:"https://youtube.com/@9ojeez9", x:0.2 },
  { name:"Twitter", icon:"icons/twitter.png", url:"https://twitter.com/9ojeez9", x:0.35 },
  { name:"SoundCloud", icon:"icons/soundcloud.png", url:"https://soundcloud.com/9ojeez9", x:0.5 },
  { name:"Spotify", icon:"icons/spotify.png", url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL", x:0.65 },
  { name:"Apple Music", icon:"icons/applemusic.png", url:"https://music.apple.com", x:0.8 }
];

const images = {};
nodes.forEach(n=>{
  const img = new Image();
  img.src = n.icon;
  images[n.icon] = img;
});

/* =========================
   HOVER STATE
========================= */
let hover = -1;

/* =========================
   MOUSE
========================= */
canvas.addEventListener("mousemove",(e)=>{
  hover = -1;

  nodes.forEach((n,i)=>{
    let x = n.x * innerWidth;
    let y = innerHeight/2;

    let dx = e.clientX - x;
    let dy = e.clientY - y;

    if(Math.sqrt(dx*dx + dy*dy) < 40){
      hover = i;
    }
  });

  canvas.style.cursor = hover !== -1 ? "pointer" : "default";
});

canvas.addEventListener("click",(e)=>{
  if(hover !== -1){
    window.open(nodes[hover].url,"_blank");
  }
});

/* =========================
   DRAW LOOP
========================= */
function draw(){

  ctx.clearRect(0,0,innerWidth,innerHeight);

  /* STARFIELD */
  ctx.fillStyle = "white";

  stars.forEach(s=>{
    ctx.fillRect(s.x,s.y,1.2,1.2);

    s.y += s.s;

    if(s.y > innerHeight){
      s.y = 0;
      s.x = Math.random()*innerWidth;
    }
  });

  /* ICONS */
  nodes.forEach((n,i)=>{

    let x = n.x * innerWidth;
    let y = innerHeight/2 + Math.sin(Date.now()*0.001 + i)*8;

    let img = images[n.icon];

    ctx.save();

    let size = hover === i ? 78 : 64;

    /* glow */
    if(hover === i){
      ctx.shadowColor = "rgba(255,255,255,0.6)";
      ctx.shadowBlur = 25;
    }

    /* circular mask (remove square background feel) */
    ctx.beginPath();
    ctx.arc(x, y, size/2, 0, Math.PI*2);
    ctx.clip();

    if(img && img.complete){
      ctx.drawImage(img, x-size/2, y-size/2, size, size);
    }

    ctx.restore();

    /* hover text */
    if(hover === i){
      ctx.save();
      ctx.fillStyle = "white";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.shadowColor = "white";
      ctx.shadowBlur = 15;
      ctx.fillText(n.name, x, y - 50);
      ctx.restore();
    }

  });

  requestAnimationFrame(draw);
}

draw();
