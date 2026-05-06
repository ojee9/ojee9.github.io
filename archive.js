
const labels = [
  "ALL / VIBES",
  "COLD TAKE",
  "HOT TAKE",
  "NEON"
];

let index = 0;

const world = document.getElementById("world");
const label = document.getElementById("label");

function update(){
  world.style.transform = `translateX(-${index * 100}vw)`;
  label.innerText = labels[index];

  if(index === 3){
    setTimeout(() => neonEngine(), 300);
  }
}

/* NAV */
function next(){
  index = (index + 1) % 4;
  update();
}

function prev(){
  index = (index - 1 + 4) % 4;
  update();
}

/* ===== NEON ENGINE ===== */
function neonEngine(){

  const canvas = document.getElementById("neonCanvas");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let t = 0;

  let signs = [
    { x:200, y:200, text:"9o9" },
    { x:500, y:300, text:"NEON" },
    { x:800, y:400, text:"SOUND" },
    { x:300, y:500, text:"STREAM" }
  ];

  function draw(){

    ctx.fillStyle = "rgba(5,0,20,0.25)";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    signs.forEach(s => {

      s.y += Math.sin(t + s.x) * 0.4;
      s.x += Math.cos(t + s.y) * 0.3;

      let glow = Math.abs(Math.sin(t * 2)) * 25;

      ctx.font = "28px Arial";
      ctx.fillStyle = "#00ffcc";
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = glow;

      ctx.fillText(s.text, s.x, s.y);
    });

    t += 0.01;

    requestAnimationFrame(draw);
  }

  draw();
}

update();
