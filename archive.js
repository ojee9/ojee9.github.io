const scenes = document.querySelectorAll(".scene");
const title = document.getElementById("title");

const names = ["HOT TAKE","NEW NEON","COLD TAKE","ALL VIBES"];

const skins = [
  "images/hot.jpg",
  "images/neon.jpg",
  "images/cold.jpg",
  "images/all.jpg"
];

let current = 0;

function update(){

  scenes.forEach(s=>s.classList.remove("active"));
  scenes[current].classList.add("active");

  scenes[current].style.backgroundImage = `url(${skins[current]})`;
  scenes[current].style.backgroundSize = "cover";

  title.innerText = names[current];
}

document.getElementById("next").onclick=()=>{
  current = (current+1)%4;
  update();
};

document.getElementById("prev").onclick=()=>{
  current = (current-1+4)%4;
  update();
};

update();
