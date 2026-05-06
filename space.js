
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const preview = document.getElementById("preview");

let w = canvas.width = window.innerWidth;
let h = canvas.height = window.innerHeight;

let mouse = { x:w/2, y:h/2 };
let hovered = null;

/* =========================
   MOUSE
========================= */

document.addEventListener("mousemove",(e)=>{
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

/* =========================
   PRELOAD ICONS (IMPORTANT FIX)
========================= */

function loadIcon(url){
  let img = new Image();
  img.src = url;
  return img;
}

/* =========================
   NODES
========================= */

let nodes = [
  {
    name:"Spotify",
    icon:loadIcon("https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/spotify.svg"),
    x:w*0.65, y:h*0.3, vx:0, vy:0,
    group:"music",
    url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL",
    desc:"Main streaming hub"
  },
  {
    name:"SoundCloud",
    icon:loadIcon("https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/soundcloud.svg"),
    x:w*0.3, y:h*0.35, vx:0, vy:0,
    group:"music",
    url:"https://soundcloud.com/9ojeez9",
    desc:"Raw uploads & drafts"
  },
  {
    name:"YouTube",
    icon:loadIcon("https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg"),
    x:w*0.25, y:h*0.55, vx:0, vy:0,
    group:"video",
    url:"https://www.youtube.com/@9ojeez9",
    desc:"Visual archive"
  },
  {
    name:"Twitch",
    icon:loadIcon("https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/twitch.svg"),
    x:w*0.7, y:h*0.55, vx:0, vy:0,
    group:"video",
    url:"https://www.twitch.tv/ojeez9",
    desc:"Live signal"
  },
  {
    name:"Twitter",
    icon:loadIcon("https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg"),
    x:w*0.4, y:h*0.25, vx:0, vy:0,
    group:"social",
    url:"https://www.twitter.com/9ojeez9",
    desc:"Updates"
  }
];

const colors = {
  music:"#ff7ad9",
  video:"#7affc2",
  social:"#6aa6ff"
};

/* =========================
   LOOP
========================= */

function update(){

  ctx.clearRect(0,0,w,h);

  hovered = null;

  nodes.forEach(n=>{

    let dx = n.x - mouse.x;
    let dy = n.y - mouse.y;
    let dist = Math.sqrt(dx*dx + dy*dy);

    let isHover = dist < 40;

    if(isHover){
      hovered = n;
    }

    /* soft repel */
    if(dist < 140){
      let f = (1 - dist/140) * 0.2;
      n.vx += dx * f * 0.002;
      n.vy += dy * f * 0.002;
    }

    /* light drift */
    n.vx += (w/2 - n.x) * 0.0007;
    n.vy += (h/2 - n.y) * 0.0007;

    /* damping */
    n.vx *= 0.93;
    n.vy *= 0.93;

    n.x += n.vx;
    n.y += n.vy;
  });

  drawLinks();
  drawNodes();
  updatePreview();

  requestAnimationFrame(update);
}

/* =========================
   LINKS
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
   NODES (ICON + HOVER GLOW)
========================= */

function drawNodes(){

  nodes.forEach(n=>{

    let dx = n.x - mouse.x;
    let dy = n.y - mouse.y;
    let hover = Math.sqrt(dx*dx + dy*dy) < 40;

    let col = colors[n.group];

    let size = hover ? 26 : 18;

    ctx.save();
    ctx.beginPath();
    ctx.arc(n.x,n.y,size,0,Math.PI*2);
    ctx.clip();

    ctx.drawImage(n.icon, n.x-size, n.y-size, size*2, size*2);

    ctx.restore();

    if(hover){
      ctx.beginPath();
      ctx.arc(n.x,n.y,size+6,0,Math.PI*2);
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });
}

/* =========================
   PREVIEW SYSTEM
========================= */

function updatePreview(){

  if(!hovered){
    preview.style.display = "none";
    return;
  }

  preview.style.display = "block";

  preview.style.left = hovered.x + "px";
  preview.style.top = hovered.y + "px";

  preview.innerHTML = `
    <b>${hovered.name}</b><br>
    ${hovered.desc}
  `;
}

/* =========================
   CLICK → LINK
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
