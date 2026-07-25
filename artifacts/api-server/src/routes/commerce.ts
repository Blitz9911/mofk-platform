import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  devicesTable,
  fleetAccountsTable,
  orderItemsTable,
  ordersTable,
  paymentsTable,
  shipmentsTable,
  subscriptionPlansTable,
  subscriptionsTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const billingCycleSchema = z.enum(["monthly", "annual"]);
const shippingAddressSchema = z.object({
  city: z.string().min(1),
  district: z.string().min(1),
  street: z.string().min(1),
  buildingNumber: z.string().min(1),
  postalCode: z.string().min(1),
  additionalNumber: z.string().min(1),
  notes: z.string().optional(),
});

const paidPlanIds = ["plus", "pro", "mofk", "family", "individual-basic", "individual-advanced"];

function periodPrice(plan: typeof subscriptionPlansTable.$inferSelect, billingCycle: "monthly" | "annual") {
  return billingCycle === "annual" ? plan.priceYearlySar : plan.priceMonthlySar;
}

function vatFor(subtotal: number) {
  return Math.round(subtotal * 0.15);
}

function verifyMoyasarSignature(body: unknown, signature?: string | string[]) {
  const secret = process.env.MOYASAR_WEBHOOK_SECRET;
  if (!secret || !signature || Array.isArray(signature)) return false;
  const payload = JSON.stringify(body ?? {});
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const given = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  return given.length === expectedBuf.length && timingSafeEqual(given, expectedBuf);
}

async function activatePaidOrder(orderId: string, rawWebhook: Record<string, unknown>, moyasarPaymentId?: string) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) return null;

  const nextPeriod = new Date();
  nextPeriod.setMonth(nextPeriod.getMonth() + (order.billingCycle === "annual" ? 12 : 1));

  const [subscription] = await db.insert(subscriptionsTable).values({
    userId: order.userId,
    planId: order.planId,
    billingCycle: order.billingCycle,
    status: "active",
    currentPeriodEnd: nextPeriod,
  }).returning();

  await db.update(ordersTable)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(ordersTable.id, order.id));

  await db.update(paymentsTable)
    .set({ status: "paid", rawWebhook, moyasarPaymentId: moyasarPaymentId ?? null, updatedAt: new Date() })
    .where(eq(paymentsTable.orderId, order.id));

  const [shipment] = await db.insert(shipmentsTable).values({
    orderId: order.id,
    carrier: "MOFK Fulfillment",
    trackingNumber: `MFK-${order.id.slice(0, 8).toUpperCase()}`,
    status: "preparing",
  }).returning();

  await db.insert(devicesTable).values({
    serial: `MFK-${randomUUID().slice(0, 8).toUpperCase()}`,
    userId: order.userId,
    subscriptionId: subscription.id,
    status: "shipped",
  });

  return { orderId: order.id, subscriptionId: subscription.id, shipmentId: shipment.id };
}

router.get("/plans", async (_req, res): Promise<void> => {
  const rows = await db.select().from(subscriptionPlansTable).orderBy(subscriptionPlansTable.sortOrder);
  res.json(rows);
});

router.post("/checkout/plan", requireAuth, async (req, res): Promise<void> => {
  const parsed = z.object({
    planId: z.string().min(1),
    billingCycle: billingCycleSchema,
    shippingAddress: shippingAddressSchema,
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, parsed.data.planId)).limit(1);
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  if (plan.tier === "free" || plan.tier === "fleet" || !paidPlanIds.includes(plan.id)) {
    res.status(400).json({ error: "This plan does not use self-checkout" });
    return;
  }

  const subscriptionAmount = periodPrice(plan, parsed.data.billingCycle);
  const deviceAmount = plan.devicePriceSar;
  const subtotal = subscriptionAmount + deviceAmount;
  const vat = vatFor(subtotal);
  const total = subtotal + vat;

  const [order] = await db.insert(ordersTable).values({
    userId: req.userId,
    planId: plan.id,
    billingCycle: parsed.data.billingCycle,
    status: "created",
    subtotal,
    vat,
    total,
    shippingAddress: parsed.data.shippingAddress,
  }).returning();

  await db.insert(orderItemsTable).values([
    {
      orderId: order.id,
      type: "device",
      description: "جهاز مفك OBD - رسوم مرة واحدة",
      amount: deviceAmount,
    },
    {
      orderId: order.id,
      type: "subscription",
      description: parsed.data.billingCycle === "annual" ? "أول سنة اشتراك" : "أول شهر اشتراك",
      amount: subscriptionAmount,
    },
  ]);

  res.status(201).json({ orderId: order.id, status: order.status, subtotal, vat, total });
});

router.post("/checkout/payment", requireAuth, async (req, res): Promise<void> => {
  const parsed = z.object({ orderId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.id, parsed.data.orderId), eq(ordersTable.userId, req.userId)))
    .limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (!["created", "pending_payment"].includes(order.status)) {
    res.status(409).json({ error: "Order is not payable" });
    return;
  }

  const moyasarPaymentId = `moyasar_pending_${randomUUID()}`;
  const [payment] = await db.insert(paymentsTable).values({
    orderId: order.id,
    moyasarPaymentId,
    status: "pending",
    amount: order.total,
  }).returning();

  await db.update(ordersTable).set({ status: "pending_payment", updatedAt: new Date() }).where(eq(ordersTable.id, order.id));

  res.status(201).json({
    paymentId: payment.id,
    moyasarPaymentId,
    status: "pending",
    amount: order.total,
    resultPath: "/checkout/result",
  });
});

router.post("/webhooks/moyasar", async (req, res): Promise<void> => {
  const signature = req.header("x-moyasar-signature") || req.header("moyasar-signature") || undefined;
  if (!verifyMoyasarSignature(req.body, signature)) {
    res.status(401).json({ error: "Invalid Moyasar signature" });
    return;
  }

  const parsed = z.object({
    id: z.string().optional(),
    status: z.string(),
    metadata: z.object({ orderId: z.string().uuid() }).optional(),
    orderId: z.string().uuid().optional(),
  }).passthrough().safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const orderId = parsed.data.metadata?.orderId ?? parsed.data.orderId;
  if (!orderId) {
    res.status(400).json({ error: "Missing order id" });
    return;
  }
  if (parsed.data.status !== "paid") {
    await db.update(paymentsTable)
      .set({ status: parsed.data.status, rawWebhook: req.body, updatedAt: new Date() })
      .where(eq(paymentsTable.orderId, orderId));
    res.json({ received: true });
    return;
  }

  const result = await activatePaidOrder(orderId, req.body, parsed.data.id);
  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json({ received: true, ...result });
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const [order] = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.id, req.params.id), eq(ordersTable.userId, req.userId)))
    .limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.orderId, order.id)).limit(1);
  res.json({ order, items, shipment });
});

router.post("/devices/activate", requireAuth, async (req, res): Promise<void> => {
  const parsed = z.object({
    serial: z.string().min(3),
    mode: z.enum(["ble", "serial", "qr"]).default("serial"),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [device] = await db.update(devicesTable)
    .set({ status: "active", pairedAt: new Date() })
    .where(and(eq(devicesTable.serial, parsed.data.serial), eq(devicesTable.userId, req.userId)))
    .returning();

  if (!device) {
    res.status(404).json({ error: "Device not found for this user" });
    return;
  }
  res.json({ device, mode: parsed.data.mode });
});

router.get("/subscription/me", requireAuth, async (req, res): Promise<void> => {
  const [subscription] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, req.userId))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);
  res.json({ subscription: subscription ?? null });
});

router.post("/fleet-contact", async (req, res): Promise<void> => {
  const parsed = z.object({
    companyName: z.string().min(2),
    contact: z.record(z.unknown()),
    vehiclesCount: z.number().int().min(5),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [fleet] = await db.insert(fleetAccountsTable).values({
    companyName: parsed.data.companyName,
    contact: parsed.data.contact,
    vehiclesCount: parsed.data.vehiclesCount,
    status: "new",
  }).returning();
  res.status(201).json(fleet);
});

export default router;
