
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
   ICON NODES (REAL LINKS)
========================= */

let nodes = [
  {
    name:"Spotify",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/spotify.svg",
    x:w*0.65, y:h*0.3, vx:0, vy:0,
    group:"music",
    url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL"
  },
  {
    name:"SoundCloud",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/soundcloud.svg",
    x:w*0.3, y:h*0.35, vx:0, vy:0,
    group:"music",
    url:"https://soundcloud.com/9ojeez9"
  },
  {
    name:"Apple Music",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/applemusic.svg",
    x:w*0.6, y:h*0.45, vx:0, vy:0,
    group:"music",
    url:"https://music.apple.com/tr/artist/9ojeez9/1702764220"
  },

  {
    name:"YouTube",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg",
    x:w*0.25, y:h*0.55, vx:0, vy:0,
    group:"video",
    url:"https://www.youtube.com/@9ojeez9"
  },
  {
    name:"Twitch",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/twitch.svg",
    x:w*0.7, y:h*0.55, vx:0, vy:0,
    group:"video",
    url:"https://www.twitch.tv/ojeez9"
  },

  {
    name:"Deezer",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/deezer.svg",
    x:w*0.5, y:h*0.65, vx:0, vy:0,
    group:"music",
    url:"https://www.deezer.com/tr/artist/226595515"
  },

  {
    name:"Twitter",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg",
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
   LOOP (RESTORED SIMPLE PHYSICS)
========================= */

function update(){

  ctx.clearRect(0,0,w,h);

  nodes.forEach(n=>{

    let dx = n.x - mouse.x;
    let dy = n.y - mouse.y;
    let dist = Math.sqrt(dx*dx + dy*dy);

    /* minimal soft repel */
    if(dist < 160){
      let f = (1 - dist/160) * 0.25;
      n.vx += dx * f * 0.002;
      n.vy += dy * f * 0.002;
    }

    /* light drift ONLY (no heavy clustering) */
    n.vx += (w/2 - n.x) * 0.0008;
    n.vy += (h/2 - n.y) * 0.0008;

    /* damping */
    n.vx *= 0.93;
    n.vy *= 0.93;

    n.x += n.vx;
    n.y += n.vy;
  });

  drawLinks();
  drawNodes();

  requestAnimationFrame(update);
}

/* =========================
   LINKS (simple restore)
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

      if(d < 180){

        ctx.beginPath();
        ctx.moveTo(a.x,a.y);
        ctx.lineTo(b.x,b.y);

        ctx.strokeStyle = colors[a.group];
        ctx.globalAlpha = 0.12;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
}

/* =========================
   ICON DRAW (FIXED)
========================= */

function drawNodes(){

  nodes.forEach(n=>{

    let img = new Image();
    img.src = n.icon;

    let size = 18;

    let dx = n.x - mouse.x;
    let dy = n.y - mouse.y;
    let hover = Math.sqrt(dx*dx + dy*dy) < 60;

    if(hover) size = 24;

    ctx.save();
    ctx.beginPath();
    ctx.arc(n.x,n.y,size,0,Math.PI*2);
    ctx.clip();

    ctx.drawImage(img, n.x-size, n.y-size, size*2, size*2);

    ctx.restore();
  });
}

/* =========================
   CLICK
========================= */

canvas.addEventListener("click",(e)=>{

  nodes.forEach(n=>{

    let dx = e.clientX - n.x;
    let dy = e.clientY - n.y;

    if(Math.sqrt(dx*dx + dy*dy) < 18){
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
