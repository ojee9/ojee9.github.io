document.addEventListener("DOMContentLoaded", function () {
  const grid = document.querySelector(".visual-grid");
  const nav = document.querySelector(".visual-filter");
  const lightbox = document.querySelector("#lightbox");
  const mediaBox = document.querySelector("#lightbox-media");
  const titleBox = document.querySelector("#lightbox-title");
  const kindBox = document.querySelector("#lightbox-kind");

  if (!grid || !nav || !lightbox || !mediaBox || !titleBox || !kindBox) {
    return;
  }

  const cards = Array.from(grid.querySelectorAll(".visual-card"));
  const buttons = Array.from(nav.querySelectorAll("[data-filter]"));

  cards.forEach((card, index) => {
    card.dataset.originalOrder = index;

    if (card.classList.contains("pocket")) {
      card.dataset.category = "hot-take";
    } else if (card.classList.contains("motion")) {
      card.dataset.category = "play-this";
    } else {
      card.dataset.category = "featured";
    }
  });

  function filterCards(filter) {
    cards.forEach(card => {
      card.hidden =
        filter !== "newest" && card.dataset.category !== filter;
    });

    if (filter === "newest") {
      cards
        .slice()
        .reverse()
        .forEach(card => grid.appendChild(card));
    } else {
      cards.forEach(card => grid.appendChild(card));
    }

    buttons.forEach(button => {
      const active = button.dataset.filter === filter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  buttons.forEach(button => {
    button.addEventListener("click", function () {
      filterCards(button.dataset.filter);
    });
  });

  grid.addEventListener("click", function (event) {
    const trigger = event.target.closest(".media-trigger");
    if (!trigger) return;

    const card = trigger.closest(".visual-card");
    const media = trigger.querySelector("img, video");
    if (!card || !media) return;

    mediaBox.replaceChildren();

    if (media.tagName === "VIDEO") {
      const video = document.createElement("video");
      video.controls = true;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;

      const source = media.querySelector("source");
      video.src = source ? source.src : media.currentSrc;
      mediaBox.appendChild(video);
      video.play().catch(() => {});
    } else {
      const image = document.createElement("img");
      image.src = media.src;
      image.alt = media.alt;
      mediaBox.appendChild(image);
    }

    titleBox.textContent = card.dataset.title || "";
    kindBox.textContent = card.dataset.kind || "";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    mediaBox.replaceChildren();
    document.body.style.overflow = "";
  }

  lightbox.querySelectorAll("[data-close-lightbox]").forEach(element => {
    element.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeLightbox();
  });

  filterCards("featured");
});
