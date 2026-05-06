
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

update();
