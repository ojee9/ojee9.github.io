const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

/* ================= STARFIELD ================= */

let stars = [];
for (let i = 0; i < 300; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    z: Math.random() * canvas.width
  });
}

/* ================= ICONS ================= */

const spacing = 110; // birbirine yakınlık
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

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
  nodes.forEach((n, i) => {
    let x = centerX + (i - 2) * spacing;
    let y = centerY;

    let dx = e.clientX - x;
    let dy = e.clientY - y;

    if (Math.sqrt(dx * dx + dy * dy) < 45) {
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // STARFIELD (derinlik hissi)
  for (let s of stars) {
    s.z -= 2;
    if (s.z <= 0) s.z = canvas.width;

    let k = 128 / s.z;
    let px = s.x * k + canvas.width / 2;
    let py = s.y * k + canvas.height / 2;

    ctx.fillStyle = "white";
    ctx.fillRect(px, py, 1.5, 1.5);
  }

  // ICONS
  nodes.forEach((n, i) => {
    let x = centerX + (i - 2) * spacing;
    let y = centerY;

    let size = hover === i ? 85 : 70;

    ctx.save();

    if (hover === i) {
      ctx.shadowColor = "white";
      ctx.shadowBlur = 30;
    }

    let img = images[n.icon];
    if (img && img.complete) {
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    }

    ctx.restore();

    if (hover === i) {
      ctx.save();
      ctx.fillStyle = "white";
      ctx.font = "13px Arial";
      ctx.textAlign = "center";
      ctx.shadowColor = "white";
      ctx.shadowBlur = 15;
      ctx.fillText(n.name, x, y - 55);
      ctx.restore();
    }
  });

  requestAnimationFrame(draw);
}

draw();
