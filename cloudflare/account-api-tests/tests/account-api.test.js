import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import worker, { __test } from "../../../update-account-api-worker-here-js";

const db = env.DB;
const stamp = new Date().toISOString();

function orderBody(email = "test@example.com") {
  return {
    customer: { email, firstName: "D1", lastName: "Test" },
    items: [{ id: "test-cd", title: "Test CD", quantity: 1, unitPrice: 10, totalPrice: 10 }],
    subtotal: 10, shipping: 0, taxes: 2, total: 12, currency: "TRY", countryCode: "TR"
  };
}

async function insertCustomerOrder(id, status = "Received", deliveredAt = null) {
  await db.prepare(`
    INSERT INTO customer_orders
      (id,user_id,order_number,vn_code,created_at,updated_at,customer_json,subtotal,shipping,taxes,total,currency,country_code,order_status,payment_status,delivered_at,order_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(id,"vn_test_user","N"+id.slice(-10),"VN-TEST-"+id.slice(-8),stamp,stamp,
    JSON.stringify({email:"test@example.com"}),10,0,2,12,"TRY","TR",status,"Paid",deliveredAt,
    JSON.stringify({items:[]})).run();
}

describe.sequential("VN SHOP account Worker — D1 integration", () => {
  beforeAll(async () => {
    // Seed the historical constrained schema so ensureSchema must perform the real migration.
    await db.prepare(`CREATE TABLE IF NOT EXISTS admin_order_code_registry (
      code_number INTEGER PRIMARY KEY CHECK(code_number BETWEEN 1 AND 99),
      admin_order_id TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
    )`).run();
    await db.prepare(`INSERT OR IGNORE INTO admin_order_code_registry (code_number,admin_order_id,created_at) VALUES (98,'legacy-admin-98',?)`).bind(stamp).run();
    await __test.ensureSchema(db);
  });

  it("migrates the VN-A registry and allocates unique codes beyond 99 under concurrency", async () => {
    const schema = await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='admin_order_code_registry'").first();
    expect(schema.sql).not.toContain("BETWEEN 1 AND 99");
    const codes = await Promise.all(Array.from({length:5}, () => __test.generateAdminCode(db)));
    expect(new Set(codes).size).toBe(5);
    expect(codes).toContain("VN-A100");
    expect(codes).toContain("VN-A103");
  });

  it("allocates customer VN codes atomically and never uses MAX+1", async () => {
    const codes = await Promise.all(Array.from({length:8}, () => __test.generateUniqueCustomerCode(db)));
    expect(new Set(codes).size).toBe(8);
    expect(codes.sort()).toEqual(["VN-001","VN-002","VN-003","VN-004","VN-005","VN-006","VN-007","VN-008"]);
  });

  it("keeps the same admin draft for repeated idempotency keys and finalizes only on Delivered/Returned", async () => {
    const body = orderBody("admin-draft@example.com");
    const [first,second] = await Promise.all([
      __test.prepareAdminOrder(db,"vn_test_admin",body,"checkout-double-click"),
      __test.prepareAdminOrder(db,"vn_test_admin",body,"checkout-double-click")
    ]);
    expect(second.id).toBe(first.id);
    expect(first.orderNumber).toMatch(/^\d{6}$/);
    expect(first.vnCode).toMatch(/^VN-A\d{2,}$/);
    expect(first.paymentStatus).toBe("Paid");
    const reservation = await db.prepare("SELECT state FROM admin_order_number_registry WHERE admin_order_id=?").bind(first.id).first();
    expect(reservation.state).toBe("reserved");
    const before = await db.prepare("SELECT COUNT(*) AS n FROM admin_orders WHERE id=?").bind(first.id).first();
    expect(before.n).toBe(0);
    const finalized = await __test.finalizeQueuedAdminOrder(db,first.id,"delivered","test-operator");
    expect(finalized.orderNumber).toBe(first.orderNumber);
    expect(finalized.vnCode).toBe(first.vnCode);
    const after = await db.prepare("SELECT status,order_number,vn_code FROM admin_orders WHERE id=?").bind(first.id).first();
    expect(after.status).toBe("delivered");
    expect(after.vn_code).toBe(finalized.vnCode);
    const permanent = await db.prepare("SELECT state FROM admin_order_number_registry WHERE admin_order_id=?").bind(first.id).first();
    expect(permanent.state).toBe("permanent");
    const queue = await db.prepare("SELECT id FROM admin_order_queue WHERE id=?").bind(first.id).first();
    expect(queue).toBeNull();
  });

  it("releases both reserved identifiers when an admin draft is returned", async () => {
    const draft = await __test.prepareAdminOrder(db,"vn_test_admin",orderBody("returned-draft@example.com"),"returned-draft-key");
    const number = draft.orderNumber, code = draft.vnCode;
    const result = await __test.finalizeQueuedAdminOrder(db,draft.id,"returned","test-operator");
    expect(result.released).toBe(true);
    expect(await db.prepare("SELECT id FROM admin_order_queue WHERE id=?").bind(draft.id).first()).toBeNull();
    expect(await db.prepare("SELECT admin_order_id FROM admin_order_number_registry WHERE order_number=?").bind(number).first()).toBeNull();
    expect(await db.prepare("SELECT admin_order_id FROM admin_order_code_registry WHERE code_number=?").bind(Number(code.slice(4))).first()).toBeNull();
    expect(await db.prepare("SELECT id FROM admin_orders WHERE id=?").bind(draft.id).first()).toBeNull();
  });

  it("creates admin Customer Orders as Paid and removes them without a cancellation record", async () => {
    const order = await __test.createAdminCustomerOrder(db,"vn_test_admin",orderBody("admin-customer@example.com"),"admin-customer-key");
    expect(order.paymentStatus).toBe("Paid");
    expect(order.adminRemovable).toBe(true);
    const row = await db.prepare("SELECT created_by_admin,payment_source,payment_status FROM customer_orders WHERE id=?").bind(order.id).first();
    expect(Number(row.created_by_admin)).toBe(1);
    expect(row.payment_source).toBe("admin_offline");
    await __test.deleteAdminCreatedCustomerOrder(db,order.id);
    expect(await db.prepare("SELECT id FROM customer_orders WHERE id=?").bind(order.id).first()).toBeNull();
    expect(await db.prepare("SELECT id FROM order_status_history WHERE order_id=?").bind(order.id).first()).toBeNull();
  });

  it("refuses the X removal path for provider-paid admin orders", async () => {
    const order = await __test.createAdminCustomerOrder(db,"vn_test_admin",orderBody("provider-paid@example.com"),"provider-paid-key");
    await db.prepare("UPDATE customer_orders SET payment_source='provider' WHERE id=?").bind(order.id).run();
    await expect(__test.deleteAdminCreatedCustomerOrder(db,order.id)).rejects.toThrow(/offline-paid/);
  });

  it("generates unique site-side payment references without accepting operator-supplied values", async () => {
    const [first,second] = await Promise.all([
      __test.generatePaymentNumber(db,"payment-order-1"),
      __test.generatePaymentNumber(db,"payment-order-2")
    ]);
    expect(first).toMatch(/^VN-PAY-\d{8}-\d{8}$/);
    expect(second).toMatch(/^VN-PAY-\d{8}-\d{8}$/);
    expect(first).not.toBe(second);
  });

  it("deletes a pending admin draft without creating a customer or finalized admin order", async () => {
    const draft = await __test.prepareAdminOrder(db,"vn_test_admin",orderBody("delete-draft@example.com"),"delete-draft-key");
    expect(await __test.deleteQueuedAdminOrder(db,draft.id)).toBe(true);
    expect(await __test.deleteQueuedAdminOrder(db,draft.id)).toBe(false);
    expect(await db.prepare("SELECT id FROM admin_orders WHERE id=?").bind(draft.id).first()).toBeNull();
    expect(await db.prepare("SELECT id FROM customer_orders WHERE id=?").bind(draft.id).first()).toBeNull();
  });

  it("does not merge an old account using an editable profile email", async () => {
    await db.prepare("INSERT INTO customer_profiles (user_id,email,created_at,updated_at) VALUES (?,?,?,?)")
      .bind("legacy-email-only-user","shared@example.com",stamp,stamp).run();
    const account = await __test.resolveVNAccount(db,{email:"shared@example.com",clerkUserId:null,firstName:"",lastName:""});
    expect(account.userId).not.toBe("legacy-email-only-user");
    const legacy = await db.prepare("SELECT user_id FROM customer_profiles WHERE user_id='legacy-email-only-user'").first();
    expect(legacy.user_id).toBe("legacy-email-only-user");
  });

  it("requires an explicit cancellation reason and records the selected reason", async () => {
    const id = "cancel-reason-test";
    await insertCustomerOrder(id);
    await expect(__test.updateOrderStatus(db,id,{status:"cancelled",cancellation_reason:"guess"},"test-operator")).rejects.toThrow();
    await __test.updateOrderStatus(db,id,{status:"cancelled",cancellation_reason:"Customer request"},"test-operator");
    const event = await db.prepare("SELECT reason FROM order_status_history WHERE order_id=? ORDER BY created_at DESC LIMIT 1").bind(id).first();
    expect(event.reason).toBe("Customer request");
  });

  it("enforces the complete return chain and hides actor ids from customer serialization", async () => {
    const orderId = "return-chain-order";
    const delivered = new Date().toISOString();
    await insertCustomerOrder(orderId,"Delivered",delivered);
    const itemId = "return-chain-item";
    await db.prepare(`INSERT INTO customer_order_items (id,order_id,product_id,title,quantity,unit_price,total_price,item_json,active)
      VALUES (?,?,?,?,?,?,?,?,1)`).bind(itemId,orderId,"cd","Test CD",1,10,10,JSON.stringify({title:"Test CD"})).run();
    const created = await __test.createReturn(db,"vn_test_user",{orderId,itemIds:[itemId],reason:"Damaged item"});
    await __test.updateReturnStatus(db,"test-operator",created.id,{status:"accepted"});
    await __test.updateReturnStatus(db,"test-operator",created.id,{status:"return process"});
    await __test.updateReturnStatus(db,"test-operator",created.id,{status:"returned"});
    const customerReturns = await __test.listReturns(db,"vn_test_user",false);
    expect(customerReturns.find(x=>x.id===created.id).status).toBe("Returned");
    expect(JSON.stringify(customerReturns)).not.toContain("actorId");
    const customerOrders = await __test.listOrders(db,"vn_test_user",false);
    expect(JSON.stringify(customerOrders)).not.toContain("actor_id");
  });

  it("lists more than 100 orders and returns without exceeding D1 bind limits", async () => {
    const baseId = "many-records-base";
    await insertCustomerOrder(baseId,"Delivered",new Date().toISOString());
    const statements = [];
    for (let i=0;i<105;i++) {
      const id = "bulk-order-"+String(i).padStart(3,"0");
      statements.push(db.prepare(`INSERT INTO customer_orders
        (id,user_id,order_number,vn_code,created_at,updated_at,customer_json,subtotal,shipping,taxes,total,currency,country_code,order_status,payment_status,order_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,"vn_bulk_user","B"+i,"VN-B"+i,stamp,stamp,JSON.stringify({email:"bulk@example.com"}),1,0,0,1,"TRY","TR","Received","Paid","{}"));
      statements.push(db.prepare(`INSERT INTO customer_returns (id,user_id,order_id,order_number,reason,status,created_at,updated_at)
        VALUES (?,?,?,?,?,'Pending',?,?)`).bind("bulk-return-"+i,"vn_bulk_user",baseId,"BASE","test",stamp,stamp));
      if (statements.length>=80) { await db.batch(statements.splice(0)); }
    }
    if (statements.length) await db.batch(statements);
    const orders = await __test.listOrders(db,"vn_bulk_user",false);
    const returns = await __test.listReturns(db,"vn_bulk_user",false);
    expect(orders.length).toBe(105);
    expect(returns.length).toBe(105);
  });

  it("denies customer-role accounts administrative privileges", async () => {
    await db.prepare("INSERT INTO vn_accounts (account_id,email,role,created_at,updated_at) VALUES (?,?,?,?,?)")
      .bind("vn_test_customer","ordinary@example.com","customer",stamp,stamp).run();
    expect(await __test.isAdmin({DB:db},"vn_test_customer")).toBe(false);
  });

  it("allows the checkout idempotency header during browser preflight", async () => {
    const response = await worker.fetch(new Request("https://account-api.test/api/orders", {
      method: "OPTIONS",
      headers: {
        Origin: "https://ojee9.github.io",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type,idempotency-key"
      }
    }), { DB: db });
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("Idempotency-Key");
  });

  it("creates only one admin Customer Order for concurrent retries of the same checkout", async () => {
    const key = "admin-customer-concurrent-key";
    const [first, second] = await Promise.all([
      __test.createAdminCustomerOrder(db, "vn_test_admin_concurrent", orderBody("concurrent@example.com"), key),
      __test.createAdminCustomerOrder(db, "vn_test_admin_concurrent", orderBody("concurrent@example.com"), key)
    ]);
    expect(first.id).toBe(second.id);
    const rows = await db.prepare("SELECT id FROM customer_orders WHERE user_id=? AND request_key=?").bind("vn_test_admin_concurrent", key).all();
    expect(rows.results).toHaveLength(1);
    const items = await db.prepare("SELECT id FROM customer_order_items WHERE order_id=?").bind(first.id).all();
    expect(items.results).toHaveLength(1);
    expect(first.paymentStatus).toBe("Paid");
    expect(first.paymentSource).toBe("admin_offline");
  });

  it("rejects unauthenticated customer and admin-order requests", async () => {
    const response = await worker.fetch(new Request("https://account-api.test/api/orders"),{DB:db});
    expect(response.status).toBe(401);
    const adminResponse = await worker.fetch(new Request("https://account-api.test/api/admin-orders/test-id",{method:"DELETE"}),{DB:db});
    expect(adminResponse.status).toBe(401);
  });
});
