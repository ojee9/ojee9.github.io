
const map = document.getElementById("map");

/* =========================
   MOBILE-OPTIMIZED CLUSTER LAYOUT
========================= */

const nodes = [
  {
    name:"9ojeez9 YouTube",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg",
    x:0.25, y:0.25,
    url:"https://www.youtube.com/@9ojeez9",
    color:"#ff4b4b"
  },
  {
    name:"9ojeez9 Spotify",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/spotify.svg",
    x:0.55, y:0.22,
    url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL",
    color:"#1ed760"
  },
  {
    name:"9ojeez9 Twitter",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg",
    x:0.8, y:0.3,
    url:"https://twitter.com/9ojeez9",
    color:"#7aa2ff"
  },
  {
    name:"9ojeez9 SoundCloud",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/soundcloud.svg",
    x:0.35, y:0.65,
    url:"https://soundcloud.com/9ojeez9",
    color:"#ff8c42"
  },
  {
    name:"9ojeez9 Instagram",
    icon:"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/instagram.svg",
    x:0.65, y:0.65,
    url:"https://instagram.com/9ojeez9",
    color:"#ff5ccf"
  }
];

/* =========================
   BUILD NODES
========================= */

nodes.forEach(n=>{

  const el = document.createElement("div");
  el.className = "node";

  el.style.left = (n.x * 100) + "vw";
  el.style.top = (n.y * 100) + "vh";

  /* STAR COLOR = PLATFORM COLOR */
  el.style.filter = `drop-shadow(0 0 14px ${n.color})`;

  el.innerHTML = `
    <img src="${n.icon}">
    <span>${n.name}</span>
  `;

  el.addEventListener("click",()=>{
    window.open(n.url,"_blank");
  });

  map.appendChild(el);
});
