
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

let w = canvas.width = window.innerWidth;
let h = canvas.height = window.innerHeight;

/* =========================
   INPUT STATE
========================= */

let mouse = { x:w/2, y:h/2 };
let focusNode = null;

document.addEventListener("mousemove",(e)=>{
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

/* =========================
   CONSTELLATION NODES
========================= */

let nodes = [
  { name:"INSTAGRAM", x:w*0.25, y:h*0.3, vx:0, vy:0, group:"social" },
  { name:"TWITTER", x:w*0.3, y:h*0.4, vx:0, vy:0, group:"social" },
  { name:"YOUTUBE", x:w*0.2, y:h*0.5, vx:0, vy:0, group:"social" },

  { name:"SPOTIFY", x:w*0.65, y:h*0.3, vx:0, vy:0, group:"music" },
  { name:"SOUNDCLOUD", x:w*0.7, y:h*0.4, vx:0, vy:0, group:"music" },
  { name:"APPLE MUSIC", x:w*0.6, y:h*0.5, vx:0, vy:0, group:"music" },

  { name:"TWITCH", x:w*0.5, y:h*0.65, vx:0, vy:0, group:"video" }
];

const colors = {
  social:"#6aa6ff",
  music:"#ff7ad9",
  video:"#7affc2"
};

/* =========================
   MAIN LOOP
========================= */

function update(){

  ctx.clearRect(0,0,w,h);

  drawLinks();

  nodes.forEach(n=>{

    let dx = n.x - mouse.x;
    let dy = n.y - mouse.y;
    let dist = Math.sqrt(dx*dx + dy*dy);

    /* =========================
       MOUSE FIELD (SOFT)
    ========================= */
    if(dist < 220){

      let force = (1 - dist/220) * 0.35;

      n.vx += dx * force * 0.002;
      n.vy += dy * force * 0.002;
    }

    /* =========================
       CLUSTER GRAVITY
    ========================= */
    let gx = w*0.5;
    let gy = h*0.5;

    if(n.group === "social") gx = w*0.3;
    if(n.group === "music") gx = w*0.65;
    if(n.group === "video") gx = w*0.5;

    n.vx += (gx - n.x) * 0.0015;
    n.vy += (gy - n.y) * 0.0015;

    /* =========================
       FOCUS STATE (ZOOM FEEL)
    ========================= */
    if(focusNode && focusNode !== n){

      let fx = focusNode.x - n.x;
      let fy = focusNode.y - n.y;

      n.vx += fx * 0.0008;
      n.vy += fy * 0.0008;
    }

    /* =========================
       DAMPING (STABILITY)
    ========================= */
    n.vx *= 0.92;
    n.vy *= 0.92;

    n.x += n.vx;
    n.y += n.vy;

  });

  drawNodes();

  requestAnimationFrame(update);
}

/* =========================
   CONSTELLATION LINKS
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

        ctx.strokeStyle = colors[a.group];
        ctx.globalAlpha = 0.12;
        ctx.lineWidth = 1;
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

    let size = 10;

    if(focusNode === n) size = 16;

    /* glow */
    ctx.beginPath();
    ctx.arc(n.x,n.y,size,0,Math.PI*2);

    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = focusNode === n ? 35 : 20;

    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = "white";
    ctx.font = focusNode === n ? "12px Arial" : "10px Arial";
    ctx.fillText(n.name, n.x+14, n.y+4);
  });
}

/* =========================
   CLICK → FOCUS SYSTEM
========================= */

canvas.addEventListener("click",(e)=>{

  let clicked = null;

  nodes.forEach(n=>{

    let dx = e.clientX - n.x;
    let dy = e.clientY - n.y;

    if(Math.sqrt(dx*dx + dy*dy) < 15){
      clicked = n;
    }
  });

  if(clicked){
    focusNode = (focusNode === clicked) ? null : clicked;
  }
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
