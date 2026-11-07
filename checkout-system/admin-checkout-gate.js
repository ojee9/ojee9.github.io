/* VN SHOP ADMIN CHECKOUT EXEMPTION
 * Canonical administrator emails are intentionally fixed to these three accounts.
 * The Worker is the authority for is_admin; a typed email or browser storage value
 * never grants administrator privileges by itself.
 * HIGH PRIORITY: checkout access and unpaid admin order receipts only.
 */
(() => {
  "use strict";
  const ADMIN_EMAILS = new Set([
    "9ojeez9@gmail.com",
    "recordsvunion@gmail.com",
    "studiovnions@gmail.com"
  ]);
  const ACCOUNT_API = "https://vn-shop-account-api.9ojeez9.workers.dev";
  const isReceipt = /(?:^|\/)order-complete\.html$/i.test(location.pathname);
  const parse = value => { try { return JSON.parse(value); } catch { return null; } };

  function showCheckoutDenied() {
    document.documentElement.classList.remove("vn-admin-gate-pending");
    const body = document.body;
    body.innerHTML = `
      <main class="vn-admin-gate-message">
        <section>
          <h1>VN SHOP CHECKOUT</h1>
          <p>This checkout is currently reserved for authorized VN administrators.</p>
          <a href="/merch.html">RETURN TO VN SHOP</a>
        </section>
      </main>`;
  }

  async function verifyWithWorker(token) {
    if (!token) return false;
    try {
      const response = await fetch(ACCOUNT_API + "/api/account", {
        method: "GET",
        cache: "no-store",
        headers: { Authorization: "Bearer " + token }
      });
      if (!response.ok) return false;
      const result = await response.json();
      return result.is_admin === true || result.isAdmin === true;
    } catch (_) {
      return false;
    }
  }

  async function verifyAdmin() {
    let storedToken = "";
    try { storedToken = sessionStorage.getItem("vn_account_session") || ""; }
    catch (_) {}

    if (await verifyWithWorker(storedToken)) return true;

    // Checkout is a subpage and does not run account.js. Initialize the same
    // Clerk session used by merch.html, then exchange its verified token with
    // the Worker. The Worker remains the only authority for administrator access.
    const clerk = window.Clerk;
    if (!clerk || typeof clerk.load !== "function") return false;

    try {
      await clerk.load();
      const clerkSession = clerk.session;
      if (!clerkSession || typeof clerkSession.getToken !== "function") return false;

      const clerkToken = await clerkSession.getToken();
      if (!clerkToken) return false;

      const exchangeResponse = await fetch(ACCOUNT_API + "/api/auth/exchange", {
        method: "POST",
        cache: "no-store",
        headers: { Authorization: "Bearer " + clerkToken }
      });
      const exchangeResult = await exchangeResponse.json().catch(() => ({}));
      if (!exchangeResponse.ok || !exchangeResult.token) return false;

      try { sessionStorage.setItem("vn_account_session", exchangeResult.token); }
      catch (_) {}

      const user = clerk.user;
      const email = String(
        user?.primaryEmailAddress?.emailAddress ||
        user?.emailAddresses?.[0]?.emailAddress ||
        ""
      ).trim().toLowerCase();
      if (email) {
        try {
          sessionStorage.setItem("vn_account_identity", JSON.stringify({
            id: user.id,
            email,
            firstName: user.firstName || "",
            lastName: user.lastName || ""
          }));
        } catch (_) {}
      }

      return await verifyWithWorker(exchangeResult.token);
    } catch (_) {
      return false;
    }
  }
  async function init() {
    const allowed = await verifyAdmin();
    if (!allowed) {
      if (isReceipt) {
        location.replace("/merch.html?checkout=admin-only");
        return;
      }
      showCheckoutDenied();
      return;
    }

    document.documentElement.classList.remove("vn-admin-gate-pending");
    document.documentElement.dataset.vnAdminCheckout = "authorized";
    const payButton = document.getElementById("pay-now");
    if (payButton) payButton.textContent = "COMPLETE ADMIN ORDER";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
