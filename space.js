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

function createStars(){
  stars = [];
  for(let i=0;i<250;i++){
    stars.push({
      x: Math.random()*innerWidth,
      y: Math.random()*innerHeight,
      s: 0.4 + Math.random()*1.4,
      o: 0.2 + Math.random()*0.8
    });
  }
}
createStars();

/* =========================
   ICONS (DAHA YAKIN)
========================= */
const nodes = [
  { name:"YouTube", icon:"icons/youtube.png", url:"https://youtube.com/@9ojeez9", x:0.38 },
  { name:"Twitter", icon:"icons/twitter.png", url:"https://twitter.com/9ojeez9", x:0.46 },
  { name:"SoundCloud", icon:"icons/soundcloud.png", url:"https://soundcloud.com/9ojeez9", x:0.54 },
  { name:"Spotify", icon:"icons/spotify.png", url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL", x:0.62 },
  { name:"Apple Music", icon:"icons/applemusic.png", url:"https://music.apple.com", x:0.70 }
];

const images = {};
nodes.forEach(n=>{
  const img = new Image();
  img.src = n.icon;
  images[n.icon] = img;
});

/* =========================
   HOVER
========================= */
let hover = -1;

canvas.addEventListener("mousemove",(e)=>{
  hover = -1;

  nodes.forEach((n,i)=>{
    let x = n.x * innerWidth;
    let y = innerHeight/2;

    let dx = e.clientX - x;
    let dy = e.clientY - y;

    if(Math.sqrt(dx*dx + dy*dy) < 45){
      hover = i;
    }
  });

  canvas.style.cursor = hover !== -1 ? "pointer" : "default";
});

canvas.addEventListener("click",()=>{
  if(hover !== -1){
    window.open(nodes[hover].url,"_blank");
  }
});

/* =========================
   DRAW LOOP
========================= */
function draw(){

  ctx.clearRect(0,0,innerWidth,innerHeight);

  /* DEEP SPACE GRADIENT */
  const gradient = ctx.createRadialGradient(
    innerWidth/2,
    innerHeight/2,
    100,
    innerWidth/2,
    innerHeight/2,
    innerWidth
  );

  gradient.addColorStop(0,"#050510");
  gradient.addColorStop(1,"#000000");

  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,innerWidth,innerHeight);

  /* STARFIELD */
  stars.forEach(s=>{
    ctx.globalAlpha = s.o;
    ctx.fillStyle = "white";
    ctx.fillRect(s.x,s.y,1.5,1.5);

    s.y += s.s;

    if(s.y > innerHeight){
      s.y = 0;
      s.x = Math.random()*innerWidth;
    }
  });

  ctx.globalAlpha = 1;

  /* ICONS */
  nodes.forEach((n,i)=>{

    let x = n.x * innerWidth;
    let y = innerHeight/2 + Math.sin(Date.now()*0.001 + i)*6;

    let img = images[n.icon];

    ctx.save();

    let size = hover === i ? 80 : 66;

    if(hover === i){
      ctx.shadowColor = "rgba(255,255,255,0.8)";
      ctx.shadowBlur = 30;
    }

    if(img && img.complete){
      ctx.drawImage(img, x-size/2, y-size/2, size, size);
    }

    ctx.restore();

    /* HOVER TEXT */
    if(hover === i){
      ctx.save();
      ctx.fillStyle = "white";
      ctx.font = "15px Arial";
      ctx.textAlign = "center";
      ctx.shadowColor = "white";
      ctx.shadowBlur = 20;
      ctx.fillText(n.name, x, y - 55);
      ctx.restore();
    }

  });

  requestAnimationFrame(draw);
}

draw();
