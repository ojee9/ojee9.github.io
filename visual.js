
document.addEventListener("DOMContentLoaded", async () => {
  const gallery =
    document.getElementById("gallery") ||
    document.querySelector(".visual-grid");

  const filterButtons = document.querySelectorAll(".visual-filter button");
  const lightbox = document.getElementById("lightbox");
  const lightboxMedia = document.getElementById("lightbox-media");
  const lightboxTitle = document.getElementById("lightbox-title");
  const lightboxKind = document.getElementById("lightbox-kind");

  if (!gallery) {
    console.error("Gallery container not found.");
    return;
  }

  let items = [];
  let previousFocus = null;

  // LOAD MANIFEST
  try {
    const response = await fetch("manifest.json");

    if (!response.ok) {
      throw new Error(`manifest.json returned ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.images)) {
      throw new Error("manifest.json must contain an images array.");
    }

    data.images.forEach((entry, index) => {
      const item = typeof entry === "string"
        ? { src: "visuals/" + entry, title: entry, kind: "ARTWORK" }
        : {
            src: entry.src || ("visuals/" + entry.name),
            title: entry.title || entry.name || "UNTITLED",
            kind: entry.kind || "ARTWORK",
            category: entry.category || "",
            date: entry.date || "",
            featured: entry.featured === true
          };

      const card = document.createElement("article");
      card.className = "visual-card";
      card.dataset.title = item.title;
      card.dataset.kind = item.kind;
      card.dataset.category = item.category;
      card.dataset.date = item.date;
      card.dataset.originalIndex = index;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "media-trigger image-box";
      button.setAttribute("aria-label", `View ${item.title}`);

      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.title;
      img.loading = index < 6 ? "eager" : "lazy";
      img.decoding = "async";

      button.appendChild(img);
      card.appendChild(button);

      const info = document.createElement("div");
      info.className = "card-info";

      const heading = document.createElement("h2");
      heading.textContent = item.title;

      const type = document.createElement("p");
      type.textContent = item.kind;

      info.append(heading, type);
      card.appendChild(info);
      gallery.appendChild(card);

      // Staggered appearance
      card.style.opacity = "0";
      card.style.transform = "scale(.96)";

      requestAnimationFrame(() => {
        setTimeout(() => {
          card.style.transition =
            "opacity .5s ease, transform .5s ease, border-color .35s ease";
          card.style.opacity = "1";
          card.style.transform = "scale(1)";
        }, index * 70);
      });

      items.push({ card, item, button, img });
    });

    setupFilters();
  } catch (error) {
    console.error("Could not load gallery:", error);
    gallery.setAttribute("data-load-error", "true");
  }

  // FILTERS
  function setupFilters() {
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter;

        filterButtons.forEach((other) => {
          const active = other === button;
          other.classList.toggle("active", active);
          other.setAttribute("aria-pressed", String(active));
        });

        const sortedItems = [...items];

        if (filter === "newest") {
          sortedItems.sort((a, b) => {
            const dateA = Date.parse(a.item.date) || 0;
            const dateB = Date.parse(b.item.date) || 0;
            return dateB - dateA ||
              Number(b.card.dataset.originalIndex) -
              Number(a.card.dataset.originalIndex);
          });
        } else {
          sortedItems.sort((a, b) =>
            Number(a.card.dataset.originalIndex) -
            Number(b.card.dataset.originalIndex)
          );
        }

        sortedItems.forEach(({ card }) => {
          gallery.appendChild(card);

          if (filter === "featured") {
            card.hidden = !(card.classList.contains("featured") ||
              items.find((entry) => entry.card === card)?.item.featured);
          } else if (filter === "hot-take") {
            card.hidden = card.dataset.category !== "hot-take";
          } else if (filter === "play-this") {
            card.hidden = card.dataset.category !== "play-this" &&
              card.dataset.kind.toLowerCase().indexOf("video") === -1 &&
              card.dataset.kind.toLowerCase().indexOf("motion") === -1;
          } else {
            card.hidden = false;
          }
        });
      });
    });
  }

  // LIGHTBOX: only the clicked image opens; no previous/next navigation
  function openLightbox(trigger) {
    if (!lightbox || !lightboxMedia) return;

    const card = trigger.closest(".visual-card");
    const original = trigger.querySelector("img, video");

    if (!card || !original) return;

    previousFocus = document.activeElement;
    lightboxMedia.replaceChildren();

    const media = original.cloneNode(true);
    media.removeAttribute("loading");
    media.style.maxWidth = "100%";
    media.style.maxHeight = "100%";
    media.style.width = "auto";
    media.style.height = "auto";
    media.style.objectFit = "contain";

    if (media.tagName === "VIDEO") {
      media.controls = true;
      media.autoplay = true;
      media.loop = false;
      media.muted = true;
      media.playsInline = true;
    }

    lightboxMedia.appendChild(media);

    if (lightboxTitle) {
      lightboxTitle.textContent = card.dataset.title || "UNTITLED";
    }

    if (lightboxKind) {
      lightboxKind.textContent = card.dataset.kind || "ARTWORK";
    }

    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    lightbox.querySelector(".lightbox-close")?.focus();

    if (media.tagName === "VIDEO") {
      media.play().catch(() => {});
    }
  }

  function closeLightbox() {
    if (!lightbox || !lightbox.classList.contains("is-open")) return;

    lightboxMedia?.querySelector("video")?.pause();
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxMedia?.replaceChildren();
    document.body.style.overflow = "";

    previousFocus?.focus?.();
  }

  gallery.addEventListener("click", (event) => {
    const trigger = event.target.closest(".media-trigger");
    if (trigger && gallery.contains(trigger)) {
      openLightbox(trigger);
    }
  });

  lightbox?.querySelectorAll("[data-close-lightbox]").forEach((button) => {
    button.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });
});
