const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

/* =========================
   STARFIELD
========================= */
let stars = [];
for(let i=0;i<180;i++){
  stars.push({
    x: Math.random()*innerWidth,
    y: Math.random()*innerHeight,
    speed: 0.2 + Math.random()*0.8
  });
}

/* =========================
   ICONS
========================= */
const size = 72;

const nodes = [
  { name:"YouTube", icon:"icons/YouTube.png", url:"https://youtube.com/@9ojeez9", pos:0.2 },
  { name:"Twitter", icon:"icons/Twitter.png", url:"https://twitter.com/9ojeez9", pos:0.35 },
  { name:"SoundCloud", icon:"icons/SoundCloud.png", url:"https://soundcloud.com/9ojeez9", pos:0.5 },
  { name:"Spotify", icon:"icons/Spotify.png", url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL", pos:0.65 },
  { name:"Apple Music", icon:"icons/Apple Music.png", url:"https://music.apple.com", pos:0.8 }
];

const images = {};
nodes.forEach(n=>{
  const img = new Image();
  img.src = n.icon;
  images[n.icon] = img;
});

let hoverIndex = -1;

/* =========================
   MOUSE
========================= */
canvas.addEventListener("mousemove",(e)=>{
  const mx = e.clientX;
  const my = e.clientY;
  hoverIndex = -1;

  nodes.forEach((n,i)=>{
    const x = n.pos * innerWidth;
    const y = innerHeight/2;
    const dx = mx - x;
    const dy = my - y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if(dist < size/2){
      hoverIndex = i;
    }
  });

  canvas.style.cursor = hoverIndex !== -1 ? "pointer" : "default";
});

canvas.addEventListener("click",()=>{
  if(hoverIndex !== -1){
    window.open(nodes[hoverIndex].url,"_blank");
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
    ctx.fillRect(s.x,s.y,1.5,1.5);
    s.y += s.speed;
    if(s.y > innerHeight){
      s.y = 0;
      s.x = Math.random()*innerWidth;
    }
  });

  /* ICONS */
  nodes.forEach((n,i)=>{
    const x = n.pos * innerWidth;
    const y = innerHeight/2 + Math.sin(Date.now()*0.001+i)*6;

    const img = images[n.icon];

    ctx.save();

    // Hover büyütme + glow
    let scale = (hoverIndex === i) ? 1.15 : 1;
    let drawSize = size * scale;

    if(hoverIndex === i){
      ctx.shadowColor = "rgba(255,255,255,0.6)";
      ctx.shadowBlur = 35;
    } else {
      ctx.shadowBlur = 0;
    }

    // Yuvarlak clip (kare hissini öldürür)
    ctx.beginPath();
    ctx.arc(x, y, drawSize/2, 0, Math.PI*2);
    ctx.closePath();
    ctx.clip();

    if(img.complete){
      ctx.drawImage(img, x-drawSize/2, y-drawSize/2, drawSize, drawSize);
    }

    ctx.restore();

    /* HOVER TEXT */
    if(hoverIndex === i){
      ctx.save();
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "white";
      ctx.shadowColor = "rgba(255,255,255,0.8)";
      ctx.shadowBlur = 20;
      ctx.fillText(n.name, x, y - drawSize/2 - 20);
      ctx.restore();
    }
  });

  requestAnimationFrame(draw);
}

draw();

/* ESC MAIN MENU */
document.addEventListener("keydown",(e)=>{
  if(e.key === "Escape"){
    window.location.href = "index.html";
  }
});
