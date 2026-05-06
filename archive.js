
let index = 0;

const biome = document.getElementById("biome");
const left = document.getElementById("left");
const right = document.getElementById("right");
const tabs = document.querySelectorAll(".tab");

const data = [
  {
    name:"ALL VIBES",
    img:"https://images.unsplash.com/photo-1524492449090-8b8f2c7b0b8c"
  },
  {
    name:"COLD TAKE",
    img:"https://images.unsplash.com/photo-1608889175123-1c6f9f6c9b6c"
  },
  {
    name:"HOT TAKE",
    img:"https://images.unsplash.com/photo-1547887537-6158d64c35b3"
  },
  {
    name:"NEW NEON",
    img:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee"
  }
];

function go(i){

  if(i < 0) i = 3;
  if(i > 3) i = 0;

  index = i;
  render();
}

function render(){

  const cur = data[index];

  /* MAIN */
  biome.style.backgroundImage = `url(${cur.img})`;

  /* LEFT / RIGHT PREVIEW */
  left.style.backgroundImage = `url(${data[(index-1+4)%4].img})`;
  right.style.backgroundImage = `url(${data[(index+1)%4].img})`;

  /* TABS */
  tabs.forEach((t,i)=>{
    t.classList.remove("active");
    if(i === index) t.classList.add("active");
  });

  /* NEON ONLY */
  if(index === 3) neon();
}

/* ================= NEON ================= */
function neon(){

  const canvas = document.getElementById("neonCanvas");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let t = 0;

  let p = Array.from({length:60}).map(()=>({
    x:Math.random()*canvas.width,
    y:Math.random()*canvas.height
  }));

  function draw(){

    ctx.fillStyle="rgba(0,0,0,0.25)";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    p.forEach(o=>{

      o.x += Math.sin(t + o.y)*0.5;
      o.y += Math.cos(t + o.x)*0.5;

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

render();
