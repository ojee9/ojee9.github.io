const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

let w = canvas.width = window.innerWidth;
let h = canvas.height = window.innerHeight;

let mouse = { x:w/2, y:h/2 };

document.addEventListener("mousemove",(e)=>{
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

/* =========================
   ICON LOADER (SAFE)
========================= */

function icon(url){
  let i = new Image();
  i.src = url;
  return i;
}

/* =========================
   CONSTELLATION NODES
========================= */

let nodes = [
  {
    name:"Spotify",
    icon:icon("https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/spotify.svg"),
    x:w*0.65, y:h*0.3, vx:0, vy:0,
    group:"music",
    url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL"
  },
  {
    name:"SoundCloud",
    icon:icon("https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/soundcloud.svg"),
    x:w*0.3, y:h*0.35, vx:0, vy:0,
    group:"music",
    url:"https://soundcloud.com/9ojeez9"
  },
  {
    name:"Apple Music",
    icon:icon("https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/applemusic.svg"),
    x:w*0.6, y:h*0.45, vx:0, vy:0,
    group:"music",
    url:"https://music.apple.com/tr/artist/9ojeez9/1702764220"
  },
  {
    name:"YouTube",
    icon:icon("https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg"),
    x:w*0.25, y:h*0.55, vx:0, vy:0,
    group:"video",
    url:"https://www.youtube.com/@9ojeez9"
  },
  {
    name:"Twitch",
    icon:icon("https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/twitch.svg"),
    x:w*0.7, y:h*0.55, vx:0, vy:0,
    group:"video",
    url:"https://www.twitch.tv/ojeez9"
  },
  {
    name:"Deezer",
    icon:icon("https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/deezer.svg"),
    x:w*0.5, y:h*0.65, vx:0, vy:0,
    group:"music",
    url:"https://www.deezer.com/tr/artist/226595515"
  },
  {
    name:"Twitter",
    icon:icon("https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg"),
    x:w*0.4, y:h*0.25, vx:0, vy:0,
    group:"social",
    url:"https://www.twitter.com/9ojeez9"
  }
];

const colors = {
  music:"#ff7ad9",
  video:"#7affc2",
  social:"#6aa6ff"
};

/* =========================
   UPDATE LOOP (STABLE PHYSICS)
========================= */

function update(){

  ctx.clearRect(0,0,w,h);

  drawLinks();

  nodes.forEach(n=>{

    let dx = n.x - mouse.x;
    let dy = n.y - mouse.y;
    let dist = Math.sqrt(dx*dx + dy*dy);

    /* soft interaction only */
    if(dist < 160){
      let f = (1 - dist/160) * 0.2;
      n.vx += dx * f * 0.0015;
      n.vy += dy * f * 0.0015;
    }

    /* minimal drift (NO chaos) */
    n.vx += (w/2 - n.x) * 0.0006;
    n.vy += (h/2 - n.y) * 0.0006;

    /* damping */
    n.vx *= 0.94;
    n.vy *= 0.94;

    n.x += n.vx;
    n.y += n.vy;
  });

  drawNodes();

  requestAnimationFrame(update);
}

/* =========================
   LINKS (soft nerves)
========================= */

function drawLinks(){

  for(let i=0;i<nodes.length;i++){
    for(let j=i+1;j<nodes.length;j++){

      let a = nodes[i];
      let b = nodes[j];

      if(a.group !== b.group) continue;

      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let d = Math.sqrt(dx*dx + dy*dy);

      if(d < 200){

        ctx.beginPath();
        ctx.moveTo(a.x,a.y);
        ctx.lineTo(b.x,b.y);

        ctx.strokeStyle = "rgba(120,160,255,0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}

/* =========================
   BRIGHT ICON RENDER (FIXED VISIBILITY)
========================= */

function drawNodes(){

  nodes.forEach(n=>{

    let dx = n.x - mouse.x;
    let dy = n.y - mouse.y;
    let hover = Math.sqrt(dx*dx + dy*dy) < 45;

    let size = hover ? 30 : 24;

    /* --- glow base --- */
    ctx.beginPath();
    ctx.arc(n.x,n.y,size+6,0,Math.PI*2);
    ctx.fillStyle = "rgba(120,180,255,0.10)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(n.x,n.y,size+3,0,Math.PI*2);
    ctx.strokeStyle = "rgba(180,220,255,0.25)";
    ctx.stroke();

    /* --- dark backing for readability --- */
    ctx.beginPath();
    ctx.arc(n.x,n.y,size,0,Math.PI*2);
    ctx.fillStyle = "rgba(10,12,18,0.92)";
    ctx.fill();

    /* --- icon --- */
    ctx.save();
    ctx.beginPath();
    ctx.arc(n.x,n.y,size-2,0,Math.PI*2);
    ctx.clip();

    ctx.filter = "invert(1) brightness(1.2) drop-shadow(0 0 6px rgba(120,180,255,0.6))";

    ctx.drawImage(n.icon, n.x-size, n.y-size, size*2, size*2);

    ctx.restore();
    ctx.filter = "none";

    /* hover ring */
    if(hover){
      ctx.beginPath();
      ctx.arc(n.x,n.y,size+10,0,Math.PI*2);
      ctx.strokeStyle = "rgba(180,220,255,0.4)";
      ctx.stroke();
    }
  });
}

/* =========================
   CLICK → OPEN LINK
========================= */

canvas.addEventListener("click",(e)=>{

  nodes.forEach(n=>{

    let dx = e.clientX - n.x;
    let dy = e.clientY - n.y;

    if(Math.sqrt(dx*dx + dy*dy) < 22){
      window.open(n.url, "_blank");
    }
  });
});

/* =========================
   RESIZE
========================= */

window.addEventListener("resize",()=>{
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
});

update();
