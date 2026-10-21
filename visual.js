
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".visual-grid");
  const filterNav = document.querySelector(".visual-filter");

  if (!grid || !filterNav) return;

  // Prevent duplicate initialization
  if (grid.dataset.visualsInitialized === "true") return;
  grid.dataset.visualsInitialized = "true";

  // Add the new motion card immediately before the existing motion card
  if (!grid.querySelector('[data-added-motion="subcity-track-canvas-social-addon"]')) {
    const existingMotion = grid.querySelector(".visual-card.motion");

    if (existingMotion) {
      const newCard = document.createElement("div");
      newCard.className = "visual-card motion";
      newCard.dataset.addedMotion = "subcity-track-canvas-social-addon";

      newCard.innerHTML = `
        <div class="image-box">
          <video autoplay muted loop playsinline preload="metadata">
            <source src="assets/motions/subcity-track-canvas-social-addon.mp4" type="video/mp4">
          </video>
        </div>
        <div class="card-info">
          <h2>SUBCITY TRACK CANVAS</h2>
          <p>VIDEO PREVIEW</p>
        </div>
      `;

      existingMotion.before(newCard);
    }
  }

  let cards = Array.from(grid.querySelectorAll(".visual-card"));

  // Assign categories to the existing cards
  cards.forEach((card, index) => {
    card.dataset.originalOrder = String(index);

    if (card.classList.contains("pocket")) {
      card.dataset.category = "hot-take";
    } else if (card.classList.contains("motion")) {
      card.dataset.category = "play-this";
    } else if (card.classList.contains("official")) {
      card.dataset.category = "featured";
    }

    const video = card.querySelector("video");
    if (video) {
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.play().catch(() => {});
    }

    card.querySelectorAll("img, video").forEach(media => {
      media.style.cursor = "pointer";
      media.tabIndex = 0;
    });

    card.style.animation = "visualCardIn .35s ease both";
  });

  // Lightbox
  let lightbox = document.querySelector("#visual-lightbox");

  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.id = "visual-lightbox";
    lightbox.innerHTML = `
      <button class="vl-close" type="button" aria-label="Close">×</button>
      <div class="vl-content">
        <div class="vl-media"></div>
        <div class="vl-caption">
          <h2 class="vl-title"></h2>
          <p class="vl-kind"></p>
        </div>
      </div>
    `;
    document.body.appendChild(lightbox);
  }

  const mediaContainer = lightbox.querySelector(".vl-media");
  const titleElement = lightbox.querySelector(".vl-title");
  const kindElement = lightbox.querySelector(".vl-kind");
  const closeButton = lightbox.querySelector(".vl-close");

  const lightboxStyle = document.createElement("style");
  lightboxStyle.textContent = `
    #visual-lightbox {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 28px;
      background: rgba(0, 0, 0, .94);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity .2s ease, visibility .2s ease;
    }

    #visual-lightbox.is-open {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    #visual-lightbox .vl-content {
      width: min(86vw, 1000px);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    #visual-lightbox .vl-media {
      width: 100%;
      height: min(72vh, 760px);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #visual-lightbox .vl-media img,
    #visual-lightbox .vl-media video {
      display: block;
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
    }

    #visual-lightbox .vl-media video {
      width: 100%;
      height: 100%;
    }

    #visual-lightbox .vl-caption {
      text-align: center;
      color: #fff;
    }

    #visual-lightbox .vl-title {
      margin: 0 0 5px;
      font-size: 15px;
      letter-spacing: .12em;
    }

    #visual-lightbox .vl-kind {
      margin: 0;
      font-size: 10px;
      letter-spacing: .16em;
      opacity: .55;
    }

    #visual-lightbox .vl-close {
      position: absolute;
      top: 18px;
      right: 25px;
      border: 0;
      background: none;
      color: #fff;
      font-size: 36px;
      cursor: pointer;
    }

    .visual-filter span,
    .visual-filter button {
      cursor: pointer;
    }

    .visual-filter .active {
      opacity: 1;
      text-decoration: underline;
      text-underline-offset: 5px;
    }

    .visual-card img,
    .visual-card video {
      cursor: pointer;
    }

    @keyframes visualCardIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 600px) {
      #visual-lightbox { padding: 16px; }
      #visual-lightbox .vl-content { width: 94vw; }
      #visual-lightbox .vl-media { height: 65vh; }
      #visual-lightbox .vl-title { font-size: 12px; }
      #visual-lightbox .vl-close { top: 8px; right: 14px; }
    }
  `;
  document.head.appendChild(lightboxStyle);

  function openLightbox(card, selectedMedia) {
    const media = selectedMedia || card.querySelector("img, video");
    if (!media) return;

    mediaContainer.replaceChildren();

    if (media.tagName.toLowerCase() === "video") {
      const video = document.createElement("video");
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;

      const source = media.currentSrc ||
        media.querySelector("source")?.src ||
        media.getAttribute("src");

      if (source) video.src = source;
      mediaContainer.appendChild(video);
      video.play().catch(() => {});
    } else {
      const image = document.createElement("img");
      image.src = media.currentSrc || media.src;
      image.alt = media.alt || "";
      mediaContainer.appendChild(image);
    }

    titleElement.textContent =
      card.querySelector(".card-info h2")?.textContent.trim() || "UNTITLED";

    kindElement.textContent =
      card.querySelector(".card-info p")?.textContent.trim() || "VISUAL";

    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    mediaContainer.replaceChildren();
    document.body.style.overflow = "";
  }

  // Clicking any card opens it. Draft thumbnails open individually.
  grid.addEventListener("click", event => {
    const card = event.target.closest(".visual-card");
    if (!card) return;

    const selectedMedia = event.target.closest("img, video");
    openLightbox(card, selectedMedia);
  });

  grid.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const media = event.target.closest("img, video");
    if (!media) return;

    event.preventDefault();
    const card = media.closest(".visual-card");
    if (card) openLightbox(card, media);
  });

  closeButton.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", event => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeLightbox();
    }
  });

  // Functional filters
  const filterItems = Array.from(
    filterNav.querySelectorAll("span, button")
  );

  function getFilterName(item) {
    const explicit = (item.dataset.filter || "").toLowerCase();
    const label = item.textContent.trim().toLowerCase();

    if (explicit.includes("featured") || label.includes("featured")) return "featured";
    if (explicit.includes("hot") || label.includes("hot take")) return "hot-take";
    if (explicit.includes("play") || label.includes("play this")) return "play-this";
    if (explicit.includes("new") || label.includes("newest")) return "newest";

    return "";
  }

  function applyFilter(filter) {
    cards = Array.from(grid.querySelectorAll(".visual-card"));

    cards.forEach(card => {
      card.hidden = false;
    });

    if (filter === "newest") {
      cards
        .slice()
        .sort((a, b) =>
          Number(b.dataset.originalOrder) - Number(a.dataset.originalOrder)
        )
        .forEach(card => grid.appendChild(card));
    } else {
      cards
        .slice()
        .sort((a, b) =>
          Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder)
        )
        .forEach(card => grid.appendChild(card));

      cards.forEach(card => {
        card.hidden = card.dataset.category !== filter;
      });
    }

    filterItems.forEach(item => {
      item.classList.toggle("active", getFilterName(item) === filter);
    });
  }

  filterItems.forEach(item => {
    item.addEventListener("click", () => {
      const filter = getFilterName(item);
      if (filter) applyFilter(filter);
    });
  });

  // Ensure hidden cards are removed from layout
  const hiddenStyle = document.createElement("style");
  hiddenStyle.textContent = ".visual-card[hidden] { display: none !important; }";
  document.head.appendChild(hiddenStyle);

  // Start on FEATURED
  applyFilter("featured");
});
