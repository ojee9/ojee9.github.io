
(function(){

/* =========================
   SCENES DATA
========================= */
window.SCENES = window.SCENES || {

  HOT: {
    name: "HOT TAKE",
    bg: "images/desert.jpg",
    skin: "skins/papyrus.css",
    color: "#ffb347",
    highlights: []
  },

  COLD: {
    name: "COLD TAKE",
    bg: "images/icewall.jpg",
    skin: "skins/stone.css",
    color: "#6ec6ff",
    highlights []
  },

  ALL: {
    name: "ALL VIBES",
    bg: "images/rome.jpg",
    skin: "skins/glass.css",
    color: "#9ad0ff",
    highlights: []
  },

  NEON: {
    name: "NEW NEON",
    bg: "images/neon.jpg",
    skin: "skins/neonboard.css",
    color: "#c77dff",
    highlights: []
  }

};

/* =========================
   STATE
========================= */
window.currentScene = window.currentScene || "HOT";

/* =========================
   GET SCENE
========================= */
window.getScene = function(){
  return window.SCENES[window.currentScene];
};

/* =========================
   SET SCENE
========================= */
window.setScene = function(id){
  if(window.SCENES[id]){
    window.currentScene = id;
    renderScene();
  }
};

/* =========================
   MAIN MENU RETURN
========================= */
window.goMainMenu = function(){
  window.currentScene = "MENU";
  renderScene();
};

/* =========================
   RENDER BACKGROUND
========================= */
function renderBackground(){

  const scene = window.getScene();
  if(!scene || !scene.bg) return;

  const bg = document.getElementById("archive-bg");

  if(bg){
    bg.style.backgroundImage = `url(${scene.bg})`;
    bg.style.backgroundSize = "cover";
    bg.style.backgroundPosition = "center";
  }
}

/* =========================
   SCENE RENDER
========================= */
function renderScene(){

  const scene = window.getScene();
  if(!scene) return;

  renderBackground();

  const title = document.getElementById("archive-title");
  if(title){
    title.innerText = scene.name || "";
  }

}

/* =========================
   NAV ARROWS (FIXED)
========================= */
const order = ["HOT","COLD","ALL","NEON"];

function nextScene(){
  let i = order.indexOf(window.currentScene);
  i = (i + 1) % order.length;
  setScene(order[i]);
}

function prevScene(){
  let i = order.indexOf(window.currentScene);
  i = (i - 1 + order.length) % order.length;
  setScene(order[i]);
}

/* =========================
   BUTTON BINDINGS
========================= */
document.addEventListener("DOMContentLoaded",()=>{

  const left = document.getElementById("archive-left");
  const right = document.getElementById("archive-right");
  const home = document.getElementById("archive-home");

  if(left) left.onclick = prevScene;
  if(right) right.onclick = nextScene;
  if(home) home.onclick = goMainMenu;

  renderScene();

});

})();
