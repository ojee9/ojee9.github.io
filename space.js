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


let hoverNode = -1;
let time = 0;



/* ================= POSITION ================= */

function getCenter(){

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
    Math.sin(time * 0.002 + index * 2) * 1.5;


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




/* ================= TEXT ================= */

function drawSafeText(text,x,y,size,alpha=1){

  ctx.font = size + "px Arial";
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.textAlign = "center";

  ctx.fillText(
    text,
    x,
    y
  );

}




function drawBrand(){

  const y = canvas.height - 45;


  drawSafeText(
    "VN STUDIOS",
    canvas.width / 2,
    y,
    canvas.width < 600 ? 11 : 13,
    0.55
  );


  drawSafeText(
    "© 2026",
    canvas.width / 2,
    y + 18,
    canvas.width < 600 ? 9 : 10,
    0.35
  );

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


    if(Math.sqrt(dx*dx + dy*dy) < 45){

      hoverNode = index;

    }


  });



  canvas.style.cursor =
    hoverNode !== -1
    ? "pointer"
    : "default";


});






/* ================= NODE ROUTING ================= */

canvas.addEventListener("click",()=>{


  if(hoverNode !== -1){


    const selected =
      nodes[hoverNode].name;



    switch(selected){


      case "VISUALS":

        window.location.href = "visuals.html";

        break;



      case "ARCHIVE":

        window.location.href = "archive.html";

        break;



      case "MUSIC":

        window.location.href = "music.html";

        break;



      case "ABOUT":

        window.location.href = "about.html";

        break;



      case "SOCIAL":

        window.location.href = "socials.html";

        break;



      case "PROJECTS":

        console.log(
          "PROJECTS MODULE COMING SOON"
        );

        break;


    }


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



/* ================= SPACE DEPTH ================= */


const gradient = ctx.createRadialGradient(
  canvas.width / 2,
  canvas.height / 2,
  0,
  canvas.width / 2,
  canvas.height / 2,
  canvas.width
);


gradient.addColorStop(
  0,
  "rgba(35,35,55,0.22)"
);


gradient.addColorStop(
  1,
  "rgba(0,0,0,0)"
);


ctx.fillStyle = gradient;


ctx.fillRect(
  0,
  0,
  canvas.width,
  canvas.height
);





/* ================= STARS ================= */


stars.forEach(star=>{


  ctx.globalAlpha = .75;

  ctx.fillStyle = "white";


  ctx.fillRect(
    star.x,
    star.y,
    star.size,
    star.size
  );


  star.y += star.speed;



  if(star.y > canvas.height){

    star.y = 0;
    star.x = Math.random()*canvas.width;

  }


});


ctx.globalAlpha = 1;



const center = getCenter();





/* ================= CONNECTIONS ================= */


nodes.forEach((node,index)=>{


const p = getNodePosition(
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



ctx.strokeStyle =
"rgba(255,255,255,0.10)";


ctx.lineWidth = 1;


ctx.stroke();


});






/* ================= CORE ================= */


const pulse =
Math.sin(time*0.04)*3;



ctx.save();


ctx.shadowColor = "white";

ctx.shadowBlur = 35;


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


ctx.strokeStyle =
"rgba(255,255,255,0.18)";


ctx.stroke();





ctx.beginPath();


ctx.arc(
center.x,
center.y,
55+pulse*2,
0,
Math.PI*2
);


ctx.strokeStyle =
"rgba(255,255,255,0.08)";


ctx.stroke();





drawBrand();







/* ================= NODES ================= */


nodes.forEach((node,index)=>{


const p = getNodePosition(
node,
index
);



const size =
hoverNode === index
? 15
: 9;




ctx.save();



if(hoverNode===index){

ctx.shadowColor="white";

ctx.shadowBlur=22;

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
