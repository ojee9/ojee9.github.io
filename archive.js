
const categories = [
  "all",
  "cold",
  "hot",
  "neon"
];

let index = 0;

const scene = document.getElementById("scene");
const categoryText = document.getElementById("category");
const fade = document.getElementById("fade");

function setScene(){

  let mode = categories[index];

  categoryText.innerText = mode.toUpperCase();

  fade.style.opacity = 1;

  setTimeout(() => {

    render(mode);

    fade.style.opacity = 0;

  }, 300);

}

/* NEXT / PREV */
function next(){
  index = (index + 1) % categories.length;
  setScene();
}

function prev(){
  index = (index - 1 + categories.length) % categories.length;
  setScene();
}

/* SCENES */
function render(mode){

  if(mode === "all"){
    scene.innerHTML = `
      <div style="
        width:100%;
        height:100%;
        background:linear-gradient(#1a1a1a,#000);
        display:flex;
        justify-content:center;
        align-items:center;
      ">
        🏛 ROMAN GARDEN / ALL VIBES
      </div>
    `;
  }

  if(mode === "cold"){
    scene.innerHTML = `
      <div style="
        width:100%;
        height:100%;
        background:#0b1b2b;
        display:flex;
        justify-content:center;
        align-items:center;
      ">
        ❄ ICE WALL / COLD TAKE / NORTH GODS
      </div>
    `;
  }

  if(mode === "hot"){
    scene.innerHTML = `
      <div style="
        width:100%;
        height:100%;
        background:#c49a3c;
        color:black;
        display:flex;
        justify-content:center;
        align-items:center;
      ">
        🏺 ANCIENT EGYPT / HOT TAKE / PAPYRUS
      </div>
    `;
  }

  if(mode === "neon"){
    scene.innerHTML = `
      <div style="
        width:100%;
        height:100%;
        background:#050014;
        color:#00ffcc;
        display:flex;
        justify-content:center;
        align-items:center;
      ">
        🌃 NEON CITY / GRAVITY STREET / DIGITAL NIGHT
      </div>
    `;
  }

}

setScene();
