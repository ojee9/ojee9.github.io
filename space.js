const map = document.getElementById("map");

const links = [
  {name:"9ojeez9 YouTube", url:"https://youtube.com/@9ojeez9"},
  {name:"9ojeez9 Spotify", url:"https://open.spotify.com/artist/4XH3BH9SPGEaTzp1suzdCL"},
  {name:"9ojeez9 Twitter", url:"https://twitter.com/9ojeez9"},
  {name:"9ojeez9 Instagram", url:"https://instagram.com/9ojeez9"},
  {name:"9ojeez9 SoundCloud", url:"https://soundcloud.com/9ojeez9"}
];

/* =========================
   CURVE PLACEMENT
========================= */

const centerX = window.innerWidth / 2;
const centerY = window.innerHeight * 0.55;
const radius = Math.min(window.innerWidth, window.innerHeight) * 0.35;

const startAngle = -0.8;   // curve start
const endAngle = 0.8;      // curve end

links.forEach((link, i) => {

  const angle = startAngle + 
    (i / (links.length - 1)) * (endAngle - startAngle);

  const x = centerX + radius * Math.sin(angle);
  const y = centerY - radius * Math.cos(angle) * 0.35;

  const node = document.createElement("div");
  node.className = "node";

  node.style.left = x + "px";
  node.style.top = y + "px";

  node.innerHTML = `
    <div class="star"></div>
    <div class="label">${link.name}</div>
  `;

  /* desktop click */
  node.onclick = () => {
    window.open(link.url, "_blank");
  };

  /* mobile tap label reveal */
  node.addEventListener("touchstart", () => {
    node.classList.add("active");
    setTimeout(()=>node.classList.remove("active"),2000);
  });

  map.appendChild(node);
});
