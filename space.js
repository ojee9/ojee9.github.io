const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

/* ================= FULL TRUE RESOLUTION ================= */

function resize() {
  const dpr = window.devicePixelRatio || 1;

  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resize();
window.addEventListener("resize", resize);

/* ================= STARFIELD ================= */

let stars = [];

for (let i = 0; i < 400; i++) {
  stars.push({
    x: (Math.random() - 0.5) * window.innerWidth,
    y: (Math.random() - 0.5) * window.innerHeight,
    z: Math.random() * window.innerWidth
  });
}

/* ================= ICONS ================= */

const spacing = 85; // daha yakın
const nodes = [
  { name: "YouTube", icon: "icons/youtube.png", url: "https://youtube.com/@9ojeez9" },
  { name: "Twitter", icon: "icons/twitter.png", url: "https://twitter.com/9ojeez9" },
  { name: "SoundCloud", icon: "icons/soundcloud.png", url: "https://soundcloud.com/9ojeez9" },
  { name: "Spotify", icon: "icons/spotify.png", url: "https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL" },
  { name: "Apple Music", icon: "icons/applemusic.png", url: "https://music.apple.com" }
];

const images = {};
nodes.forEach(n => {
  const img = new Image();
  img.src = n.icon;
  images[n.icon] = img;
});

let hover = -1;

/* ================= MOUSE ================= */

canvas.addEventListener("mousemove", e => {
  hover = -1;

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  nodes.forEach((n, i) => {
    const x = centerX + (i - 2) * spacing;
    const y = centerY;

    const dx = e.clientX - x;
    const dy = e.clientY - y;

    if (Math.sqrt(dx * dx + dy * dy) < 40) {
      hover = i;
    }
  });

  canvas.style.cursor = hover !== -1 ? "pointer" : "default";
});

canvas.addEventListener("click", () => {
  if (hover !== -1) {
    window.open(nodes[hover].url, "_blank");
  }
});

/* ================= DRAW ================= */

function draw() {

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  /* STAR DEPTH EFFECT */
  for (let s of stars) {
    s.z -= 3;
    if (s.z <= 0) s.z = window.innerWidth;

    const k = 200 / s.z;
    const x = s.x * k + window.innerWidth / 2;
    const y = s.y * k + window.innerHeight / 2;

    ctx.fillStyle = "white";
    ctx.fillRect(x, y, 2 * k, 2 * k);
  }

  /* ICONS */
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  nodes.forEach((n, i) => {

    const x = centerX + (i - 2) * spacing;
    const y = centerY;

    const size = hover === i ? 90 : 72;

    const img = images[n.icon];
    if (!img.complete) return;

    ctx.save();

    /* SOFT SPACE BLEND */
    ctx.globalCompositeOperation = "lighter";

    /* RADIAL FADE MASK (kare hissi kırar) */
    const gradient = ctx.createRadialGradient(
      x, y, size * 0.2,
      x, y, size / 2
    );

    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    /* GLOW */
    if (hover === i) {
      ctx.shadowColor = "white";
      ctx.shadowBlur = 35;
    } else {
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(255,255,255,0.4)";
    }

    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);

    ctx.restore();

    /* HOVER TEXT */
    if (hover === i) {
      ctx.save();
      ctx.fillStyle = "white";
      ctx.font = "13px Arial";
      ctx.textAlign = "center";
      ctx.shadowColor = "white";
      ctx.shadowBlur = 20;
      ctx.fillText(n.name, x, y - 60);
      ctx.restore();
    }

  });

  requestAnimationFrame(draw);
}

draw();
