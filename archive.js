const labels = [
  "ALL / VIBES",
  "COLD TAKE",
  "HOT TAKE",
  "NEON"
];

let index = 0;

const world = document.getElementById("world");
const label = document.getElementById("label");

/* UPDATE SLIDE */
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

/* ===== BIOME EFFECTS ===== */

/* ROMA GARDEN */
function roma(){
  const el = document.getElementById("all");
  el.innerHTML = `
    <div style="
      width:100%;
      height:100%;
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:center;
      background:linear-gradient(#2a2a2a,#000);
      letter-spacing:3px;
    ">
      🏛 ROMA GARDEN
      <div style="opacity:0.5;margin-top:10px;">
        marble / symmetry / archive order
      </div>
    </div>
  `;
}

/* ICE WALL */
function cold(){
  const el = document.getElementById("cold");
  el.innerHTML = `
    <div style="
      width:100%;
      height:100%;
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:center;
      background:#0b1b2b;
      letter-spacing:3px;
    ">
      ❄ ICE WALL
      <div style="opacity:0.6;margin-top:10px;">
        silence / north / frozen memory
      </div>
    </div>
  `;
}

/* EGYPT */
function hot(){
  const el = document.getElementById("hot");
  el.innerHTML = `
    <div style="
      width:100%;
      height:100%;
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:center;
      background:#c49a3c;
      color:black;
      letter-spacing:3px;
    ">
      🏺 ANCIENT EGYPT
      <div style="opacity:0.7;margin-top:10px;">
        sand / papyrus / old signal
      </div>
    </div>
  `;
}

/* NEON */
function neon(){
  const el = document.getElementById("neon");
  el.innerHTML = `
    <div style="
      width:100%;
      height:100%;
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:center;
      background:#050014;
      color:#00ffcc;
      letter-spacing:3px;
    ">
      🌃 NEON CITY
      <div style="opacity:0.7;margin-top:10px;">
        glitch / gravity / night signals
      </div>
    </div>
  `;
}

/* INIT */
function init(){
  roma();
  cold();
  hot();
  neon();
  update();
}

init();
