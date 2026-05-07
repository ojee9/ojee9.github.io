
(function(){

/* =========================
   ARCHIVE CORE DATA
   (DO NOT TOUCH ENGINE)
========================= */

window.SCENES = window.SCENES || {};

/* =========================
   HOT TAKE — DESERT
========================= */
window.SCENES.HOT = {
  id: "HOT",
  name: "HOT TAKE",
  bg: "images/desert.jpg",
  skin: "skins/papyrus.css",
  color: "#ffb347",
  highlights: []
};

/* =========================
   COLD TAKE — ICEWALL
========================= */
window.SCENES.COLD = {
  id: "COLD",
  name: "COLD TAKE",
  bg: "images/icewall.jpg",
  skin: "skins/stone.css",
  color: "#6ec6ff",
  highlights: []
};

/* =========================
   ALL VIBES — ROME
========================= */
window.SCENES.ALL = {
  id: "ALL",
  name: "ALL VIBES",
  bg: "images/rome.jpg",
  skin: "skins/glass.css",
  color: "#9ad0ff",
  highlights: []
};

/* =========================
   NEW NEON — RETROWAVE
========================= */
window.SCENES.NEON = {
  id: "NEON",
  name: "NEW NEON",
  bg: "images/neon.jpg",
  skin: "skins/neonboard.css",
  color: "#c77dff",
  highlights: []
};

/* =========================
   ACTIVE SCENE STATE
========================= */
window.currentScene = window.currentScene || "HOT";

/* =========================
   SAFE GETTER
========================= */
window.getScene = function(){
  return window.SCENES[window.currentScene];
};

/* =========================
   SWITCH SCENE (SAFE)
========================= */
window.setScene = function(id){
  if(window.SCENES[id]){
    window.currentScene = id;
  }
};

})();
