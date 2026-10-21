
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".visual-grid");
  const filterNav = document.querySelector(".visual-filter");
  const lightbox = document.getElementById("lightbox");
  const lightboxMedia = document.getElementById("lightbox-media");
  const lightboxTitle = document.getElementById("lightbox-title");
  const lightboxKind = document.getElementById("lightbox-kind");

  if (!grid || !filterNav || !lightbox || !lightboxMedia ||
      !lightboxTitle || !lightboxKind) {
    console.error("Visuals: HTML elements missing.");
    return;
  }

  const cards = [...grid.querySelectorAll(".visual-card")];

  cards.forEach((card, index) => {
    card.dataset.originalOrder = index;

    if (card.classList.contains("pocket")) {
      card.dataset.category = "hot-take";
    } else if (card.classList.contains("motion")) {
      card.dataset.category = "play-this";
    } else {
      card.dataset.category = "featured";
    }

    card.querySelectorAll("video source").forEach(source => {
      if (source.src.includes("subcity-original-canvas.mp4")) {
        source.src = "assets/motions/subcity-original-canvas.mp4?v=2";
      }
      if (source.src.includes("subcity-track-canvas-social-addon.mp4")) {
        source.src = "assets/motions/subcity-track-canvas-social-addon.mp4?v=2";
      }
    });

    const video = card.querySelector("video");
    if (video) {
      video.load();
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.play().catch(() => {});
    }
  });

  function openLightbox(card, trigger) {
    const media = trigger.querySelector("img, video");
    if (!media) return;

    lightboxMedia.replaceChildren();

    if (media.tagName === "VIDEO") {
      const video = document.createElement("video");
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;

      const source = media.querySelector("source");
      video.src = source ? source.src : (media.currentSrc || media.src);
      lightboxMedia.appendChild(video);
      video.play().catch(() => {});
    } else {
      const image = document.createElement("img");
      image.src = media.currentSrc || media.src;
      image.alt = media.alt || "";
      lightboxMedia.appendChild(image);
    }

    lightboxTitle.textContent =
      card.dataset.title ||
      card.querySelector(".card-info h2")?.textContent.trim() ||
      "UNTITLED";

    lightboxKind.textContent =
      card.dataset.kind ||
      card.querySelector(".card-info p")?.textContent.trim() ||
      "VISUAL";

    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxMedia.replaceChildren();
    document.body.style.overflow = "";
  }

  grid.addEventListener("click", event => {
    const trigger = event.target.closest(".media-trigger");
    if (!trigger) return;

    const card = trigger.closest(".visual-card");
    if (card) openLightbox(card, trigger);
  });

  lightbox.querySelectorAll("[data-close-lightbox]").forEach(element => {
    element.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeLightbox();
    }
  });

  const buttons = [...filterNav.querySelectorAll("[data-filter]")];

  function applyFilter(filter) {
    cards.forEach(card => {
      card.hidden =
        filter !== "newest" && card.dataset.category !== filter;
    });

    if (filter === "newest") {
      [...cards]
        .sort((a, b) =>
          Number(b.dataset.originalOrder) - Number(a.dataset.originalOrder)
        )
        .forEach(card => grid.appendChild(card));
    } else {
      [...cards]
        .sort((a, b) =>
          Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder)
        )
        .forEach(card => grid.appendChild(card));
    }

    buttons.forEach(button => {
      const active = button.dataset.filter === filter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      applyFilter(button.dataset.filter);
    });
  });

  applyFilter("featured");
  console.log("Visuals JS loaded successfully.");
});
