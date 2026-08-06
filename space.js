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



function getNodePosition(node,index){

  const center = getCenter();

  const isMobile = canvas.width < 600;


  const scale = Math.min(
    canvas.width,
    canvas.height
  );


  const mobileScale = isMobile ? 0.62 : 1;


  const movement =
    Math.sin(time * 0.001 + index) * 3;



  return {

    x:
      center.x +
      node.posX *
      scale *
      mobileScale,


    y:
      center.y +
      node.posY *
      scale *
      mobileScale +
      movement

  };

}



/* ================= TEXT SAFE AREA ================= */

function drawSafeText(text,x,y,size){

  let finalX = x;

  const padding = 40;


  if(finalX < padding){
    finalX = padding;
  }


  if(finalX > canvas.width - padding){
    finalX = canvas.width - padding;
  }


  ctx.font = size + "px Arial";
  ctx.fillStyle="white";
  ctx.textAlign="center";


  ctx.fillText(
    text,
    finalX,
    y
  );

}



/* ================= MOUSE ================= */

canvas.addEventListener("mousemove",e=>{


  hoverNode=-1;


  nodes.forEach((node,index)=>{


    const p=getNodePosition(
      node,
      index
    );


    const dx=e.clientX-p.x;
    const dy=e.clientY-p.y;


    if(
      Math.sqrt(dx*dx+dy*dy)<45
    ){

      hoverNode=index;

    }


  });



  canvas.style.cursor =
    hoverNode!==-1
    ? "pointer"
    : "default";


});



canvas.addEventListener("click",()=>{


  if(hoverNode!==-1){

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


  stars.forEach(star=>{


    ctx.globalAlpha=.75;

    ctx.fillStyle="white";


    ctx.fillRect(
      star.x,
      star.y,
      star.size,
      star.size
    );


    star.y+=star.speed;



    if(star.y>canvas.height){

      star.y=0;
      star.x=Math.random()*canvas.width;

    }


  });


  ctx.globalAlpha=1;



  const center=getCenter();




/* ================= CONNECTIONS ================= */


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


    const pulse =
      0.08 +
      Math.sin(time*0.02)*0.03;


    ctx.strokeStyle =
      `rgba(255,255,255,${pulse})`;


    ctx.lineWidth=1;


    ctx.stroke();


  });




/* ================= CORE ================= */


  const pulse =
    Math.sin(time*0.04)*4;



  ctx.save();


  ctx.shadowColor="white";
  ctx.shadowBlur=35;



  ctx.beginPath();


  ctx.arc(
    center.x,
    center.y,
    20+pulse,
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
    42+pulse,
    0,
    Math.PI*2
  );


  ctx.strokeStyle=
    "rgba(255,255,255,0.18)";


  ctx.stroke();




  drawSafeText(
    core.name,
    center.x,
    center.y+70,
    14
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
      ctx.shadowBlur=30;

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


      drawSafeText(
        node.name,
        p.x,
        p.y-35,
        canvas.width < 600 ? 12 : 16
      );


    }


  });



  requestAnimationFrame(draw);

}



draw();
