(function(){

/* =========================
   GLOBAL STATE
========================= */
window.APP = {
  scene: "HOT"
};

/* =========================
   SCENES (ARCHIVE DATA)
========================= */
window.SCENES = {
  HOT: {
    name: "HOT TAKE",
    bg: "images/desert.jpg"
  },
  COLD: {
    name: "COLD TAKE",
    bg: "images/icewall.jpg"
  },
  ALL: {
    name: "ALL VIBES",
    bg: "images/rome.jpg"
  },
  NEON: {
    name: "NEW NEON",
    bg: "images/neon.jpg"
  }
};

/* =========================
   APPLY SCENE (ARCHIVE UI)
========================= */
function applyScene(){

  const scene = window.SCENES[window.APP.scene];
  if(!scene) return;

  const bg = document.getElementById("archive-bg");
  if(bg){
    bg.style.backgroundImage = `url(${scene.bg})`;
    bg.style.backgroundSize = "cover";
    bg.style.backgroundPosition = "center";
  }

  const title = document.getElementById("archive-title");
  if(title){
    title.innerText = scene.name;
  }

  window.dispatchEvent(new Event("sceneChanged"));
}

/* =========================
   SCENE SWITCH
========================= */
window.setScene = function(id){
  if(window.SCENES[id]){
    window.APP.scene = id;
    applyScene();
  }
};

window.nextScene = function(){
  const order = ["HOT","COLD","ALL","NEON"];
  let i = order.indexOf(window.APP.scene);
  i = (i + 1) % order.length;
  setScene(order[i]);
};

window.prevScene = function(){
  const order = ["HOT","COLD","ALL","NEON"];
  let i = order.indexOf(window.APP.scene);
  i = (i - 1 + order.length) % order.length;
  setScene(order[i]);
};

window.goMainMenu = function(){
  window.APP.scene = "HOT";
  applyScene();
};

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded",()=>{

  const left = document.getElementById("archive-left");
  const right = document.getElementById("archive-right");
  const home = document.getElementById("archive-home");

  if(left) left.onclick = prevScene;
  if(right) right.onclick = nextScene;
  if(home) home.onclick = goMainMenu;

  applyScene();

});

})();
