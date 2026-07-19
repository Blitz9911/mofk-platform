import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertCircle, CheckCircle2, Crown } from "lucide-react";
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
        <div className="text-3xl font-black text-white">تواصل معنا</div>
        <p className="text-sm text-[#8A8A8A]">بدون سعر معلن</p>
      </div>
    );
  }

  const price = getDisplayPrice(plan, cycle) ?? 0;
  const monthlyEquivalent = getMonthlyEquivalent(plan);
  const displayPrice = cycle === "yearly" && monthlyEquivalent ? monthlyEquivalent : price;

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-2">
        <span className="text-4xl font-black text-white">{formatSar(displayPrice)}</span>
        <span className="pb-1 text-sm text-[#8A8A8A]">ر.س / شهر</span>
      </div>
      {cycle === "yearly" && plan.yearlyPrice ? (
        <p className="text-sm text-[#8A8A8A]">يدفع {formatSar(plan.yearlyPrice)} ر.س سنويًا، وفر {getYearlySavings(plan)}٪</p>
      ) : (
        <p className="text-sm text-[#8A8A8A]">{price === 0 ? "بدون بطاقة بنكية" : "دفع شهري مرن"}</p>
      )}
    </div>
  );
}

function CellValue({ value }: { value: string }) {
  if (value === "نعم") return <CheckCircle2 className="mx-auto h-5 w-5 text-[#2ECC71]" />;
  if (value === "لا") return <span className="text-[#5A5A5A]">-</span>;
  return <span>{value}</span>;
}

function authCheckoutHref(plan: "plus" | "pro") {
  const params = new URLSearchParams({ next: "/checkout/plan", plan });
  return `/auth?${params.toString()}`;
}

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>("plus");
  const [isLoading] = useState(false);
  const [networkError] = useState(false);

  const selectedPlan = useMemo(() => getPlanById(selectedPlanId), [selectedPlanId]);
  const checkoutHrefByPlan: Record<SubscriptionPlanId, string> = {
    free: "/onboarding?plan=free",
    plus: authCheckoutHref("plus"),
    pro: authCheckoutHref("pro"),
    fleet: "/fleet-contact",
  };

  return (
    <div className="dark min-h-screen bg-[#0B0B0B] text-white" dir="rtl" style={{ fontFamily: "Tajawal, Cairo, Almarai, system-ui, sans-serif" }}>
      <Header />

      <main className="pb-32 pt-28 md:pt-32">
        <section className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-[#8A8A8A]">
              <Crown className="h-4 w-4 text-[#FF6A00]" />
              باقات موفك
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black leading-tight tracking-normal md:text-6xl">اختر الباقة المناسبة لسيارتك</h1>
              <p className="max-w-xl text-base leading-8 text-[#8A8A8A] md:text-lg">
                مجاني للأساسيات، مفك لمركبة واحدة، العائلة لعدة مركبات، والأسطول للشركات عبر المبيعات.
              </p>
            </div>

            <div className="inline-grid grid-cols-2 rounded-[12px] border border-[#2A2A2A] bg-[#1A1A1A] p-1" role="tablist" aria-label="دورة الفوترة">
              {(["monthly", "yearly"] as BillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  role="tab"
                  aria-selected={billingCycle === cycle}
                  aria-pressed={billingCycle === cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={cn(
                    "rounded-[10px] px-5 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]",
                    billingCycle === cycle ? "bg-[#FF6A00] text-white" : "text-[#8A8A8A] hover:text-white",
                  )}
                >
                  {cycle === "monthly" ? "شهري" : "سنوي"}
                  {cycle === "yearly" && <span className="me-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">وفر أكثر</span>}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 w-full max-w-7xl px-4 md:px-6">
          {networkError && (
            <div className="mb-4 flex items-center gap-3 rounded-[16px] border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
              <AlertCircle className="h-5 w-5" />
              تعذر تحميل الخطط. تحقق من الاتصال ثم حاول مرة أخرى.
            </div>
          )}

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-[420px] rounded-[16px] bg-[#1A1A1A]" />
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
                      "relative flex min-h-[410px] flex-col rounded-[16px] border bg-[#1A1A1A] p-5 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]",
                      selected ? "border-[#FF6A00] bg-[#222]" : "border-[#2A2A2A] hover:border-[#FF6A00]/70",
                    )}
                  >
                    {plan.badge && <span className="absolute left-4 top-4 rounded-full bg-[#FF6A00] px-3 py-1 text-xs font-black text-white">{plan.badge}</span>}

                    <div className="space-y-3">
                      <h2 className="text-2xl font-black">{plan.name}</h2>
                      <p className="min-h-12 text-sm leading-6 text-[#8A8A8A]">{plan.subtitle}</p>
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
                      <div className="rounded-[12px] border border-[#2A2A2A] bg-[#0B0B0B] px-4 py-3 text-center text-sm font-bold text-white">
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
          <div className="rounded-[16px] border border-[#2A2A2A] bg-[#1A1A1A] p-5 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#FF6A00]">تفاصيل الباقة</p>
                <h2 className="mt-2 text-2xl font-black">{selectedPlan.name}</h2>
                <p className="mt-2 text-sm leading-7 text-[#8A8A8A]">{selectedPlan.summary}</p>
              </div>
              <div className="rounded-[12px] border border-[#2A2A2A] bg-[#222] px-4 py-3 text-sm text-[#8A8A8A]">
                {selectedPlan.maxVehicles === "sales" ? "٥ مركبات فأكثر" : `حتى ${formatVehicles(selectedPlan.maxVehicles)} مركبة`}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {selectedPlan.included.map((feature) => (
                <div key={feature} className="flex items-start gap-3 rounded-[12px] bg-[#222] p-3 text-sm leading-6">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2ECC71]" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 w-full max-w-7xl px-4 md:px-6">
          <div className="rounded-[16px] border border-[#2A2A2A] bg-[#1A1A1A] p-5 md:p-6">
            <div className="mb-6">
              <p className="text-sm font-bold text-[#FF6A00]">جدول المقارنة</p>
              <h2 className="mt-2 text-2xl font-black">مقارنة الميزات</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A] text-[#8A8A8A]">
                    <th className="p-3 text-right">الميزة</th>
                    <th className="p-3 text-center">مجاني</th>
                    <th className="p-3 text-center text-[#FF6A00]">مفك</th>
                    <th className="p-3 text-center">العائلة</th>
                    <th className="p-3 text-center">أسطول</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) =>
                    row.type === "section" ? (
                      <tr key={row.label}>
                        <td colSpan={5} className="bg-[#0B0B0B] p-3 text-sm font-black text-[#FF6A00]">{row.label}</td>
                      </tr>
                    ) : (
                      <tr key={row.label} className="border-b border-[#2A2A2A]/80">
                        <td className="p-3 font-bold">{row.label}</td>
                        <td className="p-3 text-center text-[#CFCFCF]"><CellValue value={row.free} /></td>
                        <td className="bg-[#FF6A00]/5 p-3 text-center font-bold text-white"><CellValue value={row.plus} /></td>
                        <td className="p-3 text-center text-[#CFCFCF]"><CellValue value={row.pro} /></td>
                        <td className="p-3 text-center text-[#CFCFCF]"><CellValue value={row.fleet} /></td>
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
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#2A2A2A] bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B]/95 to-transparent px-4 pb-4 pt-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-[16px] border border-[#2A2A2A] bg-[#1A1A1A] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[#8A8A8A]">الباقة المحددة</p>
              <p className="text-lg font-black">{selectedPlan.name}</p>
            </div>
            <Link href={checkoutHrefByPlan[selectedPlan.id]}>
              <Button className="h-12 w-full rounded-[12px] bg-[#FF6A00] px-8 text-base font-black hover:bg-[#E65C00] sm:w-auto">
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
