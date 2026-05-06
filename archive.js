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

function go(i){

  if(i < 0) i = 3;
  if(i > 3) i = 0;

  index = i;
  render();
}

function render(){

  const cur = data[index];
  const prev = data[(index-1+4)%4];
  const next = data[(index+1)%4];

  /* FADE RESET */
  bg.style.opacity = 0;
  overlay.style.opacity = 0;

  setTimeout(()=>{

    /* MAIN */
    bg.style.backgroundImage = `url(${cur.bg})`;
    document.body.style.background = cur.color;
    label.innerText = cur.name;

    /* SIDE PREVIEWS */
    left.style.backgroundImage = `url(${prev.bg})`;
    right.style.backgroundImage = `url(${next.bg})`;

    left.classList.add("activePop");
    right.classList.add("activePop");

    bg.style.opacity = 1;
    overlay.style.opacity = 1;

  },200);
}

render();
