const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

/* ================= STARFIELD ================= */

const stars = [];

for (let i = 0; i < 250; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 1.5,
    speed: 0.3 + Math.random() * 0.8
  });
}

/* ================= ICONS ================= */

const nodes = [
  { name:"YouTube", icon:"icons/youTube.png", url:"https://youtube.com/@9ojeez9" },
  { name:"Twitter", icon:"icons/twitter.png", url:"https://twitter.com/9ojeez9" },
  { name:"SoundCloud", icon:"icons/soundcloud.png", url:"https://soundcloud.com/9ojeez9" },
  { name:"Spotify", icon:"icons/spotify.png", url:"https://open.spotify.com" },
  { name:"Apple Music", icon:"icons/applemusic.png", url:"https://music.apple.com" }
];

const images = {};
let loadedImages = 0;

nodes.forEach(n => {
  const img = new Image();
  img.src = n.icon;

  img.onload = () => {
    loadedImages++;
  };

  images[n.icon] = img;
});

let hoverIndex = -1;

/* ================= MOUSE ================= */

canvas.addEventListener("mousemove", e => {
  hoverIndex = -1;

  const totalWidth = 400;
  const startX = canvas.width / 2 - totalWidth / 2;
  const gap = totalWidth / (nodes.length - 1);

  nodes.forEach((n, i) => {
    const x = startX + gap * i;
    const y = canvas.height / 2;

    const dx = e.clientX - x;
    const dy = e.clientY - y;

    if (Math.sqrt(dx * dx + dy * dy) < 45) {
      hoverIndex = i;
    }
  });

  canvas.style.cursor = hoverIndex !== -1 ? "pointer" : "default";
});

canvas.addEventListener("click", () => {
  if (hoverIndex !== -1) {
    window.open(nodes[hoverIndex].url, "_blank");
  }
});

/* ================= DRAW LOOP ================= */

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* Starfield */
  ctx.fillStyle = "white";

  stars.forEach(star => {
    ctx.globalAlpha = 0.8;
    ctx.fillRect(star.x, star.y, star.size, star.size);

    star.y += star.speed;

    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }
  });

  ctx.globalAlpha = 1;

  /* ICONS – ONLY DRAW IF ALL LOADED */
  if (loadedImages === nodes.length) {

    const totalWidth = 400;
    const startX = canvas.width / 2 - totalWidth / 2;
    const gap = totalWidth / (nodes.length - 1);

    nodes.forEach((n, i) => {
      const x = startX + gap * i;
      const y = canvas.height / 2;

      const img = images[n.icon];
      const size = hoverIndex === i ? 85 : 70;

      ctx.save();

      if (hoverIndex === i) {
        ctx.shadowColor = "white";
        ctx.shadowBlur = 25;
      }

      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);

      ctx.restore();

      /* Hover Text */
      if (hoverIndex === i) {
        ctx.save();
        ctx.font = "16px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.shadowColor = "white";
        ctx.shadowBlur = 15;
        ctx.fillText(n.name.toUpperCase(), x, y - 70);
        ctx.restore();
      }
    });
  }

  requestAnimationFrame(draw);
}

draw();
