document.addEventListener("DOMContentLoaded", () => {

  const scenes = document.querySelectorAll(".scene");
  const sceneTitle = document.getElementById("sceneTitle");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  const sceneNames = ["HOT TAKE", "NEW NEON", "COLD TAKE", "ALL VIBES"];

  let current = 0;
  let locked = false;

  function updateScene(direction = "next") {
    if (locked) return;
    locked = true;

    scenes.forEach(scene => scene.classList.remove("active"));

    scenes[current].classList.add("active");
    sceneTitle.textContent = sceneNames[current];

    setTimeout(() => {
      locked = false;
    }, 700);
  }

  function goNext() {
    current = (current + 1) % scenes.length;
    updateScene("next");
  }

  function goPrev() {
    current = (current - 1 + scenes.length) % scenes.length;
    updateScene("prev");
  }

  nextBtn.addEventListener("click", goNext);
  prevBtn.addEventListener("click", goPrev);

  /* SWIPE SUPPORT (MOBILE) */

  let touchStartX = 0;
  let touchEndX = 0;

  document.addEventListener("touchstart", e => {
    touchStartX = e.changedTouches[0].screenX;
  });

  document.addEventListener("touchend", e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });

  function handleSwipe() {
    if (touchEndX < touchStartX - 50) goNext();
    if (touchEndX > touchStartX + 50) goPrev();
  }

  updateScene();
});
