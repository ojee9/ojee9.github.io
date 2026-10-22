
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

  // Save the original HTML order and assign categories.
  cards.forEach((card, index) => {
    card.dataset.originalOrder = index;

    if (card.classList.contains("pocket")) {
      card.dataset.category = "hot-take";
    } else if (card.classList.contains("motion")) {
      card.dataset.category = "play-this";
    } else {
      card.dataset.category = "featured";
    }

    // Add VIEW labels to image and video triggers.
    card.querySelectorAll(".media-trigger").forEach(trigger => {
      if (
        trigger.querySelector("img, video") &&
        !trigger.querySelector(".view-label")
      ) {
        const label = document.createElement("span");
        label.className = "view-label";
        label.textContent = "VIEW";
        label.setAttribute("aria-hidden", "true");
        trigger.appendChild(label);
      }
    });
  });

  // Restore the original HTML order.
  function restoreOriginalOrder() {
    cards
      .slice()
      .sort(
        (a, b) =>
          Number(a.dataset.originalOrder) -
          Number(b.dataset.originalOrder)
      )
      .forEach(card => grid.appendChild(card));
  }

  // Filter and order the archive.
  function filterCards(filter) {
    // HTML order already places the newest cards first.
    restoreOriginalOrder();

    cards.forEach(card => {
      if (filter === "all" || filter === "newest") {
        card.hidden = false;
      } else {
        card.hidden = card.dataset.category !== filter;
      }
    });

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

  // Open artwork or video in the lightbox.
  grid.addEventListener("click", function (event) {
    const trigger = event.target.closest(".media-trigger");
    if (!trigger || !grid.contains(trigger)) return;

    const card = trigger.closest(".visual-card");
    const media = trigger.querySelector("img, video");

    if (!card || !media) return;

    mediaBox.replaceChildren();

    if (media.tagName === "VIDEO") {
      const video = document.createElement("video");
      const source = media.querySelector("source");

      video.controls = true;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.src = source ? source.src : media.currentSrc;

      mediaBox.appendChild(video);
      video.play().catch(() => {});
    } else {
      const image = document.createElement("img");
      image.src = media.src;
      image.alt = media.alt || card.dataset.title || "Artwork";

      mediaBox.appendChild(image);
    }

    titleBox.textContent = card.dataset.title || "";
    kindBox.textContent = card.dataset.kind || "";

    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });

  // Close the lightbox.
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
    if (event.key === "Escape") {
      closeLightbox();
    }
  });

  // Initial view.
  filterCards("featured");
});
