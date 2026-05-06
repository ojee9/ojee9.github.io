const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const tip = document.getElementById("tip");

let w = canvas.width = window.innerWidth;
let h = canvas.height = window.innerHeight;

let mouse = { x:0, y:0 };

document.addEventListener("mousemove",(e)=>{
  mouse.x = e.clientX;
  mouse.y = e.clientY;

  tip.style.left = (mouse.x + 12) + "px";
  tip.style.top = (mouse.y + 12) + "px";
});

/* =========================
   STATIC FIXED NODES
========================= */

const nodes = [
  { name:"9ojeez9 youtube", x:w*0.25, y:h*0.5, url:"https://www.youtube.com/@9ojeez9" },
  { name:"9ojeez9 spotify", x:w*0.6, y:h*0.35, url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL" },
  { name:"9ojeez9 soundcloud", x:w*0.3, y:h*0.25, url:"https://soundcloud.com/9ojeez9" },
  { name:"9ojeez9 twitter", x:w*0.55, y:h*0.55, url:"https://twitter.com/9ojeez9" },
  { name:"9ojeez9 twitch", x:w*0.7, y:h*0.45, url:"https://twitch.tv/ojeez9" }
];

/* =========================
   STAR SHAPE
========================= */

function star(x,y,r){
  ctx.beginPath();
  for(let i=0;i<5;i++){
    let a = (Math.PI*2/5)*i - Math.PI/2;
    ctx.lineTo(
      x + Math.cos(a)*r,
      y + Math.sin(a)*r
    );
  }
  ctx.closePath();
}

/* =========================
   DRAW (NO STATE CHANGE)
========================= */

function draw(){

  ctx.clearRect(0,0,w,h);

  let hovered = null;

  nodes.forEach(n=>{

    let dx = n.x - mouse.x;
    let dy = n.y - mouse.y;
    let d = Math.sqrt(dx*dx + dy*dy);

    let isHover = d < 40;

    if(isHover) hovered = n;

    /* NODE */
    ctx.save();

    star(n.x,n.y, isHover ? 14 : 10);

    ctx.fillStyle = isHover ? "white" : "rgba(180,200,255,0.85)";
    ctx.shadowColor = "rgba(120,160,255,0.35)";
    ctx.shadowBlur = isHover ? 18 : 6;

    ctx.fill();

    ctx.restore();

  });

  /* TOOLTIP */
  if(hovered){
    tip.style.display = "block";
    tip.innerText = hovered.name;
  } else {
    tip.style.display = "none";
  }
}

/* =========================
   CLICK → OPEN LINK
========================= */

canvas.addEventListener("click",(e)=>{

  nodes.forEach(n=>{

    let dx = e.clientX - n.x;
    let dy = e.clientY - n.y;

    if(Math.sqrt(dx*dx + dy*dy) < 20){
      window.open(n.url, "_blank");
    }
  });

});

/* =========================
   LOOP (PURE RENDER ONLY)
========================= */

function loop(){
  draw();
  requestAnimationFrame(loop);
}

loop();

/* =========================
   RESIZE FIX
========================= */

window.addEventListener("resize",()=>{
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
});
