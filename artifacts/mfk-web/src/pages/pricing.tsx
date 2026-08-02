import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BillingCycle,
  SubscriptionPlanId,
  comparisonRows,
  formatSar,
  formatVehicles,
  getDisplayPrice,
  getMonthlyEquivalent,
  getPlanById,
  getYearlySavings,
  subscriptionPlans,
} from "@/data/subscriptionPlans";

function PlanPrice({ planId, cycle }: { planId: SubscriptionPlanId; cycle: BillingCycle }) {
  const plan = getPlanById(planId);

  if (plan.saleType === "sales-led") {
    return (
      <div className="space-y-1">
        <div className="text-3xl font-black text-foreground">تواصل معنا</div>
        <p className="text-sm text-muted-foreground">بدون سعر معلن</p>
      </div>
    );
  }

  const price = getDisplayPrice(plan, cycle) ?? 0;
  const monthlyEquivalent = getMonthlyEquivalent(plan);
  const displayPrice = cycle === "yearly" && monthlyEquivalent ? monthlyEquivalent : price;

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-2">
        <span className="text-4xl font-black text-foreground">{formatSar(displayPrice)}</span>
        <span className="pb-1 text-sm text-muted-foreground">ر.س / شهر</span>
      </div>
      {cycle === "yearly" && plan.yearlyPrice ? (
        <p className="text-sm text-muted-foreground">يدفع {formatSar(plan.yearlyPrice)} ر.س سنويًا، وفر {getYearlySavings(plan)}٪</p>
      ) : (
        <p className="text-sm text-muted-foreground">{price === 0 ? "بدون بطاقة بنكية" : "دفع شهري مرن"}</p>
      )}
    </div>
  );
}

function CellValue({ value }: { value: string }) {
  if (value === "نعم") return <CheckCircle2 className="mx-auto h-5 w-5 text-[#2ECC71]" />;
  if (value === "لا") return <span className="text-muted-foreground">-</span>;
  return <span>{value}</span>;
}

function MobileComparisonCards() {
  return (
    <div className="space-y-3 md:hidden">
      {comparisonRows.map((row) =>
        row.type === "section" ? (
          <div key={row.label} className="rounded-[12px] bg-muted px-3 py-2 text-sm font-black text-primary">
            {row.label}
          </div>
        ) : (
          <div key={row.label} className="rounded-[14px] border border-border bg-card p-3">
            <p className="mb-3 text-sm font-black">{row.label}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["مجانية", row.free],
                ["مفك", row.mofk],
                ["العائلة", row.family],
                ["الاسطول", row.fleet],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[10px] bg-muted p-2">
                  <p className="mb-1 text-muted-foreground">{label}</p>
                  <div className="font-bold text-foreground"><CellValue value={value} /></div>
                </div>
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function authCheckoutHref(plan: "mofk" | "family") {
  const params = new URLSearchParams({ next: "/checkout/plan", plan });
  return `/auth?${params.toString()}`;
}

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>("mofk");
  const [isLoading] = useState(false);
  const [networkError] = useState(false);

  const selectedPlan = useMemo(() => getPlanById(selectedPlanId), [selectedPlanId]);
  const checkoutHrefByPlan: Record<SubscriptionPlanId, string> = {
    free: "/onboarding?plan=free",
    mofk: authCheckoutHref("mofk"),
    family: authCheckoutHref("family"),
    fleet: "/fleet-contact",
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl" style={{ fontFamily: "Tajawal, Cairo, Almarai, system-ui, sans-serif" }}>
      <Header />

      <main className="pb-32 pt-28 md:pt-32">
        <section className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <div className="max-w-3xl space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl font-black leading-tight tracking-normal sm:text-4xl md:text-6xl">اختر الباقة المناسبة لسيارتك</h1>
              <p className="max-w-xl text-base leading-8 text-muted-foreground md:text-lg">
                باقة مجانية للأساسيات، باقة مفك لمركبة واحدة، باقة العائلة لعدة مركبات، وباقة الاسطول للشركات عبر المبيعات.
              </p>
            </div>

            <div className="inline-grid grid-cols-2 rounded-[12px] border border-border bg-card p-1" role="tablist" aria-label="دورة الفوترة">
              {(["monthly", "yearly"] as BillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  role="tab"
                  aria-selected={billingCycle === cycle}
                  aria-pressed={billingCycle === cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={cn(
                    "min-w-[112px] rounded-[10px] px-5 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]",
                    billingCycle === cycle ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <span>{cycle === "monthly" ? "شهري" : "سنوي"}</span>
                    {cycle === "yearly" && (
                      <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs leading-none">وفر أكثر</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 w-full max-w-[min(100%,1760px)] px-4 md:px-6">
          {networkError && (
            <div className="mb-4 flex items-center gap-3 rounded-[16px] border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
              <AlertCircle className="h-5 w-5" />
              تعذر تحميل الخطط. تحقق من الاتصال ثم حاول مرة أخرى.
            </div>
          )}

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-[420px] rounded-[16px] bg-card" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {subscriptionPlans.map((plan) => {
                const selected = selectedPlanId === plan.id;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    aria-pressed={selected}
                    className={cn(
                      "relative flex min-h-[340px] flex-col rounded-[16px] border bg-card p-4 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[410px] sm:p-5",
                      selected ? "border-primary bg-primary/5 dark:bg-[#222]" : "border-border hover:border-primary/70",
                    )}
                  >
                    {plan.badge && <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">{plan.badge}</span>}

                    <div className="space-y-3">
                      <h2 className="text-2xl font-black">{plan.name}</h2>
                      <p className="min-h-12 text-sm leading-6 text-muted-foreground">{plan.subtitle}</p>
                      <PlanPrice planId={plan.id} cycle={billingCycle} />
                    </div>

                    <div className="mt-6 space-y-3">
                      {plan.included.slice(0, 5).map((feature) => (
                        <div key={feature} className="flex items-start gap-2 text-sm leading-6">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2ECC71]" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto pt-6">
                      <div className="rounded-[12px] border border-border bg-background px-4 py-3 text-center text-sm font-bold text-foreground">
                        {plan.saleType === "sales-led" ? "تواصل مع المبيعات" : selected ? "الباقة المحددة" : "اختيار الباقة"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="mx-auto mt-6 w-full max-w-7xl px-4 md:px-6">
          <div className="rounded-[16px] border border-border bg-card p-5 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold text-primary">تفاصيل الباقة</p>
                <h2 className="mt-2 text-2xl font-black">{selectedPlan.name}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{selectedPlan.summary}</p>
              </div>
              <div className="rounded-[12px] border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                {selectedPlan.maxVehicles === "sales" ? "٥ مركبات فأكثر" : `حتى ${formatVehicles(selectedPlan.maxVehicles)} مركبة`}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {selectedPlan.included.map((feature) => (
                <div key={feature} className="flex items-start gap-3 rounded-[12px] bg-muted p-3 text-sm leading-6">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2ECC71]" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 w-full max-w-7xl px-4 md:px-6">
          <div className="rounded-[16px] border border-border bg-card p-5 md:p-6">
            <div className="mb-6">
              <p className="text-sm font-bold text-primary">جدول المقارنة</p>
              <h2 className="mt-2 text-2xl font-black">مقارنة الميزات</h2>
            </div>
            <MobileComparisonCards />
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="p-3 text-right">الميزة</th>
                    <th className="p-3 text-center">باقة مجانية</th>
                    <th className="p-3 text-center text-primary">باقة مفك</th>
                    <th className="p-3 text-center">باقة العائلة</th>
                    <th className="p-3 text-center">باقة الاسطول</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) =>
                    row.type === "section" ? (
                      <tr key={row.label}>
                        <td colSpan={5} className="bg-muted p-3 text-sm font-black text-primary">{row.label}</td>
                      </tr>
                    ) : (
                      <tr key={row.label} className="border-b border-border/80">
                        <td className="p-3 font-bold">{row.label}</td>
                        <td className="p-3 text-center text-muted-foreground"><CellValue value={row.free} /></td>
                        <td className="bg-primary/5 p-3 text-center font-bold text-foreground"><CellValue value={row.mofk} /></td>
                        <td className="p-3 text-center text-muted-foreground"><CellValue value={row.family} /></td>
                        <td className="p-3 text-center text-muted-foreground"><CellValue value={row.fleet} /></td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {selectedPlan.id !== "free" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-4 pt-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-[16px] border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">الباقة المحددة</p>
              <p className="text-lg font-black">{selectedPlan.name}</p>
            </div>
            <Link href={checkoutHrefByPlan[selectedPlan.id]}>
              <Button className="h-12 w-full rounded-[12px] bg-primary px-8 text-base font-black text-primary-foreground hover:bg-[#E65C00] sm:w-auto">
                {selectedPlan.saleType === "sales-led" ? "تواصل مع المبيعات" : "ابدأ الاشتراك"}
              </Button>
            </Link>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
