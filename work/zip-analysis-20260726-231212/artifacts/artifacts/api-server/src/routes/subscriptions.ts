import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, subscriptionPlansTable, usersTable } from "@workspace/db";
import {
  ListSubscriptionPlansResponse,
  GetMySubscriptionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

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
  const tier = (u.subscriptionTier as "free" | "premium" | "fleet") ?? "free";
  const status =
    u.subscriptionEndsAt && u.subscriptionEndsAt > new Date()
      ? "active"
      : tier === "free"
        ? "active"
        : "expired";
  res.json(
    GetMySubscriptionResponse.parse({
      tier,
      status,
      startedAt: u.subscriptionStartedAt,
      endsAt: u.subscriptionEndsAt,
      autoRenew: u.subscriptionAutoRenew,
    }),
  );
});

export default router;
