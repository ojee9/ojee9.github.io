import { calculateCheckout } from "./shipping-calculator.js";
import { cart } from "./checkout-data.js";

const panel = document.getElementById("shipping-test-panel");
const country = document.getElementById("country");
const address = document.getElementById("address");
const city = document.getElementById("city");
const postal = document.getElementById("postal");

if (panel && country && address && city && postal) {
  const cartItems = cart();

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();

  const profileForPoster = (product, variant) => {
    const size = String(variant || "")
      .replace(/[×*]/g, "x")
      .replace(/cm/gi, "")
      .replace(/\s+/g, "")
      .toLowerCase();
    const id = String(product?.id || "").toLowerCase();

    if (id === "gta-love-poster-1") {
      return ({ "40x30": "POSTER_40x30", "80x60": "POSTER_80x60", "120x80": "POSTER_120x80" })[size] || null;
    }
    if (id === "gta-love-poster-2") {
      return ({ "30x45": "POSTER_30x45", "45x60": "POSTER_45x60", "60x90": "POSTER_60x90" })[size] || null;
    }
    return ({
      "45x60": "POSTER_45x60",
      "60x90": "POSTER_60x90",
      "80x120": "POSTER_80x120"
    })[size] || null;
  };

  const prepareCart = source => source.map(line => {
    const product = line?.product || {};
    const category = String(product.category || "").toUpperCase();
    const type = String(product.type || "").toUpperCase();
    let shippingProfile = null;

    if (category === "CD" || type.includes("CD")) {
      shippingProfile = "CD";
    } else if (type === "POSTER" || category === "XTRAS" && String(product.name || "").toUpperCase().includes("POSTER")) {
      shippingProfile = profileForPoster(product, line.variant);
    }

    return { ...line, shippingProfile };
  });

  const render = (message, rows = [], note = "") => {
    panel.replaceChildren();

    const heading = document.createElement("div");
    heading.className = "shipping-test-panel__eyebrow";
    heading.textContent = "SHIPPING CALCULATOR · TEST";

    const paragraph = document.createElement("p");
    paragraph.className = "shipping-test-panel__message";
    paragraph.textContent = message;

    panel.append(heading, paragraph);

    if (rows.length) {
      const detail = document.createElement("div");
      detail.className = "shipping-test-panel__detail";

      rows.forEach(([label, value]) => {
        const row = document.createElement("div");
        const name = document.createElement("span");
        const result = document.createElement("strong");
        name.textContent = label;
        result.textContent = value;
        row.append(name, result);
        detail.append(row);
      });

      if (note) {
        const footnote = document.createElement("small");
        footnote.textContent = note;
        detail.append(footnote);
      }
      panel.append(detail);
    }
  };

  const moneyTRY = amount => new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2
  }).format(amount);

  const calculate = () => {
    if (country.value !== "TR") {
      render("This test calculator currently supports Türkiye addresses only.");
      return;
    }
    if (!address.value.trim() || !city.value.trim() || !postal.value.trim()) {
      render("Complete address, city and postal code to run the test.");
      return;
    }
    if (!cartItems.length) {
      render("Your cart is empty. Add a product to test shipping.");
      return;
    }

    const destinationType = normalize(city.value) === "ankara" ? "intracity" : "intercity";
    const startedAt = performance.now();
    let result;

    try {
      result = calculateCheckout(prepareCart(cartItems), { destinationType });
    } catch (error) {
      console.error("VN shipping test calculation failed:", error);
      render("The test calculation could not be completed. Your checkout is unaffected.");
      return;
    }

    const responseMs = Math.max(0, performance.now() - startedAt).toFixed(2);

    if (result.status === "ok") {
      const dimensions = result.packing?.dimensionsCm
        ?.map(value => Number(value.toFixed(1))).join(" × ") || "—";
      render("Test estimate calculated — not a final shipping quote.", [
        ["Destination type", destinationType === "intracity" ? "Ankara · intracity" : "Türkiye · intercity"],
        ["Carrier estimate", moneyTRY(result.shipping.amount)],
        ["Handling estimate", moneyTRY(result.handling.amount)],
        ["Billable desi", String(result.packing?.billableDesi ?? "—")],
        ["Estimated parcel", dimensions + " cm"],
        ["Calculation response", responseMs + " ms"]
      ], "Preview only. This result does not change checkout totals, cart data or order information.");
      return;
    }

    const messages = {
      empty: "Your cart is empty. Add a product to test shipping.",
      invalid_destination: "The destination type could not be determined.",
      tariff_required: "A tariff is not configured for this test case.",
      manual_quote: result.reason === "UNKNOWN_PRODUCT_PROFILE"
        ? "A shipping profile is not configured for " + (result.product || "one of the cart items") + ". Manual review is required."
        : "This cart combination needs manual shipping review."
    };

    render(messages[result.status] || "The calculator returned an unsupported test result. Checkout remains available.", [
      ["Calculator status", result.status || "unknown"],
      ["Calculation response", responseMs + " ms"]
    ], "Test only. No checkout or order values were changed.");
  };

  let timer;
  const schedule = () => {
    window.clearTimeout(timer);
    render("Address updated. Preparing shipping estimate…");
    timer = window.setTimeout(calculate, 220);
  };

  [country, address, city, postal].forEach(field => {
    field.addEventListener("input", schedule);
    field.addEventListener("change", schedule);
  });

  window.requestAnimationFrame(() => {
    if (address.value.trim() && city.value.trim() && postal.value.trim()) schedule();
  });
}
