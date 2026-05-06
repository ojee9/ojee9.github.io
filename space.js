/* STARFIELD */

const canvas = document.getElementById("stars");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let stars = [];

for(let i=0;i<150;i++){
  stars.push({
    x:Math.random()*canvas.width,
    y:Math.random()*canvas.height,
    size:Math.random()*2,
    speed:Math.random()*0.3
  });
}

function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="white";

  stars.forEach(s=>{
    ctx.beginPath();
    ctx.arc(s.x,s.y,s.size,0,Math.PI*2);
    ctx.fill();

    s.y+=s.speed;
    if(s.y>canvas.height){
      s.y=0;
      s.x=Math.random()*canvas.width;
    }
  });

  requestAnimationFrame(animate);
}

animate();

/* LINKS */

const links = [
  {name:"9ojeez9 YouTube", url:"https://youtube.com/@9ojeez9"},
  {name:"9ojeez9 Spotify", url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL"},
  {name:"9ojeez9 SoundCloud", url:"https://soundcloud.com/9ojeez9"},
  {name:"9ojeez9 Twitter", url:"https://twitter.com/9ojeez9"},
  {name:"9ojeez9 Instagram", url:"https://instagram.com/9ojeez9"}
];

const container = document.getElementById("links");

links.forEach(link=>{
  const div = document.createElement("div");
  div.className="node";
  div.innerHTML=`
    <div class="star"></div>
    <div class="label">${link.name}</div>
  `;
  div.onclick=()=>window.open(link.url,"_blank");
  container.appendChild(div);
});
