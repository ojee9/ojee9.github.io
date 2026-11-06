const ALLOWED_ORIGIN = "https://ojee9.github.io";

const corsHeaders = origin => ({
  ...(origin === ALLOWED_ORIGIN ? { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, "Vary": "Origin" } : {}),
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400"
});

const json = (data, status, origin) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders(origin) }
});

async function matchesSecret(candidate, expected) {
  if (!candidate || !expected) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected))
  ]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

async function authenticate(request, env) {
  const expected = String(env.INVENTORY_ADMIN_TOKEN || "");
  if (expected.length < 32) return { ok: false, status: 503, message: "Inventory administration requires a configured admin token of at least 32 characters." };
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match || !(await matchesSecret(match[1].trim(), expected))) {
    return { ok: false, status: 401, message: "Unauthorized." };
  }
  return { ok: true };
}

async function readInventory(db) {
  const result = await db.prepare(`
    SELECT product_id, product_name, product_type, production_limit,
           produced_quantity, sold_quantity, reserved_quantity, updated_at
    FROM vn_inventory_products
    ORDER BY CASE product_type WHEN 'POSTER' THEN 1 ELSE 2 END, product_name
  `).all();
  const products = (result.results || []).map(row => ({
    ...row,
    available_quantity: row.produced_quantity - row.sold_quantity - row.reserved_quantity,
    remaining_production_capacity: row.production_limit - row.produced_quantity
  }));
  const events = await db.prepare(`
    SELECT event_id, product_id, event_type, quantity, note, created_at
    FROM vn_inventory_events ORDER BY event_id DESC LIMIT 30
  `).all();
  return { products, events: events.results || [] };
}

async function recordMovement(db, type, body) {
  const productId = String(body.productId || "").trim();
  const quantity = Number(body.quantity);
  const requestId = String(body.requestId || "").trim();
  const note = String(body.note || "").trim().slice(0, 250);
  if (!productId || productId.length > 100) return { ok: false, status: 400, message: "A valid productId is required." };
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) {
    return { ok: false, status: 400, message: "Quantity must be a whole number between 1 and 1000." };
  }
  if (!requestId || requestId.length > 100) return { ok: false, status: 400, message: "A requestId is required." };

  const updateSql = type === "production" ? `
    UPDATE vn_inventory_products
    SET produced_quantity = produced_quantity + ?, updated_at = CURRENT_TIMESTAMP
    WHERE product_id = ? AND produced_quantity + ? <= production_limit
  ` : `
    UPDATE vn_inventory_products
    SET sold_quantity = sold_quantity + ?, updated_at = CURRENT_TIMESTAMP
    WHERE product_id = ? AND produced_quantity - sold_quantity - reserved_quantity >= ?
  `;
  const eventSql = `
    INSERT INTO vn_inventory_events (request_id, product_id, event_type, quantity, note, created_at)
    SELECT ?, ?, ?, ?, ?, CURRENT_TIMESTAMP WHERE changes() = 1
  `;

  try {
    const results = await db.batch([
      db.prepare(updateSql).bind(quantity, productId, quantity),
      db.prepare(eventSql).bind(requestId, productId, type, quantity, note || null)
    ]);
    if (!results?.[0]?.meta?.changes) {
      const exists = await db.prepare("SELECT product_id, production_limit, produced_quantity, sold_quantity, reserved_quantity FROM vn_inventory_products WHERE product_id = ?")
        .bind(productId).first();
      if (!exists) return { ok: false, status: 404, message: "Product not found." };
      return {
        ok: false,
        status: 409,
        message: type === "production"
          ? "This quantity exceeds the remaining production limit."
          : "This quantity exceeds the available stock."
      };
    }
    return { ok: true };
  } catch (error) {
    const message = String(error?.message || error);
    if (/unique|constraint/i.test(message)) return { ok: false, status: 409, message: "This request was already processed." };
    console.error("VN inventory movement failed:", error);
    return { ok: false, status: 500, message: "Inventory update failed." };
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (origin && origin !== ALLOWED_ORIGIN) return json({ ok: false, message: "Origin not allowed." }, 403, "");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/inventory")) return json({ ok: false, message: "Not found." }, 404, origin);
    if (!env.DB) return json({ ok: false, message: "D1 database binding is unavailable." }, 503, origin);

    const auth = await authenticate(request, env);
    if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status, origin);

    if (request.method === "GET" && url.pathname === "/api/inventory") {
      try {
        const inventory = await readInventory(env.DB);
        return json({ ok: true, ...inventory }, 200, origin);
      } catch (error) {
        console.error("VN inventory read failed:", error);
        return json({ ok: false, message: "Inventory data could not be loaded." }, 500, origin);
      }
    }

    if (request.method === "POST" && ["/api/inventory/production", "/api/inventory/sale"].includes(url.pathname)) {
      let body;
      try { body = await request.json(); }
      catch { return json({ ok: false, message: "A valid JSON body is required." }, 400, origin); }
      const type = url.pathname.endsWith("/production") ? "production" : "sale";
      const result = await recordMovement(env.DB, type, body || {});
      if (!result.ok) return json(result, result.status, origin);
      try {
        const inventory = await readInventory(env.DB);
        return json({ ok: true, message: type === "production" ? "Production quantity recorded." : "Sale quantity recorded.", ...inventory }, 200, origin);
      } catch (error) {
        console.error("VN inventory movement saved but refresh failed:", error);
        return json({ ok: true, message: type === "production" ? "Production recorded. Refresh inventory to update the display." : "Sale recorded. Refresh inventory to update the display." }, 200, origin);
      }
    }

    return json({ ok: false, message: "Not found." }, 404, origin);
  }
};