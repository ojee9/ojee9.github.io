
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
    otpCode: "",
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
    marketingUpdates: true,
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
          const metadata = session.user.user_metadata || {};
          state.profile = {
            ...state.profile,
            first_name: state.profile.first_name || metadata.first_name || "",
            last_name: state.profile.last_name || metadata.last_name || ""
          };
          updateAccountAvatar();

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

      const metadata = state.user.user_metadata || {};
      if (!profileResult.error && profileResult.data) {
        state.profile = profileResult.data;
      } else {
        state.profile = {
          first_name: metadata.first_name || "",
          last_name: metadata.last_name || "",
          marketing_updates: metadata.marketing_updates,
          country: metadata.country
        };
        if (profileResult.error) console.warn("[VN ACCOUNT] profiles table unavailable; using account metadata:", profileResult.error.message);
      }
      state.marketingUpdates = state.profile.marketing_updates !== false;
      state.country = state.profile.country || userCountry();
      updateAccountAvatar();

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
      .vn-ac-shell.vn-ac-auth-shell{display:flex;flex-direction:column;width:min(100%,640px);min-height:480px;max-height:calc(100dvh - 28px);padding:44px 56px 38px;background:#171717;color:#f5f5f5;border:0;box-shadow:0 28px 90px rgba(0,0,0,.42)}
      .vn-ac-header{position:relative;display:flex;justify-content:center;align-items:center;padding-bottom:24px;border-bottom:1px solid #e5e5e5}
      .vn-ac-auth-shell .vn-ac-header{padding:0 32px 22px;border:0}
      .vn-ac-brand{display:flex;align-items:center;justify-content:center;width:112px;height:54px;color:inherit;text-decoration:none}
      .vn-ac-brand img{display:block;width:100%;height:100%;object-fit:contain;filter:invert(1)}
      .vn-ac-close{position:absolute;right:0;top:50%;transform:translateY(-50%);border:0;background:none;font-size:23px;cursor:pointer;color:inherit}
      .vn-ac-auth-shell .vn-ac-close{top:12px;right:12px;transform:none;display:flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;color:#f5f5f5;font-size:28px;line-height:1}
      .vn-ac-auth-shell .vn-ac-main{width:100%;max-width:100%;margin:10px auto 0!important}
      .vn-ac-auth-shell .vn-ac-header{padding:0 28px 22px}
      .vn-ac-auth-shell .vn-ac-brand{width:176px;height:82px;pointer-events:none;user-select:none}
      .vn-ac-signin-heading{margin:2px 0 0;text-align:center}
      .vn-ac-signin-heading h1{margin:0;font-size:30px;font-weight:700;line-height:1.2;letter-spacing:-.65px;color:#f5f5f5}
      .vn-ac-signin-heading p{margin:9px 0 0;font-size:14px;line-height:1.5;color:#a9a5ad}
      .vn-ac-email-form-wrap{width:min(100%,420px);margin:0 auto}
      .vn-ac-shop-space{height:42px;flex:none}
      .vn-ac-or-divider{display:flex;align-items:center;gap:13px;width:min(100%,420px);margin:0 auto 18px;color:#8d8794;font-size:11px;line-height:1;letter-spacing:1.5px}
      .vn-ac-or-divider:before,.vn-ac-or-divider:after{content:"";height:1px;flex:1;background:#39343e}
      .vn-ac-email-bar{display:flex;align-items:center;gap:4px;width:100%;min-height:58px;padding:6px 7px 6px 17px;border:1px solid #555;border-radius:2px;overflow:hidden;background:#101010;transition:border-color .18s ease,background .18s ease}
      .vn-ac-email-bar input{flex:1;min-width:0;height:44px;padding:0;border:0;outline:0;background:transparent;color:#f5f5f5;font:16px/1.45 Arial,sans-serif}
      .vn-ac-email-bar input::placeholder{color:#a4a4a4;opacity:1}
      .vn-ac-email-bar:focus-within{border-color:#bdbdbd;background:#111}
      .vn-ac-email-submit{display:flex;align-items:center;justify-content:center;width:44px;height:44px;flex:none;padding:0;border:0;border-radius:0;background:transparent;color:#f5f5f5;cursor:pointer;transition:color .16s ease,background .16s ease}
      .vn-ac-email-submit:hover{background:#242424;color:#fff}.vn-ac-email-submit svg{display:block;width:20px;height:20px}
      .vn-ac-updates{display:flex;align-items:center;justify-content:flex-start;gap:8px;margin:13px 0 0;padding-left:15px;color:#c5c1ca;font-size:13px;line-height:1.45}
      .vn-ac-updates input{width:15px;height:15px;flex:none;margin:0;accent-color:#f5f5f5;cursor:pointer}
      .vn-ac-email-terms{margin:22px auto 0!important;max-width:420px;text-align:center;color:#8d8d8d;font-size:12px;line-height:1.6}
      .vn-ac-email-terms a,.vn-ac-email-terms button{padding:0;border:0;background:transparent;color:#bdbdbd;font:inherit;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
      .vn-ac-auth-shell .vn-ac-message{margin:0 0 12px}
      @media(max-width:600px){.vn-ac-shell.vn-ac-auth-shell{width:min(100%,540px);min-height:420px;padding:30px 24px 26px}.vn-ac-auth-shell .vn-ac-close{right:-10px}.vn-ac-auth-shell .vn-ac-brand{width:158px;height:74px}.vn-ac-signin-heading h1{font-size:27px}.vn-ac-signin-heading p{font-size:13px}.vn-ac-email-form-wrap,.vn-ac-or-divider{width:100%;max-width:420px}.vn-ac-email-bar{min-height:56px;padding-left:14px}.vn-ac-email-bar input{height:42px;font-size:16px}.vn-ac-email-submit{width:42px;height:42px}.vn-ac-email-submit svg{display:block;width:20px;height:20px}.vn-ac-shop-space{height:32px}.vn-ac-updates{font-size:12px}}
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
      .vn-ac-preference strong{display:inline;font-size:13px}
      .vn-ac-preference>div{display:flex;align-items:center;gap:0;white-space:nowrap}
      .vn-ac-preference small{display:block;color:#777;margin-top:5px}
      .vn-ac-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:24px 0}
      .vn-ac-stat{border:1px solid #dedede;border-radius:4px;padding:20px}
      .vn-ac-stat strong{display:block;font-size:27px;margin-bottom:4px}
      .vn-ac-stat span{font-size:11px;letter-spacing:.06em;color:#666}
      .vn-ac-record{border:1px solid #dedede;border-radius:4px;padding:18px;margin:12px 0}
      .vn-ac-record-head{display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap}
      .vn-ac-record p{font-size:13px;color:#666;margin:9px 0}
      .vn-ac-badge{display:inline-block;padding:4px 8px;border:1px solid #ddd;border-radius:20px;font-size:11px;color:#555}
      .vn-ac-otp-wrap{position:relative;width:100%;margin:23px 0 4px}.vn-ac-otp{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;width:100%;margin:0;transition:filter .18s ease,opacity .18s ease}.vn-ac-otp input:disabled{cursor:wait}.vn-ac-otp-wrap.is-loading .vn-ac-otp{filter:blur(1.5px);opacity:.42}.vn-ac-otp-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:10px;background:rgba(20,20,20,.32);color:#eee;font-size:12px;letter-spacing:.3px}.vn-ac-otp-loading[hidden]{display:none!important}.vn-ac-otp-spinner{width:24px;height:24px;border:2px solid rgba(255,255,255,.22);border-top-color:#f5f5f5;border-radius:50%;animation:vnAcOtpSpin .7s linear infinite;box-shadow:0 0 12px rgba(255,255,255,.14)}@keyframes vnAcOtpSpin{to{transform:rotate(360deg)}}
      .vn-ac-otp input{display:block;width:100%;min-width:0;height:52px;padding:0;text-align:center;font:500 20px/1 Arial,sans-serif;border:1px solid #4a4a4a;border-radius:3px;background:#202020;color:#f5f5f5;appearance:none}
      .vn-ac-otp input:focus{outline:1px solid #bdbdbd;outline-offset:2px;border-color:#bdbdbd}
      .vn-ac-auth-shell .vn-ac-verify-main{margin:10px auto 0!important;width:100%;max-width:100%}
      .vn-ac-verify-main h1{margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:-.02em;color:#f5f5f5}
      .vn-ac-verify-main .vn-ac-sent-to{margin:0;color:#bdbdbd;font-size:12px}
      .vn-ac-inline-change{padding:0 0 0 3px;border:0;background:none;color:#f5f5f5;font:inherit;text-decoration:underline;cursor:pointer}
      
      #vnAccountOverlay{flex-direction:column;gap:13px}
      .vn-ac-policy-link{display:block;align-self:center;margin:18px auto 0;padding:11px 8px 0;border:0;background:transparent;color:#a8a8a8;font:10px/1.4 Arial,sans-serif;text-align:center;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
      .vn-ac-policy-overlay{position:fixed;inset:0;z-index:10003;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.46);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
      .vn-ac-policy-overlay[hidden]{display:none!important}
      .vn-ac-policy-panel{position:relative;width:min(100%,680px);height:min(78dvh,720px);overflow:auto;padding:34px 38px 38px;background:#171717;color:#f5f5f5;border:1px solid #383838;box-shadow:0 24px 80px rgba(0,0,0,.6);text-align:left;opacity:0;transform:scale(.06);transform-origin:var(--policy-origin-x,50%) var(--policy-origin-y,50%);transition:transform .48s cubic-bezier(.16,1,.3,1),opacity .24s ease}
      .vn-ac-policy-overlay.is-open .vn-ac-policy-panel{opacity:1;transform:scale(1)}
      .vn-ac-policy-panel iframe{display:block;width:100%;height:100%;border:0;background:#171717}.vn-ac-policy-panel h2{margin:0 0 20px;padding-right:28px;font-size:25px;font-weight:600;letter-spacing:-.4px;color:#f5f5f5}.vn-ac-policy-kicker{margin:0 0 10px;color:#999;font-size:10px;letter-spacing:1.8px;text-transform:uppercase}.vn-ac-policy-body{color:#c8c8c8;font-size:13px;line-height:1.8}.vn-ac-policy-body h3{margin:23px 0 7px;color:#f0f0f0;font-size:13px;font-weight:600}.vn-ac-policy-body p{margin:0 0 13px}.vn-ac-policy-body a{color:#f5f5f5;text-decoration:underline;text-underline-offset:3px}
      .vn-ac-policy-close{position:absolute;top:12px;right:14px;z-index:1;width:32px;height:32px;border:0;border-radius:50%;background:#303030;color:#fff;font-size:22px;line-height:1;cursor:pointer}
      @media(max-width:420px){.vn-ac-otp{gap:6px}.vn-ac-otp input{height:47px}.vn-ac-policy-panel{padding:30px 22px 24px}.vn-ac-policy-panel h2{font-size:22px}}
      .vn-ac-divider{height:1px;background:#e5e5e5;margin:24px 0}
      .vn-ac-muted{font-size:12px;color:#777}
      .vn-ac-muted a{color:inherit;text-decoration:underline}
      .vn-ac-legal-copy{white-space:pre-line;line-height:1.8;color:#555;font-size:13px}
      .vn-ac-account-footer{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 22px;margin:28px 0 0;padding:18px 0 2px;border-top:1px solid #393939}
      .vn-ac-account-footer button{padding:0;border:0;background:none;color:#aaa;font:10px/1.5 Arial,sans-serif;letter-spacing:.8px;text-decoration:none;cursor:pointer}
      .vn-ac-account-footer button:hover{color:#fff}
      .vn-ac-account-footer button[aria-current="page"]{color:#fff}
      .vn-ac-profile-legal{display:flex;flex-wrap:wrap;gap:7px 16px;margin:20px 0 0;padding-top:16px;border-top:1px solid #393939}
      .vn-ac-profile-legal .vn-ac-legal-list{display:contents}
      .vn-ac-profile-legal .vn-ac-legal-item{display:inline-flex;gap:5px;align-items:center;color:#a8a8a8;font-size:10px;line-height:1.5;text-decoration:underline;text-underline-offset:3px}
      .vn-ac-profile-legal .vn-ac-legal-item:hover{color:#fff}
      .vn-ac-policy-footer-row{display:flex;align-items:center;justify-content:center;gap:6px 16px;flex-wrap:wrap;width:100%;margin-top:18px}
      .vn-ac-policy-footer-row .vn-ac-policy-link{margin:0;padding:11px 8px 0;flex:none}
      .vn-ac-footer-policies .vn-ac-legal-list{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 14px;margin:0;border:0}
      .vn-ac-footer-policies .vn-ac-legal-item{display:inline-flex;gap:3px;padding:0;border:0;color:#a8a8a8;font:10px/1.4 Arial,sans-serif;text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
      .vn-ac-footer-policies .vn-ac-legal-item:hover{color:#fff}
      .vn-ac-footer-country{display:inline-flex;align-items:center;justify-content:flex-start;gap:0;width:max-content;max-width:100%;margin:0;padding:0;color:#a8a8a8;font:10px/1.4 Arial,sans-serif;white-space:nowrap;vertical-align:middle;flex:0 0 auto}
      .vn-ac-footer-country select{display:inline-block;box-sizing:content-box;width:0;max-width:none;min-width:0;flex:0 0 auto;margin:0;padding:0;border:0;outline:0;background:transparent;color:inherit;font:inherit;line-height:inherit;cursor:pointer;appearance:none;-webkit-appearance:none;vertical-align:middle}
      .vn-ac-footer-country::after{content:"⌄";display:inline-block;margin-left:1px;padding:0;font-size:10px;line-height:1;pointer-events:none;flex:0 0 auto;vertical-align:middle}
      .vn-ac-profile-action{min-height:30px;padding:6px 12px;font-size:11px;letter-spacing:.3px;text-decoration:none}
      .vn-ac-address-form{display:flex;flex-direction:column;gap:12px}
      .vn-ac-address-control{position:relative;display:block;min-width:0}
      .vn-ac-address-control>span{position:absolute;z-index:1;top:7px;left:13px;font-size:10px;line-height:1.1;color:#8c8c8c;pointer-events:none}
      .vn-ac-address-control>input,.vn-ac-address-control>select{box-sizing:border-box;width:100%;min-width:0;min-height:48px;padding:20px 12px 7px;border:1px solid #d7d7d7;border-radius:5px;background:#fff;color:#111;font:13px/1.3 Arial,sans-serif}
      .vn-ac-address-control>input::placeholder{color:#777;opacity:1}
      .vn-ac-address-control>select{padding-right:28px}
      .vn-ac-address-city-row{grid-template-columns:1fr 1fr 1fr;gap:10px}
      .vn-ac-phone-row{display:flex;align-items:stretch}
      .vn-ac-phone-row{position:relative;display:flex;align-items:stretch;width:100%;min-width:0}
      .vn-ac-phone-dial{display:flex;align-items:center;flex:0 0 auto;padding:0 10px;border:1px solid #d7d7d7;border-right:0;border-radius:5px 0 0 5px;background:#fff;color:#222;font:13px Arial,sans-serif;white-space:nowrap}
      .vn-ac-phone-row input{flex:1;min-width:0;width:100%;padding:14px 12px;border:1px solid #d7d7d7;border-left:0;border-right:0;border-radius:0;color:#111;font:13px Arial,sans-serif}
      .vn-ac-phone-row select{position:relative;z-index:1;flex:0 0 42px;width:42px;min-width:0;padding:0;border:1px solid #d7d7d7;border-left:0;border-radius:0 5px 5px 0;background:transparent;color:transparent;font-size:0;cursor:pointer;appearance:none;-webkit-appearance:none}
      .vn-ac-phone-row select option{color:#111;font-size:13px}
      .vn-ac-phone-flag{position:absolute;z-index:2;right:12px;top:50%;transform:translateY(-50%);font-size:17px;line-height:1;pointer-events:none}
      .vn-ac-default-address{display:flex;align-items:center;gap:9px;font-size:13px;cursor:pointer}
      .vn-ac-default-address input{width:15px;height:15px;margin:0;accent-color:#17110b}
      @media(max-width:700px){.vn-ac-address-city-row{grid-template-columns:1fr}.vn-ac-phone-row select{flex-basis:42px;width:42px}}

      .vn-ac-footer-country select option{color:#111;background:#fff}
      .vn-ac-profile-detail-row{display:flex;align-items:center;justify-content:space-between;gap:18px}
      .vn-ac-profile-detail-label{display:flex;align-items:center;min-width:0}
      .vn-ac-profile-detail-value{display:flex;align-items:center;justify-content:flex-end;gap:18px;min-width:0}
      .vn-ac-profile-detail-value small{text-align:right;overflow-wrap:anywhere}
      .vn-ac-profile-detail-row>.vn-ac-text-action{flex:none}
      @media(max-width:520px){.vn-ac-profile-detail-row{gap:10px}.vn-ac-profile-detail-value{gap:10px}}
      .vn-ac-profile-name{margin:12px 0 20px;font-size:16px;font-weight:600;line-height:1.5;letter-spacing:.1px}\n      .vn-ac-profile-section{margin-top:20px}
      .vn-ac-profile-section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:7px;font-size:13px}
      .vn-ac-text-action{padding:0;border:0;background:none;color:#777;font:12px Arial,sans-serif;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
      .vn-ac-text-action:hover{color:#111}
      .vn-ac-profile-icon{display:inline-block;margin-right:10px;color:#777;font-size:16px}.vn-ac-location-icon{width:16px;height:16px;flex:0 0 16px;vertical-align:middle}
      .vn-ac-profile-section .vn-ac-row{margin:0}
      .vn-ac-profile-section .vn-ac-preference{margin:0}
      .vn-ac-profile-signout{display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:9px;margin-top:24px;padding-top:0;border-top:0}
      .vn-ac-profile-signout .vn-ac-button{min-height:34px;padding:7px 10px;font-size:10px;letter-spacing:.6px}
      .vn-ac-profile-signout .vn-ac-button.secondary{color:#222;border-color:#aaa}
      .vn-ac-profile-signout .vn-ac-button.danger{color:#999;border-color:#ddd}
      .vn-ac-orders-empty h2{margin:0 0 24px;font-size:22px;color:#222}
      .vn-ac-ready-row{display:flex;align-items:center;justify-content:space-between;gap:18px}
      .vn-ac-ready-row h3{margin:0;font-size:20px;color:#222}
      @media(max-width:700px){.vn-ac-policy-footer-row{gap:5px 10px}.vn-ac-footer-policies .vn-ac-legal-list{gap:6px 10px}}
      #profile-open.vn-ac-avatar-initial{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;box-sizing:border-box;border:1px solid #9A7955;border-radius:50%;background:#B89A76;color:#17110B;font:700 15px/1 Arial,sans-serif;text-transform:uppercase;box-shadow:0 0 0 2px rgba(184,154,118,.22),0 1px 5px rgba(0,0,0,.22)}
      .vn-ac-profile-country{margin-top:20px}
      .vn-ac-profile-signout{display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:9px;margin-top:22px;padding-top:0;border-top:0}
      .vn-ac-profile-signout .vn-ac-button{font-size:10px;letter-spacing:.7px}
      .vn-ac-empty{padding:24px;border:1px solid #e5e5e5;color:#777;font-size:13px}
      /* One fixed-size dashboard shell for every signed-in section, including views without .vn-ac-layout. */
      .vn-ac-shell.vn-ac-dashboard-open{
        box-sizing:border-box;
        width:min(1280px,calc(100vw - 40px)) !important;
        height:min(860px,calc(100dvh - 40px)) !important;
        min-height:min(860px,calc(100dvh - 40px)) !important;
        max-height:min(860px,calc(100dvh - 40px)) !important;
        padding:36px 48px 28px !important;
        overflow:hidden !important;
        display:flex !important;
        flex-direction:column !important;
        flex:0 0 auto;
      }
      .vn-ac-shell.vn-ac-dashboard-open #vnAcContent{
        flex:1 1 auto;
        min-width:0;
        min-height:0;
        overflow:auto;
        scrollbar-gutter:stable;
      }
      .vn-ac-shell.vn-ac-dashboard-open .vn-ac-header,
      .vn-ac-shell.vn-ac-dashboard-open .vn-ac-policy-footer-row{
        flex:0 0 auto;
      }
      .vn-ac-shell.vn-ac-dashboard-open .vn-ac-layout{
        width:100%;
        min-height:100%;
      }
      @media(max-width:700px){
        .vn-ac-shell.vn-ac-dashboard-open{
          width:calc(100vw - 24px) !important;
          height:calc(100dvh - 24px) !important;
          min-height:calc(100dvh - 24px) !important;
          max-height:calc(100dvh - 24px) !important;
          padding:20px 17px 18px !important;
        }
      }
      /* Shared dashboard canvas: identical dimensions across all account sections. Footer sizing and placement stay unchanged. */
      .vn-ac-shell.vn-ac-auth-shell:has(.vn-ac-layout){
        box-sizing:border-box;
        width:min(1200px,calc(100vw - 48px));
        height:min(780px,calc(100dvh - 48px));
        min-height:min(780px,calc(100dvh - 48px));
        max-height:min(780px,calc(100dvh - 48px));
        padding:36px 48px 28px;
        overflow:hidden;
        display:flex;
        flex-direction:column;
        flex:0 0 auto;
      }
      .vn-ac-shell.vn-ac-auth-shell:has(.vn-ac-layout) .vn-ac-header,
      .vn-ac-shell.vn-ac-auth-shell:has(.vn-ac-layout) .vn-ac-policy-footer-row{
        flex:0 0 auto;
      }
      .vn-ac-shell.vn-ac-auth-shell:has(.vn-ac-layout) #vnAcContent{
        flex:1 1 auto;
        min-width:0;
        min-height:0;
        overflow:auto;
        scrollbar-gutter:stable;
      }
      .vn-ac-shell.vn-ac-auth-shell:has(.vn-ac-layout) .vn-ac-layout{
        display:grid;
        grid-template-columns:200px minmax(0,1fr);
        align-items:start;
        gap:48px;
        width:100%;
        min-height:100%;
        padding-top:24px;
      }
      .vn-ac-shell.vn-ac-auth-shell:has(.vn-ac-layout) .vn-ac-main{
        width:100%;
        max-width:none;
        min-width:0;
        font-size:14px;
        line-height:1.55;
      }
      .vn-ac-shell.vn-ac-auth-shell:has(.vn-ac-layout) .vn-ac-main h1{
        margin:0 0 8px;
        font-size:26px;
        line-height:1.25;
        letter-spacing:-.35px;
      }
      .vn-ac-shell.vn-ac-auth-shell:has(.vn-ac-layout) .vn-ac-main .vn-ac-subtitle{
        margin:0 0 22px;
        font-size:13px;
        line-height:1.5;
      }
      .vn-ac-shell.vn-ac-auth-shell:has(.vn-ac-layout) .vn-ac-sidebar,
      .vn-ac-shell.vn-ac-auth-shell:has(.vn-ac-layout) .vn-ac-main{
        box-sizing:border-box;
      }
      @media(max-width:700px){
        .vn-ac-shell.vn-ac-auth-shell:has(.vn-ac-layout){
          width:calc(100vw - 24px);
          height:calc(100dvh - 24px);
          min-height:calc(100dvh - 24px);
          max-height:calc(100dvh - 24px);
          padding:20px 17px 18px;
        }
        .vn-ac-shell.vn-ac-auth-shell:has(.vn-ac-layout) .vn-ac-layout{
          grid-template-columns:minmax(0,1fr);
          gap:22px;
          padding-top:22px;
        }
        .vn-ac-shell.vn-ac-auth-shell:has(.vn-ac-layout) .vn-ac-main h1{font-size:23px}
      }
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
      <div class="vn-ac-shell vn-ac-auth-shell">
        <header class="vn-ac-header">
          <div class="vn-ac-brand" aria-label="VN"><img src="images/vn-logo-black-transparent.png" alt="VN"></div>
          <button type="button" class="vn-ac-close" data-ac-action="close" aria-label="Close account">×</button>
        </header>
        <div id="vnAcContent"></div>
        <div class="vn-ac-policy-footer-row">
          <label class="vn-ac-footer-country" aria-label="Country"><select data-ac-country>${countryOptions(state.country)}</select></label>
          <div class="vn-ac-footer-policies">${legalLinks()}</div>
        </div>
      </div>

      <div class="vn-ac-policy-overlay" data-policy-overlay="terms" hidden role="dialog" aria-modal="true" aria-label="Terms of Use">
        <section class="vn-ac-policy-panel">
          <button type="button" class="vn-ac-policy-close" data-ac-action="policy-close" aria-label="Close Terms of Use">×</button>
          <p class="vn-ac-policy-kicker">VN SHOP · LEGAL</p>
          <h2>Terms of Use</h2>
          <div class="vn-ac-policy-body">
            <p>By accessing or using VN SHOP, you agree to these Terms of Use. If you do not agree, please discontinue use of the website.</p>
            <h3>Website use</h3>
            <p>You agree to use this website lawfully and not to interfere with its operation, security, availability, or content. You must not attempt to gain unauthorized access to accounts or systems.</p>
            <h3>Products and availability</h3>
            <p>Product descriptions, images, prices, and availability may change without notice. A product displayed on the website is not a guarantee that it is currently available for purchase.</p>
            <h3>Accounts and security</h3>
            <p>You are responsible for providing accurate information and keeping access to your email account secure. Verification codes are intended for your use only and should not be shared with others.</p>
            <h3>Intellectual property</h3>
            <p>Website content, brand assets, logos, and original materials remain the property of their respective owners. They may not be copied, redistributed, or used commercially without permission.</p>
            <h3>Changes to these terms</h3>
            <p>These terms may be updated when necessary. The current version published on this website applies to your use of the service.</p>
            <h3>Contact</h3>
            <p>For questions about these terms, visit <a href="help.html">Help &amp; Support</a>.</p>
          </div>
        </section>
      </div>

      <div class="vn-ac-policy-overlay" data-policy-overlay="privacy" hidden role="dialog" aria-modal="true" aria-label="Privacy Policy">
        <section class="vn-ac-policy-panel">
          <button type="button" class="vn-ac-policy-close" data-ac-action="policy-close" aria-label="Close privacy policy">×</button>
          <p class="vn-ac-policy-kicker">VN SHOP · LEGAL</p>
          <h2>Privacy Policy</h2>
          <div class="vn-ac-policy-body">
            <p>VN SHOP respects your privacy. This notice explains the main types of information that may be processed when you use the website.</p>
            <h3>Information you provide</h3>
            <p>If you use account sign-in, your email address is processed to send a verification code and establish your account session. If you choose to receive updates from 9ojeez9, that preference may also be associated with the account sign-up request.</p>
            <h3>Authentication</h3>
            <p>Account authentication is provided by Supabase. Your email address, verification requests, and authentication session are processed as needed to provide sign-in functionality. Never share a verification code with anyone.</p>
            <h3>Cookies and preferences</h3>
            <p>The website stores your cookie preferences in your browser so that your selections can be remembered. You can review those choices using the Cookie Choices control in the website footer.</p>
            <h3>How information is used</h3>
            <p>Information may be used to operate account features, maintain website security, remember your preferences, and provide features you request. Do not enter information that is unnecessary to use the website.</p>
            <h3>Third-party services</h3>
            <p>The website relies on third-party services for functionality such as authentication and loading external resources. Those services may process technical data under their own terms and privacy notices.</p>
            <h3>Your choices</h3>
            <p>You can choose whether to request account sign-in and whether to opt in to updates. You can also adjust your cookie preferences using Cookie Choices.</p>
            <h3>Contact</h3>
            <p>For privacy questions, visit <a href="help.html">Help &amp; Support</a>. The full published policy is also available at <a href="policies/privacy-policy.html">Privacy Policy</a>.</p>
          </div>
        </section>
      </div>
    `;

    root.addEventListener("click", event => {
      if (event.target.matches(".vn-ac-policy-overlay")) {
        event.target.classList.remove("is-open");
        event.target.hidden = true;
      }
    });

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

        <div class="vn-ac-signin-heading">
          <h1>Sign in</h1>
          <p>Sign in or create an account</p>
        </div>

        <div class="vn-ac-shop-space" aria-hidden="true"></div>
        <div class="vn-ac-or-divider" aria-hidden="true"><span>OR</span></div>

        <div class="vn-ac-email-form-wrap">
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
            <button type="submit" class="vn-ac-email-submit" aria-label="Continue" title="Continue"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          </div>

          <label class="vn-ac-updates">
            <input type="checkbox" name="updates" ${state.signupMarketing ? "checked" : ""}>
            <span>Sign up to receive updates from 9ojeez9</span>
          </label>
        </form>
        </div>

        <p class="vn-ac-muted vn-ac-email-terms">
          By continuing, you agree to our
          <button type="button" data-ac-action="policy-open" data-ac-policy="terms">Terms of Use</button>.
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
          <div class="vn-ac-otp-wrap ${state.busy ? "is-loading" : ""}">
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
                value="${escapeHTML(state.otpCode[index] || "")}"
                ${state.busy ? "disabled" : ""}
                required
              >
            `).join("")}
          </div>
          <div class="vn-ac-otp-loading" role="status" aria-live="polite" ${state.busy ? "" : "hidden"}><span class="vn-ac-otp-spinner" aria-hidden="true"></span><span>Verifying code…</span></div>
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

  function accountFooter() { return ""; }

  function renderDashboard() {
    const name = [state.profile.first_name, state.profile.last_name].filter(Boolean).join(" ").trim();
    return `
      <div class="vn-ac-layout">
        ${sidebar()}
        <main class="vn-ac-main">
          <h1>${name ? `Welcome, ${escapeHTML(name)}!` : "Welcome"}</h1>
          <p class="vn-ac-subtitle">Here's everything you can manage in your account.</p>
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
            <span>${label}</span>
          </a>
        `).join("")}
      </div>
    `;
  }

  function countryFlag(code) {
    const normalized = String(code || "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalized)) return "";
    return String.fromCodePoint(...[...normalized].map(char => 127397 + char.charCodeAt(0)));
  }

  function countryOptions(selected) {
    const codes = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    const configured = state.config?.account?.profile?.country?.options || [];
    const names = new Map(codes.map(code => [code, code === "TR" ? "Türkiye" : displayNames.of(code)]));
    configured.forEach(item => {
      if (item?.code && item?.name) names.set(item.code, item.name);
    });
    return codes.map(code => `
      <option value="${escapeHTML(code)}" ${code === selected ? "selected" : ""}>${escapeHTML(names.get(code) || code)}</option>
    `).join("");
  }

  function countryName(code) {
    const list = state.config?.account?.profile?.country?.options || [
      { code: "TR", name: "Türkiye" }, { code: "US", name: "United States" },
      { code: "GB", name: "United Kingdom" }, { code: "DE", name: "Germany" },
      { code: "FR", name: "France" }, { code: "NL", name: "Netherlands" },
      { code: "CA", name: "Canada" }, { code: "AU", name: "Australia" }
    ];
    return list.find(item => item.code === code)?.name || code || "Türkiye";
  }

  function renderProfile() {
    const email = state.user?.email || state.email;
    const fullName = [state.profile.first_name, state.profile.last_name].filter(Boolean).join(" ").trim();
    return `
      <div class="vn-ac-layout">
        ${sidebar()}
        <main class="vn-ac-main">
          <h1>My Profile</h1>
          <p class="vn-ac-profile-name">${escapeHTML(fullName || "Enter name")}</p>
          ${messageHTML()}
          <section class="vn-ac-profile-section"><div class="vn-ac-profile-section-head"><strong>Email</strong><button type="button" class="vn-ac-button secondary vn-ac-profile-action" data-ac-action="edit-contact">Edit</button></div>
            <div class="vn-ac-row vn-ac-profile-detail-row"><div class="vn-ac-profile-detail-label"><strong>Email</strong></div><div class="vn-ac-profile-detail-value"><small>${escapeHTML(email)}</small></div></div>
          </section>
          <section class="vn-ac-profile-section"><div class="vn-ac-profile-section-head"><strong>Addresses</strong><button type="button" class="vn-ac-button secondary vn-ac-profile-action" data-ac-action="edit-addresses">Add</button></div>
            <div class="vn-ac-row vn-ac-profile-detail-row"><div class="vn-ac-profile-detail-label"><svg class="vn-ac-profile-icon vn-ac-location-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 10C20 15.25 12 22 12 22S4 15.25 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.7"/></svg><strong>${state.addresses.length ? escapeHTML(state.addresses.length + " saved address(es)") : "No addresses added"}</strong></div></div>
          </section>
          <section class="vn-ac-profile-section"><div class="vn-ac-profile-section-head"><strong>Marketing preferences</strong></div>
            <div class="vn-ac-preference"><div><span class="vn-ac-profile-icon" aria-hidden="true">✉</span><strong>Email</strong></div><input type="checkbox" class="vn-ac-toggle" data-ac-toggle="marketing" aria-label="Email marketing preferences" ${state.marketingUpdates ? "checked" : ""}></div>
          </section>
          
          <div class="vn-ac-profile-signout"><button class="vn-ac-button secondary" data-ac-action="signout">SIGN OUT</button><button class="vn-ac-button danger" data-ac-action="signout-all">SIGN OUT FROM ALL DEVICES</button></div>
        </main>
      </div>
    `;
  }

  function renderContactEdit() {
    const email = state.user?.email || state.email || "";
    return `
      <div class="vn-ac-layout">
        ${sidebar()}
        <main class="vn-ac-main">
          <h1>Edit Profile</h1>
          <form id="vnAcProfileForm">
            <div class="vn-ac-form-grid">
              <label class="vn-ac-field"><span>First name</span><input name="first_name" value="${escapeHTML(state.profile.first_name || "")}" autocomplete="given-name"></label>
              <label class="vn-ac-field"><span>Last name</span><input name="last_name" value="${escapeHTML(state.profile.last_name || "")}" autocomplete="family-name"></label>
            </div>
            <label class="vn-ac-field"><span>Email</span><input name="email" type="email" value="${escapeHTML(email)}" autocomplete="email" required></label>
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
            <p>${escapeHTML([address.first_name,address.last_name,address.address,address.apartment,address.city,address.state,address.postal_code,address.country].filter(Boolean).join(", "))}</p>
            ${address.phone ? `<p>${escapeHTML(address.phone)}</p>` : ""}
            <button type="button" class="vn-ac-button secondary" data-ac-delete-address="${escapeHTML(address.id)}">Delete address</button>
          </article>
        `).join("")
      : `<div class="vn-ac-empty">No saved addresses yet.</div>`;
    const countryCodes = "AD AE AF AG AL AM AO AR AT AU AZ BA BD BE BG BH BO BR BY CA CH CL CN CO CR CY CZ DE DK DO DZ EC EE EG ES ET FI FR GB GE GH GR HK HR HU ID IE IL IN IQ IR IS IT JO JP KE KR KW KZ LB LK LT LU LV MA MD ME MX MY NG NL NO NP NZ OM PA PE PH PK PL PT QA RO RS RU SA SE SG SI SK TH TN TR TW TZ UA UG US UY UZ VE VN ZA".split(" ");
    const dialCodes = {US:"+1",CA:"+1",GB:"+44",TR:"+90",DE:"+49",FR:"+33",NL:"+31",AU:"+61",NZ:"+64",IN:"+91",JP:"+81",KR:"+82",CN:"+86",BR:"+55",MX:"+52",ES:"+34",IT:"+39",AE:"+971",SA:"+966",QA:"+974",EG:"+20",PK:"+92",BD:"+880",ID:"+62",RU:"+7",UA:"+380",SE:"+46",NO:"+47",DK:"+45",FI:"+358",CH:"+41",AT:"+43",BE:"+32",IE:"+353",PT:"+351",GR:"+30",PL:"+48",CZ:"+420",RO:"+40",ZA:"+27",NG:"+234",KE:"+254",GH:"+233"};

    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    const dialSelect = countryCodes.map(code => `<option value="${code}" data-dial="${dialCodes[code] || ""}" ${code === (state.country || "TR") ? "selected" : ""}>${regionNames.of(code) || code}</option>`).join("");
    const selectedDial = dialCodes[state.country || "TR"] || "";
    return `
      <div class="vn-ac-layout">
        ${sidebar()}
        <main class="vn-ac-main">
          <h1>Addresses</h1><p class="vn-ac-subtitle">Manage your saved shipping addresses.</p>
          ${messageHTML()}${list}
          <h2 style="margin-top:28px">Add address</h2>
          <form id="vnAcAddressForm" class="vn-ac-address-form">
            <label class="vn-ac-address-control"><span>Country / Region</span><select name="country" autocomplete="country-name">${countryOptions(state.country)}</select></label>
            <div class="vn-ac-form-grid">
              <label class="vn-ac-address-control"><span>First name</span><input name="first_name" placeholder="First name" autocomplete="given-name" required></label>
              <label class="vn-ac-address-control"><span>Last name</span><input name="last_name" placeholder="Last name" autocomplete="family-name" required></label>
            </div>
            <label class="vn-ac-address-control"><span>Address</span><input name="address" placeholder="Address" autocomplete="street-address" list="vnAcAddressSuggestions" required></label>
            <datalist id="vnAcAddressSuggestions">
              <option value="Street"></option><option value="Avenue"></option><option value="Boulevard"></option><option value="Road"></option><option value="Apartment"></option>
            </datalist>
            <label class="vn-ac-address-control"><span>Apartment, suite, etc. (optional)</span><input name="apartment" placeholder="Apartment, suite, etc. (optional)" autocomplete="address-line2"></label>
            <div class="vn-ac-form-grid vn-ac-address-city-row">
              <label class="vn-ac-address-control"><span>City</span><input name="city" placeholder="City" autocomplete="address-level2" required></label>
              <label class="vn-ac-address-control"><span>State</span><select name="state" autocomplete="address-level1"><option value="">State / Province</option>${(state.country === "TR" ? "Adana Adıyaman Afyonkarahisar Ağrı Amasya Ankara Antalya Artvin Aydın Balıkesir Bilecik Bingöl Bitlis Bolu Burdur Bursa Çanakkale Çankırı Çorum Denizli Diyarbakır Edirne Elazığ Erzincan Erzurum Eskişehir Gaziantep Giresun Gümüşhane Hakkari Hatay Isparta Mersin İstanbul İzmir Kars Kastamonu Kayseri Kırklareli Kırşehir Kocaeli Konya Kütahya Malatya Manisa Kahramanmaraş Mardin Muğla Muş Nevşehir Niğde Ordu Rize Sakarya Samsun Siirt Sinop Sivas Tekirdağ Tokat Trabzon Tunceli Şanlıurfa Uşak Van Yozgat Zonguldak Aksaray Bayburt Karaman Kırıkkale Batman Şırnak Bartın Ardahan Iğdır Yalova Karabük Kilis Osmaniye Düzce" : "Alabama Alaska Arizona Arkansas California Colorado Connecticut Delaware Florida Georgia Hawaii Idaho Illinois Indiana Iowa Kansas Kentucky Louisiana Maine Maryland Massachusetts Michigan Minnesota Mississippi Missouri Montana Nebraska Nevada New Hampshire New Jersey New Mexico New York North Carolina North Dakota Ohio Oklahoma Oregon Pennsylvania Rhode Island South Carolina South Dakota Tennessee Texas Utah Vermont Virginia Washington West Virginia Wisconsin Wyoming").split(" ").map(item => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`).join("")}</select></label>
              <label class="vn-ac-address-control"><span>ZIP Code</span><input name="postal_code" placeholder="ZIP Code" autocomplete="postal-code" required></label>
            </div>
            <label class="vn-ac-address-control"><span>Phone</span><div class="vn-ac-phone-row"><span class="vn-ac-phone-dial" data-ac-phone-dial>${selectedDial}</span><input name="phone" type="tel" placeholder="Phone" autocomplete="tel-national"><select name="phone_country" aria-label="Phone country" title="Select phone country">${dialSelect}</select><span class="vn-ac-phone-flag" aria-hidden="true">${countryFlag(state.country || "TR")}</span></div></label>
            <label class="vn-ac-default-address"><input type="checkbox" name="is_default"><span>This is my default address</span></label>
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
          ${orders.length ? `
            <h1>My Orders</h1><p class="vn-ac-subtitle">View your order history and track shipments.</p>
            ${messageHTML()}
            <div class="vn-ac-stats">
              <div class="vn-ac-stat"><strong>${orders.length}</strong><span>TOTAL ORDERS</span></div>
              <div class="vn-ac-stat"><strong>${delivered}</strong><span>DELIVERED ORDERS</span></div>
              <div class="vn-ac-stat"><strong>${returned}</strong><span>RETURNED ORDERS</span></div>
              <div class="vn-ac-stat"><strong>${waiting}</strong><span>WAITING ORDERS</span></div>
            </div>
            ${orders.map(order => `
              <article class="vn-ac-record">
                <div class="vn-ac-record-head"><strong>Order ${escapeHTML(order.order_number || order.id)}</strong><span class="vn-ac-badge">${escapeHTML(order.status || "Status unavailable")}</span></div>
                <p>Placed: ${escapeHTML(order.created_at || "—")}</p>
                <p>Total: ${escapeHTML(order.currency || "USD")} ${escapeHTML(order.grand_total ?? order.total ?? "—")}</p>
                <p>Tracking: ${escapeHTML(order.tracking_number || "Not available yet")}</p>
                <button class="vn-ac-button secondary" data-ac-order="${escapeHTML(order.id)}">View order</button>
                <button class="vn-ac-button secondary" data-ac-return-order="${escapeHTML(order.id)}">Start a return</button>
              </article>
            `).join("")}
          ` : `
            <div class="vn-ac-empty vn-ac-orders-empty">
              <h1>Welcome${[state.profile.first_name, state.profile.last_name].filter(Boolean).join(" ").trim() ? `, ${escapeHTML([state.profile.first_name, state.profile.last_name].filter(Boolean).join(" ").trim())}` : ""}</h1>
              <div class="vn-ac-ready-row"><h3>Ready to shop?</h3><button class="vn-ac-button" data-ac-section="shop">Shop Now</button></div>
            </div>
          `}
        </main>
      </div>
    `;
  }

  function renderReturns() {
    if (!state.returns.length) {
      return `
        <div class="vn-ac-layout">
          ${sidebar()}
          <main class="vn-ac-main">
            <p>No return requests are available for this account.</p>
          </main>
        </div>
      `;
    }

    return `
      <div class="vn-ac-layout">
        ${sidebar()}
        <main class="vn-ac-main">
          <h1>My Returns</h1><p class="vn-ac-subtitle">Start or track a return.</p>
          ${messageHTML()}
          ${state.returns.map(item => `
            <article class="vn-ac-record">
              <div class="vn-ac-record-head"><strong>Return ${escapeHTML(item.return_number || item.id)}</strong><span class="vn-ac-badge">${escapeHTML(item.status || "Status unavailable")}</span></div>
              <p>Order: ${escapeHTML(item.order_id || "—")}</p><p>Reason: ${escapeHTML(item.reason || "—")}</p>
              <p>Created: ${escapeHTML(item.requested_at || item.created_at || "—")}</p><p>${escapeHTML(item.customer_note || "")}</p>
            </article>
          `).join("")}
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
          <p class="vn-ac-muted">Submitting a request does not guarantee approval or automatically issue a refund.</p>
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

  function updateAccountAvatar() {
    const button = document.querySelector("#profile-open");
    if (!button) return;
    const name = [state.profile.first_name, state.profile.last_name].filter(Boolean).join(" ").trim();
    if (state.user && name) {
      button.textContent = name.charAt(0).toLocaleUpperCase();
      button.setAttribute("aria-label", name);
      button.classList.add("vn-ac-avatar-initial");
    } else {
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>';
      button.setAttribute("aria-label", "Account");
      button.classList.remove("vn-ac-avatar-initial");
    }
  }
  function syncFooterCountryWidth() {
    const select = document.querySelector("#vnAccountOverlay [data-ac-country]");
    if (!select) return;
    const selected = select.selectedOptions?.[0];
    if (!selected) return;
    const measure = document.createElement("span");
    const style = getComputedStyle(select);
    measure.textContent = selected.textContent.trim();
    measure.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0;font:" + style.font + ";letter-spacing:" + style.letterSpacing + ";";
    document.body.appendChild(measure);
    select.style.width = Math.ceil(measure.getBoundingClientRect().width + 1) + "px";
    measure.remove();
  }

  function render() {
    updateAccountAvatar();
    const root = createRoot();
    if (root.hidden) return;

    const content = $("#vnAcContent", root);
    const shell = $(".vn-ac-shell", root);
    shell?.classList.toggle("vn-ac-auth-shell", !state.user);
    shell?.classList.toggle("vn-ac-dashboard-open", Boolean(state.user));

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

    if (["dashboard", "profile", "orders", "returns", "help"].includes(state.section)) {
      content.insertAdjacentHTML("beforeend", accountFooter());
    }
    syncFooterCountryWidth();
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

        let result;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            result = await state.supabase.auth.signInWithOtp({
              email: normalizedEmail,
              options: {
                shouldCreateUser: true,
                data: { marketing_updates: state.signupMarketing }
              }
            });
            break;
          } catch (networkError) {
            const networkFailure = /failed to fetch|fetch failed|networkerror|network request failed|load failed|timed out|timeout/i.test(String(networkError?.message || networkError));
            if (!networkFailure || attempt === 1) throw networkError;
            await new Promise(resolve => window.setTimeout(resolve, 700));
          }
        }

        if (result?.error) throw result.error;

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

    if (/failed to fetch|fetch failed|networkerror|network request failed|load failed|timed out|timeout/i.test(message)) {
      return "A network error interrupted the request. Check your connection and try again. If it continues, the email provider or Supabase endpoint may be temporarily unavailable.";
    }

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
    state.otpCode = code;
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
      state.busy = false;
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
    const email = String(data.get("email") || "").trim();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      state.messageType = "error";
      state.message = "Enter a valid email address.";
      render();
      return;
    }

    const currentEmail = String(state.user.email || state.email || "").trim().toLowerCase();
    const emailChanged = email.toLowerCase() !== currentEmail;
    const profile = {
      id: state.user.id,
      first_name: String(data.get("first_name") || "").trim(),
      last_name: String(data.get("last_name") || "").trim(),
      updated_at: new Date().toISOString()
    };

    const { error } = await state.supabase.from("profiles").upsert(profile, { onConflict: "id" });
    const metadataResult = await state.supabase.auth.updateUser({ data: {
      first_name: profile.first_name, last_name: profile.last_name
    }});
    if (error && metadataResult.error) {
      state.messageType = "error";
      state.message = `Could not save your profile: ${metadataResult.error.message}`;
      render();
      return;
    }

    state.profile = { ...state.profile, ...profile };
    if (emailChanged) {
      const emailResult = await state.supabase.auth.updateUser({ email });
      if (emailResult.error) {
        state.section = "edit-contact";
        state.messageType = "error";
        state.message = `Your name was saved, but the email could not be updated: ${emailResult.error.message}`;
        render();
        return;
      }
      state.section = "profile";
      state.messageType = "success";
      state.message = "Profile updated. Check your new email address for a confirmation link to finish changing your email.";
    } else {
      state.section = "profile";
      state.messageType = "success";
      state.message = "Profile updated.";
    }
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
      id: state.user.id, marketing_updates: enabled, updated_at: new Date().toISOString()
    }, { onConflict: "id" });
    const metadataResult = await state.supabase.auth.updateUser({ data: { marketing_updates: enabled } });
    state.profile = { ...state.profile, marketing_updates: enabled };
    if (error && metadataResult.error) {
      state.messageType = "error";
      state.message = `Could not save this preference: ${metadataResult.error.message}`;
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
      state.section = "dashboard";
      state.message = "";
    }

    createRoot().hidden = false;
    render();
    document.body.style.overflow = "hidden";
    window.setTimeout(focusEntry, 30);
  }

  function goShop() {
    const currentPage = window.location.pathname.split("/").pop().toLowerCase();

    if (currentPage === "help.html") {
      window.location.href = "merch.html";
      return;
    }

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

          case "privacy-open":
          case "policy-open": {
            const policyType = action.dataset.acPolicy || "privacy";
            const policy = $(`.vn-ac-policy-overlay[data-policy-overlay="${policyType}"]`, root);
            if (policy) {
              const panel = $(".vn-ac-policy-panel", policy);
              const rect = panel.getBoundingClientRect();
              const originX = event.clientX - rect.left;
              const originY = event.clientY - rect.top;
              panel.style.setProperty("--policy-origin-x", `${originX}px`);
              panel.style.setProperty("--policy-origin-y", `${originY}px`);
              policy.classList.remove("is-open");
              policy.hidden = false;
              void panel.offsetWidth;
              requestAnimationFrame(() => policy.classList.add("is-open"));
            }
            break;
          }

          case "privacy-close":
          case "policy-close": {
            const policy = action.closest(".vn-ac-policy-overlay");
            if (policy) {
              policy.classList.remove("is-open");
              policy.hidden = true;
            }
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
    if (!input || state.busy) return;

    input.value = input.value.replace(/\D/g, "").slice(0, 1);
    const root = $("#vnAccountOverlay");
    const inputs = [...(root?.querySelectorAll("[data-otp-digit]") || [])];
    state.otpCode = inputs.map(element => element.value).join("");

    if (input.value) {
      const index = Number(input.dataset.otpDigit);
      root?.querySelector('[data-otp-digit="' + (index + 1) + '"]')?.focus();
    }

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
    state.otpCode = inputs.map(element => element.value).join("");

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
    const phoneCountry = event.target.closest("#vnAcAddressForm select[name='phone_country']");
    if (phoneCountry) {
      const option = phoneCountry.selectedOptions[0];
      const code = phoneCountry.value;
      const dialCodes = {US:"+1",CA:"+1",GB:"+44",TR:"+90",DE:"+49",FR:"+33",NL:"+31",AU:"+61",NZ:"+64",IN:"+91",JP:"+81",KR:"+82",CN:"+86",BR:"+55",MX:"+52",ES:"+34",IT:"+39",AE:"+971",SA:"+966",QA:"+974",EG:"+20",PK:"+92",BD:"+880",ID:"+62",RU:"+7",UA:"+380",SE:"+46",NO:"+47",DK:"+45",FI:"+358",CH:"+41",AT:"+43",BE:"+32",IE:"+353",PT:"+351",GR:"+30",PL:"+48",CZ:"+420",RO:"+40",ZA:"+27",NG:"+234",KE:"+254",GH:"+233"};

      const flag = event.target.closest(".vn-ac-phone-row")?.querySelector(".vn-ac-phone-flag");
      const dial = event.target.closest(".vn-ac-phone-row")?.querySelector("[data-ac-phone-dial]");
      if (flag) flag.textContent = countryFlag(code);
      if (dial) dial.textContent = dialCodes[code] || "";
      return;
    }
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
        id: state.user.id, country: state.country, updated_at: new Date().toISOString()
      }, { onConflict: "id" });
      const metadataResult = await state.supabase.auth.updateUser({ data: { country: state.country } });
      state.profile = { ...state.profile, country: state.country };
      state.messageType = error && metadataResult.error ? "error" : "";
      state.message = error && metadataResult.error
        ? `Could not save country: ${metadataResult.error.message}`
        : "";
      if (!state.message) {
        const current = document.querySelector("#vnAccountOverlay [data-ac-country]");
        if (current) current.blur();
      }
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
