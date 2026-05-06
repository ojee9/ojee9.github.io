
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

let w = canvas.width = window.innerWidth;
let h = canvas.height = window.innerHeight;

let mouse = { x:0, y:0 };

document.addEventListener("mousemove",(e)=>{
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

/* =========================
   PLATFORM COLORS
========================= */

const colors = {
  youtube:"#ff4b4b",
  spotify:"#1ed760",
  soundcloud:"#ff8c42",
  twitter:"#7aa2ff",
  instagram:"#ff5ccf"
};

/* =========================
   ORDERED CONSTELLATION LAYOUT
========================= */

const nodes = [
  { name:"9ojeez9 YouTube", x:w*0.2, y:h*0.25, url:"https://www.youtube.com/@9ojeez9", type:"youtube" },
  { name:"9ojeez9 Spotify", x:w*0.5, y:h*0.2, url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL", type:"spotify" },
  { name:"9ojeez9 Twitter", x:w*0.8, y:h*0.25, url:"https://twitter.com/9ojeez9", type:"twitter" },

  { name:"9ojeez9 SoundCloud", x:w*0.3, y:h*0.55, url:"https://soundcloud.com/9ojeez9", type:"soundcloud" },
  { name:"9ojeez9 Instagram", x:w*0.7, y:h*0.55, url:"https://instagram.com/9ojeez9", type:"instagram" }
];

/* =========================
   DRAW STAR NODE
========================= */

function drawStar(x,y,r){

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
   RENDER
========================= */

function draw(){

  ctx.clearRect(0,0,w,h);

  let hovered = null;

  nodes.forEach(n=>{

    let dx = n.x - mouse.x;
    let dy = n.y - mouse.y;
    let d = Math.sqrt(dx*dx + dy*dy);

    let isHover = d < 45;

    if(isHover) hovered = n;

    let col = colors[n.type] || "#ffffff";

    /* glow */
    ctx.beginPath();
    ctx.arc(n.x,n.y,16,0,Math.PI*2);
    ctx.fillStyle = col + "22";
    ctx.fill();

    /* star */
    ctx.save();

    drawStar(n.x,n.y, isHover ? 14 : 10);

    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = isHover ? 18 : 8;

    ctx.fill();

    ctx.restore();

    /* label */
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "12px Arial";
    ctx.fillText(n.name, n.x + 14, n.y + 4);

  });

}

/* =========================
   CLICK
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
   LOOP
========================= */

function loop(){
  draw();
  requestAnimationFrame(loop);
}

loop();

/* =========================
   RESIZE SAFE
========================= */

window.addEventListener("resize",()=>{
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
});
