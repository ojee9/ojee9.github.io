(function(){

/* =========================
   SCENES
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

const order = ["HOT","COLD","ALL","NEON"];

window.state = { scene:"HOT" };

/* =========================
   APPLY SCENE
========================= */
function render(){

  const scene = SCENES[state.scene];

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
}

/* =========================
   SWITCH
========================= */
function setScene(id){
  state.scene = id;
  render();
}

function next(){
  let i = order.indexOf(state.scene);
  setScene(order[(i+1)%order.length]);
}

function prev(){
  let i = order.indexOf(state.scene);
  setScene(order[(i-1+order.length)%order.length]);
}

function home(){
  setScene("HOT");
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded",()=>{

  document.getElementById("archive-left").onclick = prev;
  document.getElementById("archive-right").onclick = next;
  document.getElementById("archive-home").onclick = home;

  render();

});

})();
