
document.addEventListener("DOMContentLoaded", function () {
  const grid = document.querySelector(".visual-grid");
  const nav = document.querySelector(".visual-filter");
  const search = document.querySelector("#visual-search");
  const count = document.querySelector("#visual-count");
  const lightbox = document.querySelector("#lightbox");
  const mediaBox = document.querySelector("#lightbox-media");
  const titleBox = document.querySelector("#lightbox-title");
  const kindBox = document.querySelector("#lightbox-kind");

  if (!grid || !nav || !lightbox || !mediaBox || !titleBox || !kindBox) {
    return;
  }

  const cards = Array.from(grid.querySelectorAll(".visual-card"));
  const buttons = Array.from(nav.querySelectorAll("[data-filter]"));

  let activeFilter = "featured";

  // Keep the original HTML order as the archive order.
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

  function filterCards(filter = activeFilter) {
    activeFilter = filter;

    const query = search ? search.value.trim().toLowerCase() : "";

    // Restore original order before displaying the selected filter.
    cards
      .slice()
      .sort(
        (a, b) =>
          Number(a.dataset.originalOrder) -
          Number(b.dataset.originalOrder)
      )
      .forEach(card => grid.appendChild(card));

    let visibleCount = 0;

    cards.forEach(card => {
      const searchableText = [
        card.dataset.title || "",
        card.dataset.kind || "",
        card.textContent || "",
        ...Array.from(card.querySelectorAll("img")).map(img => img.alt || ""),
        ...Array.from(card.querySelectorAll("video source")).map(source => source.getAttribute("src") || "")
      ].join(" ").toLowerCase();

      const matchesCategory =
        filter === "all" ||
        filter === "newest" ||
        card.dataset.category === filter;

      const matchesSearch =
        !query || searchableText.includes(query);

      const visible = matchesCategory && matchesSearch;

      card.hidden = !visible;

      if (visible) visibleCount++;
    });

    buttons.forEach(button => {
      const active = button.dataset.filter === filter;

      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (count) {
      count.textContent =
        `${visibleCount} ${visibleCount === 1 ? "ITEM" : "ITEMS"}`;
    }
  }

  // Category filters.
  buttons.forEach(button => {
    button.addEventListener("click", function () {
      filterCards(button.dataset.filter);
    });
  });

  // Live search.
  if (search) {
    search.addEventListener("input", function () {
      filterCards();
    });
  }

  // Open artwork or video in the lightbox.
  grid.addEventListener("click", function (event) {
    const trigger = event.target.closest(".media-trigger");

    if (!trigger) return;

    const card = trigger.closest(".visual-card");
    if (!card) return;

    const media = trigger.querySelector("img, video");

    if (!media) return;

    mediaBox.replaceChildren();

    if (media.tagName === "VIDEO") {
      const video = document.createElement("video");
      const source = media.querySelector("source");

      video.controls = true;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;

      if (source) {
        video.src = source.src;
      } else {
        video.src = media.currentSrc || media.src;
      }

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

  lightbox
    .querySelectorAll("[data-close-lightbox]")
    .forEach(element => {
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
