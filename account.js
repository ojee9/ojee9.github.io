
/* VN SHOP — ACCOUNT
   Email OTP, dashboard, profile, addresses, orders, returns, legal panels.
   Requires Supabase JS v2 and merch.json.
   Persistent account data requires matching Supabase tables and RLS policies.
*/
(() => {
  "use strict";

  const CONFIG = {
    configUrl: "merch.json",
    otpLength: 6,
    resendDelay: 30,
    defaultEmail: "",
    defaultCountry: "TR"
  };

  const state = {
    config: null,
    supabase: null,
    user: null,
    email: "",
    screen: "email",
    section: "dashboard",
    busy: false,
    sendingCode: false,
    sendRequestId: 0,
    resendAt: 0,
    resendTimer: null,
    profile: {},
    addresses: [],
    orders: [],
    returns: [],
    legalKey: "",
    message: "",
    messageType: "info",
    country: CONFIG.defaultCountry,
    marketingUpdates: false,
    signupMarketing: false,
    editing: "",
    loadingData: false
  };

  let configPromise = null;

  const $ = (selector, root = document) => root.querySelector(selector);

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const legalFallbacks = {
    refund: {
      title: "Refund Policy",
      text: "Refunds and returns are handled according to the applicable refund policy and consumer protection laws. Eligibility, deadlines, return conditions and refund processing depend on the circumstances of each order."
    },
    shipping: {
      title: "Shipping Policy",
      text: "Shipping costs, delivery estimates, customs duties and handling arrangements may vary by destination and shipping method. Delivery estimates are not guarantees. International orders may be subject to customs charges."
    },
    privacy: {
      title: "Privacy Policy",
      text: "Personal information is used to operate the store, process orders, provide customer support and maintain account security. Information handling, retention and applicable rights are described in the full Privacy Policy."
    },
    terms: {
      title: "Terms of Use",
      text: "Use of this website is subject to applicable terms, intellectual property rules and restrictions against misuse. Access to the website does not guarantee product availability."
    },
    sale: {
      title: "Terms and Conditions of Sale",
      text: "Orders are subject to product availability, confirmed pricing, payment authorization and applicable consumer laws. An order is not confirmed as paid until the payment provider verifies the transaction."
    },
    data: {
      title: "Do Not Sell or Share My Personal Information",
      text: "You may contact the store to ask about applicable privacy rights, including requests concerning the sale or sharing of personal information. Availability of particular rights depends on the law applicable to your location."
    }
  };

  async function loadConfig() {
    try {
      const response = await fetch(CONFIG.configUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load merch.json.");
      state.config = await response.json();
    } catch (error) {
      console.error("[VN ACCOUNT] Configuration error:", error);
      state.config = {};
    }

    const supabaseConfig = state.config?.supabase;

    if (
      supabaseConfig?.url &&
      supabaseConfig?.publishableKey &&
      window.supabase?.createClient
    ) {
      state.supabase = window.supabase.createClient(
        supabaseConfig.url,
        supabaseConfig.publishableKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );

      window.supabaseClient = state.supabase;

      try {
        const { data, error } = await state.supabase.auth.getSession();
        if (error) throw error;

        if (data?.session?.user) {
          state.user = data.session.user;
          state.email = data.session.user.email || "";
          state.screen = "account";

          // Do not delay initialization of the auth listener on account queries.
          loadAccountData().catch(error => {
            console.error("[VN ACCOUNT] Initial account data error:", error);
          });
        }
      } catch (error) {
        console.error("[VN ACCOUNT] Session error:", error);
      }

      state.supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          const sameUser = state.user?.id === session.user.id;
          state.user = session.user;

          if (sameUser) return;

          state.email = session.user.email || state.email;
          state.screen = "account";

          setTimeout(() => {
            loadAccountData().finally(render);
          }, 0);
        } else if (event === "SIGNED_OUT") {
          state.user = null;
          state.profile = {};
          state.addresses = [];
          state.orders = [];
          state.returns = [];
          state.screen = "email";
          state.section = "dashboard";
          render();
        }
      });
    } else {
      console.error(
        "[VN ACCOUNT] Supabase client or credentials are missing. " +
        "Check the Supabase CDN script and merch.json."
      );
    }
  }

  function userCountry() {
    const locale = navigator.language || "";
    const region = locale.split("-")[1]?.toUpperCase();

    if (region && region.length === 2) return region;

    return CONFIG.defaultCountry;
  }

  async function loadAccountData() {
    if (!state.user || !state.supabase) return;

    state.loadingData = true;

    try {
      const userId = state.user.id;

      const profileResult = await state.supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!profileResult.error && profileResult.data) {
        state.profile = profileResult.data;
        state.marketingUpdates = Boolean(profileResult.data.marketing_updates);
        state.country = profileResult.data.country || userCountry();
      } else if (profileResult.error) {
        console.warn(
          "[VN ACCOUNT] Profile could not be loaded:",
          profileResult.error.message
        );
      }

      const addressResult = await state.supabase
        .from("customer_addresses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!addressResult.error && Array.isArray(addressResult.data)) {
        state.addresses = addressResult.data;
      } else if (addressResult.error) {
        console.warn(
          "[VN ACCOUNT] Addresses could not be loaded:",
          addressResult.error.message
        );
      }

      const ordersResult = await state.supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!ordersResult.error && Array.isArray(ordersResult.data)) {
        state.orders = ordersResult.data;
      } else if (ordersResult.error) {
        console.warn(
          "[VN ACCOUNT] Orders could not be loaded:",
          ordersResult.error.message
        );
      }

      const returnsResult = await state.supabase
        .from("returns")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!returnsResult.error && Array.isArray(returnsResult.data)) {
        state.returns = returnsResult.data;
      } else if (returnsResult.error) {
        console.warn(
          "[VN ACCOUNT] Returns could not be loaded:",
          returnsResult.error.message
        );
      }
    } catch (error) {
      console.error("[VN ACCOUNT] Data loading failed:", error);
    } finally {
      state.loadingData = false;
    }
  }

  function injectStyles() {
    if ($("#vnAccountStyles")) return;

    const style = document.createElement("style");
    style.id = "vnAccountStyles";

    style.textContent = `
      #vnAccountOverlay{position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;overflow:auto;padding:24px;background:rgba(0,0,0,.48);color:#151515;font:14px/1.55 Arial,sans-serif}
      #vnAccountOverlay[hidden]{display:none!important}
      #vnAccountOverlay *{box-sizing:border-box}
      .vn-ac-shell{width:min(100%,980px);max-height:calc(100dvh - 48px);overflow:auto;margin:auto;padding:28px;background:#fff;border:1px solid #d8d8d8;box-shadow:0 24px 80px rgba(0,0,0,.25)}
      .vn-ac-shell.vn-ac-auth-shell{width:min(100%,410px);max-height:calc(100dvh - 36px);padding:28px 30px 27px;background:#171717;color:#f5f5f5;border:0;box-shadow:0 24px 80px rgba(0,0,0,.3)}
      .vn-ac-header{position:relative;display:flex;justify-content:center;align-items:center;padding-bottom:24px;border-bottom:1px solid #e5e5e5}
      .vn-ac-auth-shell .vn-ac-header{padding:0 32px 22px;border:0}
      .vn-ac-brand{display:flex;align-items:center;justify-content:center;width:112px;height:54px;color:inherit;text-decoration:none}
      .vn-ac-brand img{display:block;width:100%;height:100%;object-fit:contain;filter:invert(1)}
      .vn-ac-close{position:absolute;right:0;top:50%;transform:translateY(-50%);border:0;background:none;font-size:23px;cursor:pointer;color:inherit}
      .vn-ac-auth-shell .vn-ac-close{right:-18px;color:#f5f5f5}
      .vn-ac-auth-shell .vn-ac-main{width:100%;max-width:100%;margin:10px auto 0!important}
      .vn-ac-auth-shell .vn-ac-header{padding-bottom:18px}
      .vn-ac-auth-shell .vn-ac-brand{width:132px;height:62px;pointer-events:none;user-select:none}
      .vn-ac-auth-shell .vn-ac-email-main h1,.vn-ac-auth-shell .vn-ac-email-main .vn-ac-subtitle{display:none}
      .vn-ac-email-bar{display:flex;align-items:stretch;width:100%;min-height:48px;border:1px solid #555;border-radius:3px;overflow:hidden;background:#171717}
      .vn-ac-email-bar input{flex:1;min-width:0;padding:0 13px;border:0;outline:0;background:transparent;color:#f5f5f5;font:14px/1.4 Arial,sans-serif}
      .vn-ac-email-bar input::placeholder{color:#aaa;opacity:1}
      .vn-ac-email-submit{width:48px;flex:none;border:0;border-left:1px solid #444;background:#222;color:#fff;font:25px/1 Arial,sans-serif;cursor:pointer;transition:background .15s}
      .vn-ac-email-submit:hover{background:#333}
      .vn-ac-updates{display:flex;align-items:center;justify-content:flex-start;gap:8px;margin:12px 0 0;color:#bdbdbd;font-size:11px;line-height:1.35}
      .vn-ac-updates input{width:13px;height:13px;flex:none;margin:0;accent-color:#f5f5f5;cursor:pointer}
      .vn-ac-email-terms{margin-top:18px!important;color:#8d8d8d;font-size:11px;line-height:1.5}
      .vn-ac-email-terms a{color:#bdbdbd}
      .vn-ac-auth-shell .vn-ac-message{margin:0 0 12px}
      @media(max-width:600px){.vn-ac-shell.vn-ac-auth-shell{padding:24px 22px}.vn-ac-auth-shell .vn-ac-close{right:-10px}.vn-ac-auth-shell .vn-ac-brand{width:132px;height:62px}}
      .vn-ac-layout{display:grid;grid-template-columns:200px minmax(0,1fr);gap:48px;padding-top:32px}
      .vn-ac-sidebar{display:flex;flex-direction:column;gap:8px}
      .vn-ac-nav{border:0;background:none;color:#666;text-align:left;padding:12px 10px;font:inherit;cursor:pointer;border-radius:4px}
      .vn-ac-nav.active{color:#111;background:#f3f3f3;font-weight:700}
      .vn-ac-main{min-width:0;max-width:760px}
      .vn-ac-main h1{font-size:25px;letter-spacing:-.025em;margin:0 0 8px}
      .vn-ac-subtitle{color:#777;margin:0 0 28px}
      .vn-ac-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .vn-ac-card{border:1px solid #dedede;border-radius:5px;padding:22px;min-height:135px;display:flex;flex-direction:column;align-items:flex-start;text-align:left;background:#fff;color:inherit;cursor:pointer}
      .vn-ac-card strong{font-size:13px;letter-spacing:.045em;margin-bottom:9px}
      .vn-ac-card span{font-size:13px;color:#777}
      .vn-ac-card:hover{border-color:#888}
      .vn-ac-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;border:1px solid #dedede;padding:18px 20px;margin:10px 0;border-radius:4px}
      .vn-ac-row strong{display:block;font-size:13px}
      .vn-ac-row small{display:block;color:#777;margin-top:5px;overflow-wrap:anywhere}
      .vn-ac-button{padding:10px 16px;min-height:40px;background:#151515;color:white;border:1px solid #151515;border-radius:4px;cursor:pointer;font:inherit}
      .vn-ac-button.secondary{background:white;color:#333;border-color:#ccc}
      .vn-ac-button.text{background:none;border:0;color:#666;text-decoration:underline;padding:6px}
      .vn-ac-button.danger{background:white;color:#8c1d2c;border-color:#8c1d2c}
      .vn-ac-actions{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}
      .vn-ac-field{display:flex;flex-direction:column;gap:6px;margin:13px 0}
      .vn-ac-field span{font-size:12px;color:#555}
      .vn-ac-field input,.vn-ac-field select,.vn-ac-field textarea{width:100%;min-height:45px;padding:12px;border:1px solid #ccc;border-radius:4px;background:#fff;color:#111;font:inherit}
      .vn-ac-field textarea{min-height:90px;resize:vertical}
      .vn-ac-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .vn-ac-message{margin:15px 0;padding:12px 14px;border:1px solid #ddd;background:#f7f7f7;font-size:13px;overflow-wrap:anywhere}
      .vn-ac-message.error{border-color:#c88;background:#fff7f7;color:#8a1822}
      .vn-ac-message.success{border-color:#9b9;background:#f6fff6;color:#225b2b}
      .vn-ac-legal-list{border-top:1px solid #e5e5e5;margin-top:30px}
      .vn-ac-legal-item{display:flex;justify-content:space-between;gap:20px;padding:13px 0;border-bottom:1px solid #e5e5e5;color:#444;text-decoration:none}
      .vn-ac-legal-item:hover{color:#000}
      .vn-ac-legal-item span:last-child{color:#999}
      .vn-ac-toggle{appearance:none;width:44px;height:25px;border-radius:20px;background:#ccc;position:relative;cursor:pointer;transition:background .15s;flex:none}
      .vn-ac-toggle:before{content:"";position:absolute;width:19px;height:19px;border-radius:50%;background:white;left:3px;top:3px;transition:transform .15s}
      .vn-ac-toggle:checked{background:#171717}
      .vn-ac-toggle:checked:before{transform:translateX(19px)}
      .vn-ac-preference{display:flex;align-items:center;justify-content:space-between;gap:20px;border:1px solid #dedede;border-radius:4px;padding:18px 20px;margin:12px 0}
      .vn-ac-preference strong{display:block;font-size:13px}
      .vn-ac-preference small{display:block;color:#777;margin-top:5px}
      .vn-ac-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:24px 0}
      .vn-ac-stat{border:1px solid #dedede;border-radius:4px;padding:20px}
      .vn-ac-stat strong{display:block;font-size:27px;margin-bottom:4px}
      .vn-ac-stat span{font-size:11px;letter-spacing:.06em;color:#666}
      .vn-ac-record{border:1px solid #dedede;border-radius:4px;padding:18px;margin:12px 0}
      .vn-ac-record-head{display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap}
      .vn-ac-record p{font-size:13px;color:#666;margin:9px 0}
      .vn-ac-badge{display:inline-block;padding:4px 8px;border:1px solid #ddd;border-radius:20px;font-size:11px;color:#555}
      .vn-ac-otp{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;width:100%;margin:23px 0 4px}
      .vn-ac-otp input{display:block;width:100%;min-width:0;height:52px;padding:0;text-align:center;font:500 20px/1 Arial,sans-serif;border:1px solid #4a4a4a;border-radius:3px;background:#202020;color:#f5f5f5;appearance:none}
      .vn-ac-otp input:focus{outline:1px solid #bdbdbd;outline-offset:2px;border-color:#bdbdbd}
      .vn-ac-auth-shell .vn-ac-verify-main{margin:12px auto 0!important}
      .vn-ac-verify-main h1{margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:-.02em;color:#f5f5f5}
      .vn-ac-verify-main .vn-ac-sent-to{margin:0;color:#bdbdbd;font-size:12px}
      .vn-ac-inline-change{padding:0 0 0 3px;border:0;background:none;color:#f5f5f5;font:inherit;text-decoration:underline;cursor:pointer}
      .vn-ac-auth-shell:has(.vn-ac-verify-main){width:min(100%,440px)}
      #vnAccountOverlay{flex-direction:column;gap:13px}
      .vn-ac-policy-link{padding:2px 8px;border:0;background:transparent;color:#bdbdbd;font:11px/1.4 Arial,sans-serif;text-decoration:underline;cursor:pointer}
      .vn-ac-policy-overlay{position:fixed;inset:0;z-index:10003;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.72)}
      .vn-ac-policy-overlay[hidden]{display:none!important}
      .vn-ac-policy-panel{position:relative;width:min(100%,680px);height:min(78dvh,720px);background:#fff;box-shadow:0 24px 80px rgba(0,0,0,.4)}
      .vn-ac-policy-panel iframe{display:block;width:100%;height:100%;border:0;background:#fff}
      .vn-ac-policy-close{position:absolute;top:8px;right:8px;z-index:1;width:32px;height:32px;border:0;border-radius:50%;background:#171717;color:#fff;font-size:22px;line-height:1;cursor:pointer}
      @media(max-width:420px){.vn-ac-otp{gap:6px}.vn-ac-otp input{height:47px}.vn-ac-auth-shell:has(.vn-ac-verify-main){width:min(100%,410px)}}
      .vn-ac-divider{height:1px;background:#e5e5e5;margin:24px 0}
      .vn-ac-muted{font-size:12px;color:#777}
      .vn-ac-muted a{color:inherit;text-decoration:underline}
      .vn-ac-legal-copy{white-space:pre-line;line-height:1.8;color:#555;font-size:13px}
      .vn-ac-empty{padding:24px;border:1px solid #e5e5e5;color:#777;font-size:13px}
      @media(max-width:700px){
        .vn-ac-shell{padding:17px}
        .vn-ac-layout{grid-template-columns:1fr;gap:22px;padding-top:22px}
        .vn-ac-sidebar{flex-direction:row;flex-wrap:wrap;border-bottom:1px solid #e5e5e5;padding-bottom:15px}
        .vn-ac-nav{padding:9px 11px}
        .vn-ac-card-grid,.vn-ac-stats{grid-template-columns:1fr 1fr}
        .vn-ac-form-grid{grid-template-columns:1fr}
        .vn-ac-row{padding:14px}
        .vn-ac-otp{gap:5px}
        .vn-ac-otp input{width:38px}
      }
    `;

    document.head.appendChild(style);
  }

  function createRoot() {
    injectStyles();

    let root = $("#vnAccountOverlay");
    if (root) return root;

    root = document.createElement("div");
    root.id = "vnAccountOverlay";
    root.hidden = true;

    root.innerHTML = `
      <div class="vn-ac-shell">
        <header class="vn-ac-header">
          <div class="vn-ac-brand" aria-label="VN"><img src="images/vn-logo-black-transparent.png" alt="VN"></div>
          <button type="button" class="vn-ac-close" data-ac-action="close" aria-label="Close account">×</button>
        </header>
        <div id="vnAcContent"></div>
      </div>
      <button type="button" class="vn-ac-policy-link" data-ac-action="privacy-open">Privacy Policy</button>
      <div class="vn-ac-policy-overlay" hidden role="dialog" aria-modal="true" aria-label="Privacy Policy">
        <section class="vn-ac-policy-panel">
          <button type="button" class="vn-ac-policy-close" data-ac-action="privacy-close" aria-label="Close privacy policy">×</button>
          <iframe title="Privacy Policy" src="policies/privacy-policy.html"></iframe>
        </section>
      </div>
    `;

    document.body.appendChild(root);
    return root;
  }

  function messageHTML() {
    if (!state.message) return "";

    return `
      <div class="vn-ac-message ${escapeHTML(state.messageType)}" role="status" aria-live="polite">
        ${escapeHTML(state.message)}
      </div>
    `;
  }

  function renderEmail() {
    return `
      <main class="vn-ac-main vn-ac-email-main">
        ${messageHTML()}

        <form id="vnAcEmailForm">
          <div class="vn-ac-email-bar">
            <input
              name="email"
              type="email"
              placeholder="Email"
              aria-label="Email"
              value="${escapeHTML(state.email)}"
              autocomplete="email"
              required
              autofocus
            >
            <button type="submit" class="vn-ac-email-submit" aria-label="Continue">→</button>
          </div>

          <label class="vn-ac-updates">
            <input type="checkbox" name="updates" ${state.signupMarketing ? "checked" : ""}>
            <span>Sign up to receive updates from 9ojeez9</span>
          </label>
        </form>

        <p class="vn-ac-muted vn-ac-email-terms">
          By continuing, you agree to our
          <a href="${escapeHTML(state.config?.paths?.termsOfUse || "policies/terms-of-use.html")}" target="_blank" rel="noopener">Terms of Use</a>
          and
          <a href="${escapeHTML(state.config?.paths?.privacyPage || "policies/privacy-policy.html")}" target="_blank" rel="noopener">Privacy Policy</a>.
        </p>
      </main>
    `;
  }

  function renderVerify() {
    return `
      <main class="vn-ac-main vn-ac-verify-main">
        <h1>Enter code</h1>
        <p class="vn-ac-subtitle vn-ac-sent-to">
          Sent to <strong>${escapeHTML(state.email)}</strong>
          <button type="button" class="vn-ac-inline-change" data-ac-action="change-email">(change)</button>
        </p>

        ${messageHTML()}

        <form id="vnAcVerifyForm">
          <div class="vn-ac-otp" aria-label="Verification code">
            ${Array.from({ length: 6 }, (_, index) => `
              <input
                aria-label="Digit ${index + 1}"
                data-otp-digit="${index}"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="1"
                autocomplete="${index === 0 ? "one-time-code" : "off"}"
                required
              >
            `).join("")}
          </div>
        </form>
      </main>
    `;
  }

  function sidebar() {
    const entries = [
      ["dashboard", "DASHBOARD"],
      ["shop", "SHOP"]
    ];

    return `
      <aside class="vn-ac-sidebar">
        ${entries.map(([key, label]) => `
          <button type="button"
            class="vn-ac-nav ${state.section === key ? "active" : ""}"
            data-ac-section="${key}">${label}</button>
        `).join("")}
      </aside>
    `;
  }

  function renderDashboard() {
    return `
      <div class="vn-ac-layout">
        ${sidebar()}
        <main class="vn-ac-main">
          <h1>Dashboard</h1>
          <p class="vn-ac-subtitle">Manage your VN SHOP account.</p>
          ${messageHTML()}
          <div class="vn-ac-card-grid">
            <button class="vn-ac-card" data-ac-section="orders"><strong>MY ORDERS</strong><span>View your order history and track shipments.</span></button>
            <button class="vn-ac-card" data-ac-section="returns"><strong>MY RETURNS</strong><span>Start or track a return.</span></button>
            <button class="vn-ac-card" data-ac-section="profile"><strong>MY PROFILE</strong><span>Update your details and saved addresses.</span></button>
            <button class="vn-ac-card" data-ac-section="help"><strong>HELP CENTER</strong><span>Find answers to common questions.</span></button>
          </div>
        </main>
      </div>
    `;
  }

  function legalLinks() {
    const links = [
      ["refund", "Refund Policy"],
      ["shipping", "Shipping Policy"],
      ["privacy", "Privacy Policy"],
      ["terms", "Terms of Use"],
      ["sale", "Terms and Conditions of Sale"],
      ["data", "Do Not Sell My Information"]
    ];

    return `
      <div class="vn-ac-legal-list">
        ${links.map(([key, label]) => `
          <a href="#" class="vn-ac-legal-item" data-ac-legal="${key}">
            <span>${label}</span><span>→</span>
          </a>
        `).join("")}
      </div>
    `;
  }

  function countryOptions(selected) {
    const list = state.config?.account?.profile?.country?.options || [
      { code: "TR", name: "Türkiye" },
      { code: "US", name: "United States" },
      { code: "GB", name: "United Kingdom" },
      { code: "DE", name: "Germany" },
      { code: "FR", name: "France" },
      { code: "NL", name: "Netherlands" },
      { code: "CA", name: "Canada" },
      { code: "AU", name: "Australia" }
    ];

    return list.map(item => `
      <option value="${escapeHTML(item.code)}" ${item.code === selected ? "selected" : ""}>
        ${escapeHTML(item.name)}
      </option>
    `).join("");
  }

  function renderProfile() {
    const email = state.user?.email || state.email;
    const fullName = [state.profile.first_name, state.profile.last_name]
      .filter(Boolean).join(" ");

    return `
      <div class="vn-ac-layout">
        ${sidebar()}
        <main class="vn-ac-main">
          <h1>My Profile</h1>
          <p class="vn-ac-subtitle">Manage your account information.</p>
          ${messageHTML()}

          <div class="vn-ac-row">
            <div><strong>Contact</strong><small>${escapeHTML(email)}</small>
              ${fullName ? `<small>${escapeHTML(fullName)}</small>` : ""}
            </div>
            <button class="vn-ac-button secondary" data-ac-action="edit-contact">EDIT</button>
          </div>

          <div class="vn-ac-row">
            <div><strong>Addresses</strong><small>${state.addresses.length} saved address(es)</small></div>
            <button class="vn-ac-button secondary" data-ac-action="edit-addresses">EDIT</button>
          </div>

          <div class="vn-ac-preference">
            <div><strong>Marketing preferences</strong><small>EMAIL</small></div>
            <input type="checkbox" class="vn-ac-toggle" data-ac-toggle="marketing"
              aria-label="Email marketing preferences" ${state.marketingUpdates ? "checked" : ""}>
          </div>

          <div class="vn-ac-actions">
            <button class="vn-ac-button secondary" data-ac-action="signout">SIGN OUT</button>
            <button class="vn-ac-button danger" data-ac-action="signout-all">SIGN OUT FROM ALL DEVICES</button>
          </div>

          <label class="vn-ac-field"><span>Country / Region</span>
            <select data-ac-country>${countryOptions(state.country)}</select>
          </label>
          ${legalLinks()}
        </main>
      </div>
    `;
  }

  function renderContactEdit() {
    return `
      <div class="vn-ac-layout">
        ${sidebar()}
        <main class="vn-ac-main">
          <h1>Edit Contact</h1><p class="vn-ac-subtitle">Update your profile details.</p>
          ${messageHTML()}
          <form id="vnAcProfileForm">
            <div class="vn-ac-form-grid">
              <label class="vn-ac-field"><span>First name</span><input name="first_name" value="${escapeHTML(state.profile.first_name || "")}" autocomplete="given-name"></label>
              <label class="vn-ac-field"><span>Last name</span><input name="last_name" value="${escapeHTML(state.profile.last_name || "")}" autocomplete="family-name"></label>
            </div>
            <label class="vn-ac-field"><span>Email</span><input type="email" value="${escapeHTML(state.user?.email || state.email)}" disabled></label>
            <div class="vn-ac-actions">
              <button class="vn-ac-button" type="submit">Save changes</button>
              <button class="vn-ac-button secondary" type="button" data-ac-section="profile">Cancel</button>
            </div>
          </form>
        </main>
      </div>
    `;
  }

  function renderAddresses() {
    const list = state.addresses.length
      ? state.addresses.map(address => `
          <article class="vn-ac-record">
            <div class="vn-ac-record-head"><strong>${escapeHTML(address.label || "Address")}</strong>
              ${address.is_default ? '<span class="vn-ac-badge">DEFAULT</span>' : ""}
            </div>
            <p>${escapeHTML([
              address.first_name, address.last_name, address.address,
              address.apartment, address.city, address.postal_code, address.country
            ].filter(Boolean).join(", "))}</p>
            ${address.phone ? `<p>${escapeHTML(address.phone)}</p>` : ""}
            <button type="button" class="vn-ac-button secondary" data-ac-delete-address="${escapeHTML(address.id)}">Delete address</button>
          </article>
        `).join("")
      : `<div class="vn-ac-empty">No saved addresses yet.</div>`;

    return `
      <div class="vn-ac-layout">
        ${sidebar()}
        <main class="vn-ac-main">
          <h1>Addresses</h1><p class="vn-ac-subtitle">Manage your saved shipping addresses.</p>
          ${messageHTML()}${list}
          <h2 style="margin-top:28px">Add address</h2>
          <form id="vnAcAddressForm">
            <div class="vn-ac-form-grid">
              <label class="vn-ac-field"><span>First name</span><input name="first_name" required></label>
              <label class="vn-ac-field"><span>Last name</span><input name="last_name" required></label>
            </div>
            <label class="vn-ac-field"><span>Address</span><input name="address" required></label>
            <label class="vn-ac-field"><span>Apartment, suite, etc. (optional)</span><input name="apartment"></label>
            <div class="vn-ac-form-grid">
              <label class="vn-ac-field"><span>City</span><input name="city" required></label>
              <label class="vn-ac-field"><span>ZIP code</span><input name="postal_code" required></label>
            </div>
            <label class="vn-ac-field"><span>Country</span><select name="country">${countryOptions(state.country)}</select></label>
            <label class="vn-ac-field"><span>Phone (optional)</span><input name="phone" type="tel"></label>
            <label class="vn-ac-preference"><span>Set as default address</span><input type="checkbox" name="is_default"></label>
            <button class="vn-ac-button" type="submit">Save address</button>
          </form>
          <div class="vn-ac-actions"><button class="vn-ac-button secondary" data-ac-section="profile">Back to profile</button></div>
        </main>
      </div>
    `;
  }

  function renderOrders() {
    const orders = state.orders;
    const delivered = orders.filter(order => String(order.status || "").toLowerCase() === "delivered").length;
    const returned = state.returns.filter(item => ["approved", "received", "refunded", "completed"].includes(String(item.status || "").toLowerCase())).length;
    const waiting = orders.filter(order => ["pending", "processing", "paid", "shipped"].includes(String(order.status || "").toLowerCase())).length;

    return `
      <div class="vn-ac-layout">
        ${sidebar()}
        <main class="vn-ac-main">
          <h1>My Orders</h1><p class="vn-ac-subtitle">View your order history and track shipments.</p>
          ${messageHTML()}
          <div class="vn-ac-stats">
            <div class="vn-ac-stat"><strong>${orders.length}</strong><span>TOTAL ORDERS</span></div>
            <div class="vn-ac-stat"><strong>${delivered}</strong><span>DELIVERED ORDERS</span></div>
            <div class="vn-ac-stat"><strong>${returned}</strong><span>RETURNED ORDERS</span></div>
            <div class="vn-ac-stat"><strong>${waiting}</strong><span>WAITING ORDERS</span></div>
          </div>
          ${orders.length ? orders.map(order => `
            <article class="vn-ac-record">
              <div class="vn-ac-record-head"><strong>Order ${escapeHTML(order.order_number || order.id)}</strong><span class="vn-ac-badge">${escapeHTML(order.status || "Status unavailable")}</span></div>
              <p>Placed: ${escapeHTML(order.created_at || "—")}</p>
              <p>Total: ${escapeHTML(order.currency || "USD")} ${escapeHTML(order.grand_total ?? order.total ?? "—")}</p>
              <p>Tracking: ${escapeHTML(order.tracking_number || "Not available yet")}</p>
              <button class="vn-ac-button secondary" data-ac-order="${escapeHTML(order.id)}">View order</button>
              <button class="vn-ac-button secondary" data-ac-return-order="${escapeHTML(order.id)}">Start a return</button>
            </article>
          `).join("") : `<div class="vn-ac-empty">No order history is available for this account yet. Orders appear here after they are saved to the store database.</div>`}
          <p class="vn-ac-muted">Need help with an order? Visit the Help Center.</p>
          <button class="vn-ac-button secondary" data-ac-section="help">Help Center</button>
        </main>
      </div>
    `;
  }

  function renderReturns() {
    return `
      <div class="vn-ac-layout">
        ${sidebar()}
        <main class="vn-ac-main">
          <h1>My Returns</h1><p class="vn-ac-subtitle">Start or track a return.</p>
          ${messageHTML()}
          ${state.returns.length ? state.returns.map(item => `
            <article class="vn-ac-record">
              <div class="vn-ac-record-head"><strong>Return ${escapeHTML(item.return_number || item.id)}</strong><span class="vn-ac-badge">${escapeHTML(item.status || "Status unavailable")}</span></div>
              <p>Order: ${escapeHTML(item.order_id || "—")}</p><p>Reason: ${escapeHTML(item.reason || "—")}</p>
              <p>Created: ${escapeHTML(item.requested_at || item.created_at || "—")}</p><p>${escapeHTML(item.customer_note || "")}</p>
            </article>
          `).join("") : `<div class="vn-ac-empty">No return requests are available for this account. Return requests must be saved to the store database to appear here.</div>`}
          <h2 style="margin-top:28px">Start a return</h2>
          <form id="vnAcReturnForm">
            <label class="vn-ac-field"><span>Order</span><select name="order_id" required><option value="">Select an order</option>
              ${state.orders.map(order => `<option value="${escapeHTML(order.id)}">${escapeHTML(order.order_number || order.id)}</option>`).join("")}
            </select></label>
            <label class="vn-ac-field"><span>Reason for return</span><select name="reason" required>
              <option value="">Select a reason</option><option value="damaged">Item arrived damaged</option><option value="wrong_item">Wrong item received</option><option value="size_fit">Size or fit issue</option><option value="changed_mind">Changed my mind</option><option value="other">Other</option>
            </select></label>
            <label class="vn-ac-field"><span>Additional details</span><textarea name="customer_note" placeholder="Tell us more (optional)"></textarea></label>
            <button class="vn-ac-button" type="submit">Submit return request</button>
          </form>
          <p class="vn-ac-muted">Submitting a request does not guarantee approval or automatically issue a refund. Eligibility and return instructions must be confirmed by the store.</p>
        </main>
      </div>
    `;
  }

  function renderHelp() {
    const helpPath = state.config?.paths?.help || "help.html";

    return `
      <div class="vn-ac-layout">
        ${sidebar()}
        <main class="vn-ac-main">
          <h1>Help Center</h1><p class="vn-ac-subtitle">Find answers to common questions.</p>
          <div class="vn-ac-card-grid">
            <a class="vn-ac-card" href="${escapeHTML(helpPath)}"><strong>ORDERS &amp; SHIPPING</strong><span>Order status, delivery estimates and tracking.</span></a>
            <a class="vn-ac-card" href="${escapeHTML(helpPath)}"><strong>RETURNS &amp; REFUNDS</strong><span>Return eligibility, requests and refund status.</span></a>
            <a class="vn-ac-card" href="${escapeHTML(helpPath)}"><strong>ACCOUNT &amp; SECURITY</strong><span>Sign-in, email verification and profile details.</span></a>
            <a class="vn-ac-card" href="mailto:${escapeHTML(CONFIG.defaultEmail || "9ojeez9@gmail.com")}"><strong>CONTACT SUPPORT</strong><span>Get in touch about an order or account issue.</span></a>
          </div>
        </main>
      </div>
    `;
  }

  function getLegalContent(key) {
    const config = state.config || {};
    const fallback = legalFallbacks[key] || {
      title: "Policy",
      text: "Please consult the relevant store policy for details."
    };
    const policyKey = key === "sale" ? "terms" : key;
    const policy = config.policies?.[policyKey];

    if (policy) {
      const sections = Array.isArray(policy.sections)
        ? policy.sections.map(section => {
            if (typeof section === "string") return section;
            return [section.title || section.heading, section.content || section.text].filter(Boolean).join("\n\n");
          }).join("\n\n")
        : "";

      return { title: policy.title || fallback.title, text: sections || fallback.text };
    }

    return fallback;
  }

  function renderLegal() {
    const legal = getLegalContent(state.legalKey);

    return `
      <div class="vn-ac-layout">
        ${sidebar()}
        <main class="vn-ac-main">
          <button class="vn-ac-button text" data-ac-action="legal-back">← Back to profile</button>
          <h1>${escapeHTML(legal.title)}</h1><p class="vn-ac-subtitle">VN SHOP · LEGAL</p>
          <div class="vn-ac-legal-copy">${escapeHTML(legal.text)}</div>
          <div class="vn-ac-actions"><button class="vn-ac-button secondary" data-ac-action="legal-back">Back to profile</button></div>
        </main>
      </div>
    `;
  }

  function render() {
    const root = createRoot();
    if (root.hidden) return;

    const content = $("#vnAcContent", root);
    const shell = $(".vn-ac-shell", root);
    shell?.classList.toggle("vn-ac-auth-shell", !state.user);

    if (!state.user) {
      content.innerHTML = state.screen === "verify" ? renderVerify() : renderEmail();
      return;
    }

    if (state.section === "dashboard") content.innerHTML = renderDashboard();
    else if (state.section === "profile") content.innerHTML = renderProfile();
    else if (state.section === "edit-contact") content.innerHTML = renderContactEdit();
    else if (state.section === "addresses") content.innerHTML = renderAddresses();
    else if (state.section === "orders") content.innerHTML = renderOrders();
    else if (state.section === "returns") content.innerHTML = renderReturns();
    else if (state.section === "help") content.innerHTML = renderHelp();
    else if (state.section === "legal") content.innerHTML = renderLegal();
    else content.innerHTML = renderDashboard();
  }

  /*
   * OTP FLOW:
   * - Switch to verification immediately.
   * - Start the Supabase request only after the screen is rendered.
   * - Never wait for the email request before showing the OTP inputs.
   * - Keep errors and resend controls on the verification screen.
   */
  function sendCode(email) {
    const normalizedEmail = String(email || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      state.messageType = "error";
      state.message = "Enter a valid email address.";
      state.screen = "email";
      render();
      return;
    }

    // Invalidate any earlier send response so it cannot overwrite the current screen.
    const requestId = ++state.sendRequestId;

    state.email = normalizedEmail;
    state.screen = "verify";
    state.messageType = "info";
    state.message = "";
    state.sendingCode = true;
    state.resendAt = Date.now() + CONFIG.resendDelay * 1000;

    // Render synchronously before making any network request.
    render();
    startResendTimer();
    window.setTimeout(focusOtp, 0);

    // The network request starts after the verification screen is already visible.
    Promise.resolve().then(async () => {
      try {
        // Configuration may still be loading; keep the verification screen visible meanwhile.
        if (configPromise) await configPromise;

        if (!state.supabase) {
          throw new Error("Sign-in is unavailable because the Supabase client is not configured.");
        }

        const { error } = await state.supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            shouldCreateUser: true,
            data: { marketing_updates: state.signupMarketing }
          }
        });

        if (error) throw error;

        // Success needs no redraw; preserve any digits the user has already entered.
      } catch (error) {
        console.error("[VN ACCOUNT] OTP send failed:", error);

        if (requestId !== state.sendRequestId) return;

        state.resendAt = 0;
        state.messageType = "error";
        state.message = explainAuthError(error);
        render();
        startResendTimer();
        focusOtp();
      } finally {
        if (requestId === state.sendRequestId) {
          state.sendingCode = false;
          updateResendButton();
        }
      }
    });
  }

  function explainAuthError(error) {
    const message = String(error?.message || "").toLowerCase();

    if (message.includes("rate limit") || message.includes("too many requests")) {
      return "Too many verification requests. Wait a little before trying again.";
    }

    if (message.includes("invalid email")) {
      return "This email address is invalid. Change the address and try again.";
    }

    if (message.includes("email") && message.includes("disabled")) {
      return "Email sign-in is disabled in the authentication settings.";
    }

    if (message.includes("smtp") || message.includes("sending") || message.includes("email")) {
      return "The verification email could not be sent. Check the Supabase email provider / SMTP configuration, then try resending.";
    }

    return error?.message
      ? `Could not send the verification code: ${error.message}`
      : "Could not send the verification email. Please try again.";
  }

  function updateResendButton() {
    const root = $("#vnAccountOverlay");
    if (!root || root.hidden || state.screen !== "verify") return;

    const button = $('[data-ac-action="resend"]', root);
    if (!button) return;

    const remaining = Math.ceil((state.resendAt - Date.now()) / 1000);

    if (state.sendingCode) {
      button.textContent = "Resend code";
      button.disabled = true;
    } else if (remaining > 0) {
      button.textContent = `Resend code (${remaining}s)`;
      button.disabled = true;
    } else {
      button.textContent = "Resend code";
      button.disabled = false;
    }
  }

  function startResendTimer() {
    clearInterval(state.resendTimer);
    updateResendButton();

    state.resendTimer = setInterval(() => {
      const root = $("#vnAccountOverlay");

      if (!root || root.hidden || state.screen !== "verify") {
        clearInterval(state.resendTimer);
        return;
      }

      updateResendButton();

      if (Date.now() >= state.resendAt && !state.sendingCode) {
        clearInterval(state.resendTimer);
      }
    }, 250);
  }

  async function verifyCode(code) {
    if (!state.supabase) {
      state.messageType = "error";
      state.message = "Sign-in is unavailable because the Supabase client is not configured.";
      render();
      return;
    }

    if (!new RegExp(`^\\d{${CONFIG.otpLength}}$`).test(code)) {
      state.messageType = "error";
      state.message = `Enter the complete ${CONFIG.otpLength}-digit code.`;
      render();
      focusOtp();
      return;
    }

    if (state.busy) return;

    state.busy = true;
    state.message = "";
    render();

    try {
      const { data, error } = await state.supabase.auth.verifyOtp({
        email: state.email,
        token: code,
        type: "email"
      });

      if (error) throw error;

      state.user = data.user || data.session?.user || null;

      if (!state.user) {
        throw new Error("Verification did not return a user session.");
      }

      state.screen = "account";
      state.section = "dashboard";
      state.message = "";

      // Account queries start only after successful code verification.
      await loadAccountData();
      render();
    } catch (error) {
      console.error("[VN ACCOUNT] OTP verification failed:", error);
      state.messageType = "error";
      state.message = explainAuthError(error);
      render();
      focusOtp();
    } finally {
      state.busy = false;
    }
  }

  function focusEntry() {
    const root = $("#vnAccountOverlay");
    if (!root || root.hidden || state.user) return;

    const target = state.screen === "verify"
      ? $("[data-otp-digit]", root)
      : $('input[name="email"]', root);

    target?.focus();
  }

  function focusOtp() {
    const root = $("#vnAccountOverlay");
    if (!root || root.hidden) return;
    $('[data-otp-digit="0"]', root)?.focus();
  }

  async function saveProfile(form) {
    if (!state.supabase || !state.user) return;

    const data = new FormData(form);
    const profile = {
      id: state.user.id,
      first_name: String(data.get("first_name") || "").trim(),
      last_name: String(data.get("last_name") || "").trim(),
      updated_at: new Date().toISOString()
    };

    const { error } = await state.supabase.from("profiles").upsert(profile, { onConflict: "id" });

    if (error) {
      console.error("[VN ACCOUNT] Profile save failed:", error);
      state.messageType = "error";
      state.message = `Could not save your profile: ${error.message}`;
      render();
      return;
    }

    state.profile = { ...state.profile, ...profile };
    state.section = "profile";
    state.messageType = "success";
    state.message = "Profile updated.";
    render();
  }

  async function saveAddress(form) {
    if (!state.supabase || !state.user) return;

    const data = new FormData(form);
    const address = {
      user_id: state.user.id,
      first_name: String(data.get("first_name") || "").trim(),
      last_name: String(data.get("last_name") || "").trim(),
      address: String(data.get("address") || "").trim(),
      apartment: String(data.get("apartment") || "").trim(),
      city: String(data.get("city") || "").trim(),
      postal_code: String(data.get("postal_code") || "").trim(),
      country: String(data.get("country") || state.country),
      phone: String(data.get("phone") || "").trim(),
      is_default: data.get("is_default") === "on"
    };

    if (address.is_default) {
      const { error: resetError } = await state.supabase
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("user_id", state.user.id);

      if (resetError) {
        state.messageType = "error";
        state.message = `Could not update default address: ${resetError.message}`;
        render();
        return;
      }
    }

    const { error } = await state.supabase.from("customer_addresses").insert(address);

    if (error) {
      console.error("[VN ACCOUNT] Address save failed:", error);
      state.messageType = "error";
      state.message = `Could not save the address: ${error.message}`;
      render();
      return;
    }

    await loadAccountData();
    state.section = "addresses";
    state.messageType = "success";
    state.message = "Address saved.";
    render();
  }

  async function deleteAddress(id) {
    if (!state.supabase || !state.user) return;
    if (!confirm("Delete this saved address?")) return;

    const { error } = await state.supabase
      .from("customer_addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", state.user.id);

    if (error) {
      state.messageType = "error";
      state.message = `Could not delete the address: ${error.message}`;
    } else {
      state.messageType = "success";
      state.message = "Address deleted.";
      await loadAccountData();
    }

    render();
  }

  async function saveMarketingPreference(enabled) {
    if (!state.supabase || !state.user) return;

    state.marketingUpdates = enabled;

    const { error } = await state.supabase.from("profiles").upsert({
      id: state.user.id,
      marketing_updates: enabled,
      updated_at: new Date().toISOString()
    }, { onConflict: "id" });

    if (error) {
      console.error("[VN ACCOUNT] Marketing preference save failed:", error);
      state.messageType = "error";
      state.message = `Could not save this preference: ${error.message}`;
      await loadAccountData();
    } else {
      state.messageType = "success";
      state.message = "Marketing preference saved.";
    }

    render();
  }

  async function signOut(allDevices = false) {
    if (!state.supabase) return;

    const { error } = await state.supabase.auth.signOut({
      scope: allDevices ? "global" : "local"
    });

    if (error) {
      state.messageType = "error";
      state.message = `Could not sign out: ${error.message}`;
      render();
    } else if (!allDevices) {
      closePanel();
    }
  }

  async function createReturn(form) {
    if (!state.supabase || !state.user) return;

    const data = new FormData(form);
    const orderId = String(data.get("order_id") || "");
    const reason = String(data.get("reason") || "");
    const note = String(data.get("customer_note") || "").trim();

    if (!orderId || !reason) {
      state.messageType = "error";
      state.message = "Select an order and a reason for the return.";
      render();
      return;
    }

    const order = state.orders.find(item => String(item.id) === orderId);

    if (!order) {
      state.messageType = "error";
      state.message = "The selected order was not found in your account.";
      render();
      return;
    }

    const { error } = await state.supabase.from("returns").insert({
      user_id: state.user.id,
      order_id: orderId,
      reason,
      customer_note: note,
      status: "requested"
    });

    if (error) {
      console.error("[VN ACCOUNT] Return request failed:", error);
      state.messageType = "error";
      state.message = `Could not submit the return request: ${error.message}`;
      render();
      return;
    }

    await loadAccountData();
    state.section = "returns";
    state.messageType = "success";
    state.message = "Return request submitted. Refund approval is not automatic.";
    render();
  }

  function closePanel() {
    const root = $("#vnAccountOverlay");
    if (root) root.hidden = true;
    document.body.style.overflow = "";
  }

  function openPanel() {
    if (!state.user) {
      state.screen = "email";
      state.message = "";
    } else {
      state.section = state.section === "dashboard" ? "profile" : "dashboard";
    }

    createRoot().hidden = false;
    render();
    document.body.style.overflow = "hidden";
    window.setTimeout(focusEntry, 30);
  }

  function goShop() {
    closePanel();
    const shopTarget = $("#shop, #products, [data-shop-home]");

    if (shopTarget) {
      shopTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  document.addEventListener("click", async event => {
    const root = $("#vnAccountOverlay");

    if (root && !root.hidden && root.contains(event.target)) {
      const sectionButton = event.target.closest("[data-ac-section]");

      if (sectionButton) {
        event.preventDefault();
        const section = sectionButton.dataset.acSection;

        if (section === "shop") {
          goShop();
          return;
        }

        state.section = section;
        state.message = "";
        render();
        return;
      }

      const legalLink = event.target.closest("[data-ac-legal]");

      if (legalLink) {
        event.preventDefault();
        state.legalKey = legalLink.dataset.acLegal;
        state.section = "legal";
        render();
        return;
      }

      const deleteButton = event.target.closest("[data-ac-delete-address]");

      if (deleteButton) {
        event.preventDefault();
        await deleteAddress(deleteButton.dataset.acDeleteAddress);
        return;
      }

      const action = event.target.closest("[data-ac-action]");

      if (action) {
        event.preventDefault();

        switch (action.dataset.acAction) {
          case "close":
            closePanel();
            break;

          case "privacy-open": {
            const policy = $(".vn-ac-policy-overlay", root);
            if (policy) policy.hidden = false;
            break;
          }

          case "privacy-close": {
            const policy = $(".vn-ac-policy-overlay", root);
            if (policy) policy.hidden = true;
            break;
          }

          case "change-email":
            state.screen = "email";
            state.message = "";
            state.messageType = "info";
            render();
            window.setTimeout(focusEntry, 30);
            break;

          case "resend":
            if (Date.now() < state.resendAt || state.sendingCode) return;
            sendCode(state.email);
            break;

          case "edit-contact":
            state.section = "edit-contact";
            state.message = "";
            render();
            break;

          case "edit-addresses":
            state.section = "addresses";
            state.message = "";
            render();
            break;

          case "signout":
            await signOut(false);
            break;

          case "signout-all":
            await signOut(true);
            break;

          case "legal-back":
            state.section = "profile";
            render();
            break;
        }

        return;
      }

      const orderButton = event.target.closest("[data-ac-order]");

      if (orderButton) {
        const order = state.orders.find(item => String(item.id) === orderButton.dataset.acOrder);

        if (order) {
          alert(
            `Order: ${order.order_number || order.id}\n` +
            `Status: ${order.status || "Unavailable"}\n` +
            `Tracking: ${order.tracking_number || "Not available"}`
          );
        }

        return;
      }

      const returnButton = event.target.closest("[data-ac-return-order]");

      if (returnButton) {
        state.section = "returns";
        render();

        const selector = $('select[name="order_id"]', $("#vnAccountOverlay"));
        if (selector) selector.value = returnButton.dataset.acReturnOrder;

        return;
      }
    }

    const profileButton = event.target.closest(
      '[data-account-toggle], [data-profile-toggle], #accountButton, #profileButton, .account-button, .profile-button, a[href="#account"], button[aria-label*="account" i], button[aria-label*="profile" i]'
    );

    if (
      profileButton &&
      profileButton.id !== "profile-open" &&
      !profileButton.closest("#vnAccountOverlay")
    ) {
      event.preventDefault();
      openPanel();
    }
  });

  document.addEventListener("submit", async event => {
    const form = event.target;

    if (form.id === "vnAcEmailForm") {
      event.preventDefault();

      const formData = new FormData(form);
      const email = String(formData.get("email") || "").trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        state.messageType = "error";
        state.message = "Enter a valid email address.";
        render();
        return;
      }

      state.signupMarketing = formData.get("updates") === "on";

      // Do not await: sendCode renders the OTP screen before starting the request.
      sendCode(email);
      return;
    }

    if (form.id === "vnAcVerifyForm") {
      event.preventDefault();

      const code = [...form.querySelectorAll("[data-otp-digit]")]
        .map(input => input.value.trim())
        .join("");

      await verifyCode(code);
      return;
    }

    if (form.id === "vnAcProfileForm") {
      event.preventDefault();
      await saveProfile(form);
      return;
    }

    if (form.id === "vnAcAddressForm") {
      event.preventDefault();
      await saveAddress(form);
      return;
    }

    if (form.id === "vnAcReturnForm") {
      event.preventDefault();
      await createReturn(form);
    }
  });

  document.addEventListener("input", event => {
    const input = event.target.closest("[data-otp-digit]");
    if (!input) return;

    input.value = input.value.replace(/\D/g, "").slice(0, 1);

    if (input.value) {
      const index = Number(input.dataset.otpDigit);
      $(`[data-otp-digit="${index + 1}"]`, $("#vnAccountOverlay"))?.focus();
    }

    const root = $("#vnAccountOverlay");
    const inputs = [...(root?.querySelectorAll("[data-otp-digit]") || [])];
    if (inputs.length === 6 && inputs.every(element => element.value.length === 1)) {
      root.querySelector("#vnAcVerifyForm")?.requestSubmit();
    }
  });

  document.addEventListener("keydown", event => {
    const input = event.target.closest("[data-otp-digit]");
    if (!input || event.key !== "Backspace" || input.value) return;

    const index = Number(input.dataset.otpDigit);
    $(`[data-otp-digit="${index - 1}"]`, $("#vnAccountOverlay"))?.focus();
  });

  document.addEventListener("paste", event => {
    const input = event.target.closest?.("[data-otp-digit]");
    if (!input) return;

    const digits = (event.clipboardData?.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, CONFIG.otpLength);

    if (!digits) return;

    event.preventDefault();

    const root = $("#vnAccountOverlay");
    if (!root) return;

    const inputs = [...root.querySelectorAll("[data-otp-digit]")];
    inputs.forEach((element, index) => {
      element.value = digits[index] || "";
    });

    inputs[Math.min(digits.length, inputs.length) - 1]?.focus();
    if (inputs.length === 6 && inputs.every(element => element.value.length === 1)) {
      root.querySelector("#vnAcVerifyForm")?.requestSubmit();
    }
  });

  document.addEventListener("keydown", event => {
    const root = $("#vnAccountOverlay");
    if (event.key === "Escape" && root && !root.hidden) closePanel();
  });

  document.addEventListener("change", async event => {
    const toggle = event.target.closest("[data-ac-toggle='marketing']");

    if (toggle) {
      await saveMarketingPreference(toggle.checked);
      return;
    }

    const country = event.target.closest("[data-ac-country]");

    if (country) {
      state.country = country.value;

      if (!state.supabase || !state.user) return;

      const { error } = await state.supabase.from("profiles").upsert({
        id: state.user.id,
        country: state.country,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

      state.messageType = error ? "error" : "success";
      state.message = error
        ? `Could not save country: ${error.message}`
        : "Country preference saved.";

      render();
    }
  });

  window.VNAccount = {
    open: openPanel,
    close: closePanel,
    refresh: async () => {
      await loadAccountData();
      render();
    },
    getUser: () => state.user
  };

  configPromise = loadConfig();
  configPromise.then(() => {
    if (state.user) render();
  });
})();
