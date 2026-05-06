
let index = 0;

const bg = document.getElementById("bg");
const overlay = document.getElementById("overlay");
const label = document.getElementById("label");
const thumbs = document.getElementById("thumbs");

const data = [
  {
    name:"ALL VIBES",
    color:"rgb(80,120,180)",
    bg:"https://images.unsplash.com/photo-1524492449090-8b8f2c7b0b8c",
    thumbs:[
      "https://images.unsplash.com/photo-1524492449090-8b8f2c7b0b8c"
    ]
  },
  {
    name:"COLD TAKE",
    color:"rgb(80,120,160)",
    bg:"https://images.unsplash.com/photo-1608889175123-1c6f9f6c9b6c",
    thumbs:[
      "https://images.unsplash.com/photo-1608889175123-1c6f9f6c9b6c"
    ]
  },
  {
    name:"HOT TAKE",
    color:"rgb(160,120,80)",
    bg:"https://images.unsplash.com/photo-1547887537-6158d64c35b3",
    thumbs:[
      "https://images.unsplash.com/photo-1547887537-6158d64c35b3"
    ]
  },
  {
    name:"NEW NEON",
    color:"rgb(120,80,160)",
    bg:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    thumbs:[
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee"
    ]
  }
];

function go(i){

  if(i < 0) i = 3;
  if(i > 3) i = 0;

  index = i;
  render();
}

function render(){

  const d = data[index];

  /* FADE EFFECT */
  bg.style.opacity = 0;
  overlay.style.opacity = 0;

  setTimeout(()=>{

    bg.style.backgroundImage = `url(${d.bg})`;
    overlay.style.background = `rgba(0,0,0,0.35)`;
    document.body.style.background = d.color;
    label.innerText = d.name;

    /* thumbs rebuild */
    thumbs.innerHTML = "";
    d.thumbs.forEach((t,i)=>{
      const el = document.createElement("div");
      el.className = "thumb active";
      el.innerHTML = `<img src="${t}">`;
      thumbs.appendChild(el);
    });

    bg.style.opacity = 1;
    overlay.style.opacity = 1;

  },200);
}

render();
