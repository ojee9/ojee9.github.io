const canvas = document.getElementById("space");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* MOUSE */
let mouse = { x: 0, y: 0 };

window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

/* STARS */
let stars = [];

for (let i = 0; i < 150; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.2,
    speed: Math.random() * 0.4 + 0.05
  });
}

/* NODES (ROOT NETWORK) */
let nodes = [
  { name: "INSTAGRAM", x: 200, y: 200, baseX: 200, baseY: 200 },
  { name: "TWITTER", x: 350, y: 300, baseX: 350, baseY: 300 },
  { name: "YOUTUBE", x: 500, y: 250, baseX: 500, baseY: 250 },
  { name: "SPOTIFY", x: 650, y: 320, baseX: 650, baseY: 320 },
  { name: "SOUNDCLOUD", x: 300, y: 450, baseX: 300, baseY: 450 },
  { name: "APPLE MUSIC", x: 550, y: 480, baseX: 550, baseY: 480 },
  { name: "DEEZER", x: 700, y: 520, baseX: 700, baseY: 520 },
  { name: "YOUTUBE MUSIC", x: 420, y: 550, baseX: 420, baseY: 550 },
  { name: "TWITCH", x: 600, y: 620, baseX: 600, baseY: 620 }
];

/* STARS DRAW */
function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";

  stars.forEach(s => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();

    s.y += s.speed;

    if (s.y > canvas.height) {
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }
  });
}

/* NODE PHYSICS (LIVING SYSTEM) */
function updateNodes() {
  nodes.forEach(n => {

    let dx = mouse.x - n.x;
    let dy = mouse.y - n.y;

    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 150) {
      n.x -= dx * 0.01;
      n.y -= dy * 0.01;
    } else {
      n.x += (n.baseX - n.x) * 0.05;
      n.y += (n.baseY - n.y) * 0.05;
    }

  });
}

/* DRAW NODES */
function drawNodes() {
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";

  nodes.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillText(n.name, n.x + 10, n.y + 4);
  });
}

/* CONNECTION LINES (NEURAL ROOTS) */
function drawLinks() {
  const core = nodes[0];

  nodes.forEach(n => {
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 100);
    ctx.lineTo(n.x, n.y);
    ctx.stroke();
  });
}

/* MAIN LOOP */
function animate() {
  drawStars();

  updateNodes();

  drawLinks();

  drawNodes();

  requestAnimationFrame(animate);
}

animate();
