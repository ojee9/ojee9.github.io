/* VN SHOP — CHECKOUT
   Steps: Information → Shipping & Handling → Payment
   Payment processing is not connected yet.
*/
(() => {
  "use strict";

  const CONFIG = {
    currency: "USD",
    supportEmail: "9ojeez9@gmail.com",
    demoShipDate: "Ships on October 30, 2026",
    shippingRates: {
      US: { together: 0, separate: 0 },
      TR: { together: 0, separate: 0 },
      DEFAULT: { together: 37.22, separate: 37.22 }
    }
  };

  const state = {
    step: 1,
    cart: [],
    email: "9ojeez9@gmail.com",
    emailOffers: false,
    country: "US",
    firstName: "",
    lastName: "",
    address: "",
    apartment: "",
    city: "",
    postal: "",
    phone: "",
    shippingMethod: "together",
    paymentMethod: "card",
    billingMode: "same",
    billing: {
      country: "US",
      firstName: "",
      lastName: "",
      address: "",
      apartment: "",
      city: "",
      postal: "",
      phone: ""
    },
    discountCode: "",
    orderNote: "",
    rememberMe: false
  };

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const money = amount =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: CONFIG.currency
    }).format(Number(amount) || 0);

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  function parsePrice(value) {
    if (typeof value === "number") return value;

    const match = String(value ?? "")
      .replace(/,/g, "")
      .match(/-?\d+(?:\.\d{1,2})?/);

    return match ? Number(match[0]) : 0;
  }

  function normalizeCart(items) {
    return items.map((item, index) => {
      const quantity = Math.max(
        1,
        Number(item.quantity ?? item.qty ?? 1) || 1
      );

      const price = parsePrice(
        item.unitPrice ?? item.price ?? item.amount ?? 0
      );

      return {
        id: String(item.id ?? item.productId ?? index),
        name: String(item.name ?? item.title ?? "Product"),
        image: String(item.image ?? item.img ?? item.thumbnail ?? ""),
        variant: String(item.variant ?? item.size ?? ""),
        quantity,
        unitPrice: price,
        lineTotal: price * quantity
      };
    });
  }

  function readCart() {
    if (Array.isArray(window.VN_SHOP_CART)) {
      return normalizeCart(window.VN_SHOP_CART);
    }

    for (const key of [
      "vn-cart",
      "vn_cart",
      "cart",
      "merch-cart",
      "merchCart"
    ]) {
      try {
        const value = localStorage.getItem(key);
        if (!value) continue;

        const parsed = JSON.parse(value);
        const items = Array.isArray(parsed)
          ? parsed
          : parsed.items ?? parsed.cart;

        if (Array.isArray(items)) {
          return normalizeCart(items);
        }
      } catch (_) {}
    }

    return [];
  }

  function subtotal() {
    return state.cart.reduce(
      (total, item) => total + item.lineTotal,
      0
    );
  }

  function shippingPrice(method = state.shippingMethod) {
    const rates =
      CONFIG.shippingRates[state.country] ??
      CONFIG.shippingRates.DEFAULT;

    return Number(rates[method] ?? 0);
  }

  function total() {
    return subtotal() + shippingPrice();
  }

  const countries = [
    ["US", "United States"],
    ["TR", "Türkiye"],
    ["GB", "United Kingdom"],
    ["CA", "Canada"],
    ["AU", "Australia"],
    ["DE", "Germany"],
    ["FR", "France"],
    ["IT", "Italy"],
    ["ES", "Spain"],
    ["NL", "Netherlands"],
    ["BE", "Belgium"],
    ["AT", "Austria"],
    ["CH", "Switzerland"],
    ["SE", "Sweden"],
    ["NO", "Norway"],
    ["DK", "Denmark"],
    ["PL", "Poland"],
    ["GR", "Greece"],
    ["AE", "United Arab Emirates"],
    ["SA", "Saudi Arabia"],
    ["JP", "Japan"],
    ["KR", "South Korea"],
    ["IN", "India"],
    ["BR", "Brazil"],
    ["MX", "Mexico"]
  ];

  function countryOptions(selected) {
    return countries.map(([code, name]) => `
      <option value="${code}" ${selected === code ? "selected" : ""}>
        ${name}
      </option>
    `).join("");
  }

  function field(label, key, options = {}) {
    const value = options.value ?? state[key] ?? "";
    const required = options.required === false ? "" : "required";
    const optional = options.optional ? " (optional)" : "";

    return `
      <label class="vn-co-field">
        <span>${escapeHTML(label)}${optional}</span>
        <input
          name="${escapeHTML(key)}"
          data-field="${escapeHTML(key)}"
          type="${escapeHTML(options.type || "text")}"
          value="${escapeHTML(value)}"
          autocomplete="${escapeHTML(options.autocomplete || "off")}"
          placeholder="${escapeHTML(options.placeholder || "")}"
          ${required}
        >
      </label>
    `;
  }

  function addressFields(prefix = "", data = state) {
    const key = name =>
      prefix
        ? prefix + name[0].toUpperCase() + name.slice(1)
        : name;

    const countryKey = key("country");
    const selectedCountry = data.country || state.country;

    return `
      <label class="vn-co-field">
        <span>Country / Region</span>
        <select name="${countryKey}" data-field="${countryKey}">
          ${countryOptions(selectedCountry)}
        </select>
      </label>

      <div class="vn-co-grid">
        ${field("First name", key("firstName"), {
          value: data.firstName,
          autocomplete: "given-name"
        })}
        ${field("Last name", key("lastName"), {
          value: data.lastName,
          autocomplete: "family-name"
        })}
      </div>

      ${field("Address", key("address"), {
        value: data.address,
        autocomplete: "address-line1"
      })}

      ${field("Apartment, suite, etc.", key("apartment"), {
        value: data.apartment,
        optional: true,
        required: false,
        autocomplete: "address-line2"
      })}

      <div class="vn-co-grid">
        ${field("City", key("city"), {
          value: data.city,
          autocomplete: "address-level2"
        })}
        ${field("ZIP code", key("postal"), {
          value: data.postal,
          autocomplete: "postal-code"
        })}
      </div>

      ${field("Phone", key("phone"), {
        value: data.phone,
        type: "tel",
        optional: prefix === "billing",
        required: prefix !== "billing",
        autocomplete: "tel"
      })}

      ${prefix !== "billing"
        ? `<small class="vn-co-hint">
             In case we need to contact you about your order.
           </small>`
        : ""}
    `;
  }

  function progress() {
    const steps = [
      ["CART", 0],
      ["Information", 1],
      ["Shipping & Handling", 2],
      ["Payment", 3]
    ];

    return `
      <nav class="vn-co-progress" aria-label="Checkout progress">
        ${steps.map(([label, number], index) => `
          ${index ? "<span>›</span>" : ""}
          <button
            type="button"
            data-step="${number}"
            class="${state.step === number ? "current" : state.step > number ? "done" : ""}"
          >${label}</button>
        `).join("")}
      </nav>
    `;
  }

  function productList() {
    if (!state.cart.length) {
      return `<p>Your cart is empty.</p>`;
    }

    return state.cart.map(item => `
      <div class="vn-co-product">
        <div class="vn-co-thumb">
          ${item.image
            ? `<img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}">`
            : `<span>${escapeHTML(item.name.slice(0, 1))}</span>`}
          <i>${item.quantity}</i>
        </div>

        <div class="vn-co-product-info">
          <strong>${escapeHTML(item.name)}</strong>
          ${item.variant
            ? `<small>${escapeHTML(item.variant)}</small>`
            : ""}
        </div>

        <span>${money(item.lineTotal)}</span>
      </div>
    `).join("");
  }

  function orderSummary() {
    return `
      <aside class="vn-co-summary">
        <div>${productList()}</div>

        <form id="vnCoDiscount" class="vn-co-discount">
          <input
            name="discount"
            placeholder="Discount code"
            aria-label="Discount code"
            value="${escapeHTML(state.discountCode)}"
          >
          <button type="submit">APPLY</button>
        </form>

        <p class="vn-co-discount-message" aria-live="polite"></p>

        <div class="vn-co-total-row">
          <span>Subtotal</span>
          <span>${money(subtotal())}</span>
        </div>

        <div class="vn-co-total-row">
          <span>Shipping &amp; Handling</span>
          <span>${state.step === 1
            ? "Calculated at next step"
            : money(shippingPrice())}</span>
        </div>

        <div class="vn-co-total-row vn-co-grand-total">
          <strong>Total</strong>
          <strong>
            <small>${CONFIG.currency}</small>
            ${money(total())}
          </strong>
        </div>
      </aside>
    `;
  }

  function reviewRow(title, value, action) {
    return `
      <div class="vn-co-review">
        <strong>${title}</strong>
        <div>${value}</div>
        <button type="button" data-action="change-${action}">Change</button>
      </div>
    `;
  }

  function informationStep() {
    return `
      <section class="vn-co-step">
        <h2>Express checkout</h2>

        <div class="vn-co-express">
          <button type="button" data-express="gpay">G Pay</button>
          <button type="button" data-express="paypal">PayPal</button>
          <button type="button" data-express="shop">Shop Pay</button>
          <button type="button" data-express="applepay">Apple Pay</button>
        </div>

        <div class="vn-co-or"><span>OR</span></div>

        <form id="vnCoInformation">
          <div class="vn-co-section-title">
            <h2>Contact</h2>
            <button type="button" data-action="signout">Sign out</button>
          </div>

          ${field("Email", "email", {
            type: "email",
            autocomplete: "email"
          })}

          <label class="vn-co-check">
            <input type="checkbox" data-field="emailOffers"
              ${state.emailOffers ? "checked" : ""}>
            Email me with news and offers
          </label>

          <div class="vn-co-section-title">
            <h2>Shipping address</h2>
          </div>

          <div class="vn-co-address-choice">
            <label>
              <input type="radio" name="addressMode" value="new" checked>
              Use a new address
            </label>
            <label>
              <input type="radio" name="addressMode" value="saved" disabled>
              Saved addresses
            </label>
          </div>

          ${addressFields()}

          <div class="vn-co-actions">
            <button type="button" class="vn-co-subtle" data-action="cart">
              Return to cart
            </button>
            <button type="submit" class="vn-co-primary">
              Continue to shipping
            </button>
          </div>
        </form>

        <p class="vn-co-legal">
          <a href="policies/terms-of-sale.html">Terms</a>
          and
          <a href="policies/privacy-policy.html">Policies</a>
        </p>
      </section>
    `;
  }

  function shippingStep() {
    const name = `${state.firstName} ${state.lastName}`.trim();
    const address = [
      state.address,
      state.apartment,
      state.city,
      state.postal,
      countryName(state.country)
    ].filter(Boolean).map(escapeHTML).join(", ");

    return `
      <section class="vn-co-step">
        ${reviewRow("Contact", escapeHTML(state.email), "contact")}

        ${reviewRow(
          "Ship to",
          `${escapeHTML(name)}<br>${address}`,
          "address"
        )}

        <div class="vn-co-section-title">
          <h2>Shipping &amp; Handling</h2>
        </div>

        <p class="vn-co-hint">
          ${CONFIG.demoShipDate} · Example date
        </p>

        <p>Choose a shipping method</p>

        <label class="vn-co-shipping ${state.shippingMethod === "together" ? "selected" : ""}">
          <input type="radio" name="shippingMethod" value="together"
            ${state.shippingMethod === "together" ? "checked" : ""}>
          <span>
            <strong>INTL EXPRESS — SHIP ITEMS TOGETHER</strong>
            <small>2–5 days. Customs &amp; duties may apply.</small>
          </span>
          <b>${money(shippingPrice("together"))}</b>
        </label>

        <label class="vn-co-shipping ${state.shippingMethod === "separate" ? "selected" : ""}">
          <input type="radio" name="shippingMethod" value="separate"
            ${state.shippingMethod === "separate" ? "checked" : ""}>
          <span>
            <strong>INTL EXPRESS — SHIP SEPARATELY AS AVAILABLE</strong>
            <small>2–5 days. Customs &amp; duties may apply.</small>
          </span>
          <b>${money(shippingPrice("separate"))}</b>
        </label>

        <div class="vn-co-actions">
          <button type="button" class="vn-co-subtle" data-step="1">
            Return to information
          </button>
          <button type="button" class="vn-co-primary" data-action="payment">
            Continue to payment
          </button>
        </div>
      </section>
    `;
  }

  function paymentStep() {
    const name = `${state.firstName} ${state.lastName}`.trim();
    const address = [
      state.address,
      state.apartment,
      state.city,
      state.postal,
      countryName(state.country)
    ].filter(Boolean).map(escapeHTML).join(", ");

    return `
      <section class="vn-co-step">
        ${reviewRow("Contact", escapeHTML(state.email), "contact")}

        ${reviewRow(
          "Ship to",
          `${escapeHTML(name)}<br>${address}`,
          "address"
        )}

        ${reviewRow(
          "Shipping &amp; Handling",
          `${state.shippingMethod === "together"
            ? "INTL EXPRESS — SHIP ITEMS TOGETHER"
            : "INTL EXPRESS — SHIP SEPARATELY AS AVAILABLE"}
            · ${money(shippingPrice())}`,
          "shipping"
        )}

        <div class="vn-co-section-title">
          <h2>Additional information</h2>
        </div>

        ${field(
          "Türkiye Cumhuriyeti Kimlik Numarası / KDV",
          "orderNote",
          { value: state.orderNote, required: false, optional: true }
        )}

        <div class="vn-co-section-title">
          <h2>Payment</h2>
        </div>

        <p class="vn-co-hint">All transactions are secure and encrypted.</p>

        <div class="vn-co-payment-options">
          <label class="vn-co-payment">
            <input type="radio" name="paymentMethod" value="card"
              ${state.paymentMethod === "card" ? "checked" : ""}>
            <span>
              <strong>Credit card</strong>
              <small>VISA · MASTERCARD · AMEX · DISCOVER · ELO · JCB · UNIONPAY</small>
            </span>
          </label>

          <div class="vn-co-card-fields" ${state.paymentMethod !== "card" ? "hidden" : ""}>
            ${field("Card number", "cardNumber", {
              value: "",
              autocomplete: "cc-number",
              placeholder: "Card number"
            })}

            <div class="vn-co-grid">
              ${field("Expiration date", "cardExpiry", {
                value: "",
                autocomplete: "cc-exp",
                placeholder: "MM / YY"
              })}
              ${field("Security code", "cardCvc", {
                value: "",
                autocomplete: "cc-csc",
                placeholder: "CVC"
              })}
            </div>

            <small class="vn-co-hint">
              The security code is usually on the back of your card.
              American Express uses a 4-digit code on the front.
            </small>
          </div>

          <label class="vn-co-payment">
            <input type="radio" name="paymentMethod" value="applepay"
              ${state.paymentMethod === "applepay" ? "checked" : ""}>
            <span><strong>Apple Pay</strong><small>Apple Pay</small></span>
          </label>

          <label class="vn-co-payment">
            <input type="radio" name="paymentMethod" value="paypal"
              ${state.paymentMethod === "paypal" ? "checked" : ""}>
            <span><strong>PayPal</strong><small>PayPal</small></span>
          </label>

          <label class="vn-co-payment">
            <input type="radio" name="paymentMethod" value="affirm"
              ${state.paymentMethod === "affirm" ? "checked" : ""}>
            <span><strong>Affirm — Pay Over Time</strong><small>affirm</small></span>
          </label>
        </div>

        <div class="vn-co-section-title">
          <h2>Billing address</h2>
        </div>

        <p class="vn-co-hint">
          Select the address that matches your card or payment method.
        </p>

        <label class="vn-co-billing-choice">
          <input type="radio" name="billingMode" value="same"
            ${state.billingMode === "same" ? "checked" : ""}>
          Same as shipping address
        </label>

        <label class="vn-co-billing-choice">
          <input type="radio" name="billingMode" value="different"
            ${state.billingMode === "different" ? "checked" : ""}>
          Use a different billing address
        </label>

        <div id="vnCoBillingFields"
          ${state.billingMode !== "different" ? "hidden" : ""}>
          ${addressFields("billing", state.billing)}
        </div>

        <label class="vn-co-check">
          <input type="checkbox" data-field="rememberMe"
            ${state.rememberMe ? "checked" : ""}>
          Remember me
        </label>

        <p class="vn-co-hint">
          Save your information for a faster checkout, or leave unchecked to skip.
        </p>

        <div class="vn-co-actions">
          <button type="button" class="vn-co-subtle" data-step="2">
            Return to shipping
          </button>
          <button type="button" class="vn-co-primary" data-action="pay">
            PAY NOW · ${money(total())}
          </button>
        </div>

        <p class="vn-co-legal">
          By placing your order, you agree to our
          <a href="policies/terms-of-sale.html">Terms of Sale</a>
          and
          <a href="policies/privacy-policy.html">Privacy Policy</a>.
        </p>
      </section>
    `;
  }

  function countryName(code) {
    return countries.find(country => country[0] === code)?.[1] ?? code;
  }

  function injectStyles() {
    if ($("#vnCoStyles")) return;

    const style = document.createElement("style");
    style.id = "vnCoStyles";
    style.textContent = `
      .vn-co-overlay{position:fixed;inset:0;z-index:10000;background:#fff;color:#171717;overflow:auto;font:14px/1.5 Arial,sans-serif}
      .vn-co-overlay *{box-sizing:border-box}
      .vn-co-shell{max-width:1200px;margin:auto;padding:24px}
      .vn-co-header{text-align:center;border-bottom:1px solid #e5e5e5;padding:8px 0 20px}
      .vn-co-logo{font-size:24px;letter-spacing:.18em;font-weight:800;color:inherit;text-decoration:none}
      .vn-co-progress{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin:18px 0 28px;color:#777;font-size:12px}
      .vn-co-progress button{border:0;background:none;color:inherit;padding:0;cursor:pointer;font:inherit}
      .vn-co-progress .current{color:#111;font-weight:700}
      .vn-co-progress .done{color:#555}
      .vn-co-columns{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(300px,.95fr);gap:64px}
      .vn-co-step h2{font-size:16px;font-weight:650;margin:0 0 14px}
      .vn-co-section-title{display:flex;justify-content:space-between;align-items:center;margin:26px 0 12px}
      .vn-co-section-title h2{margin:0}
      .vn-co-field{display:flex;flex-direction:column;gap:5px;margin:10px 0;min-width:0}
      .vn-co-field>span{font-size:12px;color:#444}
      .vn-co-field input,.vn-co-field select,.vn-co-discount input{width:100%;min-height:46px;padding:12px;border:1px solid #c9c9c9;border-radius:5px;background:#fff;color:#111;font:inherit}
      .vn-co-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .vn-co-hint{font-size:12px;color:#666}
      .vn-co-check,.vn-co-billing-choice{display:flex;align-items:center;gap:8px;margin:12px 0}
      .vn-co-address-choice{display:flex;gap:20px;flex-wrap:wrap;font-size:13px}
      .vn-co-address-choice label{display:flex;align-items:center;gap:8px;margin:12px 0}
      .vn-co-express{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      .vn-co-express button{height:46px;border:0;border-radius:5px;background:#111;color:#fff;font-weight:700;cursor:pointer}
      .vn-co-express button:nth-child(1){background:#f3f3f3;color:#111}
      .vn-co-express button:nth-child(2){background:#ffc439;color:#111}
      .vn-co-express button:nth-child(3){background:#5a31f4}
      .vn-co-express button:nth-child(4){background:#000}
      .vn-co-or{display:flex;align-items:center;gap:12px;color:#888;font-size:11px;margin:22px 0}
      .vn-co-or:before,.vn-co-or:after{content:"";height:1px;background:#e5e5e5;flex:1}
      .vn-co-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:28px 0 14px}
      .vn-co-primary,.vn-co-subtle{min-height:48px;padding:12px 18px;border-radius:5px;cursor:pointer;font:inherit}
      .vn-co-primary{background:#171717;color:#fff;border:1px solid #171717;font-weight:650}
      .vn-co-subtle{background:transparent;color:#555;border:0;padding-left:0}
      .vn-co-step [data-action="signout"],.vn-co-review button{background:none;border:0;color:#666;text-decoration:underline;cursor:pointer;font:inherit;font-size:12px}
      .vn-co-legal{font-size:11px;color:#777;margin-top:24px}
      .vn-co-legal a{color:inherit}
      .vn-co-summary{border-left:1px solid #e5e5e5;padding-left:28px;position:sticky;top:20px;align-self:start}
      .vn-co-product{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:12px;align-items:center;padding:0 0 18px;margin-bottom:16px;border-bottom:1px solid #eee}
      .vn-co-thumb{width:64px;height:64px;background:#f4f4f4;border:1px solid #e1e1e1;border-radius:6px;position:relative;display:grid;place-items:center;overflow:visible}
      .vn-co-thumb img{width:100%;height:100%;object-fit:cover;border-radius:5px}
      .vn-co-thumb i{position:absolute;right:-7px;top:-7px;background:#666;color:#fff;border-radius:50%;font-style:normal;font-size:11px;min-width:20px;height:20px;display:grid;place-items:center}
      .vn-co-product-info{display:flex;flex-direction:column;gap:3px}
      .vn-co-product-info strong{font-size:13px;font-weight:600}
      .vn-co-product-info small{font-size:12px;color:#777}
      .vn-co-discount{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin:16px 0 4px}
      .vn-co-discount button{padding:0 16px;border:1px solid #d4d4d4;border-radius:5px;background:#eee;color:#222;font-weight:600}
      .vn-co-discount-message{font-size:12px;color:#555;min-height:12px}
      .vn-co-total-row{display:flex;justify-content:space-between;gap:16px;margin:12px 0;font-size:13px}
      .vn-co-grand-total{border-top:1px solid #e5e5e5;padding-top:18px;margin-top:18px;font-size:16px}
      .vn-co-grand-total small{font-size:10px;color:#777}
      .vn-co-review{display:grid;grid-template-columns:80px minmax(0,1fr) auto;gap:12px;align-items:start;padding:14px 0;border-bottom:1px solid #e5e5e5;font-size:12px}
      .vn-co-review>strong{color:#555;font-weight:500}
      .vn-co-review>div{overflow-wrap:anywhere}
      .vn-co-shipping,.vn-co-payment{display:flex;align-items:center;gap:12px;border:1px solid #d6d6d6;border-radius:6px;padding:16px;margin:10px 0;cursor:pointer}
      .vn-co-shipping.selected{border-color:#222;box-shadow:0 0 0 1px #222}
      .vn-co-shipping>span,.vn-co-payment>span{display:flex;flex-direction:column;gap:5px;flex:1}
      .vn-co-shipping strong,.vn-co-payment strong{font-size:12px}
      .vn-co-shipping small,.vn-co-payment small{font-size:11px;color:#666}
      .vn-co-shipping>b{font-size:13px;white-space:nowrap}
      .vn-co-card-fields{padding:0 8px 10px}
      @media(max-width:760px){
        .vn-co-shell{padding:16px}
        .vn-co-columns{grid-template-columns:1fr;gap:26px}
        .vn-co-summary{order:-1;position:static;border-left:0;border-bottom:1px solid #ddd;padding:0 0 20px}
        .vn-co-express{grid-template-columns:repeat(2,minmax(0,1fr))}
        .vn-co-progress{gap:6px;font-size:10px}
        .vn-co-review{grid-template-columns:70px minmax(0,1fr) auto}
        .vn-co-actions{align-items:stretch}
        .vn-co-primary{flex:1}
        .vn-co-grid{gap:8px}
      }
    `;

    document.head.appendChild(style);
  }

  function render() {
    injectStyles();

    let root = $("#vnCheckoutOverlay");

    if (!root) {
      root = document.createElement("div");
      root.id = "vnCheckoutOverlay";
      root.className = "vn-co-overlay";
      root.hidden = true;

      root.innerHTML = `
        <div class="vn-co-shell">
          <header class="vn-co-header">
            <a class="vn-co-logo" href="#" data-action="close">VN SHOP</a>
          </header>
          <div id="vnCoProgress"></div>
          <div class="vn-co-columns">
            <main id="vnCoMain"></main>
            <div id="vnCoSummary"></div>
          </div>
        </div>
      `;

      document.body.appendChild(root);
    }

    root.hidden = false;
    $("#vnCoProgress", root).innerHTML = progress();

    $("#vnCoMain", root).innerHTML =
      state.step === 1
        ? informationStep()
        : state.step === 2
          ? shippingStep()
          : paymentStep();

    $("#vnCoSummary", root).innerHTML = orderSummary();

    document.body.style.overflow = "hidden";
  }

  function close() {
    const root = $("#vnCheckoutOverlay");
    if (root) root.hidden = true;
    document.body.style.overflow = "";
  }

  function open() {
    state.cart = readCart();

    state.step = 1;
    render();
  }

  function captureFields(root) {
    root.querySelectorAll("[data-field]").forEach(element => {
      const key = element.dataset.field;

      if (key === "emailOffers") {
        state.emailOffers = element.checked;
      } else if (key === "rememberMe") {
        state.rememberMe = element.checked;
      } else if (key.startsWith("billing")) {
        const name = key.slice(7);
        const normalized =
          name.charAt(0).toLowerCase() + name.slice(1);
        state.billing[normalized] = element.value;
      } else if (key === "country") {
        state.country = element.value;
      } else if (key === "orderNote") {
        state.orderNote = element.value;
      } else if (Object.hasOwn(state, key)) {
        state[key] = element.value;
      }
    });
  }

  function validateInformation() {
    const required = [
      ["email", "Enter a valid email address."],
      ["firstName", "Enter your first name."],
      ["lastName", "Enter your last name."],
      ["address", "Enter your shipping address."],
      ["city", "Enter your city."],
      ["postal", "Enter your ZIP / postal code."]
    ];

    for (const [key, message] of required) {
      const value = String(state[key] || "").trim();

      if (
        !value ||
        (key === "email" &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      ) {
        alert(message);
        $(`#vnCheckoutOverlay [data-field="${key}"]`)?.focus();
        return false;
      }
    }

    return true;
  }

  function goTo(step) {
    if (step === 0) {
      close();

      const cartButton = $(
        "#cart-drawer button, #cartDrawer button, [data-cart-toggle]"
      );

      cartButton?.click();
      return;
    }

    if (step === 2 && !validateInformation()) return;

    state.step = step;
    render();
  }

  function unavailable(message) {
    alert(
      `${message} is not connected yet. No payment has been taken and no order has been placed.`
    );
  }

  document.addEventListener("click", event => {
    const root = $("#vnCheckoutOverlay");

    if (root && !root.hidden && root.contains(event.target)) {
      const stepButton = event.target.closest("[data-step]");

      if (stepButton) {
        event.preventDefault();

        const step = Number(stepButton.dataset.step);

        if (step === 0) {
          goTo(0);
        } else if (step < state.step) {
          goTo(step);
        }

        return;
      }

      const actionButton = event.target.closest("[data-action]");

      if (actionButton) {
        event.preventDefault();

        switch (actionButton.dataset.action) {
          case "close":
            close();
            break;

          case "cart":
            goTo(0);
            break;

          case "payment":
            state.step = 3;
            render();
            break;

          case "change-contact":
          case "change-address":
            goTo(1);
            break;

          case "change-shipping":
            goTo(2);
            break;

          case "signout":
            state.email = "";

            if (window.supabaseClient?.auth?.signOut) {
              window.supabaseClient.auth.signOut()
                .finally(render);
            } else {
              render();
            }
            break;

          case "pay":
            unavailable("Payment processing");
            break;
        }

        return;
      }

      const express = event.target.closest("[data-express]");

      if (express) {
        event.preventDefault();
        unavailable(express.textContent.trim());
        return;
      }
    }
  });

  document.addEventListener("input", event => {
    const root = $("#vnCheckoutOverlay");

    if (!root || root.hidden || !root.contains(event.target)) return;

    const element = event.target;
    const key = element.dataset.field;

    if (!key) return;

    if (key.startsWith("billing")) {
      const name = key.slice(7);
      const normalized =
        name.charAt(0).toLowerCase() + name.slice(1);
      state.billing[normalized] = element.value;
    } else if (key === "orderNote") {
      state.orderNote = element.value;
    } else if (Object.hasOwn(state, key)) {
      state[key] = element.value;
    }
  });

  document.addEventListener("change", event => {
    const root = $("#vnCheckoutOverlay");

    if (!root || root.hidden || !root.contains(event.target)) return;

    const element = event.target;
    const key = element.dataset.field;

    if (key === "emailOffers") {
      state.emailOffers = element.checked;
    } else if (key === "rememberMe") {
      state.rememberMe = element.checked;
    } else if (key === "country") {
      state.country = element.value;
      render();
    } else if (key?.startsWith("billing")) {
      const name = key.slice(7);
      const normalized =
        name.charAt(0).toLowerCase() + name.slice(1);
      state.billing[normalized] = element.value;
    }

    if (element.name === "shippingMethod") {
      state.shippingMethod = element.value;
      render();
    } else if (element.name === "paymentMethod") {
      state.paymentMethod = element.value;
      render();
    } else if (element.name === "billingMode") {
      state.billingMode = element.value;
      render();
    }
  });

  document.addEventListener("submit", event => {
    const form = event.target;

    if (form.id === "vnCoInformation") {
      event.preventDefault();
      captureFields(form);

      if (validateInformation()) {
        state.step = 2;
        render();
      }
    }

    if (form.id === "vnCoDiscount") {
      event.preventDefault();

      const code = form.elements.discount.value.trim();
      state.discountCode = code;

      render();

      const message = $(".vn-co-discount-message");

      if (message) {
        message.textContent = code
          ? "Discount code validation is not connected yet."
          : "Enter a discount code.";
      }
    }
  });

  // Catch checkout buttons in the existing storefront.
  document.addEventListener("click", event => {
    if (event.defaultPrevented) return;

    const button = event.target.closest("button, a, [role='button']");

    if (!button || button.closest("#vnCheckoutOverlay")) return;

    const text = [
      button.textContent || "",
      button.getAttribute("aria-label") || "",
      button.dataset.action || ""
    ].join(" ").toLowerCase();

    if (!/\b(checkout|check out|proceed to checkout|go to checkout)\b/i.test(text)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    open();
  }, true);

  window.VNCheckout = {
    open,
    close,
    setEmail(email) {
      state.email = String(email || "");
    },
    setCart(items) {
      state.cart = normalizeCart(Array.isArray(items) ? items : []);
    },
    refreshCart() {
      state.cart = readCart();
    },
    getState() {
      return {
        step: state.step,
        itemCount: state.cart.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: subtotal(),
        shipping: shippingPrice(),
        total: total(),
        country: state.country
      };
    }
  };
})();
