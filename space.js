
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
   STATIC NODES (NO PHYSICS)
========================= */

let nodes = [
  { name:"9ojeez9 youtube", x:w*0.25, y:h*0.5, url:"https://www.youtube.com/@9ojeez9" },
  { name:"9ojeez9 spotify", x:w*0.6, y:h*0.35, url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL" },
  { name:"9ojeez9 soundcloud", x:w*0.3, y:h*0.25, url:"https://soundcloud.com/9ojeez9" },
  { name:"9ojeez9 twitter", x:w*0.55, y:h*0.55, url:"https://www.twitter.com/9ojeez9" },
  { name:"9ojeez9 twitch", x:w*0.7, y:h*0.45, url:"https://www.twitch.tv/ojeez9" }
];

/* =========================
   DRAW STAR ICON (NO IMAGES)
========================= */

function drawStar(x,y,r){

  ctx.beginPath();
  for(let i=0;i<5;i++){
    let angle = (Math.PI*2/5)*i - Math.PI/2;
    let sx = x + Math.cos(angle)*r;
    let sy = y + Math.sin(angle)*r;
    ctx.lineTo(sx,sy);
  }
  ctx.closePath();
}

/* =========================
   RENDER
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

    /* star */
    ctx.beginPath();
    drawStar(n.x,n.y, isHover ? 14 : 10);

    ctx.fillStyle = isHover ? "white" : "rgba(180,200,255,0.8)";
    ctx.shadowColor = "rgba(120,160,255,0.4)";
    ctx.shadowBlur = isHover ? 20 : 8;

    ctx.fill();

    ctx.shadowBlur = 0;
  });

  /* tooltip */
  if(hovered){
    tip.style.display = "block";
    tip.innerText = hovered.name;
  } else {
    tip.style.display = "none";
  }

}

/* =========================
   CLICK → OPEN
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
   LOOP (NO PHYSICS)
========================= */

function loop(){
  draw();
  requestAnimationFrame(loop);
}

loop();
