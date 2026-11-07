/* VN SHOP ADMIN CHECKOUT EXEMPTION
 * Canonical administrator emails are intentionally fixed to these three accounts.
 * The Worker is the authority for is_admin; a typed email or browser storage value
 * never grants administrator privileges by itself.
 * ADMIN PRIVILEGES: test checkout access and unpaid admin order receipts only.
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
          <p>This checkout is currently reserved for authorized VN administrators. Customer checkout will become available when the real payment system is connected.</p>
          <a href="/merch.html">RETURN TO VN SHOP</a>
        </section>
      </main>`;
  }

  async function verifyAdmin() {
    let token = "";
    let identity = null;
    try {
      token = sessionStorage.getItem("vn_account_session") || "";
      identity = parse(sessionStorage.getItem("vn_account_identity") || "null");
    } catch (_) {}
    const email = String(identity?.email || "").trim().toLowerCase();
    if (!token || !ADMIN_EMAILS.has(email)) return false;

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
    if (payButton) payButton.textContent = "COMPLETE ADMIN TEST ORDER";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
