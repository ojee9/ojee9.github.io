
let index = 0;

const bg = document.getElementById("bg");
const overlay = document.getElementById("overlay");
const label = document.getElementById("label");
const left = document.getElementById("left");
const right = document.getElementById("right");

const data = [
  {
    name:"ALL VIBES",
    color:"rgb(90,140,190)",
    bg:"https://images.unsplash.com/photo-1524492449090-8b8f2c7b0b8c"
  },
  {
    name:"COLD TAKE",
    color:"rgb(80,120,170)",
    bg:"https://images.unsplash.com/photo-1608889175123-1c6f9f6c9b6c"
  },
  {
    name:"HOT TAKE",
    color:"rgb(180,130,80)",
    bg:"https://images.unsplash.com/photo-1547887537-6158d64c35b3"
  },
  {
    name:"NEW NEON",
    color:"rgb(130,90,180)",
    bg:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee"
  }
];

/* 🎮 MAIN NAV */
function go(i){

  if(i < 0) i = 3;
  if(i > 3) i = 0;

  index = i;
  render();
}

/* 🧠 RENDER ENGINE */
function render(){

  const cur = data[index];
  const prev = data[(index-1+4)%4];
  const next = data[(index+1)%4];

  /* smooth fade */
  bg.style.opacity = 0;
  overlay.style.opacity = 0;

  setTimeout(()=>{

    bg.style.backgroundImage = `url(${cur.bg})`;
    document.body.style.background = cur.color;
    label.innerText = cur.name;

    left.style.backgroundImage = `url(${prev.bg})`;
    right.style.backgroundImage = `url(${next.bg})`;

    left.classList.add("active");
    right.classList.add("active");

    bg.style.opacity = 1;
    overlay.style.opacity = 1;

  },180);
}

/* 🧲 MICRO PARALLAX (mouse depth) */
document.addEventListener("mousemove",(e)=>{

  let x = (e.clientX / window.innerWidth - 0.5) * 10;
  let y = (e.clientY / window.innerHeight - 0.5) * 10;

  bg.style.transform = `scale(1.05) translate(${x}px,${y}px)`;
});

/* INIT */
render();
