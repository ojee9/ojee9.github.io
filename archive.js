
let index = 0;

const world = document.getElementById("world");

function next(){
  index = (index + 1) % 4;
  update();
}

function prev(){
  index = (index - 1 + 4) % 4;
  update();
}

function update(){
  world.style.transform = `translateX(-${index * 100}vw)`;

  if(index === 3){
    setTimeout(() => neon(), 300);
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

  let lights = Array.from({length:40}).map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 2 + 1
  }));

  function draw(){

    ctx.fillStyle = "rgba(5,0,10,0.25)";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    lights.forEach(l => {

      l.y += Math.sin(t + l.x) * 0.5;
      l.x += Math.cos(t + l.y) * 0.3;

      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);

      ctx.fillStyle = "#00ffe1";
      ctx.shadowColor = "#00ffe1";
      ctx.shadowBlur = 15;

      ctx.fill();
    });

    t += 0.01;

    requestAnimationFrame(draw);
  }

  draw();
}

update();
