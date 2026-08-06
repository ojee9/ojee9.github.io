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
  { name:"YouTube", icon:"icons/youtube.png", url:"https://youtube.com/@9ojeez9" },
  { name:"Twitter", icon:"icons/twitter.png", url:"https://twitter.com/9ojeez9" },
  { name:"SoundCloud", icon:"icons/soundcloud.png", url:"https://soundcloud.com/9ojeez9" },
  { name:"Spotify", icon:"icons/spotify.png", url:"https://open.spotify.com/intl-tr/artist/4XH3BH9SPGEaTzp1suzdCL?si=bGKYTXi-QIeWzlMsLJqCOQ" },
  { name:"Apple Music", icon:"icons/applemusic.png", url:"https://music.apple.com/us/artist/9ojeez9/1702764220" }
];


const images = {};
let loadedImages = 0;


/* ================= REMOVE BLACK BACKGROUND ================= */

function removeBlackBackground(img) {

  const temp = document.createElement("canvas");
  const tctx = temp.getContext("2d");

  temp.width = img.width;
  temp.height = img.height;

  tctx.drawImage(img, 0, 0);

  const imageData = tctx.getImageData(
    0,
    0,
    temp.width,
    temp.height
  );

  const data = imageData.data;


  for (let i = 0; i < data.length; i += 4) {

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];


    if (r < 30 && g < 30 && b < 30) {
      data[i + 3] = 0;
    }
  }


  tctx.putImageData(imageData, 0, 0);

  return temp;
}



nodes.forEach(n => {

  const img = new Image();

  img.src = n.icon;


  img.onload = () => {

    images[n.icon] = removeBlackBackground(img);

    loadedImages++;

  };

});


let hoverIndex = -1;


/* ================= RESPONSIVE POSITION ================= */

function getLayout() {

  const totalWidth = Math.min(
    canvas.width * 0.8,
    400
  );

  const iconSize = Math.min(
    canvas.width * 0.18,
    70
  );


  return {
    totalWidth,
    iconSize
  };

}



/* ================= MOUSE ================= */

canvas.addEventListener("mousemove", e => {

  hoverIndex = -1;


  const layout = getLayout();

  const startX = canvas.width / 2 - layout.totalWidth / 2;

  const gap = layout.totalWidth / (nodes.length - 1);


  nodes.forEach((n, i) => {

    const x = startX + gap * i;
    const y = canvas.height / 2;


    const dx = e.clientX - x;
    const dy = e.clientY - y;


    if (Math.sqrt(dx * dx + dy * dy) < 45) {
      hoverIndex = i;
    }

  });


  canvas.style.cursor =
    hoverIndex !== -1 ? "pointer" : "default";

});



canvas.addEventListener("click", () => {

  if (hoverIndex !== -1) {
    window.open(nodes[hoverIndex].url, "_blank");
  }

});



/* ================= DRAW LOOP ================= */


function draw() {


  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  /* Starfield */

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



  /* ICONS */

  if (loadedImages === nodes.length) {


    const layout = getLayout();


    const startX =
      canvas.width / 2 - layout.totalWidth / 2;


    const gap =
      layout.totalWidth / (nodes.length - 1);



    nodes.forEach((n, i) => {


      const x = startX + gap * i;
      const y = canvas.height / 2;


      const img = images[n.icon];


      const size =
        hoverIndex === i
        ? layout.iconSize + 15
        : layout.iconSize;



      ctx.save();



      if (hoverIndex === i) {

        ctx.shadowColor = "white";
        ctx.shadowBlur = 25;

      }



      ctx.drawImage(
        img,
        x - size / 2,
        y - size / 2,
        size,
        size
      );


      ctx.restore();



      /* Hover Text */

      if (hoverIndex === i) {


        ctx.save();

        ctx.font = "16px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";

        ctx.shadowColor = "white";
        ctx.shadowBlur = 15;


        ctx.fillText(
          n.name.toUpperCase(),
          x,
          y - 70
        );


        ctx.restore();

      }


    });

  }



  requestAnimationFrame(draw);

}


draw();
