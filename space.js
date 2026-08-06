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
  { name:"MUSIC", posX:0, posY:-0.28 },
  { name:"ARCHIVE", posX:0.28, posY:-0.05 },
  { name:"VISUALS", posX:-0.28, posY:-0.05 },
  { name:"PROJECTS", posX:-0.28, posY:0.22 },
  { name:"ABOUT", posX:0.28, posY:0.22 },
  { name:"SOCIAL", posX:0, posY:0.38 }
];


const core = {
  name:"VN STUDIOS"
};


let hoverNode = -1;
let time = 0;



/* ================= POSITION ================= */

function getCenter() {

  return {
    x: canvas.width / 2,
    y: canvas.height / 2
  };

}


function getNodePosition(node, index) {

  const center = getCenter();

  const scale = Math.min(
    canvas.width,
    canvas.height
  );


  const movement =
    Math.sin(time * 0.001 + index) * 3;


  return {

    x:
      center.x +
      node.posX * scale,

    y:
      center.y +
      node.posY * scale +
      movement

  };

}



/* ================= MOUSE ================= */

canvas.addEventListener("mousemove", e => {

  hoverNode = -1;


  nodes.forEach((node,index)=>{

    const p = getNodePosition(
      node,
      index
    );


    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;


    if (
      Math.sqrt(dx*dx + dy*dy)
      < 35
    ) {
      hoverNode = index;
    }


  });


  canvas.style.cursor =
    hoverNode !== -1
    ? "pointer"
    : "default";

});



canvas.addEventListener("click",()=>{

  if(hoverNode !== -1){

    console.log(
      "ENTER:",
      nodes[hoverNode].name
    );

  }

});



/* ================= DRAW ================= */

function draw(){

  time++;


  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


/* STARFIELD */

  ctx.fillStyle="white";


  stars.forEach(star=>{

    ctx.globalAlpha=.8;

    ctx.fillRect(
      star.x,
      star.y,
      star.size,
      star.size
    );


    star.y += star.speed;


    if(star.y > canvas.height){

      star.y=0;
      star.x=Math.random()*canvas.width;

    }


  });


  ctx.globalAlpha=1;



  const center=getCenter();



/* ================= CONNECTIONS ================= */


  ctx.strokeStyle="rgba(255,255,255,0.12)";
  ctx.lineWidth=1;


  nodes.forEach((node,index)=>{

    const p=getNodePosition(
      node,
      index
    );


    ctx.beginPath();

    ctx.moveTo(
      center.x,
      center.y
    );

    ctx.lineTo(
      p.x,
      p.y
    );

    ctx.stroke();


  });



/* ================= CORE ================= */


  const pulse =
    Math.sin(time*0.03)*3;


  ctx.save();


  ctx.shadowColor="white";
  ctx.shadowBlur=25;


  ctx.beginPath();

  ctx.arc(
    center.x,
    center.y,
    18+pulse,
    0,
    Math.PI*2
  );


  ctx.fillStyle="white";

  ctx.fill();


  ctx.restore();



  ctx.beginPath();

  ctx.arc(
    center.x,
    center.y,
    35+pulse,
    0,
    Math.PI*2
  );


  ctx.strokeStyle=
    "rgba(255,255,255,0.25)";


  ctx.stroke();



  ctx.font="14px Arial";
  ctx.fillStyle="white";
  ctx.textAlign="center";


  ctx.fillText(
    core.name,
    center.x,
    center.y+65
  );



/* ================= NODES ================= */


nodes.forEach((node,index)=>{


  const p=getNodePosition(
    node,
    index
  );


  const size =
    hoverNode===index
    ? 15
    : 9;



  ctx.save();


  if(hoverNode===index){

    ctx.shadowColor="white";
    ctx.shadowBlur=25;

  }


  ctx.beginPath();

  ctx.arc(
    p.x,
    p.y,
    size,
    0,
    Math.PI*2
  );


  ctx.fillStyle="white";

  ctx.fill();


  ctx.restore();



  if(hoverNode===index){

    ctx.font="16px Arial";
    ctx.fillStyle="white";
    ctx.textAlign="center";


    ctx.fillText(
      node.name,
      p.x,
      p.y-30
    );

  }


});


requestAnimationFrame(draw);

}


draw();
