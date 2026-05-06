const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize",()=>{
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const mouse = { x: -999, y: -999 };

canvas.addEventListener("mousemove", e=>{
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

canvas.addEventListener("mouseleave", ()=>{
  mouse.x = -999;
  mouse.y = -999;
});

/* =========================
   NODES (POZİSYON SABİT)
========================= */

const nodes = [
  { name:"9ojeez9 SoundCloud", icon:"icons/soundcloud.png", x:300, y:320, url:"https://soundcloud.com/9ojeez9" },
  { name:"9ojeez9 Spotify", icon:"icons/spotify.png", x:420, y:300, url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL" },
  { name:"9ojeez9 Apple Music", icon:"icons/applemusic.png", x:540, y:320, url:"https://music.apple.com/tr/artist/9ojeez9/1702764220" },
  { name:"9ojeez9 YouTube", icon:"icons/youtube.png", x:660, y:300, url:"https://www.youtube.com/@9ojeez9" },
  { name:"9ojeez9 Twitter", icon:"icons/twitter.png", x:780, y:320, url:"https://www.twitter.com/9ojeez9" }
];

/* =========================
   CLICK
========================= */

canvas.addEventListener("click", ()=>{
  nodes.forEach(n=>{
    let dx = mouse.x - n.x;
    let dy = mouse.y - n.y;
    if(Math.sqrt(dx*dx + dy*dy) < 30){
      window.open(n.url,"_blank");
    }
  });
});

/* =========================
   DRAW LOOP
========================= */

function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  nodes.forEach(n=>{

    let dx = mouse.x - n.x;
    let dy = mouse.y - n.y;
    let hover = Math.sqrt(dx*dx + dy*dy) < 35;

    let size = 26;

    /* YILDIZ GLOW (ESKİ RENK BOZULMUYOR) */

    ctx.beginPath();
    ctx.arc(n.x, n.y, size+6, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255, 230, 150, 0.06)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(n.x, n.y, size+2, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255, 230, 150, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    /* LOGO DRAW (YILDIZ YERİNE) */

    let img = new Image();
    img.src = n.icon;

    ctx.save();
    ctx.beginPath();
    ctx.arc(n.x, n.y, size, 0, Math.PI*2);
    ctx.clip();
    ctx.drawImage(img, n.x-size, n.y-size, size*2, size*2);
    ctx.restore();

    /* HOVER TEXT */

    if(hover){
      ctx.fillStyle="white";
      ctx.font="14px Arial";
      ctx.textAlign="center";
      ctx.fillText(n.name, n.x, n.y-40);
    }

  });

  requestAnimationFrame(draw);
}

draw();
