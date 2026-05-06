const canvas = document.getElementById("space");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* STAR SYSTEM */
let stars = [];

for (let i = 0; i < 150; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.2,
    speed: Math.random() * 0.4 + 0.05
  });
}

/* NODE SYSTEM */
let nodes = [
  { name: "INSTAGRAM", x: 200, y: 200 },
  { name: "TWITTER", x: 350, y: 300 },
  { name: "YOUTUBE", x: 500, y: 250 },
  { name: "SPOTIFY", x: 650, y: 320 },
  { name: "SOUNDCLOUD", x: 300, y: 450 },
  { name: "APPLE MUSIC", x: 550, y: 480 },
  { name: "DEEZER", x: 700, y: 520 },
  { name: "YOUTUBE MUSIC", x: 420, y: 550 },
  { name: "TWITCH", x: 600, y: 620 }
];

/* DRAW STARS */
function drawStars() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "white";

  stars.forEach(s => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fill();

    s.y += s.speed;

    if(s.y > canvas.height){
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }
  });
}

/* DRAW NODES */
function drawNodes() {
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";

  nodes.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 3, 0, Math.PI*2);
    ctx.fill();

    ctx.fillText(n.name, n.x + 10, n.y + 4);
  });
}

/* ANIMATE */
function animate() {
  drawStars();
  drawNodes();
  requestAnimationFrame(animate);
}

animate();
