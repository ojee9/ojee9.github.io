const scenes = document.querySelectorAll(".scene");
const sceneTitle = document.getElementById("sceneTitle");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const sceneNames = ["HOT TAKE", "NEW NEON", "COLD TAKE", "ALL VIBES"];

let current = 0;

function updateScene() {
  scenes.forEach(scene => scene.classList.remove("active"));
  scenes[current].classList.add("active");
  sceneTitle.textContent = sceneNames[current];
}

prevBtn.addEventListener("click", () => {
  current--;
  if (current < 0) current = scenes.length - 1;
  updateScene();
});

nextBtn.addEventListener("click", () => {
  current++;
  if (current >= scenes.length) current = 0;
  updateScene();
});

updateScene();
