
let index = 0;

const world = document.getElementById("world");
const label = document.getElementById("label");
const thumbs = document.querySelectorAll(".thumb");

const names = [
  "ALL VIBES",
  "COLD TAKE",
  "HOT TAKE",
  "NEW NEON"
];

function go(i){

  if(i < 0) i = 3;
  if(i > 3) i = 0;

  index = i;
  update();
}

function update(){

  world.style.transform = `translateX(-${index * 100}vw)`;
  label.innerText = names[index];

  thumbs.forEach((t,i)=>{
    t.classList.remove("active");
    if(i === index) t.classList.add("active");
  });

  if(index === 3){
    setTimeout(neon,200);
  }
}

/* ================= NEON WATER PARTICLES ================= */
function neon(){

  const canvas = document.getElementById("neonCanvas");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let t = 0;

  let p = Array.from({length:80}).map(()=>({
    x:Math.random()*canvas.width,
    y:Math.random()*canvas.height
  }));

  function draw(){

    ctx.fillStyle="rgba(0,0,20,0.25)";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    p.forEach(o=>{

      o.x += Math.sin(t + o.y)*0.6;
      o.y += Math.cos(t + o.x)*0.6;

      ctx.beginPath();
      ctx.arc(o.x,o.y,2,0,Math.PI*2);

      ctx.fillStyle="#4fd3ff";
      ctx.shadowColor="#4fd3ff";
      ctx.shadowBlur=20;

      ctx.fill();
    });

    t += 0.01;
    requestAnimationFrame(draw);
  }

  draw();
}

update();
