
/* VN SHOP — ACCOUNT
   Email OTP, dashboard, profile, addresses, orders, returns, legal panels.
   Requires Supabase JS v2 and merch.json.
   Persistent account data requires matching Supabase tables and RLS policies.
*/
(() => {
  "use strict";

  const CONFIG = {
    configUrl: new URL("merch.json", document.currentScript.src).href,
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

  // Open the account panel immediately on click. Session/config requests must
  // never block the visible response to the profile icon.
  document.addEventListener("click", event => {
    const target = event.target;
    const trigger = target instanceof Element ? target.closest("#profile-open") : null;
    if (!trigger) return;

    event.preventDefault();

    try {
      openPanel();
    } catch (error) {
      console.error("[VN ACCOUNT] Profile panel failed to open:", error);
      try {
        createRoot().hidden = false;
        render();
      } catch (fallbackError) {
        console.error("[VN ACCOUNT] Could not render account panel:", fallbackError);
      }
      return;
    }

    // Resolve saved authentication in the background, then show the dashboard.
    // The panel is already visible even if the network/auth check is slow.
    (async () => {
      try {
        if (configPromise) await configPromise;

        if (state.supabase) {
          const { data, error } = await state.supabase.auth.getSession();
          if (error) throw error;

          const sessionUser = data?.session?.user || null;
          state.user = sessionUser;
          state.email = sessionUser?.email || "";
          state.screen = sessionUser ? "account" : "email";
        }

        if (state.user) {
          state.section = "dashboard";
          state.message = "";
        }

        render();

        if (state.user) {
          loadAccountData()
            .then(() => render())
            .catch(error => console.error("[VN ACCOUNT] Account data refresh failed:", error));
        }
      } catch (error) {
        console.error("[VN ACCOUNT] Background session refresh failed:", error);
      }
    })();
  }, true);

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const legalFallbacks = {
    refund: { title: "Refund Policy", text: "REFUND POLICY\n\n## ORDERS SHIPPING WITHIN TÜRKİYE\n\nCustomers may exercise their legal right of withdrawal within 14 days from the date they receive their order, subject to applicable law. Return requests must be submitted within this period unless a longer period is required by law or offered by VN SHOP.\n\nItems must be returned in their original condition and packaging, with any original tags and protective materials included where applicable. Customers may inspect items as reasonably necessary to establish their nature, characteristics, and functioning. These conditions do not limit any rights customers have regarding defective, damaged, incorrect, or incomplete orders.\n\nWe are unable to accept return or exchange requests for limited-edition, clearance, or sale items where permitted by applicable law. These restrictions do not apply where mandatory consumer rights require a return, refund, repair, replacement, or other remedy. Custom-made or personalized items and other items excluded from the right of withdrawal under applicable law may not be eligible for return, except where another legal obligation applies.\n\nReturn shipping costs will be handled in accordance with applicable Turkish consumer protection law and the return carrier information provided before purchase. Customers will not be charged return shipping costs where applicable law requires VN SHOP to cover them. If an item is defective, damaged, incorrect, or incomplete, please contact VN SHOP at [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com) so that the issue can be reviewed and an appropriate solution arranged.\n\nRefunds will be issued within the legally required period. Where applicable, refunds will include the original delivery costs and will be made using the original payment method without additional charges to the customer. The time it takes for a refund to appear in the customer's account may depend on the payment provider or bank.\n\n## ORDERS SHIPPING OUTSIDE TÜRKİYE\n\nCustomers may submit return requests within 30 days from the date their order is delivered, where permitted by applicable law. This voluntary return period does not limit any mandatory consumer rights available in the customer's country.\n\nItems must be returned in their original condition and packaging, with any original tags and protective materials included where applicable. Customers may inspect items as reasonably necessary to establish their nature, characteristics, and functioning. These conditions do not limit any rights customers have regarding defective, damaged, incorrect, or incomplete orders.\n\nWe are unable to accept return or exchange requests for limited-edition, clearance, or sale items where permitted by applicable law. These restrictions do not override mandatory consumer rights. Custom-made or personalized items and other items excluded from the right of withdrawal under applicable law may not be eligible for return, except where another legal obligation applies.\n\nFor international returns, customers may be responsible for return shipping costs where permitted by applicable law. If an item is defective, damaged, incorrect, or incomplete, please contact VN SHOP at [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com) before returning it so that the issue can be reviewed and an appropriate solution arranged.\n\nRefund processing times may vary depending on the payment provider, bank, and destination country. Any mandatory refund deadlines and refund obligations under applicable law will be observed.\n\n## DIGITAL MUSIC PURCHASES\n\nPurchases of downloadable or digitally delivered music are non-refundable where permitted by applicable law and where the legal requirements for excluding the right of withdrawal have been met. Where required, customers will be asked to give their express consent to begin digital delivery during the withdrawal period and acknowledge that this may result in the loss of their right of withdrawal.\n\nIf you experience trouble accessing your purchased music, please email [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com). VN SHOP will help you resolve the access issue.\n\n## DAMAGED, INCORRECT, OR INCOMPLETE ORDERS\n\nIf your order arrives damaged, contains an incorrect item, or is incomplete, please contact VN SHOP at [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com) with your order number and a description of the issue. VN SHOP will review the matter and arrange an appropriate resolution in accordance with applicable law.\n\nNothing in this policy limits any mandatory consumer rights.\n\n## EXCHANGES\n\nPlease contact VN SHOP at [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com) before attempting to exchange an item. Exchanges are subject to product availability and applicable law. Where an exchange is unavailable, an eligible return or other legally required remedy may be offered instead.\n\n## REFUND QUESTIONS\n\nFor questions about returns, exchanges, or refunds, contact [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com) and include your order number." },
    shipping: { title: "Shipping Policy", text: "SHIPPING POLICY\n\n## GENERAL ORDER INFORMATION\n\n- Please review your shipping address, billing information, product, size, and quantity carefully before completing your purchase. Once an order has been processed, changes or cancellations may no longer be possible. Any cancellation request will be reviewed in accordance with the applicable law and VN SHOP’s policies.\n- Orders can only be placed through the VN SHOP website. Orders cannot be placed over the phone.\n- If an item becomes unavailable after an order has been placed, VN SHOP will contact the customer using the email address provided with the order to discuss the available options. These may include an alternative product of equal value, if agreed by the customer, or another solution permitted by applicable law. VN SHOP will not substitute a different product without the customer's agreement. Any cancellation or refund will be handled in accordance with applicable law.\n- Products are available only in the sizes, colors, and variants listed on the website. If a size or variant is not listed, it is currently unavailable.\n- If you believe your package has been lost in transit, please contact VN SHOP at [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com) and include your order number and tracking information, if available. VN SHOP will investigate the issue with the shipping carrier and work toward an appropriate resolution in accordance with applicable law.\n\n## DAMAGED, INCORRECT, OR INCOMPLETE ORDERS\n\n- If your order arrives damaged, contains an incorrect item, or is incomplete, please contact VN SHOP at [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com) and include your order number and a description of the issue.\n- For damaged items, photographic evidence may be requested by email to help assess the issue.\n- If an item is confirmed to be damaged, incorrect, or missing, VN SHOP will review the case and arrange an appropriate solution in accordance with applicable law. Depending on the circumstances and applicable legal requirements, this may include a replacement, refund, repair, or another remedy.\n- Customers are encouraged to report visible damage or order discrepancies promptly so that VN SHOP can investigate and contact the carrier where necessary. This request does not limit any mandatory consumer rights or applicable legal deadlines.\n- VN SHOP is not responsible for damage caused by improper handling, washing, or use after delivery. This does not limit any mandatory consumer rights relating to defective or non-conforming products.\n\n## LIMITED EDITION AND PRE-ORDER SALES\n\n- Estimated preparation, shipping, and delivery dates for limited-edition items and pre-orders are estimates unless a specific timeframe is expressly guaranteed.\n- Limited-edition merchandise may be excluded from voluntary returns or exchanges where permitted by applicable law. This restriction does not override any mandatory consumer rights.\n- If a package is returned to VN SHOP because of an incorrect or incomplete address or another delivery issue, we may contact the customer by email to confirm the address and discuss redelivery options.\n- If we do not receive a response within 10 business days, VN SHOP may pause further delivery arrangements while awaiting the customer's response. Any cancellation, refund, storage, or redelivery charges will be handled only where permitted by applicable law and any applicable costs were properly disclosed.\n- These procedures also apply to limited-edition and pre-order merchandise, subject to any mandatory legal obligations.\n\n## GENERAL SHIPPING INFORMATION\n\n- Orders are generally prepared for dispatch within **2–7 business days**, depending on the order and product availability.\n- Once your order has been dispatched, tracking information will be sent to the email address provided at checkout, where tracking is available.\n- Delivery generally takes **2 days to 4 weeks after dispatch**, depending on the destination, shipping carrier, customs procedures, and other circumstances. These timeframes are estimates and are not guaranteed unless expressly stated otherwise.\n- Please ensure that your shipping address is accurate and complete at checkout. Incorrect or incomplete addresses may cause delays, failed delivery attempts, or the package being returned to VN SHOP.\n- If a delivery attempt fails because of an incorrect address or because the package cannot be received, please contact VN SHOP promptly. Where redelivery is possible, any additional shipping costs will be communicated in advance and charged only where permitted by applicable law.\n- VN SHOP will assist with shipping issues and lost-package claims in accordance with applicable law and the shipping carrier’s procedures. VN SHOP remains responsible for loss or damage to the extent required by applicable law.\n- If a package is returned to VN SHOP, we may contact the customer by email to arrange redelivery or another appropriate solution. If we do not receive a response within 10 business days, we may pause further arrangements until we receive instructions. Any refund or other resolution will be handled in accordance with applicable law.\n\n## RETURNS AND EXCHANGES\n\nFor information about return eligibility, return periods, shipping costs, and refunds, please refer to VN SHOP’s **Refund Policy**.\n\nReturn and exchange requests for limited-edition, clearance, or sale items may be restricted where permitted by applicable law. Nothing in this Shipping Policy limits any mandatory consumer rights.\n\n## DIGITAL MUSIC PURCHASES\n\nPurchases of downloadable or digitally delivered music are non-refundable where permitted by applicable law and where the legal requirements for excluding the right of withdrawal have been met.\n\nIf you experience difficulty accessing purchased music, please contact [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com). VN SHOP will help resolve the access issue.\n\n## CONTACT\n\nFor shipping questions, delivery issues, or lost-package claims, contact:\n\n**Email:** [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com)\n\nPlease include your order number so that we can review your request." },
    privacy: { title: "Privacy Policy", text: "PRIVACY POLICY\n\n## INTRODUCTION\n\nVN SHOP — powered by 9ojeez9 (“VN SHOP,” “we,” “us,” or “our”) respects your privacy and is committed to protecting the personal information you share with us when visiting our website, creating an account, purchasing products, subscribing to marketing communications, or contacting us.\n\nThis Privacy Policy explains what information we collect, how we use and share it, how long we retain it, and the choices available to you regarding your information.\n\nBy using our website, you acknowledge that your information may be handled as described in this Privacy Policy, subject to applicable law.\n\n## WHO WE ARE\n\nVN SHOP operates within the VN ecosystem associated with VN RECORDS and the VNION brand structure. Our website provides access to merchandise, products, and related services.\n\nOur website is hosted through GitHub Pages and may use third-party services to support website functionality, analytics, payments, shipping, customer accounts, and communications.\n\nThis Privacy Policy applies to information collected through the VN SHOP website and through your interactions with our shop and related customer services.\n\n## CONTACT US\n\nIf you have questions about this Privacy Policy, your personal information, or your privacy choices, you may contact us at:\n\n**Email:** [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com)\n\n**Website:** https://ojee9.github.io/\n\n## INFORMATION WE COLLECT\n\nThe information we collect depends on how you interact with VN SHOP, the information you choose to provide, and the services enabled on the website.\n\n| Category | Information that may be collected | How it may be collected |\n|---|---|---|\n| Contact information | Name, email address, telephone number, and shipping or billing address | When placing an order, creating an account, or contacting us |\n| Account information | Login credentials and account-related preferences | When registering for or using a customer account |\n| Order information | Products purchased, quantities, order totals, order status, and transaction references | When placing or managing an order |\n| Payment information | Payment status, transaction identifiers, and information required to process a payment | Through checkout and third-party payment providers |\n| Shipping information | Delivery address, shipment status, tracking details, and delivery-related information | When an order is prepared, dispatched, or delivered |\n| Marketing information | Email subscription status and communication preferences | When subscribing to marketing communications or changing your preferences |\n| Website usage information | Pages visited, interactions, referral information, approximate location derived from technical data, and website performance information | Through website analytics and similar technologies, where enabled |\n| Technical information | IP address, browser type, device information, operating system, timestamps, and technical logs | Automatically through website hosting, security, analytics, and related services |\n| Cookie and preference information | Cookie identifiers and saved preferences concerning available website technologies | Through cookies, browser storage, and the website's cookie-choice interface |\n| Communications | Messages, enquiries, feedback, and information you choose to include in communications | When contacting us or responding to our communications |\n\nWe may receive certain information from third-party service providers involved in payment processing, shipping, website hosting, analytics, and other services necessary to operate the shop.\n\nWe do not intentionally request payment card security details to be sent to us directly by email. Payment information is processed through the payment provider selected during checkout, subject to that provider's own terms and privacy practices.\n\n## HOW YOUR INFORMATION MAY BE USED\n\nWe may use the information described above for the following purposes:\n\n- To create and manage customer accounts.\n- To process orders, payments, refunds, returns, and other purchase-related requests.\n- To arrange shipping, provide delivery updates, and communicate order status.\n- To provide customer support and respond to enquiries.\n- To send transactional and service-related communications.\n- To send marketing emails where applicable and in accordance with your preferences and applicable law.\n- To understand how visitors use the website and measure website performance through analytics.\n- To maintain website functionality, security, reliability, and performance.\n- To detect, prevent, and investigate fraud, abuse, unauthorised activity, or other security issues.\n- To maintain business records and comply with applicable legal obligations.\n- To establish, exercise, or defend legal claims.\n- To administer and improve our products, services, and customer experience.\n\nWe process personal information only for purposes relevant to our operations and subject to applicable legal requirements.\n\n## HOW YOUR INFORMATION MAY BE SHARED\n\nWe may share information with third parties when reasonably necessary to operate VN SHOP, fulfil orders, provide services, or meet legal obligations.\n\nThese parties may include:\n\n- **Payment providers:** To process payments, refunds, and payment-related transactions.\n- **Shipping and delivery providers:** To dispatch orders and deliver products to the addresses provided.\n- **Website hosting and technical service providers:** To host, maintain, secure, and support the website.\n- **Analytics and tag-management providers:** Including Google Analytics and Google Tag Manager, as configured on the website, to help measure website usage and manage website tags.\n- **Email and communication service providers:** Where used to deliver transactional or marketing communications.\n- **Professional advisers and authorities:** Where disclosure is reasonably necessary to comply with law, protect rights, investigate suspected wrongdoing, or respond to valid legal requests.\n- **Business successors:** In connection with a potential or completed transfer, restructuring, or other transaction involving the relevant business or its assets, subject to applicable law.\n\nThird-party providers may process information under their own privacy policies and terms. Where required, we take appropriate steps to ensure information is handled in accordance with applicable legal requirements.\n\nWe do not state that we sell personal information or share it for cross-context behavioural advertising unless such practices are separately implemented and disclosed.\n\n## STORAGE AND RETENTION OF INFORMATION\n\nWe retain personal information for as long as reasonably necessary to fulfil the purposes described in this Privacy Policy, including processing orders, maintaining customer accounts, providing support, managing returns and disputes, maintaining business records, and complying with legal obligations.\n\nRetention periods may vary depending on the type of information, the reason it was collected, the services involved, and applicable legal requirements.\n\nOrder, payment, and transaction records may be retained for accounting, tax, fraud prevention, dispute resolution, and other legitimate recordkeeping purposes.\n\nAccount and communication information may be retained while needed to provide the relevant service or address outstanding matters. Marketing information may be retained until you unsubscribe or it is no longer needed for the relevant purpose, subject to applicable law.\n\nTechnical logs, analytics information, cookies, and similar identifiers may be retained according to the settings and retention policies of the relevant service providers.\n\nWhen information is no longer reasonably required, we will take appropriate steps to delete it, anonymise it, or otherwise handle it in accordance with applicable requirements and the capabilities of the relevant systems.\n\n## CHILDREN\n\nVN SHOP is not intended for children who are not legally able to make purchases or provide consent where consent is required by law.\n\nWe do not knowingly collect personal information from children in circumstances where such collection is prohibited. If you believe a child has provided personal information to us inappropriately, please contact us at [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com) so that we can review the matter and take appropriate action.\n\n## YOUR RIGHTS\n\nDepending on your location and applicable law, you may have rights concerning your personal information. These may include the right to:\n\n- Request access to personal information we hold about you.\n- Request correction of inaccurate or incomplete information.\n- Request deletion of personal information, where applicable.\n- Request restriction of or object to certain processing activities.\n- Withdraw consent where processing is based on consent.\n- Request a copy of certain information in a portable format, where applicable.\n- Opt out of marketing communications.\n- Lodge a complaint with the relevant data protection authority.\n\nTo exercise a privacy right, contact us at [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com). We may need to verify your identity before responding to certain requests.\n\nWe will review and respond to requests in accordance with applicable law. Some information may need to be retained where required by law or where a valid legal basis for retention applies.\n\nYou may unsubscribe from marketing emails by using the unsubscribe instructions included in the relevant message or by contacting us. Opting out of marketing communications does not stop essential transactional or service-related messages, such as order confirmations, shipping updates, or account notifications.\n\nYou may also manage available cookie preferences through the website's cookie-choice interface and through your browser settings.\n\n## INTERNATIONAL DATA TRANSFERS\n\nVN SHOP may use third-party service providers whose systems or infrastructure are located in countries other than the country in which you reside. As a result, your information may be processed or stored internationally.\n\nWhere applicable law requires safeguards for international transfers of personal information, appropriate measures must be used in accordance with those legal requirements.\n\nThe privacy and data-protection laws of the destination country may differ from those in your country of residence. Third-party providers may also process information under their own privacy policies and contractual commitments.\n\n## DISPUTE RESOLUTION\n\nIf you have a concern or complaint about how your personal information is handled, please contact us at [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com) so that we can review the issue.\n\nNothing in this section limits any rights or remedies available to you under applicable law, including the right to contact a competent data protection authority or pursue a legal remedy where available.\n\n## CHANGES TO OUR PRIVACY POLICY\n\nWe may update this Privacy Policy from time to time to reflect changes in our website, services, technology, business operations, or applicable legal requirements.\n\nWhen changes are made, the revised version will be published on the website with an updated effective or revision date where appropriate. Your continued use of the website after an updated policy is published is subject to the revised policy to the extent permitted by applicable law.\n\nWe encourage visitors to review this page periodically to remain informed about how their information is handled.\n\n## DIGITAL ADVERTISING\n\nVN SHOP uses Google Analytics to understand how visitors interact with the website and to measure website performance. Google Tag Manager is used to manage and configure website tags and integrated measurement services.\n\nDepending on the services enabled and the visitor's consent choices, these technologies may process technical information, website interaction data, and identifiers associated with browser activity.\n\nVN SHOP's cookie-choice interface allows visitors to manage the cookie preferences made available on the website. Where consent is required, applicable Google tags and other non-essential tracking technologies must operate in accordance with the visitor's recorded choices.\n\nVN SHOP does not represent that it uses personalised advertising, advertising networks, cross-site advertising profiles, or lookalike audiences unless those practices are separately implemented and disclosed.\n\nVisitors may manage available cookie preferences through the website's cookie-choice interface. Marketing email recipients may unsubscribe using the instructions included in the relevant message or by contacting [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com).\n\nUnsubscribing from marketing communications does not prevent necessary transactional communications, including order confirmations, shipping updates, account notifications, and service-related messages.\n\n## COOKIES\n\nVN SHOP uses a cookie-choice interface to provide visitors with information about available cookie preferences and allow them to manage their choices.\n\nThe website may use cookies and similar technologies for essential functionality, security, preferences, website analytics, and other services enabled on the website. These technologies may include browser cookies, scripts, tags, pixels, and similar identifiers.\n\nGoogle Analytics and Google Tag Manager may be involved in website measurement and tag management. The information collected and the technologies activated depend on the website's configuration and the visitor's consent choices.\n\nWhere applicable law requires consent for non-essential cookies or similar technologies, those technologies must not be activated in a manner that bypasses the required consent. The website's tag configuration must respect the choices recorded through the cookie interface.\n\nVisitors may revisit the cookie-choice interface to change their available preferences. They may also manage or delete cookies through their browser settings, although disabling certain technologies may affect website functionality.\n\nDeleting cookies or using a different browser or device may reset previously saved preferences.\n\nFor additional information about the data collected by Google services, visitors may review Google's applicable privacy documentation: [https://policies.google.com/privacy](https://policies.google.com/privacy) and [https://policies.google.com/technologies/cookies](https://policies.google.com/technologies/cookies)." }
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
      .vn-ac-shell{width:min(100%,980px);max-height:calc(100dvh - 48px);overflow:auto;margin:auto;padding:28px;background:#BFC5C8;border:1px solid #d8d8d8;box-shadow:0 24px 80px rgba(0,0,0,.25)}
      .vn-ac-shell.vn-ac-auth-shell{display:flex;flex-direction:column;width:min(100%,640px);min-height:480px;max-height:calc(100dvh - 28px);padding:44px 56px 38px;background:#171717;color:#f5f5f5;border:0;box-shadow:0 28px 90px rgba(0,0,0,.42)}
      .vn-ac-header{position:relative;display:flex;justify-content:center;align-items:center;padding-bottom:24px;border-bottom:1px solid #e5e5e5}
      .vn-ac-auth-shell .vn-ac-header{padding:0 32px 22px;border:0}
      .vn-ac-brand{display:flex;align-items:center;justify-content:center;width:164px;height:80px;color:inherit;text-decoration:none;user-select:none;-webkit-user-select:none;pointer-events:none}
      .vn-ac-brand img{display:block;width:100%;height:100%;object-fit:contain;filter:invert(1);user-select:none;-webkit-user-select:none;-webkit-user-drag:none}
      .vn-ac-close{position:absolute;right:0;top:50%;transform:translateY(-50%);border:0;background:none;font-size:23px;cursor:pointer;color:inherit}
      .vn-ac-auth-shell .vn-ac-close{top:12px;right:12px;transform:none;display:flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;color:#f5f5f5;font-size:28px;line-height:1}
      .vn-ac-auth-shell .vn-ac-main{width:100%;max-width:100%;margin:10px auto 0!important}
      .vn-ac-auth-shell .vn-ac-header{padding:0 28px 22px}
      .vn-ac-auth-shell .vn-ac-brand{width:176px;height:82px;pointer-events:none;user-select:none}
      .vn-ac-auth-shell .vn-ac-brand img{filter:brightness(0) invert(1)}
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
      .vn-ac-email-bar input:-webkit-autofill,.vn-ac-email-bar input:-webkit-autofill:hover,.vn-ac-email-bar input:-webkit-autofill:focus,.vn-ac-email-bar input:-webkit-autofill:active{-webkit-text-fill-color:#f5f5f5!important;caret-color:#f5f5f5;-webkit-box-shadow:0 0 0 1000px #101010 inset!important;box-shadow:0 0 0 1000px #101010 inset!important;transition:background-color 999999s ease-out 0s}
      .vn-ac-email-bar:focus-within{border-color:#bdbdbd;background:#111}
      .vn-ac-email-submit{display:flex;align-items:center;justify-content:center;width:44px;height:44px;flex:none;padding:0;border:0;border-radius:0;background:transparent;color:#f5f5f5;cursor:pointer;transition:color .16s ease,background .16s ease}
      .vn-ac-email-submit:hover{background:#242424;color:#fff}.vn-ac-email-submit svg{display:block;width:20px;height:20px}
      .vn-ac-updates{display:flex;align-items:center;justify-content:flex-start;gap:8px;margin:13px 0 0;padding-left:15px;color:#c5c1ca;font-size:13px;line-height:1.45}
      .vn-ac-updates input{width:15px;height:15px;flex:none;margin:0;accent-color:#f5f5f5;cursor:pointer}
      .vn-ac-email-terms{margin:22px auto 0!important;max-width:420px;text-align:center;color:#8d8d8d;font-size:12px;line-height:1.6}
      .vn-ac-email-terms a,.vn-ac-email-terms button{padding:0;border:0;background:transparent;color:#fff;font:inherit;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
      .vn-ac-auth-shell .vn-ac-message{margin:0 0 12px}
      @media(max-width:600px){.vn-ac-shell.vn-ac-auth-shell{width:min(100%,540px);min-height:420px;padding:30px 24px 26px}.vn-ac-auth-shell .vn-ac-close{right:-10px}.vn-ac-auth-shell .vn-ac-brand{width:158px;height:74px}.vn-ac-signin-heading h1{font-size:27px}.vn-ac-signin-heading p{font-size:13px}.vn-ac-email-form-wrap,.vn-ac-or-divider{width:100%;max-width:420px}.vn-ac-email-bar{min-height:56px;padding-left:14px}.vn-ac-email-bar input{height:42px;font-size:16px}.vn-ac-email-submit{width:42px;height:42px}.vn-ac-email-submit svg{display:block;width:20px;height:20px}.vn-ac-shop-space{height:32px}.vn-ac-updates{font-size:12px}}
      .vn-ac-layout{display:grid;grid-template-columns:200px minmax(0,1fr);gap:48px;padding-top:32px}
      .vn-ac-sidebar{display:flex;flex-direction:column;gap:8px}
      .vn-ac-nav{border:0;background:none;color:#666;text-align:left;padding:12px 10px;font:inherit;cursor:pointer;border-radius:4px}
      .vn-ac-nav.active{color:#111;background:#f3f3f3;font-weight:700}
      .vn-ac-main:has(button[data-ac-section="orders"]) > .vn-ac-subtitle{color:#000}
      .vn-ac-sidebar .vn-ac-nav[data-ac-section="dashboard"],
      .vn-ac-sidebar .vn-ac-nav[data-ac-section="shop"]{color:#000}
      .vn-ac-shell.vn-ac-dashboard-open .vn-ac-footer-policies .vn-ac-legal-item{color:#000}
      .vn-ac-shell.vn-ac-dashboard-open .vn-ac-footer-policies .vn-ac-legal-item:hover{color:#000}
      .vn-ac-main{min-width:0;max-width:760px}
      .vn-ac-main h1{font-size:25px;letter-spacing:-.025em;margin:0 0 8px}
      .vn-ac-subtitle{color:#777;margin:0 0 28px}
      .vn-ac-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;background:#BFC5C8}
      .vn-ac-card{border:1px solid #151515;border-radius:5px;padding:22px;min-height:135px;display:flex;flex-direction:column;align-items:flex-start;text-align:left;background:#000;color:#fff;cursor:pointer}
      .vn-ac-card strong{font-size:13px;letter-spacing:.045em;margin-bottom:9px;color:#fff}
      .vn-ac-card span{font-size:13px;color:#fff}
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
      .vn-ac-otp input:focus,.vn-ac-otp input:focus-visible{outline:none;outline-offset:0;border-color:#4a4a4a;box-shadow:none}
      .vn-ac-auth-shell .vn-ac-verify-main{margin:10px auto 0!important;width:100%;max-width:100%}
      .vn-ac-verify-main h1{margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:-.02em;color:#f5f5f5}
      .vn-ac-verify-main .vn-ac-sent-to{margin:0;color:#bdbdbd;font-size:12px}
      .vn-ac-inline-change{padding:0 0 0 3px;border:0;background:none;color:#f5f5f5;font:inherit;text-decoration:underline;cursor:pointer}
      
      #vnAccountOverlay{flex-direction:column;gap:13px}
      .vn-ac-policy-body h3{margin:22px 0 9px;font-size:15px;font-weight:700;line-height:1.4}.vn-ac-policy-body p{margin:0 0 13px}.vn-ac-policy-body ul{margin:0 0 15px;padding-left:22px}.vn-ac-policy-body li{margin:0 0 7px}.vn-ac-policy-body a{color:inherit;text-decoration:underline;overflow-wrap:anywhere}.vn-ac-policy-table-wrap{max-width:100%;overflow-x:auto;margin:14px 0 20px}.vn-ac-policy-table{width:100%;border-collapse:collapse;font-size:12px;line-height:1.45}.vn-ac-policy-table th,.vn-ac-policy-table td{padding:9px;border:1px solid #ddd;text-align:left;vertical-align:top}.vn-ac-policy-table th{font-weight:700}
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
      .vn-ac-phone-flag{position:absolute;z-index:2;right:11px;top:50%;transform:translateY(-50%);display:block;width:22px;height:16px;object-fit:cover;border:1px solid rgba(0,0,0,.12);border-radius:2px;pointer-events:none}
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
      .vn-ac-orders-empty{background:#000;border-color:#000;color:#fff}
      .vn-ac-orders-empty h1,.vn-ac-orders-empty h2,.vn-ac-orders-empty h3,.vn-ac-orders-empty p{color:#fff}
      .vn-ac-orders-empty .vn-ac-button{background:#fff;color:#000;border-color:#fff}
      /* One fixed-size dashboard shell for every signed-in section, including views without .vn-ac-layout. */
      .vn-ac-shell.vn-ac-dashboard-open{
        background:#BFC5C8;
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
          <div class="vn-ac-brand" aria-label="VN"><img src="/images/vn-logo-official.png" alt="VN"></div>
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
          <a href="#" data-ac-action="privacy-open" data-ac-policy="privacy">Privacy Policy</a>
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
          <div class="vn-ac-otp-loading" role="status" aria-live="polite" ${state.busy ? "" : "hidden"}><span class="vn-ac-otp-spinner" aria-label="Verifying code"></span></div>
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
    const countryCodes = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
    const dialCodes = {"AD":"+376","AE":"+971","AF":"+93","AG":"+1","AI":"+1","AL":"+355","AM":"+374","AO":"+244","AQ":"+672","AR":"+54","AS":"+1","AT":"+43","AU":"+61","AW":"+297","AX":"+358","AZ":"+994","BA":"+387","BB":"+1","BD":"+880","BE":"+32","BF":"+226","BG":"+359","BH":"+973","BI":"+257","BJ":"+229","BL":"+590","BM":"+1","BN":"+673","BO":"+591","BQ":"+599","BR":"+55","BS":"+1","BT":"+975","BV":"+47","BW":"+267","BY":"+375","BZ":"+501","CA":"+1","CC":"+61","CD":"+243","CF":"+236","CG":"+242","CH":"+41","CI":"+225","CK":"+682","CL":"+56","CM":"+237","CN":"+86","CO":"+57","CR":"+506","CU":"+53","CV":"+238","CW":"+599","CX":"+61","CY":"+357","CZ":"+420","DE":"+49","DJ":"+253","DK":"+45","DM":"+1","DO":"+1","DZ":"+213","EC":"+593","EE":"+372","EG":"+20","EH":"+212","ER":"+291","ES":"+34","ET":"+251","FI":"+358","FJ":"+679","FK":"+500","FM":"+691","FO":"+298","FR":"+33","GA":"+241","GB":"+44","GD":"+1","GE":"+995","GF":"+594","GG":"+44","GH":"+233","GI":"+350","GL":"+299","GM":"+220","GN":"+224","GP":"+590","GQ":"+240","GR":"+30","GT":"+502","GU":"+1","GW":"+245","GY":"+592","HK":"+852","HN":"+504","HR":"+385","HT":"+509","HU":"+36","ID":"+62","IE":"+353","IL":"+972","IM":"+44","IN":"+91","IO":"+246","IQ":"+964","IR":"+98","IS":"+354","IT":"+39","JE":"+44","JM":"+1","JO":"+962","JP":"+81","KE":"+254","KG":"+996","KH":"+855","KI":"+686","KM":"+269","KN":"+1","KP":"+850","KR":"+82","KW":"+965","KY":"+1","KZ":"+7","LA":"+856","LB":"+961","LC":"+1","LI":"+423","LK":"+94","LR":"+231","LS":"+266","LT":"+370","LU":"+352","LV":"+371","LY":"+218","MA":"+212","MC":"+377","MD":"+373","ME":"+382","MF":"+590","MG":"+261","MH":"+692","MK":"+389","ML":"+223","MM":"+95","MN":"+976","MO":"+853","MP":"+1","MQ":"+596","MR":"+222","MS":"+1","MT":"+356","MU":"+230","MV":"+960","MW":"+265","MX":"+52","MY":"+60","MZ":"+258","NA":"+264","NC":"+687","NE":"+227","NF":"+672","NG":"+234","NI":"+505","NL":"+31","NO":"+47","NP":"+977","NR":"+674","NU":"+683","NZ":"+64","OM":"+968","PA":"+507","PE":"+51","PF":"+689","PG":"+675","PH":"+63","PK":"+92","PL":"+48","PM":"+508","PN":"+64","PR":"+1","PS":"+970","PT":"+351","PW":"+680","PY":"+595","QA":"+974","RE":"+262","RO":"+40","RS":"+381","RU":"+7","RW":"+250","SA":"+966","SB":"+677","SC":"+248","SD":"+249","SE":"+46","SG":"+65","SH":"+290","SI":"+386","SJ":"+47","SK":"+421","SL":"+232","SM":"+378","SN":"+221","SO":"+252","SR":"+597","SS":"+211","ST":"+239","SV":"+503","SX":"+1","SY":"+963","SZ":"+268","TC":"+1","TD":"+235","TG":"+228","TH":"+66","TJ":"+992","TK":"+690","TL":"+670","TM":"+993","TN":"+216","TO":"+676","TR":"+90","TT":"+1","TV":"+688","TW":"+886","TZ":"+255","UA":"+380","UG":"+256","UM":"+1","US":"+1","UY":"+598","UZ":"+998","VA":"+39","VC":"+1","VE":"+58","VG":"+1","VI":"+1","VN":"+84","VU":"+678","WF":"+681","WS":"+685","YE":"+967","YT":"+262","ZA":"+27","ZM":"+260","ZW":"+263"};
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    const dialSelect = countryCodes.map(code => `<option value="${code}" data-dial="${dialCodes[code] || ""}" ${code === (state.country || "TR") ? "selected" : ""}>${regionNames.of(code) || code} ${dialCodes[code] || "—"}</option>`).join("");
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
            <label class="vn-ac-address-control"><span>Phone</span><div class="vn-ac-phone-row"><span class="vn-ac-phone-dial" data-ac-phone-dial>${selectedDial}</span><input name="phone" type="tel" placeholder="Phone" autocomplete="tel-national"><select name="phone_country" aria-label="Phone country" title="Select phone country">${dialSelect}</select><img class="vn-ac-phone-flag" src="https://flagcdn.com/w40/${(state.country || "TR").toLowerCase()}.png" alt="" aria-hidden="true" loading="eager"></div></label>
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

  legalFallbacks.terms = {
    title: "Terms of Use",
    text: "# TERMS OF USE\n\n**VN SHOP — powered by 9ojeez9**\n\n*Last updated: October 28, 2026*\n\n## 1. General\n\n1. These Terms and Conditions (“Terms”) govern your use of the VN SHOP website (“Website” or “Shop”) and the services made available through it. “You” and “your” refer to each visitor or customer. “VN SHOP,” “we,” “us,” and “our” refer to VN SHOP — powered by 9ojeez9, operating within the VN RECORDS and VNION brand ecosystem.\n\n2. By accessing the Website, creating an account, or placing an order, you acknowledge that you have read and agree to these Terms and the applicable policies published on the Website, including our Privacy Policy, Refund Policy, and Shipping Policy. If you do not agree to these Terms, you should not use the Website or place an order.\n\n3. Orders must be placed through the Website's available ordering and checkout process. We do not accept orders through other channels unless expressly stated.\n\n4. You are encouraged to keep a copy of these Terms for future reference.\n\n5. If you have questions about these Terms, contact us at **recordsvunion@gmail.com**.\n\n6. Placing an order may require the use of third-party services, including payment providers. Your use of those services may also be subject to their own terms and conditions.\n\n## 2. Changes to These Terms\n\n1. We may update these Terms from time to time. Revised Terms become effective when published on the Website, unless otherwise stated or required by applicable law. You should review this page periodically.\n\n2. The Terms applicable to an order are generally those in effect when the order is placed, subject to any changes required by law or a competent authority.\n\n## 3. Website Content and Intellectual Property\n\n1. The Website and its content, including names, logos, artwork, graphics, photographs, designs, text, music, recordings, audiovisual material, digital products, and other creative works (“Content”), may be owned by or licensed to VN RECORDS, VNION, VN SHOP, 9ojeez9, or their respective rights holders.\n\n2. Unless otherwise stated, the Website and its Content are provided for personal, non-commercial use. Purchasing a product does not transfer ownership of the underlying intellectual property or grant permission to commercially exploit the Content.\n\n3. You may not reproduce, distribute, publicly display, modify, sell, sublicense, or otherwise exploit the Website or its Content without the prior written permission of the relevant rights holder, except where permitted by applicable law.\n\n4. All rights not expressly granted to you remain with the relevant rights holders.\n\n## 4. Acceptable Use\n\nYou agree not to:\n\n- Restrict or interfere with another person's use of the Website.\n- Damage, disable, overload, disrupt, or impair the Website or its services.\n- Upload, transmit, or distribute malicious code or other harmful material.\n- Publish unlawful, defamatory, misleading, or infringing material through any feature made available by the Website.\n- Impersonate another person or misrepresent your affiliation with any person, brand, or organisation.\n- Collect personal information belonging to other users without lawful authorisation.\n- Use automated scraping, harvesting, or similar methods to obtain information from the Website in a manner that is unauthorised or prohibited by law.\n- Attempt to gain unauthorised access to accounts, systems, or restricted areas.\n- Use the Website, its Content, or its services for unlawful purposes.\n- Copy, resell, or commercially exploit the Website or its services without permission.\n\nWe may take reasonable measures to protect the Website, its users, and our rights where misuse is suspected.\n\n## 5. Software and Third-Party Services\n\n1. The Website may rely on third-party software, hosting, payment processing, analytics, account-management, or other technical services.\n\n2. You may use these services only as permitted by applicable law and the relevant provider's terms.\n\n3. You must not attempt to bypass security measures, interfere with technical systems, reverse engineer third-party software where prohibited, or access systems or information without authorisation.\n\n4. Third-party services may be subject to separate terms, privacy policies, availability limits, and technical requirements. We do not control every aspect of those services.\n\n## 6. Registration and Passwords\n\n1. If the Website offers customer accounts, you must provide accurate information when registering and keep your account details up to date.\n\n2. You are responsible for maintaining the confidentiality of your password and account credentials and for activity carried out through your account, subject to applicable law.\n\n3. You should notify us promptly at **recordsvunion@gmail.com** if you become aware of unauthorised access to your account or a security concern relating to it.\n\n4. You must not access another person's account without permission.\n\n5. We may restrict or suspend account access where reasonably necessary for security, suspected misuse, breach of these Terms, or compliance with applicable law.\n\n6. You are responsible for having a compatible device, internet connection, and browser capable of accessing the Website. Some features may depend on JavaScript, cookies, or third-party services.\n\n7. Information about how we collect and use personal information and cookies is explained in our Privacy Policy.\n\n## 7. Products\n\n1. VN SHOP may offer products such as clothing, accessories, posters, physical music products, digital music, gift cards, and other merchandise or creative products. The products actually available are those displayed on the Website.\n\n2. Product availability, sizes, colours, variants, and specifications are limited to the options shown on the relevant product page.\n\n3. Product images are provided to illustrate the products. Reasonable differences in colour or appearance may occur due to display settings, production variations, or other circumstances.\n\n4. Where a product is offered as a limited edition, preorder, or made-to-order item, any special conditions and estimated fulfilment information displayed on the product page will apply, subject to applicable law.\n\n5. We may add, remove, modify, or discontinue products and product options. Changes will not override rights already granted to customers under applicable law.\n\n6. Digital products, where offered, are subject to the access and usage conditions stated on the relevant product page and at checkout.\n\n## 8. Placing an Order\n\n1. By placing an order, you confirm that you are legally capable of entering into a binding contract under the laws applicable to you. If you are not legally able to enter into such a contract independently, the required parent, guardian, or legal representative must act as required by applicable law.\n\n2. Follow the instructions displayed on the Website to select products, review your order, provide the required information, and complete checkout.\n\n3. Products selected for purchase may be placed in a shopping cart or equivalent checkout area. You can review and, where available, amend your selection before submitting your order.\n\n4. Before completing checkout, you should check your product selection, quantities, delivery details, payment method, and the total amount payable.\n\n5. When placing an order, you must provide accurate and complete information necessary to process the purchase and deliver the products.\n\n6. An order confirmation indicates that your order has been received. It does not necessarily mean that the order has been accepted or dispatched.\n\n7. We may need to review, reject, or cancel an order where there is a genuine issue involving availability, pricing, payment authorisation, inaccurate information, suspected fraud, a technical error, or another legitimate reason. Where payment has been taken for an order that is cancelled, the applicable refund will be processed in accordance with our Refund Policy and applicable law.\n\n8. Once an order has entered processing or has been dispatched, changes to the products, quantities, or delivery address may not be possible. Contact us promptly if you identify an error. Any cancellation or change remains subject to the applicable policy and your statutory rights.\n\n9. Order preparation generally takes **2–7 business days**. Delivery after dispatch may take approximately **2 days to 4 weeks**, depending on the destination, carrier, customs procedures, and other circumstances. These are estimates, not guaranteed delivery dates. Any mandatory statutory delivery deadlines remain applicable.\n\n10. Where tracking is available, tracking information may be provided after dispatch.\n\n11. You are responsible for providing a complete and accurate delivery address. Incorrect or incomplete address details may cause delays, failed delivery, or additional shipping arrangements.\n\n12. If a shipment is returned, delayed, or cannot be delivered, we may contact you using the details provided with your order to determine the appropriate next steps, subject to applicable law.\n\n13. If an order contains multiple products, availability or fulfilment requirements may affect whether the products are dispatched together or separately. Any applicable shipping charges and arrangements will be communicated through the Website or checkout where relevant.\n\n## 9. General Disclaimers and Promotions\n\n1. Product prices, discounts, promotional offers, and stock availability are displayed on the Website. Unless otherwise stated, the price and terms shown at checkout apply to the order.\n\n2. We may correct obvious listing or pricing errors and may cancel an affected order where permitted by applicable law. If payment has already been taken for an order that cannot be fulfilled, the applicable refund will be processed.\n\n3. Promotions are subject to the conditions displayed with the relevant offer, including any eligibility requirements, duration, stock limitations, or restrictions on combining offers.\n\n4. We may modify or withdraw a promotion where permitted by applicable law. Changes will not remove rights that have already accrued to a customer under applicable law.\n\n5. Nothing in these Terms excludes any mandatory consumer protection or other legal right that cannot lawfully be excluded.\n\n## 10. Payment\n\n1. Available payment methods are those presented at checkout. Payment processing may be provided by third-party payment providers.\n\n2. By submitting a payment, you confirm that you are authorised to use the selected payment method.\n\n3. Product prices and any applicable shipping charges, taxes, or other fees will be presented at checkout as required by applicable law.\n\n4. We may correct pricing errors before fulfilling an order where permitted by law. If a material error affects your order, we may contact you to resolve it or cancel the affected order and arrange any required refund.\n\n5. Payment authorisation, collection, settlement, and refunds may be handled by the relevant payment provider according to its procedures.\n\n6. Payment providers may process payment information under their own privacy policies and security practices. We do not intend to collect or store full payment card security details directly where these are handled by the payment provider.\n\n7. We may take reasonable steps to detect and prevent fraudulent or unauthorised transactions. An order may be delayed, reviewed, or cancelled if there are reasonable grounds to suspect fraud or a payment problem, subject to applicable law.\n\n## 11. Cancellation, Delivery, and Usage Rules\n\n### 11.1. Digital Products\n\n**i. Cancellation and Withdrawal**\n\nDigital downloads and other digital content are subject to the conditions stated on the relevant product page and at checkout, as well as applicable law.\n\nWhere permitted by applicable law, digital content that has been supplied or made available for immediate access may be non-refundable once delivery or access has begun, provided that any legally required express consent, acknowledgement, and prior information concerning the loss of the right of withdrawal have been obtained.\n\nNothing in these Terms removes a mandatory right to cancel, withdraw, or obtain a refund where such a right applies.\n\n**ii. Delivery and Access**\n\nDigital products, where available, will be delivered or made accessible using the method described on the relevant product page or during checkout. Access may depend on successful payment, account access, technical compatibility, or instructions provided by the Website.\n\n**iii. Usage Rules**\n\nUnless a separate written licence states otherwise, digital products are licensed for personal, non-commercial use only. Purchasing or downloading a digital product does not transfer copyright or other intellectual property rights.\n\nYou may not redistribute, resell, publicly share, commercially exploit, or create unauthorised derivative works from digital products.\n\n**iv. Technical Problems and Defective Digital Products**\n\nIf a digital product is inaccessible, defective, or materially different from its description, contact us at **recordsvunion@gmail.com**. We will review the issue and provide an appropriate remedy in accordance with the applicable policy and law.\n\n### 11.2. Physical Products\n\n**i. Cancellation and Returns**\n\nFor orders delivered within Türkiye, consumers may exercise the applicable statutory right of withdrawal within **14 days of receiving the product**, subject to the conditions and exceptions established by applicable law. A withdrawal notice may be sent to **recordsvunion@gmail.com** within the applicable period.\n\nProducts should be returned in accordance with the instructions provided by us and the requirements of applicable law. Where relevant, products should be returned with their original packaging, tags, and included accessories, and should not have been worn, washed, or altered beyond what is legally permitted for inspection.\n\nAny exceptions for customised or personalised products, opened sealed products, digital content, or other legally excluded categories apply only to the extent recognised by applicable law. A product's limited-edition, discounted, clearance, or sale status does not by itself remove a mandatory consumer right.\n\nFor international orders, VN SHOP offers a voluntary return period of **30 days from delivery**, where permitted by law and subject to the applicable Refund Policy. This voluntary return period does not replace or restrict any longer or otherwise mandatory rights available to the customer.\n\nReturn shipping costs and arrangements are governed by the Refund Policy and applicable law. Customers will not be charged return costs where applicable law prohibits those charges.\n\n**ii. Delivery**\n\nWe aim to prepare orders within approximately **2–7 business days**. Delivery after dispatch may take approximately **2 days to 4 weeks**. Actual delivery times depend on the shipping destination, carrier, customs procedures, and other circumstances.\n\nThese estimates do not override mandatory statutory delivery deadlines or remedies available when an order is not delivered as required by law.\n\n**iii. Risk and Ownership**\n\nOwnership of a purchased product transfers in accordance with applicable law and the terms governing the transaction. Nothing in these Terms removes any mandatory rights you may have concerning loss, damage, delivery, or ownership.\n\n## 12. Damaged, Incorrect, or Incomplete Orders\n\n1. If an order arrives damaged, incorrect, or incomplete, contact **recordsvunion@gmail.com** and include your order number and a description of the issue.\n\n2. Where reasonably possible, provide photographs or other information that helps us assess the issue. We may request additional details where necessary.\n\n3. We will review the claim and arrange an appropriate solution, which may include a replacement, repair, return, or refund, depending on the circumstances, the applicable policy, and applicable law.\n\n4. Please retain the affected product and its packaging until we provide instructions, where reasonably possible.\n\n5. Nothing in this section limits mandatory consumer rights relating to defective, damaged, incorrect, or incomplete products.\n\n## 13. Refund Policy\n\n1. Refund eligibility and procedures are explained in our Refund Policy, which forms part of the policies governing purchases through VN SHOP. In the event of any inconsistency, mandatory applicable law prevails.\n\n2. For orders delivered within Türkiye, eligible consumers may exercise the statutory right of withdrawal within 14 days of receiving the product, subject to applicable legal conditions and exceptions.\n\n3. For international orders, VN SHOP offers a voluntary 30-day return period from delivery where permitted by law. This voluntary policy does not limit any mandatory statutory rights.\n\n4. Digital downloads and digital content may be non-refundable after delivery or access begins only where permitted by law and where any required consent and acknowledgement conditions have been satisfied. Mandatory remedies for defective or incorrectly supplied digital content remain unaffected.\n\n5. If an order is cancelled by us after payment has been received, or a refund is otherwise due, we will process the applicable refund within the period required by law and the relevant Refund Policy.\n\n6. Where required, refunds will include the applicable delivery charges and will be made using the original payment method, without imposing unlawful fees or burdens on the customer. The time required for the refund to appear may depend on the payment provider or financial institution.\n\n7. Return shipping costs will be allocated in accordance with the Refund Policy and applicable law. No provision of these Terms requires a customer to bear return costs where such a requirement is prohibited by law.\n\n8. If a product is defective, damaged, incorrect, or incomplete, we will review the issue and provide the remedy required by applicable law and our published policies.\n\n9. Nothing in these Terms removes or restricts a refund, withdrawal, cancellation, or other remedy that is mandatory under applicable law.\n\n## 14. Technical Problems\n\n1. We aim to keep the Website and its services available and functioning properly, but uninterrupted access cannot be guaranteed.\n\n2. Technical issues may affect ordering, payment, account access, digital product delivery, or other Website functions.\n\n3. We will take reasonable steps to address technical problems that come to our attention.\n\n4. To the extent permitted by applicable law, we are not responsible for failures or delays caused by inaccurate information supplied by a customer, incompatible devices or software, misuse of the Website, third-party service interruptions, or events beyond our reasonable control.\n\n5. This section does not limit any rights or remedies that cannot lawfully be excluded.\n\n## 15. International Orders and Import Duties\n\n1. Delivery availability and estimated delivery times depend on the destination and the shipping options offered at checkout.\n\n2. International shipments may be subject to customs procedures, import duties, taxes, or other charges imposed by the destination country. Responsibility for such charges will be determined by the shipping terms, checkout disclosures, and applicable law.\n\n3. Customers are responsible for complying with applicable laws and import requirements in the destination country.\n\n4. We cannot guarantee that customs authorities or shipping carriers will process every shipment within a particular timeframe.\n\n5. If delivery to a particular destination is unavailable or restricted, the relevant limitations may be stated on the Website or during checkout.\n\n## 16. Games and Interactive Features\n\n1. VN SHOP may provide games, interactive applications, or similar features. Their use will be subject to these Terms and any additional terms displayed with those features.\n\n2. Unless expressly stated otherwise, the text, graphics, logos, images, audio, downloads, software, and other materials associated with such features remain the property of their respective rights holders.\n\n3. You may use these features only for lawful, permitted purposes. You may not copy, modify, distribute, sell, publicly display, or commercially exploit them without the required permission.\n\n4. We may modify, suspend, or discontinue interactive features where reasonably necessary, subject to applicable law and any rights already acquired by users.\n\n5. Interactive features may depend on third-party systems and may be subject to additional terms or technical requirements.\n\n## 17. Ticket and Event Presale Terms\n\n1. VN SHOP may offer ticket presales, event access, or similar opportunities. The specific conditions displayed for the relevant offer will apply in addition to these Terms.\n\n2. Access to a presale opportunity does not necessarily guarantee the availability of a ticket or admission to an event.\n\n3. Ticket availability, prices, purchase limits, delivery, cancellation, and refunds may be controlled in whole or in part by the event organiser or ticket provider.\n\n4. Any restrictions on resale, transfer, cancellation, or refunds will be communicated with the relevant offer and will apply only to the extent permitted by applicable law.\n\n## 18. Termination and Suspension\n\n1. We may restrict or suspend access to the Website or a customer account where reasonably necessary because of a security concern, suspected fraud, unlawful activity, a material breach of these Terms, or another legitimate operational reason.\n\n2. Where appropriate and permitted by law, we may provide notice or an opportunity to resolve the issue before restricting access.\n\n3. Suspension or termination of access does not remove rights or obligations arising from orders already placed, payments already made, or applicable consumer protection law.\n\n4. Any intellectual property permissions granted under these Terms end when the relevant permission expires or is lawfully terminated, except where otherwise agreed in writing or required by law.\n\n## 19. Warranties and Liability\n\n1. Products are supplied subject to the descriptions and specifications displayed on the Website and the mandatory rights applicable to the transaction.\n\n2. Nothing in these Terms excludes or limits any warranty, consumer right, or legal responsibility that cannot lawfully be excluded or limited.\n\n3. To the extent permitted by applicable law, we are not liable for indirect or unforeseeable losses arising from the use of the Website or a product, where such exclusion is legally valid.\n\n4. We are not responsible for interruptions or failures caused by third-party services or events beyond our reasonable control, except where applicable law provides otherwise.\n\n5. You are responsible for using the Website lawfully and for avoiding unauthorised use of its accounts, services, and Content.\n\n6. You must not use the Website or products to infringe another person's rights or violate applicable law. Any liability arising from such conduct will be determined in accordance with applicable law.\n\n7. Nothing in these Terms limits liability for fraud, intentional misconduct, or any other matter for which liability cannot lawfully be excluded or limited.\n\n## 20. Transfer of Rights and Obligations\n\n1. These Terms apply to you and to us, together with any lawful successors or permitted assigns.\n\n2. You may not transfer your rights or obligations under these Terms to another person where doing so is prohibited by law or requires our consent and that consent has not been obtained.\n\n3. We may use service providers and contractors to support Website operations, order processing, payment handling, shipping, and other services.\n\n4. Any transfer of rights or obligations by us will be subject to applicable law and will not remove mandatory rights held by customers.\n\n## 21. Events Outside Our Control\n\n1. We are not responsible for a delay or failure to perform an obligation to the extent it results from an event beyond our reasonable control, such as natural disasters, severe weather, public emergencies, transport disruptions, customs delays, widespread technical outages, or interruptions affecting third-party providers.\n\n2. Where such an event affects an order or service, we will take reasonable steps to limit the impact and fulfil our obligations when reasonably possible.\n\n3. This section does not remove any refund, cancellation, or other right that applies under mandatory law.\n\n## 22. Resolving Disputes\n\n1. If you have a question, concern, or complaint about the Website, an order, or a product, please contact us at **recordsvunion@gmail.com**.\n\n2. We will review the matter and attempt to resolve it through communication where reasonably possible.\n\n3. Nothing in this section prevents you from exercising any rights available under applicable law or contacting a competent consumer protection authority or dispute-resolution body.\n\n## 23. Miscellaneous\n\n1. These Terms, together with the policies and additional terms expressly referenced on the Website, govern your use of VN SHOP and the transactions to which they apply.\n\n2. If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will continue to apply to the extent permitted by law.\n\n3. A failure or delay in exercising a right under these Terms does not automatically waive that right.\n\n4. Any waiver or amendment must be effective under applicable law and, where required, recorded in writing.\n\n5. The rights and remedies available under these Terms are in addition to those available under applicable law, unless otherwise prohibited.\n\n6. Opinions or material provided by third parties on or through the Website do not necessarily represent the views of VN SHOP or VN RECORDS.\n\n7. **Governing Law and Jurisdiction:** These Terms are subject to applicable law. Any governing-law or jurisdiction provision will apply only to the extent permitted by applicable law, including mandatory consumer protection rules applicable to the customer and transaction.\n\n8. Customers must comply with applicable laws when accessing the Website, purchasing products, or importing products into their country.\n\n## 24. Communications and Legal Notices\n\n1. By using the Website, you acknowledge that order-related and service-related communications may be provided electronically, including by email or through notices on the Website, where permitted by applicable law.\n\n2. You are responsible for providing a valid email address and keeping your contact information accurate so that we can communicate with you about orders and services.\n\n3. Electronic communications do not remove any legal requirement for a particular notice, document, or communication to be delivered in another form.\n\n4. For questions about these Terms, the Website, orders, or legal notices, contact:\n\n   **VN SHOP — powered by 9ojeez9**  \n   **Email:** recordsvunion@gmail.com  \n   **Website:** https://ojee9.github.io/\n\n## 25. Gift Card Terms\n\n1. VN SHOP gift cards (“Gift Cards”) may be purchased or redeemed where offered on the Website. Gift Cards may be used only toward eligible products or services and in accordance with the conditions displayed at purchase or redemption.\n\n2. Any expiry date, balance, redemption restriction, or fee applicable to a Gift Card will be disclosed in its terms or at the relevant point of purchase, subject to applicable law.\n\n3. Unless expressly permitted by the applicable Gift Card terms, Gift Cards may not be resold, exchanged for cash, used to purchase other Gift Cards, or used outside the services or products for which they are valid. Any such restriction applies only to the extent permitted by law.\n\n4. You are responsible for safeguarding your Gift Card and any redemption code. Contact us if you believe a Gift Card has been lost, stolen, misused, or sent to an incorrect recipient. We will assess the situation in accordance with the applicable Gift Card terms and law.\n\n5. By purchasing or redeeming a Gift Card, you agree to its applicable terms and these Terms of Use.\n\n6. We may investigate suspected fraud, unauthorised use, or misuse of Gift Cards and may restrict or cancel affected transactions where reasonably necessary and legally permitted.\n\n7. Gift Card purchases, cancellations, and refunds are subject to the applicable Gift Card terms and mandatory legal rights. Nothing in this section removes any refund or other right that cannot lawfully be excluded."
  };

  legalFallbacks.sale = {
    title: "Terms and Conditions of Sale",
    text: "# TERMS AND CONDITIONS OF SALE\n\n**VN SHOP — powered by 9ojeez9**\n\n*Last updated: October 29, 2026*\n\n## I. General\n\n1. These Terms and Conditions of Sale (“Terms”) govern your relationship with VN SHOP when you use the online services offered through this webstore (“Webstore”). VN SHOP operates within the VN RECORDS and VNION creative and commercial ecosystem. References to VN SHOP, VN RECORDS, VNION RECORDS and 9ojeez9 identify the relevant brands, operations or rights holders, as applicable. VN SHOP may use third-party service providers to operate the Webstore, process payments, provide digital services and fulfil orders.\n2. By purchasing products through this Webstore, you acknowledge that your transaction is subject to these Terms and the applicable policies published on the Webstore, including the **Privacy Policy**, **Terms of Use**, **Refund Policy** and **Shipping Policy**. If you do not agree to these Terms, you should not place an order through the Webstore. Nothing in these Terms limits any mandatory rights you may have under applicable law.\n3. Orders must be placed through the Webstore using the ordering methods made available at checkout.\n4. You should retain a copy of these Terms for future reference.\n5. If you have questions about these Terms, contact VN SHOP at [**recordsvunion@gmail.com**](mailto:recordsvunion@gmail.com).\n6. Placing an order may require you to use third-party applications or services, including payment, checkout, digital delivery or ticketing services. Your use of those services may also be subject to their applicable terms and privacy policies. Those third-party terms do not remove any mandatory rights you have against the relevant responsible party under applicable law.\n\n## II. Changes to These Terms\n\n1. VN SHOP may update these Terms from time to time. Updated Terms will be published on the Webstore and will state their effective date. Changes will generally apply prospectively. Where applicable law requires notice, consent or continued application of the terms in force when an order was placed, VN SHOP will comply with those requirements.\n2. The Terms applicable to an order are generally those in force when the order is placed, subject to any changes required by law or a competent authority.\n\n## III. Webstore Content\n\n1. The Webstore and its content, including trademarks, logos, music recordings, lyrics, artwork, photographs, videos, audio-visual material, digital downloads, designs, text and software (“Content”), are owned by or licensed to VN SHOP, VN RECORDS, VNION RECORDS, 9ojeez9 or the relevant rights holders. All rights remain with their respective owners or licensees.\n2. Unless expressly stated otherwise, the Webstore and Content are provided for personal, non-commercial use.\n3. Without prior written permission from the relevant rights holder, you may not reproduce, distribute, sell, modify, publicly display, commercially exploit or create derivative works from the Webstore or its Content, except where such use is expressly permitted by law or an applicable licence. You may not copy or modify source code except as permitted by law.\n\n## IV. System Requirements and Acceptable Use\n\n1. You must not:\n\n   i. Restrict or interfere with another user's access to or enjoyment of the Webstore or its services.\n\n   ii. Damage, disable, overload or impair the Webstore, or use it to engage in unlawful conduct.\n\n   iii. Upload, transmit or distribute viruses, malicious code, fraudulent or misleading statements, defamatory material, unlawful content or material that infringes third-party rights.\n\n   iv. Impersonate another person or organisation or misrepresent your affiliation with any person or organisation.\n\n   v. Exploit information obtained through the Webstore for unauthorised commercial purposes.\n\n   vi. Engage in spam, flooding, harvesting of email addresses or personal information, automated scraping, database scraping or similar activities not authorised by VN SHOP.\n\n   vii. Attempt to obtain unauthorised access to the Webstore, its accounts, servers, software or data.\n\n   viii. Reproduce, resell or commercially exploit any portion of the Webstore, its Content or services without authorisation.\n\n## V. Software and Third-Party Services\n\n1. Software used to provide the Webstore or its services is owned by or licensed to VN SHOP or the relevant third-party providers. You may use that software only as necessary to access and use the services lawfully.\n2. Unless permitted by law or expressly authorised by the relevant rights holder, you must not:\n\n   i. Use software to transmit unlawful or unauthorised content.\n\n   ii. Sell, redistribute or commercially exploit software provided through the Webstore.\n\n   iii. Modify, translate, adapt or reverse-engineer software, except to the extent applicable law permits.\n\n   iv. Circumvent security mechanisms or access restricted systems or data without authorisation.\n\n   v. Use software for illegal, fraudulent, abusive or harassing purposes.\n\n   vi. Use software for unauthorised commercial purposes.\n3. Third-party software and services may be subject to separate licence terms.\n\n## VI. Registration and Passwords\n\n1. Certain services may require you to register an account and provide information such as your name, email address and other details necessary for the service. You agree to provide accurate information and keep it up to date. Creating an account does not itself establish eligibility to place an order; the age and legal-capacity requirements in Section VIII apply to purchases.\n2. You are responsible for keeping your login credentials confidential and taking reasonable steps to prevent unauthorised access to your account.\n3. You should promptly notify VN SHOP at [**recordsvunion@gmail.com**](mailto:recordsvunion@gmail.com) if you become aware of unauthorised access to your account or another security incident affecting it.\n4. You must not use another person's account without permission. Any allocation of responsibility for unauthorised account activity will be subject to applicable law.\n5. You are responsible for ensuring that the information associated with your account remains accurate. You may update your details through the available account settings or contact VN SHOP for assistance.\n6. You are responsible for using a compatible device, browser and internet connection. Some services may require cookies, JavaScript or third-party software. Availability and technical requirements may vary by service.\n7. Please refer to the **Privacy Policy** for information about how personal data is handled and how cookies and analytics technologies are used.\n\n## VII. VN SHOP Products and Services\n\n1. The Webstore may offer:\n\n   i. Physical products, including clothing, accessories, posters and other merchandise.\n\n   ii. Digital products, including music, downloads and other digital content.\n\n   iii. Digital or mobile content made available through compatible devices or platforms.\n\n   iv. Games, applications and interactive features, whether paid or free.\n\n   v. Streaming services or other services allowing users to preview, listen to or view content online.\n\n   vi. Subscription services, where offered under separate terms.\n\n   vii. Event-related products, ticket or event pre-sale access, and related offers.\n\n   viii. Gift cards, including electronic gift cards, where available.\n2. Product pages will provide applicable information about pre-orders, limited editions, estimated dispatch or delivery dates, digital access and any relevant restrictions. Estimated dates are not guaranteed unless expressly stated, subject to applicable statutory delivery requirements.\n3. A product being described as limited edition, discounted, clearance or final sale does not, by itself, remove any mandatory consumer rights. Returns, exchanges and cancellation restrictions apply only to the extent permitted by applicable law and as explained in the **Refund Policy**.\n4. Products are available only in the sizes, colours, formats and variants displayed on the Webstore. A variant that is not listed may be unavailable.\n5. Additional products or services offered in the future will be subject to these Terms and any additional terms disclosed for those products or services.\n\n## VIII. Placing an Order\n\n1. You must be **at least 18 years old** to place an order independently through the Webstore. By placing an order independently, you confirm that you are at least 18 years old and have the legal capacity to enter into the transaction. A person under 18 or otherwise lacking legal capacity may participate in a transaction only through a parent or legal guardian who reviews and accepts these Terms and places the order on their behalf, and only to the extent permitted by applicable law. Nothing in this clause permits a transaction that applicable law prohibits.\n2. Follow the instructions provided on the Webstore to select products and place an order.\n3. Selected items will be added to your shopping basket. You can remove items or change quantities before submitting your order, using the controls available at checkout.\n4. During checkout, you will be asked to provide the information necessary to process your order, including delivery details and your selected payment method.\n5. Once an order has been submitted, changes to the products, quantities, billing details or delivery address may not be possible. Contact VN SHOP promptly if you need assistance. This does not limit any cancellation, withdrawal or other rights available under applicable law.\n6. An order confirmation acknowledges receipt of your order and does not necessarily mean that the order has been accepted or dispatched. Where applicable, acceptance may be confirmed separately by an order or dispatch notification.\n7. VN SHOP may decline or cancel an order where there is a legitimate reason, such as unavailability, a material pricing error, suspected fraud or a technical error. If payment has already been taken, any refund due will be handled under the **Refund Policy** and applicable law.\n8. Estimated preparation time is generally **2–7 business days**. After dispatch, delivery may take approximately **2 days to 4 weeks**, depending on the destination, carrier and other circumstances. These are estimates, not guarantees, and do not override any mandatory delivery deadline under applicable law.\n9. If a trackable shipping method is available and selected, tracking information may be provided by email or through the relevant carrier service.\n10. You are responsible for providing accurate delivery information. If an address is incomplete or incorrect, contact VN SHOP as soon as possible. Any decision to resend, redirect or refund an order will be handled in accordance with applicable law and the relevant shipping and refund policies.\n11. Orders containing multiple items may be shipped together or in separate shipments, depending on product availability and fulfilment arrangements. Any additional shipping charges or split-shipping options will be disclosed where applicable.\n12. Expedited shipping, if offered, is subject to the options and delivery estimates displayed at checkout. For pre-orders, dispatch may depend on the stated release date or the date the product becomes available.\n\n## IX. General Disclaimer and Promotions\n\n1. Prices, discounts and promotions will be displayed on the Webstore. Unless stated otherwise, the final order total will be shown before you submit payment and will include applicable taxes, delivery charges and other disclosed fees.\n2. Promotions may be subject to stock availability, eligibility requirements, dates, codes or other restrictions disclosed with the offer. Unless expressly stated, promotions cannot be combined with other offers and do not apply retrospectively to completed purchases.\n3. Promotions have no cash value unless otherwise stated or required by law. VN SHOP may modify or end a promotion prospectively, subject to any obligations arising from purchases or offers already accepted and applicable law.\n4. If a promotion is cancelled or a purchase is returned, any adjustment to the promotional benefit will be handled according to the published promotion terms and applicable law.\n\n## X. Payment\n\n1. The payment methods available for a purchase will be displayed at checkout. Accepted methods may include bank cards, digital wallets or other payment services, depending on availability.\n2. By submitting payment details, you confirm that you are authorised to use the selected payment method and that the transaction may be processed for the amount shown at checkout.\n3. Product prices, delivery charges, taxes and other applicable costs will be displayed before you finalise your order. Your bank or payment provider may apply separate charges under its own terms.\n4. Although VN SHOP takes reasonable steps to ensure pricing accuracy, errors may occur. If a material pricing error is identified before fulfilment, VN SHOP may contact you to confirm whether you wish to proceed at the correct price or cancel the order. If the order is cancelled after payment, any refund due will be processed under the **Refund Policy** and applicable law.\n5. Payment may be authorised or collected at the time of purchase or at another stage disclosed during checkout, depending on the product and payment provider.\n6. Payments may be processed by third-party payment providers. Payment details are handled in accordance with the relevant provider's terms and privacy practices, as well as applicable data-protection requirements.\n7. Transactions may be reviewed for fraud prevention or security purposes. If further verification is reasonably necessary, processing may be delayed and you may be contacted using the information supplied with your order.\n\n## XI. Cancellation, Delivery and Usage Rules\n\n### 1. Digital Content\n\n**i. Cancellation and withdrawal**\n\nDigital downloads, streaming music and other digital content are subject to the applicable product terms and mandatory consumer law. Where the law permits withdrawal rights to be lost once digital content delivery or performance begins, that restriction will apply only if the required express prior consent and acknowledgement have been obtained and all applicable legal conditions are satisfied. A general statement that digital products are non-refundable does not override mandatory rights.\n\n**ii. Delivery**\n\nDigital products will be made available through the relevant account, download link, streaming service or instructions supplied on the Webstore or by email. Access times and technical requirements may vary by product.\n\n**iii. Usage rules**\n\nUnless otherwise specified in a product licence, digital content is provided for personal, non-commercial use. You may not redistribute, publicly perform, sell, sublicense or commercially exploit the content without permission from the relevant rights holder, except where permitted by law. Reasonable copies for personal use may be made only where allowed by the applicable licence and law.\n\n**iv. Technical problems and defective digital products**\n\nIf digital content is inaccessible, defective or does not conform to its description, contact [**recordsvunion@gmail.com**](mailto:recordsvunion@gmail.com) and include your order details. VN SHOP will assess the issue and provide repair, replacement, renewed access, a price reduction, refund or another remedy where required by applicable law or the relevant product terms.\n\n### 2. Physical Products\n\n**i. Cancellation and withdrawal**\n\na. Before dispatch, you may contact VN SHOP to request cancellation. Once an order has been dispatched, your rights to withdraw, return or cancel will be governed by the **Refund Policy** and applicable law.\n\nb. For orders delivered in Türkiye, consumers generally have a statutory **14-day withdrawal period** for eligible distance-contract purchases, subject to applicable legal exceptions. The period and its calculation may differ for orders containing multiple items or separate deliveries, as provided by law.\n\nc. To exercise a withdrawal right, notify VN SHOP clearly at [**recordsvunion@gmail.com**](mailto:recordsvunion@gmail.com), providing your order number and a statement that you wish to withdraw. Follow the return instructions supplied in response. You should take reasonable care of the product while it is in your possession.\n\nd. Statutory exceptions may apply, including to certain customised or personalised products, unsealed goods that are legally excluded from withdrawal, and digital content supplied under the required legal conditions. These exceptions apply only to the extent recognised by applicable law.\n\ne. Limited-edition status, a discount, clearance status or a “final sale” label does not by itself eliminate mandatory statutory rights. Products that have been worn, washed or damaged may be subject to lawful restrictions or deductions where applicable, but this does not remove rights concerning defective or incorrectly supplied goods.\n\nf. For international orders, VN SHOP may offer a voluntary return period of **30 days from delivery**, where stated in the applicable **Refund Policy** and permitted by law. This voluntary period does not replace or restrict any longer or otherwise mandatory rights that apply to the transaction.\n\n**ii. Delivery**\n\nVN SHOP will use reasonable efforts to fulfil orders within the estimated preparation and delivery periods shown on the Webstore. Delays may occur due to carrier disruption, customs, manufacturing, high order volumes, pre-order availability, weather or other circumstances. Any applicable statutory delivery deadlines and remedies remain unaffected.\n\n**iii. Risk and ownership**\n\nRisk of loss and transfer of ownership will be determined in accordance with applicable law. Nothing in these Terms transfers risk to a consumer earlier than the law permits or limits any mandatory remedy for non-delivery or defective goods.\n\n## XII. Damaged, Incorrect or Incomplete Orders\n\n1. If your order arrives damaged, incorrect or incomplete, contact [**recordsvunion@gmail.com**](mailto:recordsvunion@gmail.com) with your order number and a description of the problem. Photographs may be included where useful.\n2. **Damaged products:** VN SHOP will assess the issue and provide an appropriate remedy under the **Refund Policy** and applicable law. Where a return is required, instructions and any applicable return arrangements will be provided.\n3. **Incorrect products:** If you receive an item different from the one ordered, contact VN SHOP. The issue will be handled in accordance with applicable law and the **Refund Policy**, including any applicable replacement, return or refund rights.\n4. **Worn or washed products:** Products should be inspected with reasonable care. Damage caused by use beyond what is reasonably necessary to inspect the product may affect a voluntary return or any lawful deduction. This does not limit statutory rights relating to defective, damaged on arrival or incorrectly supplied products.\n\n## XIII. Refund Policy\n\n1. Refunds, cancellations, withdrawals, exchanges and returns are governed by the separate **Refund Policy**, which forms part of these Terms. Where a consumer exercises a statutory withdrawal right, any refund will include the amounts required by applicable law, including standard delivery charges where required.\n2. If you report that a product is defective, damaged or incorrect, VN SHOP will assess the issue and notify you of the available remedy in accordance with applicable law. Statutory remedies are not restricted to the remedies described in this section.\n3. If VN SHOP cancels an order after receiving payment, any refund due will be processed within the period required by applicable law and the **Refund Policy**.\n4. Where a refund is due for a defective or incorrectly supplied product, delivery and return costs will be allocated in accordance with applicable law and the **Refund Policy**.\n5. Refunds will generally be made using the original payment method unless otherwise agreed or required by law. If a gift card or prepaid method was used, the refund will be handled in accordance with applicable law, the **Refund Policy** and the relevant gift-card terms. You should retain any relevant gift-card details until the transaction is fully resolved.\n6. Nothing in this section excludes, limits or replaces a consumer right that cannot lawfully be excluded or restricted.\n\n## XIV. Technical Problems\n\n1. Technical issues may delay or prevent access to a digital product or service. VN SHOP will assess reported issues and provide any repair, replacement, renewed access, refund or other remedy required by applicable law and the relevant product terms.\n2. VN SHOP is not responsible for a technical problem to the extent it is directly caused by incorrect information supplied by you, an incompatible device or system, failure to follow reasonable instructions, or an event outside VN SHOP's reasonable control. This provision does not exclude liability that cannot lawfully be excluded.\n\n## XV. International Orders and Import Duties\n\n1. International delivery times vary according to destination, carrier, customs processing and other factors. The estimated delivery window shown at checkout or on the Webstore applies, subject to any mandatory delivery obligations under applicable law.\n2. International orders may be subject to import duties, customs charges, taxes or local handling fees imposed by the destination country. Where such charges are payable by the recipient under applicable law and are not collected at checkout, you may be responsible for paying them.\n3. You are responsible for complying with applicable import requirements in the destination country. VN SHOP does not control the decisions of customs authorities or the amount of duties imposed by them.\n4. These provisions do not transfer to you any customs, tax or other legal obligation that applicable law places on VN SHOP or another responsible party.\n\n## XVI. Games and Interactive Features\n\n1. VN SHOP may provide games, applications and other interactive features (“Games”). These may be subject to additional terms, including an end-user licence agreement, which will be disclosed where applicable.\n2. Unless otherwise stated, the text, graphics, logos, images, audio, digital downloads, software and other materials made available through the Games (“Materials”) are owned by or licensed to VN SHOP or the relevant rights holders and are protected by applicable intellectual-property laws.\n3. You may use the Games and Materials for personal, non-commercial purposes, subject to the applicable licence and law. Without authorisation, you may not reproduce, distribute, sell, modify, publicly display or create derivative works from them, except where permitted by law.\n4. You may not frame the Games or use VN SHOP's trademarks, logos or other proprietary material in a way that suggests endorsement or affiliation without prior permission.\n5. You may not use VN SHOP's name or trademarks in hidden metadata or other misleading ways to imply an unauthorised relationship.\n6. VN SHOP may suspend, modify or discontinue a Game or interactive feature for operational, security, legal or other legitimate reasons. Where paid access, unused credits or purchased entitlements are affected, any refund or remedy will be handled in accordance with the applicable product terms and law.\n7. Games remain subject to these Terms, the **Privacy Policy** and any additional terms disclosed for the relevant feature.\n8. By using the Games, you acknowledge that electronic communications may be used to provide the service, account notices and relevant updates.\n9. Games are provided subject to their disclosed availability and technical requirements. VN SHOP does not guarantee uninterrupted or error-free operation, but nothing in this section excludes any warranty or liability that cannot lawfully be excluded.\n\n## XVII. Ticket and Event Pre-Sale Terms\n\n1. VN SHOP may offer access to ticket or event pre-sales, including offers bundled with merchandise or other products.\n2. Pre-sale access gives you an opportunity to attempt to obtain tickets before a general sale. It does not guarantee ticket availability unless expressly stated.\n3. Ticketing and event sales may be operated by third-party platforms or organisers. Their separate terms, conditions, refund rules and privacy policies may apply. VN SHOP is responsible for its own obligations under applicable law and is not relieved of those obligations merely because a third party is involved.\n4. Pre-sale access and ticket purchases may be available only through the online channels identified in the relevant announcement.\n5. Ticket quantities, categories, prices, eligibility and access periods will be described in the applicable offer. Additional restrictions may apply if disclosed before purchase.\n6. VN SHOP does not guarantee pre-sale access to additional dates, venues or shows announced after the original offer.\n7. Cancellation, refunds, exchanges, name changes and ticket transfers are subject to the specific event terms and applicable law. A “final sale” statement does not remove any mandatory cancellation or refund right.\n8. Resale or transfer of pre-sale access may be restricted where the applicable offer and law permit. Any restriction must be disclosed clearly before purchase.\n\n## XVIII. Termination and Suspension\n\n1. VN SHOP may suspend or terminate an account or access to a service where reasonably necessary due to a material breach of these Terms, suspected fraud, security risks, unlawful activity or another legitimate operational or legal reason.\n2. Suspension or termination does not remove any rights or remedies that either party has under applicable law.\n3. Upon termination, permissions to use services or content may end, except for rights associated with products already purchased or other rights that continue under applicable law or licence terms.\n\n## XIX. Warranty and Liability\n\n1. Physical and digital products will be subject to the applicable conformity, quality, warranty and consumer-protection requirements imposed by law. Nothing in these Terms reduces any mandatory protection available to consumers.\n2. Where special legal requirements apply to particular products, including autographed memorabilia or collectibles, VN SHOP will comply with the requirements applicable to the transaction and jurisdiction.\n3. To the extent permitted by law, VN SHOP will not be liable for indirect or unforeseeable losses arising from a transaction. This does not exclude liability for direct losses, statutory remedies or other liability that cannot lawfully be excluded or limited.\n4. Nothing in these Terms excludes or restricts liability for fraud, wilful misconduct, death or personal injury where such exclusion is prohibited, or any other liability that applicable law does not allow to be excluded or limited.\n5. You agree to be responsible for claims arising from your unlawful use of the Webstore, infringement of third-party rights or material breach of these Terms, to the extent such responsibility is established under applicable law.\n6. This section does not limit any mandatory consumer rights or remedies.\n\n## XX. Transfer of Rights and Obligations\n\n1. These Terms are binding on the parties and their lawful successors and permitted assigns.\n2. You may not transfer your account or contractual rights where doing so is prohibited by the applicable terms or law.\n3. VN SHOP may engage service providers or transfer relevant operations or contractual obligations where permitted by law. Such arrangements do not remove any obligations or liabilities that VN SHOP must retain under applicable law.\n\n## XXI. Events Outside VN SHOP's Control\n\n1. VN SHOP will not be responsible for a failure or delay caused by events beyond its reasonable control, such as natural disasters, severe weather, public emergencies, disruptions to transport or communications, industrial action, government restrictions or major service outages.\n2. VN SHOP will take reasonable steps to limit the effects of such events and resume performance when reasonably possible. This section does not remove any refund, cancellation or other remedy that applicable law requires.\n\n## XXII. Resolving Disputes\n\n1. If you have a question or complaint about an order or service, contact [**recordsvunion@gmail.com**](mailto:recordsvunion@gmail.com) with your order number and a description of the issue. VN SHOP will review the matter and respond within a reasonable period.\n2. You may also use any consumer complaint, mediation, arbitration or dispute-resolution procedure available under the mandatory laws applicable to your transaction. Nothing in these Terms requires you to waive a statutory right to bring a complaint or claim before a competent authority or court.\n\n## XXIII. Miscellaneous\n\n1. These Terms, together with the policies and additional terms expressly incorporated by reference, govern your use of the Webstore and your purchases through it. In the event of a conflict, mandatory applicable law takes precedence. Product-specific terms apply to the relevant product to the extent they do not conflict with mandatory law or these Terms.\n2. The rights and remedies in these Terms are cumulative and do not exclude rights or remedies available under applicable law.\n3. A waiver of a provision of these Terms must be clear and authorised. A waiver in one instance does not automatically constitute a waiver in another.\n4. A failure or delay in exercising a right does not by itself waive that right. Any provision will be interpreted subject to applicable law.\n5. These Terms are binding on the parties and their lawful successors and permitted assigns.\n6. Opinions or statements expressed in user-generated or third-party content on the Webstore do not necessarily represent the views of VN SHOP or VN RECORDS. This does not alter responsibility for statements made by VN SHOP itself.\n\n## XXIV. Governing Law and Jurisdiction\n\n1. These Terms are subject to applicable law. Any governing-law or jurisdiction provision will apply only to the extent permitted by applicable law, including mandatory consumer-protection rules applicable to the customer and transaction.\n2. You must comply with applicable laws governing your use of the Webstore and the import or receipt of products in the destination country. Nothing in this provision excludes obligations or liability that applicable law places on VN SHOP.\n\n## XXV. Communications and Legal Notices\n\n1. Where permitted by law, communications relating to the Webstore and your orders may be provided electronically, including by email, account notifications or notices published on the Webstore. Required information will be provided in the form and language required by applicable law.\n2. You may send notices or questions concerning these Terms to [**recordsvunion@gmail.com**](mailto:recordsvunion@gmail.com). Where a specific legal notice must be delivered in another form under applicable law, that requirement will continue to apply.\n3. VN SHOP may contact you using the email address or other contact details you provide during checkout or account registration. You are responsible for keeping those details accurate and checking relevant order communications.\n4. For questions concerning these Terms, the Webstore or VN SHOP services, contact:\n\n   **VN SHOP — powered by 9ojeez9**  \n   **VN RECORDS**  \n   Email: [**recordsvunion@gmail.com**](mailto:recordsvunion@gmail.com)\n\n## XXVI. eGift Card Terms\n\n1. Electronic gift cards (“eGift Cards”) may be offered for purchase and redemption through the Webstore. Gift cards may be used toward eligible products or services as specified on the relevant gift-card product page or at checkout.\n2. The applicable gift-card terms, including the issuer, redemption scope, expiry, fees (if any), balance handling, transferability, cancellation and refund conditions, will be disclosed with the gift-card offer before purchase.\n3. By purchasing or redeeming an eGift Card, you agree to the applicable disclosed gift-card terms, these Terms and applicable law.\n4. Gift cards are subject to reasonable fraud-prevention and security checks. Any restrictions, suspension, cancellation, replacement, or treatment of lost, stolen, defective or unauthorisedly used gift cards will be handled under the disclosed gift-card terms and applicable law.\n5. Nothing in this section excludes or restricts any mandatory statutory right or remedy.\n\n---\n\nThese Terms should be read together with the **Privacy Policy**, **Terms of Use**, **Refund Policy** and **Shipping Policy** published on the VN SHOP Webstore."
  };

  legalFallbacks.data = {
    title: "Do Not Sell or Share My Personal Information",
    text: "# DO NOT SELL OR SHARE MY PERSONAL INFORMATION\n\n**VN SHOP — powered by 9ojeez9**\n\n*Last updated: October 29, 2026*\n\n## I. Your Privacy Choices\n\nVN SHOP respects your privacy and is committed to handling personal information responsibly. We process information as necessary to operate the Webstore, process orders, provide customer support, maintain security, and perform other activities described in the VN SHOP Privacy Policy.\n\nDepending on where you live and which laws apply, you may have rights concerning the collection, use, disclosure, sale, or sharing of your personal information, including its use for targeted advertising.\n\nThis notice explains certain privacy rights and how to exercise them. It supplements the VN SHOP Privacy Policy and does not replace it.\n\nTo submit a privacy request or ask about our data practices, contact:\n\n- **Email:** [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com)\n- **Subject line:** Privacy Request\n\nYou do not need to purchase anything or create an account to submit a privacy request. We will handle requests in accordance with applicable law.\n\n## II. United States State Privacy Rights\n\nResidents of certain U.S. states may have rights concerning their personal information under applicable state privacy laws. Depending on the state, the type of information involved, and applicable legal exceptions, these rights may include the right to:\n\n- Confirm whether personal information about you is being processed and access eligible information;\n- Correct inaccurate personal information;\n- Request deletion of eligible personal information;\n- Obtain a portable copy of certain personal information;\n- Opt out of the sale of personal information;\n- Opt out of targeted advertising or certain disclosures of personal information for advertising purposes;\n- Opt out of certain profiling that produces legal or similarly significant effects; and\n- Appeal a decision concerning a privacy request where applicable law provides that right.\n\nThe availability and scope of these rights depend on applicable law. Some laws apply only to businesses that meet specified legal thresholds or other requirements.\n\n### California Privacy Rights\n\nCalifornia residents may have rights under the California Consumer Privacy Act, as amended, and its implementing regulations. Depending on the circumstances, these may include rights to know, access, correct, delete, and obtain certain personal information, as well as the right to opt out of the sale or sharing of personal information.\n\nCalifornia residents may also have the right to limit certain uses and disclosures of sensitive personal information where applicable.\n\nTo submit a request, email [**recordsvunion@gmail.com**](mailto:recordsvunion@gmail.com) with the subject line **California Privacy Request**.\n\n### Do Not Sell or Share My Personal Information\n\nWhere required by applicable law, you may request that VN SHOP stop selling your personal information or sharing it for cross-context behavioral advertising or other targeted advertising covered by that law.\n\nThe legal meaning of “sale” or “sharing” depends on the applicable law. Certain disclosures to third parties may qualify even when no money changes hands.\n\nVN SHOP does not claim in this notice that it sells personal information or shares it for targeted advertising. Whether a particular activity qualifies as a sale or sharing depends on the Webstore's actual configuration and practices.\n\nIf applicable law gives you this right, you may submit a request by emailing [**recordsvunion@gmail.com**](mailto:recordsvunion@gmail.com) with the subject line **Do Not Sell or Share My Personal Information**.\n\nWhere a law requires a specific, accessible opt-out method or link, VN SHOP will provide the applicable method. An email request is an additional contact option and does not replace any legally required mechanism.\n\n### Opt-Out Preference Signals\n\nSome browsers and browser extensions can transmit privacy preference signals, including the Global Privacy Control (GPC).\n\nWhere applicable law requires VN SHOP to recognize a qualifying opt-out preference signal, and the Webstore receives or detects that signal, VN SHOP will process it as required by law. Where required, the signal will be applied to the browser or device and associated information within the scope prescribed by applicable law.\n\nA browser signal does not necessarily control every cookie, technology, or processing activity. Its effect depends on the signal, the relevant technology, and applicable law.\n\nVN SHOP's actual recognition and implementation of these signals must correspond to the Webstore's technical configuration.\n\n### Do-Not-Track Signals and Other Browser Preferences\n\nSome browsers transmit “Do Not Track” signals or similar privacy preferences. These signals are distinct from opt-out preference signals such as GPC, and their legal treatment may differ.\n\nVN SHOP will respond to browser signals to the extent required by applicable law and supported by the technologies in use. Unless applicable law requires otherwise, a general Do-Not-Track signal may not disable every cookie or tracking technology.\n\nWhere cookie or privacy preference controls are available, you may use them to manage the optional technologies covered by those controls. Technologies necessary for security, checkout, or core Webstore functionality may continue to operate where permitted by law.\n\n## III. Categories of Personal Information\n\nThe categories below describe types of information that may be relevant to an online store. They do not mean VN SHOP necessarily collects every listed category. Actual processing depends on the information you provide, the Webstore's features, the technologies enabled, and the services used to operate the store.\n\n| Category | Examples | Potential purposes, where applicable |\n| --- | --- | --- |\n| Identifiers and contact details | Name, email address, postal address, account identifier, IP address, online identifier | Order fulfillment, account management, customer support, security |\n| Commercial information | Products purchased, cart contents, order history, returns, purchase preferences | Order processing, fulfillment, accounting, customer service |\n| Internet or electronic network activity | Website interactions, browsing activity, referral information, interactions with pages or advertisements | Website operation, security, analytics or advertising where enabled |\n| Approximate geolocation | Location inferred from an IP address or similar technical information | Security, fraud prevention, localization, service operation |\n| Customer-provided content | Messages, support inquiries, reviews, or other content submitted by you | Customer support, moderation, dispute resolution |\n| Transaction and payment-related information | Order totals, payment status, billing details, transaction references | Payment processing, fraud prevention, accounting, order administration |\n| Inferences and preferences | Preferences inferred from interactions with the Webstore | Personalization or marketing where implemented and legally permitted |\n| Other information associated with the categories above | Information linked to an account, order, or customer inquiry | Purposes described in the applicable Privacy Policy |\n\nPayment card details, where accepted, may be processed directly by third-party payment providers. The information VN SHOP receives depends on the payment method and provider. This notice does not claim that VN SHOP stores complete payment card details.\n\n### Disclosure of Personal Information\n\nDepending on the Webstore's actual configuration and the services used, personal information may be disclosed to categories of recipients such as:\n\n- Service providers that host, maintain, or support the Webstore;\n- Payment processors and fraud-prevention providers;\n- Shipping, delivery, and fulfillment providers;\n- Customer support and communications providers;\n- Analytics or advertising providers, if such services are enabled;\n- Professional advisers, auditors, insurers, or public authorities where necessary and legally permitted; and\n- Other parties when you direct or authorize a disclosure or when disclosure is required or permitted by law.\n\nThe VN SHOP Privacy Policy should be read alongside this notice for information about actual processing activities and relevant recipients.\n\n### Sale and Targeted Advertising\n\nThe terms “sale” and “sharing” have specific meanings under certain privacy laws. A disclosure may qualify even if the business does not receive money in exchange. Sharing may include certain disclosures for cross-context behavioral advertising.\n\nThis notice does not assert that VN SHOP sells personal information, shares it for targeted advertising, or is categorically exempt from those definitions. Any applicable disclosure and opt-out mechanism must reflect the Webstore's actual configuration and operations.\n\nWhere a legally covered sale or sharing activity occurs, VN SHOP will provide and honor applicable opt-out rights.\n\n### Sources of Personal Information\n\nDepending on how you use the Webstore, personal information may come from:\n\n- Information you provide directly, such as when placing an order or contacting customer support;\n- Your interactions with the Webstore and its features;\n- Service providers supporting transactions, delivery, payment, security, or website operation; and\n- Other sources where collection is permitted by applicable law and properly disclosed.\n\n### Business and Commercial Purposes\n\nPersonal information may be processed, where applicable and legally permitted, to:\n\n- Operate and maintain the Webstore;\n- Accept and fulfill orders;\n- Process payments and manage returns;\n- Arrange shipping and delivery;\n- Create and maintain customer accounts, if accounts are offered;\n- Respond to inquiries and provide customer support;\n- Prevent fraud, misuse, unauthorized access, and security incidents;\n- Maintain business records and comply with legal obligations;\n- Understand and improve Webstore performance; and\n- Provide marketing or personalized content where implemented and permitted, including obtaining consent when required.\n\nThese purposes describe potential activities, not a representation that VN SHOP performs every activity listed. For further information, consult the VN SHOP Privacy Policy.\n\n## IV. Exercising Your Privacy Rights\n\nTo submit a privacy request, email [**recordsvunion@gmail.com**](mailto:recordsvunion@gmail.com). Identify the right you wish to exercise and provide enough information for us to understand your request.\n\nDepending on applicable law, you may be able to request to:\n\n- Know whether personal information about you is being processed;\n- Access eligible personal information;\n- Correct inaccurate personal information;\n- Delete eligible personal information;\n- Obtain a portable copy of eligible personal information;\n- Opt out of a legally covered sale or sharing of personal information;\n- Opt out of targeted advertising or certain profiling; or\n- Exercise another right available under applicable privacy law.\n\nWhere required by law, VN SHOP will provide an applicable method for submitting requests that is reasonably accessible and suited to the type of request. We will not require unnecessary information or steps that applicable law prohibits.\n\nWe may retain information where necessary to complete a transaction, comply with legal obligations, resolve disputes, protect security, or satisfy another lawful purpose. Any retention remains subject to applicable law.\n\n### No Discrimination\n\nWhere required by law, VN SHOP will not unlawfully discriminate against you for exercising your privacy rights. This does not prohibit differences in service that are permitted by applicable law, including situations where particular information is necessary to provide a service you request.\n\n### Appeals\n\nIf applicable law gives you the right to appeal a decision concerning a privacy request, you may submit an appeal by emailing [**recordsvunion@gmail.com**](mailto:recordsvunion@gmail.com) with the subject line **Privacy Request Appeal**.\n\nPlease include the date of your original request and enough information to identify the decision you wish to appeal. We will review and respond to the appeal within the period and in the manner required by applicable law.\n\n## V. Verification\n\nTo protect personal information and prevent unauthorized access, VN SHOP may need to verify your identity before completing certain requests.\n\nVerification measures will be proportionate to the nature of the request and the sensitivity of the information involved. They may include confirming access to the email address associated with an order or account, requesting relevant order details, or asking for other information reasonably necessary to verify the request.\n\nVN SHOP will not request government-issued identification unless reasonably necessary and permitted by applicable law. Information provided for verification will be handled in accordance with the VN SHOP Privacy Policy and applicable legal requirements.\n\nIf we cannot verify a request, we may be unable to complete it. Where required by law, we will explain the outcome and any available next steps.\n\nVerification requirements may differ for opt-out requests. Where applicable law prohibits requiring identity verification for a particular opt-out request, VN SHOP will not impose such a requirement.\n\n## VI. Authorized Agents\n\nWhere permitted by applicable law, you may authorize another person to submit a privacy request on your behalf.\n\nWe may require evidence of the agent's authority, such as written authorization or a valid power of attorney, and may separately verify your identity where permitted or required by law.\n\nAny requirements will be consistent with the applicable law and the type of request. We may decline to act on a request if an agent's authority cannot be established and applicable law permits that decision.\n\n## VII. European Economic Area and European Privacy Rights\n\nThis section applies where the General Data Protection Regulation (GDPR) or other applicable European data protection law governs the processing of your personal data.\n\nSubject to applicable legal conditions and exceptions, you may have the right to:\n\n- Obtain confirmation of whether your personal data is being processed and access that data;\n- Request correction of inaccurate or incomplete personal data;\n- Request erasure of personal data;\n- Request restriction of processing;\n- Receive certain personal data in a structured, commonly used, machine-readable format and, where legally applicable, transmit it to another controller;\n- Object to certain processing, including processing based on legitimate interests;\n- Withdraw consent where processing is based on consent, without affecting the lawfulness of processing carried out before withdrawal; and\n- Lodge a complaint with a competent data protection supervisory authority.\n\nThese rights are not absolute and may be subject to conditions, exemptions, and limitations under applicable law.\n\n### Legal Bases for Processing\n\nWhere the GDPR applies, personal data may be processed on one or more of the following legal bases, as appropriate to the specific activity:\n\n- **Contract:** Processing necessary to take steps at your request before entering into a contract or to perform a contract, such as processing and delivering an order.\n- **Legal obligation:** Processing necessary to comply with applicable legal requirements, including relevant accounting or recordkeeping obligations.\n- **Legitimate interests:** Processing necessary for legitimate interests, provided those interests are not overridden by your rights and freedoms.\n- **Consent:** Processing based on your consent, where required or selected as the applicable legal basis, such as certain optional cookies or marketing communications.\n\nThe legal basis applicable to a particular activity depends on the actual processing involved. Where consent is the legal basis, you may withdraw it at any time. Withdrawal does not affect processing carried out lawfully before withdrawal.\n\n### Profiling and Automated Decision-Making\n\nTechnical tools may be used to understand website performance, prevent fraud, support customer service, or personalize content where such functionality is implemented and permitted by law.\n\nThis notice does not assert that VN SHOP currently uses profiling or automated decision-making that produces legal or similarly significant effects. If such processing is used and applicable law requires additional information or safeguards, VN SHOP will provide them in the applicable privacy notice.\n\n### Required and Optional Information\n\nCertain information may be necessary to process an order, deliver a product, provide customer support, or meet legal obligations. If you do not provide information genuinely required for a requested service, VN SHOP may be unable to provide that service.\n\nOptional information and consent-based processing should be distinguished from information required to fulfill an order or comply with law. The applicable Privacy Policy or collection notice should explain these distinctions where required.\n\n## VIII. International Data Transfers\n\nPersonal data may be processed in countries other than the country where you live when necessary to operate the Webstore or use service providers.\n\nWhere applicable data protection law restricts international transfers, VN SHOP will rely on a legally recognized transfer mechanism where required. Depending on the circumstances, this may include:\n\n- Transferring data to a country recognized by the relevant authority as providing an adequate level of protection;\n- Using standard contractual clauses or another legally approved safeguard; or\n- Relying on another transfer mechanism or derogation permitted by applicable law.\n\nWhere legally required, you may request information about the safeguards applicable to a relevant international transfer by contacting [**recordsvunion@gmail.com**](mailto:recordsvunion@gmail.com).\n\nThis section describes the safeguards that may apply; it does not claim that every listed mechanism is used for every transfer.\n\n## IX. Other Locations and Applicable Rights\n\nIf you live outside the regions specifically described above, you may still contact VN SHOP with questions or requests concerning your personal information.\n\nThe rights available to you, the procedures for exercising them, and any applicable exceptions depend on the privacy laws governing the relevant processing. Nothing in this notice is intended to limit a right that cannot lawfully be excluded or waived.\n\n## X. Updates to This Notice\n\nVN SHOP may update this notice to reflect changes in applicable law, the Webstore's features, or its privacy practices.\n\nThe “Last updated” date at the beginning of this notice indicates when the notice was most recently revised. Where required by law, VN SHOP will provide additional notice or obtain consent before implementing changes that require it.\n\n## XI. Contact\n\nFor privacy questions, requests, or concerns, contact:\n\n**VN SHOP — powered by 9ojeez9**  \n**Email:** [recordsvunion@gmail.com](mailto:recordsvunion@gmail.com)  \n**Subject:** Privacy Request\n\nThis notice supplements the VN SHOP Privacy Policy. If any provision of this notice conflicts with a mandatory requirement of applicable law, the mandatory legal requirement will prevail."
  };

  function getLegalContent(key) {
    const config = state.config || {};
    const fallback = legalFallbacks[key] || {
      title: "Policy",
      text: "Please consult the relevant store policy for details."
    };
    if (["refund", "shipping", "privacy", "terms", "sale", "data"].includes(key)) return fallback;

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
          <div class="vn-ac-legal-copy">${formatLegalContent(legal.text)}</div>
          <div class="vn-ac-actions"><button class="vn-ac-button secondary" data-ac-action="legal-back">Back to profile</button></div>
        </main>
      </div>
    `;
  }

  function formatLegalContent(markdown) {
    const lines = String(markdown).replace(/\r/g, "").split("\n");
    const out = [];
    let para = [], items = [], rows = [];
    const inline = value => escapeHTML(value)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    const flushPara = () => { if (para.length) out.push("<p>"+inline(para.join(" "))+"</p>"); para=[]; };
    const flushList = () => { if(items.length) out.push("<ul>"+items.map(x=>"<li>"+inline(x)+"</li>").join("")+"</ul>"); items=[]; };
    const flushTable = () => {
      if(rows.length) {
        const clean=rows.filter(x=>!/^\|?\s*:?-{3,}/.test(x));
        const cells=x=>x.replace(/^\|/,"").replace(/\|$/,"").split("|").map(v=>v.trim());
        if(clean.length) out.push('<div class="vn-ac-policy-table-wrap"><table class="vn-ac-policy-table"><thead><tr>'+cells(clean[0]).map(x=>"<th>"+inline(x)+"</th>").join("")+"</tr></thead><tbody>"+clean.slice(1).map(x=>"<tr>"+cells(x).map(y=>"<td>"+inline(y)+"</td>").join("")+"</tr>").join("")+"</tbody></table></div>");
      }
      rows=[];
    };
    for(const raw of lines) {
      const line=raw.trim();
      if(!line){flushPara();flushList();flushTable();continue;}
      if(line.startsWith("|")){flushPara();flushList();rows.push(line);continue;}
      flushTable();
      if(line.startsWith("## ")){flushPara();flushList();out.push("<h3>"+inline(line.slice(3))+"</h3>");continue;}
      if(line.startsWith("- ")){flushPara();items.push(line.slice(2));continue;}
      flushList();para.push(line);
    }
    flushPara();flushList();flushTable();
    return out.join("");
  }

  function openLegalOverlay(key, event, root) {
    const legal = getLegalContent(key);
    let overlay = $('[data-policy-overlay="account-legal"]', root);

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "vn-ac-policy-overlay";
      overlay.dataset.policyOverlay = "account-legal";
      overlay.hidden = true;
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.innerHTML = `
        <section class="vn-ac-policy-panel">
          <button type="button" class="vn-ac-policy-close" data-ac-action="policy-close" aria-label="Close legal panel">×</button>
          <p class="vn-ac-policy-kicker">VN SHOP · LEGAL</p>
          <h2 data-legal-panel-title></h2>
          <div class="vn-ac-policy-body" data-legal-panel-body></div>
        </section>
      `;
      root.appendChild(overlay);
    }

    overlay.querySelector("[data-legal-panel-title]").textContent = legal.title;
    const body = overlay.querySelector("[data-legal-panel-body]");
    body.innerHTML = formatLegalContent(legal.text || "");
    body.scrollTop = 0;

    const panel = $(".vn-ac-policy-panel", overlay);
    panel.scrollTop = 0;
    overlay.scrollTop = 0;
    const rect = panel.getBoundingClientRect();
    panel.style.setProperty("--policy-origin-x", `${event.clientX - rect.left}px`);
    panel.style.setProperty("--policy-origin-y", `${event.clientY - rect.top}px`);
    overlay.classList.remove("is-open");
    overlay.hidden = false;
    void panel.offsetWidth;
    panel.scrollTop = 0;
    body.scrollTop = 0;
    overlay.scrollTop = 0;
    requestAnimationFrame(() => {
      panel.scrollTop = 0;
      body.scrollTop = 0;
      overlay.scrollTop = 0;
      overlay.classList.add("is-open");
      requestAnimationFrame(() => {
        panel.scrollTop = 0;
        body.scrollTop = 0;
        overlay.scrollTop = 0;
      });
    });
  }

  function updateAccountAvatar() {
    const button = document.querySelector("#profile-open");
    if (!button) return;
    const name = [state.profile.first_name, state.profile.last_name].filter(Boolean).join(" ").trim();
    const initialSource = name || state.user?.email || "";
    if (state.user && initialSource) {
      button.textContent = initialSource.trim().charAt(0).toLocaleUpperCase();
      button.setAttribute("aria-label", name || state.user.email || "Account");
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
    const policyFooter = $(".vn-ac-policy-footer-row", root);
    shell?.classList.toggle("vn-ac-auth-shell", !state.user);
    shell?.classList.toggle("vn-ac-dashboard-open", Boolean(state.user));

    if (policyFooter) {
      policyFooter.innerHTML = !state.user
        ? ""
        : `<label class="vn-ac-footer-country" aria-label="Country"><select data-ac-country>${countryOptions(state.country)}</select></label><div class="vn-ac-footer-policies">${legalLinks()}</div>`;
    }

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

    if (currentPage !== "merch.html") {
      window.location.href = new URL("/merch.html", window.location.origin).href;
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
        openLegalOverlay(legalLink.dataset.acLegal, event, root);
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
      const dialCodes = {"AD":"+376","AE":"+971","AF":"+93","AG":"+1","AI":"+1","AL":"+355","AM":"+374","AO":"+244","AQ":"+672","AR":"+54","AS":"+1","AT":"+43","AU":"+61","AW":"+297","AX":"+358","AZ":"+994","BA":"+387","BB":"+1","BD":"+880","BE":"+32","BF":"+226","BG":"+359","BH":"+973","BI":"+257","BJ":"+229","BL":"+590","BM":"+1","BN":"+673","BO":"+591","BQ":"+599","BR":"+55","BS":"+1","BT":"+975","BV":"+47","BW":"+267","BY":"+375","BZ":"+501","CA":"+1","CC":"+61","CD":"+243","CF":"+236","CG":"+242","CH":"+41","CI":"+225","CK":"+682","CL":"+56","CM":"+237","CN":"+86","CO":"+57","CR":"+506","CU":"+53","CV":"+238","CW":"+599","CX":"+61","CY":"+357","CZ":"+420","DE":"+49","DJ":"+253","DK":"+45","DM":"+1","DO":"+1","DZ":"+213","EC":"+593","EE":"+372","EG":"+20","EH":"+212","ER":"+291","ES":"+34","ET":"+251","FI":"+358","FJ":"+679","FK":"+500","FM":"+691","FO":"+298","FR":"+33","GA":"+241","GB":"+44","GD":"+1","GE":"+995","GF":"+594","GG":"+44","GH":"+233","GI":"+350","GL":"+299","GM":"+220","GN":"+224","GP":"+590","GQ":"+240","GR":"+30","GT":"+502","GU":"+1","GW":"+245","GY":"+592","HK":"+852","HN":"+504","HR":"+385","HT":"+509","HU":"+36","ID":"+62","IE":"+353","IL":"+972","IM":"+44","IN":"+91","IO":"+246","IQ":"+964","IR":"+98","IS":"+354","IT":"+39","JE":"+44","JM":"+1","JO":"+962","JP":"+81","KE":"+254","KG":"+996","KH":"+855","KI":"+686","KM":"+269","KN":"+1","KP":"+850","KR":"+82","KW":"+965","KY":"+1","KZ":"+7","LA":"+856","LB":"+961","LC":"+1","LI":"+423","LK":"+94","LR":"+231","LS":"+266","LT":"+370","LU":"+352","LV":"+371","LY":"+218","MA":"+212","MC":"+377","MD":"+373","ME":"+382","MF":"+590","MG":"+261","MH":"+692","MK":"+389","ML":"+223","MM":"+95","MN":"+976","MO":"+853","MP":"+1","MQ":"+596","MR":"+222","MS":"+1","MT":"+356","MU":"+230","MV":"+960","MW":"+265","MX":"+52","MY":"+60","MZ":"+258","NA":"+264","NC":"+687","NE":"+227","NF":"+672","NG":"+234","NI":"+505","NL":"+31","NO":"+47","NP":"+977","NR":"+674","NU":"+683","NZ":"+64","OM":"+968","PA":"+507","PE":"+51","PF":"+689","PG":"+675","PH":"+63","PK":"+92","PL":"+48","PM":"+508","PN":"+64","PR":"+1","PS":"+970","PT":"+351","PW":"+680","PY":"+595","QA":"+974","RE":"+262","RO":"+40","RS":"+381","RU":"+7","RW":"+250","SA":"+966","SB":"+677","SC":"+248","SD":"+249","SE":"+46","SG":"+65","SH":"+290","SI":"+386","SJ":"+47","SK":"+421","SL":"+232","SM":"+378","SN":"+221","SO":"+252","SR":"+597","SS":"+211","ST":"+239","SV":"+503","SX":"+1","SY":"+963","SZ":"+268","TC":"+1","TD":"+235","TG":"+228","TH":"+66","TJ":"+992","TK":"+690","TL":"+670","TM":"+993","TN":"+216","TO":"+676","TR":"+90","TT":"+1","TV":"+688","TW":"+886","TZ":"+255","UA":"+380","UG":"+256","UM":"+1","US":"+1","UY":"+598","UZ":"+998","VA":"+39","VC":"+1","VE":"+58","VG":"+1","VI":"+1","VN":"+84","VU":"+678","WF":"+681","WS":"+685","YE":"+967","YT":"+262","ZA":"+27","ZM":"+260","ZW":"+263"};

      const flag = event.target.closest(".vn-ac-phone-row")?.querySelector(".vn-ac-phone-flag");
      const dial = event.target.closest(".vn-ac-phone-row")?.querySelector("[data-ac-phone-dial]");
      if (flag) flag.src = `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
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
  if (new URLSearchParams(window.location.search).get("account") === "register") window.setTimeout(() => openPanel(), 0);
})();
