
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

let w = canvas.width = window.innerWidth;
let h = canvas.height = window.innerHeight;

/* =========================
   MOUSE FIELD
========================= */
let mouse = { x:w/2, y:h/2 };

document.addEventListener("mousemove",(e)=>{
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

/* =========================
   CONSTELLATION GROUPS
========================= */

let nodes = [
  // SOCIAL CORE CLUSTER
  { name:"INSTAGRAM", x:w*0.3, y:h*0.3, vx:0, vy:0, group:"social" },
  { name:"TWITTER", x:w*0.35, y:h*0.4, vx:0, vy:0, group:"social" },
  { name:"TIKTOK", x:w*0.25, y:h*0.45, vx:0, vy:0, group:"social" },

  // MUSIC CLUSTER
  { name:"SPOTIFY", x:w*0.6, y:h*0.3, vx:0, vy:0, group:"music" },
  { name:"SOUNDCLOUD", x:w*0.65, y:h*0.4, vx:0, vy:0, group:"music" },
  { name:"APPLE MUSIC", x:w*0.55, y:h*0.45, vx:0, vy:0, group:"music" },

  // VIDEO CLUSTER
  { name:"YOUTUBE", x:w*0.5, y:h*0.6, vx:0, vy:0, group:"video" },
  { name:"TWITCH", x:w*0.6, y:h*0.65, vx:0, vy:0, group:"video" },
];

/* =========================
   COLORS BY GROUP
========================= */

const colors = {
  social:"#6aa6ff",
  music:"#ff7ad9",
  video:"#7affc2"
};

/* =========================
   UPDATE LOOP
========================= */

function update(){

  ctx.clearRect(0,0,w,h);

  /* LINKS FIRST (behind nodes) */
  drawLinks();

  nodes.forEach(n=>{

    let dx = n.x - mouse.x;
    let dy = n.y - mouse.y;
    let dist = Math.sqrt(dx*dx + dy*dy);

    /* SOFT FIELD (NOT REPULSION) */
    if(dist < 180){

      let force = (1 - dist/180) * 0.4;

      n.vx += dx * force * 0.002;
      n.vy += dy * force * 0.002;
    }

    /* GROUP GRAVITY (cluster stability) */
    let gx = w*0.5;
    let gy = h*0.5;

    if(n.group === "social") gx = w*0.3;
    if(n.group === "music") gx = w*0.6;
    if(n.group === "video") gx = w*0.5;

    n.vx += (gx - n.x) * 0.002;
    n.vy += (gy - n.y) * 0.002;

    /* damping */
    n.vx *= 0.92;
    n.vy *= 0.92;

    n.x += n.vx;
    n.y += n.vy;

  });

  drawNodes();

  requestAnimationFrame(update);
}

/* =========================
   DRAW LINKS
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
        ctx.globalAlpha = 0.15;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
}

/* =========================
   DRAW NODES
========================= */

function drawNodes(){

  nodes.forEach(n=>{

    let col = colors[n.group];

    /* glow */
    ctx.beginPath();
    ctx.arc(n.x,n.y,12,0,Math.PI*2);

    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 20;
    ctx.fill();

    /* label */
    ctx.shadowBlur = 0;
    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.fillText(n.name, n.x+14, n.y+4);
  });
}

/* =========================
   CLICK INTERACTION
========================= */

canvas.addEventListener("click",(e)=>{

  nodes.forEach(n=>{

    let dx = e.clientX - n.x;
    let dy = e.clientY - n.y;

    if(Math.sqrt(dx*dx + dy*dy) < 15){
      console.log("OPEN NODE:", n.name);
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

/* START */
update();
