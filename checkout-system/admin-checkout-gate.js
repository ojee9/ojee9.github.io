/* VN SHOP checkout identity bridge.
 * The Worker alone decides whether the signed-in account is an administrator.
 * Ordinary customers are never blocked or redirected by this script.
 * The storefront and checkout presentation remain identical for every account.
 */
(() => {
  "use strict";

  const ACCOUNT_API = "https://vn-shop-account-api.9ojeez9.workers.dev";

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

  async function resolveAdministrator() {
    let storedToken = "";
    try {
      storedToken = sessionStorage.getItem("vn_account_session") || "";
    } catch (_) {}

    if (await verifyWithWorker(storedToken)) return true;

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

      try {
        sessionStorage.setItem("vn_account_session", exchangeResult.token);
      } catch (_) {}

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

  const adminCheck = resolveAdministrator()
    .then(isAdmin => {
      try {
        if (isAdmin) sessionStorage.setItem("vn_checkout_admin_verified", "1");
        else sessionStorage.removeItem("vn_checkout_admin_verified");
      } catch (_) {}
      return isAdmin;
    })
    .catch(() => false);

  // Checkout controller awaits this promise before assigning order type.
  window.VN_CHECKOUT_ADMIN_CHECK = adminCheck;

  const releaseCheckout = () => {
    document.documentElement.classList.remove("vn-admin-gate-pending");
    document.documentElement.removeAttribute("data-vn-admin-checkout");
  };

  adminCheck.finally(releaseCheckout);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", releaseCheckout, { once: true });
  }
})();
