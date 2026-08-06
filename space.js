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


/* ================= SPACE NODES ================= */

const nodes = [
  {
    name: "MUSIC",
    x: 0,
    y: -170
  },
  {
    name: "ARCHIVE",
    x: 170,
    y: -40
  },
  {
    name: "VISUALS",
    x: -170,
    y: -40
  },
  {
    name: "PROJECTS",
    x: -170,
    y: 130
  },
  {
    name: "ABOUT",
    x: 170,
    y: 130
  },
  {
    name: "SOCIAL",
    x: 0,
    y: 220
  }
];


const core = {
  name: "VN STUDIOS",
  x: 0,
  y: 0
};


let hoverNode = -1;


/* ================= POSITION ================= */

function getCenter() {
  return {
    x: canvas.width / 2,
    y: canvas.height / 2
  };
}


/* ================= MOUSE ================= */

canvas.addEventListener("mousemove", e => {

  hoverNode = -1;

  const center = getCenter();


  nodes.forEach((node, index) => {

    const x = center.x + node.x;
    const y = center.y + node.y;


    const dx = e.clientX - x;
    const dy = e.clientY - y;


    if (Math.sqrt(dx * dx + dy * dy) < 35) {
      hoverNode = index;
    }

  });


  canvas.style.cursor =
    hoverNode !== -1 ? "pointer" : "default";

});



canvas.addEventListener("click", () => {

  if (hoverNode !== -1) {

    console.log(
      "ENTER:",
      nodes[hoverNode].name
    );

  }

});



/* ================= DRAW ================= */

function draw() {

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  /* STARFIELD */

  ctx.fillStyle = "white";


  stars.forEach(star => {

    ctx.globalAlpha = 0.8;

    ctx.fillRect(
      star.x,
      star.y,
      star.size,
      star.size
    );


    star.y += star.speed;


    if (star.y > canvas.height) {

      star.y = 0;
      star.x = Math.random() * canvas.width;

    }

  });


  ctx.globalAlpha = 1;



  const center = getCenter();



  /* CORE */

  ctx.beginPath();

  ctx.arc(
    center.x,
    center.y,
    18,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = "white";

  ctx.fill();



  ctx.font = "14px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";

  ctx.fillText(
    core.name,
    center.x,
    center.y + 45
  );



  /* NODES */

  nodes.forEach((node, index) => {


    const x = center.x + node.x;
    const y = center.y + node.y;


    ctx.beginPath();

    ctx.arc(
      x,
      y,
      hoverNode === index ? 14 : 9,
      0,
      Math.PI * 2
    );


    ctx.fillStyle = "white";

    ctx.fill();



    if (hoverNode === index) {

      ctx.font = "16px Arial";

      ctx.fillText(
        node.name,
        x,
        y - 25
      );

    }


  });



  requestAnimationFrame(draw);

}


draw();
