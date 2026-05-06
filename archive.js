let index = 0;

const world = document.getElementById("world");
const centerLabel = document.getElementById("centerLabel");
const thumbs = document.querySelectorAll(".thumb");

const labels = [
  "ROMA GARDEN",
  "ICE WALL",
  "DESERT PYRAMID",
  "NEON CITY"
];

function go(i){

  if(i < 0) i = 3;
  if(i > 3) i = 0;

  index = i;
  update();
}

function update(){

  world.style.transform = `translateX(-${index * 100}vw)`;
  centerLabel.innerText = labels[index];

  /* thumbnail focus system */
  thumbs.forEach((t,i)=>{
    t.classList.remove("active");
    if(i === index) t.classList.add("active");
  });

  if(index === 3){
    setTimeout(neon,200);
  }
}

/* ================= NEON ================= */
let started = false;

function neon(){

  if(started) return;
  started = true;

  const canvas = document.getElementById("neonCanvas");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let t = 0;

  let lights = Array.from({length:80}).map(()=>({
    x:Math.random()*canvas.width,
    y:Math.random()*canvas.height
  }));

  function draw(){

    ctx.fillStyle="rgba(0,0,0,0.25)";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    lights.forEach(l=>{

      l.x += Math.cos(t + l.y)*0.4;
      l.y += Math.sin(t + l.x)*0.4;

      ctx.beginPath();
      ctx.arc(l.x,l.y,2,0,Math.PI*2);

      ctx.fillStyle="#00ffe1";
      ctx.shadowColor="#00ffe1";
      ctx.shadowBlur=20;

      ctx.fill();
    });

    t += 0.01;
    requestAnimationFrame(draw);
  }

  draw();
}

update();
