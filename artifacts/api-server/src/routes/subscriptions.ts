import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, subscriptionPlansTable, subscriptionsTable, usersTable } from "@workspace/db";
import {
  ListSubscriptionPlansResponse,
  GetMySubscriptionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function entitlementTier(raw?: string | null) {
  const value = String(raw || "free").toLowerCase();
  if (value === "plus" || value === "mofk" || value === "individual-basic") return "mofk";
  if (value === "premium" || value === "pro" || value === "family" || value === "individual-advanced") {
    return "family";
  }
  if (value === "fleet") return "fleet";
  if (value === "free") return "free";
  return value;
}

router.get("/subscriptions/plans", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(subscriptionPlansTable)
    .orderBy(subscriptionPlansTable.sortOrder);
  res.json(ListSubscriptionPlansResponse.parse(rows));
});

router.get("/subscriptions/me", async (req, res): Promise<void> => {
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId));
  if (!u) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [latest] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, req.userId))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);

  const fromSubscription =
    latest && (latest.status === "active" || latest.status === "inactive")
      ? entitlementTier(latest.planId)
      : null;
  const fromUser = entitlementTier(u.subscriptionTier);
  const tier = (fromUser !== "free" ? fromUser : fromSubscription) || "free";
  const endsAt = u.subscriptionEndsAt ?? latest?.currentPeriodEnd ?? null;
  const startedAt = u.subscriptionStartedAt ?? latest?.createdAt ?? null;
  const status =
    u.isActive === false
      ? "cancelled"
      : endsAt && endsAt < new Date() && tier !== "free"
        ? "expired"
        : "active";

  res.json(
    GetMySubscriptionResponse.parse({
      tier,
      status,
      startedAt,
      endsAt,
      autoRenew: u.subscriptionAutoRenew,
    }),
  );
});

export default router;
