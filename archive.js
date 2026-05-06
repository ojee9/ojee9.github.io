
let index = 0;

const world = document.getElementById("world");
const centerLabel = document.getElementById("centerLabel");

/* BIOME LABELS */
const labels = [
  "ROMA GARDEN",
  "ICE WALL",
  "DESERT PYRAMID",
  "NEON CITY"
];

/* NAV SYSTEM */
function go(i){
  index = i;
  update();
}

function update(){
  world.style.transform = `translateX(-${index * 100}vw)`;
  centerLabel.innerText = labels[index];

  if(index === 3){
    setTimeout(() => neon(), 200);
  }
}

/* ================= NEON CITY ENGINE ================= */
function neon(){

  const canvas = document.getElementById("neonCanvas");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let t = 0;

  /* procedural city lights */
  let lights = Array.from({length:70}).map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    v: Math.random() * 0.5 + 0.2
  }));

  function draw(){

    /* trailing fade */
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    lights.forEach(l => {

      /* gravity-like drift */
      l.x += Math.cos(t + l.y) * l.v;
      l.y += Math.sin(t + l.x) * l.v;

      /* wrap */
      if(l.x < 0) l.x = canvas.width;
      if(l.x > canvas.width) l.x = 0;
      if(l.y < 0) l.y = canvas.height;
      if(l.y > canvas.height) l.y = 0;

      /* glow light */
      ctx.beginPath();
      ctx.arc(l.x, l.y, 2, 0, Math.PI * 2);

      ctx.fillStyle = "#00ffe1";
      ctx.shadowColor = "#00ffe1";
      ctx.shadowBlur = 18;

      ctx.fill();
    });

    t += 0.01;
    requestAnimationFrame(draw);
  }

  draw();
}

/* INIT */
update();
