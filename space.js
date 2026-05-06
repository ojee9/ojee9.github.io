
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
   NERVOUS SYSTEM NODES
========================= */

let nodes = [
  {
    name:"Spotify",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/spotify.svg",
    x:w*0.6, y:h*0.2,
    baseY:h*0.2,
    vx:0, vy:0,
    url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL"
  },
  {
    name:"SoundCloud",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/soundcloud.svg",
    x:w*0.3, y:h*0.25,
    baseY:h*0.25,
    vx:0, vy:0,
    url:"https://soundcloud.com/9ojeez9"
  },
  {
    name:"YouTube",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg",
    x:w*0.2, y:h*0.35,
    baseY:h*0.35,
    vx:0, vy:0,
    url:"https://www.youtube.com/@9ojeez9"
  },
  {
    name:"Twitter",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg",
    x:w*0.5, y:h*0.3,
    baseY:h*0.3,
    vx:0, vy:0,
    url:"https://www.twitter.com/9ojeez9"
  },
  {
    name:"Twitch",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/twitch.svg",
    x:w*0.7, y:h*0.35,
    baseY:h*0.35,
    vx:0, vy:0,
    url:"https://www.twitch.tv/ojeez9"
  }
];

/* =========================
   LOOP
========================= */

function update(){

  ctx.clearRect(0,0,w,h);

  nodes.forEach(n=>{

    let dx = n.x - mouse.x;
    let dy = n.y - mouse.y;
    let dist = Math.sqrt(dx*dx + dy*dy);

    /* MICRO INTERACTION ONLY */
    if(dist < 120){

      let f = (1 - dist/120) * 0.08; // VERY SMALL FORCE

      n.vx += dx * f * 0.001;
      n.vy += dy * f * 0.001;
    }

    /* ROOT SYSTEM — slight downward pull */
    n.vy += (n.baseY - n.y) * 0.01;

    /* damping */
    n.vx *= 0.95;
    n.vy *= 0.95;

    n.x += n.vx;
    n.y += n.vy;

  });

  drawConnections();
  drawNodes();

  requestAnimationFrame(update);
}

/* =========================
   CONNECTION LINES (soft nerves)
========================= */

function drawConnections(){

  for(let i=0;i<nodes.length;i++){
    for(let j=i+1;j<nodes.length;j++){

      let a = nodes[i];
      let b = nodes[j];

      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let d = Math.sqrt(dx*dx + dy*dy);

      if(d < 220){

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
   NODES (ICON ONLY, MOBILE READABLE)
========================= */

function drawNodes(){

  nodes.forEach(n=>{

    let dx = n.x - mouse.x;
    let dy = n.y - mouse.y;
    let hover = Math.sqrt(dx*dx + dy*dy) < 40;

    let size = hover ? 28 : 22;

    let img = new Image();
    img.src = n.icon;

    ctx.save();
    ctx.beginPath();
    ctx.arc(n.x,n.y,size,0,Math.PI*2);
    ctx.clip();

    ctx.drawImage(img, n.x-size, n.y-size, size*2, size*2);

    ctx.restore();

    /* subtle hover pulse only */
    if(hover){
      ctx.beginPath();
      ctx.arc(n.x,n.y,size+6,0,Math.PI*2);
      ctx.strokeStyle = "rgba(120,160,255,0.4)";
      ctx.stroke();
    }

  });
}

/* =========================
   CLICK → LINK
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
