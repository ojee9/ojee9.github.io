
const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");

let w = canvas.width = window.innerWidth;
let h = canvas.height = window.innerHeight;

/* =========================
   SMALL STARFIELD (MOBILE SAFE)
========================= */

const stars = Array.from({length: 60}).map(()=>({
  x: Math.random()*w,
  y: Math.random()*h,
  r: Math.random()*1.2,
  s: Math.random()*0.2 + 0.05
}));

function draw(){

  ctx.clearRect(0,0,w,h);

  for(let s of stars){

    s.y += s.s;

    if(s.y > h){
      s.y = 0;
      s.x = Math.random()*w;
    }

    ctx.beginPath();
    ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fillStyle = "rgba(180,200,255,0.35)";
    ctx.fill();
  }

  requestAnimationFrame(draw);
}

draw();

window.addEventListener("resize",()=>{
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
});
