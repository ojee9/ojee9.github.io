const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize",()=>{
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

/* STARFIELD (UNCHANGED) */
let stars = [];
for(let i=0;i<120;i++){
  stars.push({
    x:Math.random()*canvas.width,
    y:Math.random()*canvas.height,
    s:Math.random()*0.4
  });
}

/* ICON CACHE (PATCH ONLY) */
const imgCache = {};
function getImg(src){
  if(!imgCache[src]){
    const img = new Image();
    img.src = src;
    imgCache[src] = img;
  }
  return imgCache[src];
}

/* NODES (DO NOT TOUCH POSITIONS) */
const nodes = [
  { name:"SoundCloud", icon:"icons/soundcloud.png", x:300, y:320, url:"https://soundcloud.com/9ojeez9" },
  { name:"Spotify", icon:"icons/spotify.png", x:420, y:300, url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL" },
  { name:"Apple Music", icon:"icons/applemusic.png", x:540, y:320, url:"https://music.apple.com/tr/artist/9ojeez9/1702764220" },
  { name:"YouTube", icon:"icons/youtube.png", x:660, y:300, url:"https://www.youtube.com/@9ojeez9" },
  { name:"Twitter", icon:"icons/twitter.png", x:780, y:320, url:"https://www.twitter.com/9ojeez9" }
];

/* CLICK */
canvas.addEventListener("click",(e)=>{
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  nodes.forEach(n=>{
    let dx = mx - n.x;
    let dy = my - n.y;
    if(Math.sqrt(dx*dx+dy*dy)<30){
      window.open(n.url,"_blank");
    }
  });
});

/* LOOP */
function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  /* STARFIELD */
  ctx.fillStyle="white";
  stars.forEach(s=>{
    ctx.fillRect(s.x,s.y,1.2,1.2);
    s.y += s.s;
    if(s.y>canvas.height){
      s.y=0;
      s.x=Math.random()*canvas.width;
    }
  });

  /* ICONS */
  nodes.forEach(n=>{

    const img = getImg(n.icon);

    ctx.beginPath();
    ctx.arc(n.x,n.y,28,0,Math.PI*2);
    ctx.fillStyle="rgba(255,230,150,0.05)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(n.x,n.y,28,0,Math.PI*2);
    ctx.strokeStyle="rgba(255,230,150,0.25)";
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(n.x,n.y,26,0,Math.PI*2);
    ctx.clip();
    ctx.drawImage(img,n.x-26,n.y-26,52,52);
    ctx.restore();

    /* LABEL */
    const dx = mxCheck(n);
    if(dx){
      ctx.fillStyle="white";
      ctx.font="14px Arial";
      ctx.textAlign="center";
      ctx.fillText(n.name,n.x,n.y-40);
    }
  });

  requestAnimationFrame(draw);
}

function mxCheck(n){
  return false; // hover off (stabil version)
}

draw();
