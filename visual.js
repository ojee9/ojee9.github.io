fetch("manifest.json")
  .then(response => response.json())
  .then(data => {
    const gallery = document.getElementById("gallery");

    data.images.forEach((imgName, index) => {
      const img = document.createElement("img");
      img.src = "visuals/" + imgName;

      // stagger pop animation
      img.style.opacity = 0;
      img.style.transform = "scale(0.9)";

      gallery.appendChild(img);

      setTimeout(() => {
        img.style.transition = "0.6s ease";
        img.style.opacity = 1;
        img.style.transform = "scale(1)";
      }, index * 150);
    });
  });
