/** Isolated from real checkout / StoreKit. Replace this module later with Apple IAP. */

export type SubscriptionBillingCycle = "monthly" | "yearly";

export type SubscriptionTrialSelection = {
  planId: string;
  planNameAr: string;
  billingCycle: SubscriptionBillingCycle;
  priceSar: number;
};

export type SubscriptionTrialResult = {
  kind: "preview-only";
  charged: false;
  subscriptionMutated: false;
  selection: SubscriptionTrialSelection;
  confirmedAt: string;
};

export type PricedPlan = {
  priceMonthlySar: number;
  priceYearlySar?: number | null;
};

export function cyclePriceSar(plan: PricedPlan, cycle: SubscriptionBillingCycle): number | null {
  if (cycle === "monthly") {
    return Number.isFinite(plan.priceMonthlySar) ? plan.priceMonthlySar : null;
  }
  if (typeof plan.priceYearlySar !== "number" || !Number.isFinite(plan.priceYearlySar)) {
    return null;
  }
  return plan.priceYearlySar;
}

export function confirmSubscriptionTrialPreview(
  selection: SubscriptionTrialSelection,
): SubscriptionTrialResult {
  return {
    kind: "preview-only",
    charged: false,
    subscriptionMutated: false,
    selection,
    confirmedAt: new Date().toISOString(),
  };
}

export async function activateAccountSubscription(selection: SubscriptionTrialSelection) {
  const response = await fetch("/api/subscriptions/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planId: selection.planId,
      billingCycle: selection.billingCycle,
    }),
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || data?.message || "تعذر تفعيل الباقة على الحساب.");
  }
  return data as {
    tier: string;
    status: string;
    startedAt?: string | null;
    endsAt?: string | null;
    autoRenew?: boolean;
  };
}
