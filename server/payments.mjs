import { createHmac, timingSafeEqual } from "node:crypto";
import plans from "../src/data/plans.json" with { type: "json" };
import { getSubscription, recordPaymentEvent, saveSubscription } from "./data/store.mjs";

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

function sameSignature(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function parentOnly(request, response) {
  if (request.user?.role !== "parent" || request.user?.parentVerified !== true) {
    response.status(403).json({ error: "Only a verified parent account can manage a subscription." });
    return false;
  }
  return true;
}

async function razorpay(path, method = "GET", body) {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Razorpay returned ${response.status}.`);
  return payload;
}

function planProviderId(planId) {
  return process.env[`RAZORPAY_PLAN_${planId.toUpperCase()}`];
}

export function registerPaymentRoutes(app, { storeMode }) {
  app.get("/api/plans", (_request, response) => response.json({ plans, checkoutEnabled: Boolean(razorpayKeyId && razorpayKeySecret) }));

  app.post("/api/checkout/webhook", async (request, response) => {
    if (!webhookSecret || !Buffer.isBuffer(request.rawBody)) return response.status(503).json({ error: "Payment webhooks are not configured." });
    const signature = request.get("x-razorpay-signature") ?? "";
    const expected = createHmac("sha256", webhookSecret).update(request.rawBody).digest("hex");
    if (!sameSignature(signature, expected)) return response.status(401).json({ error: "Invalid webhook signature." });
    try {
      const event = JSON.parse(request.rawBody.toString("utf8"));
      const eventId = request.get("x-razorpay-event-id");
      if (!eventId || typeof event.event !== "string") return response.status(400).json({ error: "Invalid webhook event." });
      if (!(await recordPaymentEvent(eventId, event.event))) return response.status(200).json({ received: true, duplicate: true });

      const subscription = event.payload?.subscription?.entity;
      const userId = subscription?.notes?.userId;
      const planId = subscription?.notes?.planId;
      if (userId && plans.some((plan) => plan.id === planId && plan.id !== "free")) {
        const active = ["subscription.activated", "subscription.charged", "subscription.resumed"].includes(event.event);
        const canceled = ["subscription.cancelled", "subscription.halted", "subscription.paused"].includes(event.event);
        await saveSubscription(userId, {
          planId: active ? planId : canceled ? "free" : planId,
          status: active ? "active" : canceled ? "canceled" : "pending",
          providerSubscriptionId: subscription.id,
          currentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : null,
        });
      }
      response.status(200).json({ received: true });
    } catch (error) {
      console.error("Razorpay webhook processing failed.", error);
      response.status(500).json({ error: "Webhook event could not be processed." });
    }
  });

  app.post("/api/checkout/create", async (request, response) => {
    if (!parentOnly(request, response)) return;
    if (!razorpayKeyId || !razorpayKeySecret) return response.status(503).json({ error: "Razorpay test credentials are not configured." });
    if (storeMode !== "postgres") return response.status(503).json({ error: "Persistent storage is required before checkout can be enabled." });
    const plan = plans.find((item) => item.id === request.body?.planId && item.id !== "free");
    if (!plan) return response.status(400).json({ error: "Choose a valid paid plan." });
    const providerPlanId = planProviderId(plan.id);
    if (!providerPlanId) return response.status(503).json({ error: `Configure RAZORPAY_PLAN_${plan.id.toUpperCase()} before enabling this plan.` });
    try {
      const created = await razorpay("subscriptions", "POST", {
        plan_id: providerPlanId,
        total_count: plan.interval === "month" ? 120 : 10,
        quantity: 1,
        customer_notify: 1,
        notes: { userId: String(request.user.sub), planId: plan.id },
      });
      await saveSubscription(String(request.user.sub), { planId: plan.id, status: "pending", providerSubscriptionId: created.id, currentPeriodEnd: null });
      response.status(201).json({ subscriptionId: created.id, shortUrl: created.short_url, plan: { id: plan.id, name: plan.name, amount: plan.amount, interval: plan.interval } });
    } catch (error) {
      console.error("Razorpay subscription creation failed.", error);
      response.status(502).json({ error: "Checkout could not be started. No subscription was activated." });
    }
  });

  app.get("/api/subscription", async (request, response) => {
    if (!parentOnly(request, response)) return;
    response.json({ subscription: await getSubscription(String(request.user.sub)) });
  });

  app.post("/api/subscription/cancel", async (request, response) => {
    if (!parentOnly(request, response)) return;
    if (!razorpayKeyId || !razorpayKeySecret) return response.status(503).json({ error: "Razorpay is not configured." });
    const current = await getSubscription(String(request.user.sub));
    if (current.status !== "active" || !current.providerSubscriptionId) return response.status(409).json({ error: "There is no active subscription to cancel." });
    try {
      await razorpay(`subscriptions/${encodeURIComponent(current.providerSubscriptionId)}/cancel`, "POST", { cancel_at_cycle_end: 1 });
      await saveSubscription(String(request.user.sub), { ...current, status: "cancel_at_period_end" });
      response.json({ canceled: true, currentPeriodEnd: current.currentPeriodEnd });
    } catch (error) {
      console.error("Razorpay cancellation failed.", error);
      response.status(502).json({ error: "Cancellation could not be confirmed. Contact support before retrying." });
    }
  });

  app.post("/api/coupon/validate", (request, response) => {
    if (!parentOnly(request, response)) return;
    const code = typeof request.body?.code === "string" ? request.body.code.trim().slice(0, 40) : "";
    if (!code) return response.status(400).json({ error: "Enter a coupon or referral code." });
    response.status(404).json({ valid: false, error: "This code is not available." });
  });
}
