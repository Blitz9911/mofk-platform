import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  LucideIcon,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

type PaymentState = "success" | "pending" | "past_due";

const paymentState: PaymentState = "success";

const stateCopy: Record<PaymentState, { title: string; body: string; tone: string; icon: LucideIcon }> = {
  success: {
    title: "اشتراكك نشط",
    body: "يمكنك تغيير الباقة أو دورة الفوترة، وسيتم تطبيق الصلاحيات من الخادم عند الربط.",
    tone: "border-[#2ECC71]/30 bg-[#2ECC71]/10 text-[#DFF8E8]",
    icon: CheckCircle2,
  },
  pending: {
    title: "الدفع قيد المعالجة",
    body: "سنحدث حالة الاشتراك تلقائيًا بعد اكتمال عملية الدفع.",
    tone: "border-[#FF6A00]/40 bg-[#FF6A00]/10 text-white",
    icon: RefreshCw,
  },
  past_due: {
    title: "تعذر تحصيل الدفعة",
    body: "حدث مشكلة في الدفع. أعد المحاولة لتجنب فقدان ميزات الباقة.",
    tone: "border-red-500/40 bg-red-500/10 text-red-100",
    icon: AlertCircle,
  },
};

function PlanAmount({ planId, cycle }: { planId: SubscriptionPlanId; cycle: BillingCycle }) {
  const plan = getPlanById(planId);

  if (plan.saleType === "sales-led") {
    return (
      <>
        <span className="text-2xl font-black">تواصل معنا</span>
        <span className="text-xs text-[#8A8A8A]">بدون سعر معلن</span>
      </>
    );
  }

  const price = getDisplayPrice(plan, cycle) ?? 0;
  const monthlyEquivalent = getMonthlyEquivalent(plan);
  const displayPrice = cycle === "yearly" && monthlyEquivalent ? monthlyEquivalent : price;

  return (
    <>
      <span className="text-3xl font-black">{formatSar(displayPrice)}</span>
      <span className="text-xs text-[#8A8A8A]">
        ر.س / شهر
        {cycle === "yearly" && plan.yearlyPrice ? `، تدفع ${formatSar(plan.yearlyPrice)} سنويًا وتوفر ${getYearlySavings(plan)}٪` : ""}
      </span>
    </>
  );
}

function CellValue({ value }: { value: string }) {
  if (value === "نعم") return <CheckCircle2 className="mx-auto h-5 w-5 text-[#2ECC71]" />;
  if (value === "لا") return <span className="text-[#5A5A5A]">-</span>;
  return <span>{value}</span>;
}

export default function Subscription() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>("mofk");

  const currentPlanId: SubscriptionPlanId = "free";
  const currentPlan = getPlanById(currentPlanId);
  const selectedPlan = useMemo(() => getPlanById(selectedPlanId), [selectedPlanId]);
  const StatusIcon = stateCopy[paymentState].icon;

  return (
    <div className="dark -m-4 min-h-screen bg-[#0B0B0B] p-4 text-white md:-m-6 md:p-6" dir="rtl" style={{ fontFamily: "Tajawal, Cairo, Almarai, system-ui, sans-serif" }}>
      <div className="mx-auto max-w-7xl space-y-6 pb-28">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-[#FF6A00]">الاشتراك والباقات</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal md:text-4xl">إدارة اشتراك موفك</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#8A8A8A]">
              مجاني للأساسيات، مفك لمركبة واحدة، العائلة لعدة مركبات، والأسطول للشركات.
            </p>
          </div>

          <div className="inline-grid w-full grid-cols-2 rounded-[12px] border border-[#2A2A2A] bg-[#1A1A1A] p-1 sm:w-auto" role="tablist" aria-label="دورة الفوترة">
            {(["monthly", "yearly"] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                type="button"
                role="tab"
                aria-selected={billingCycle === cycle}
                aria-pressed={billingCycle === cycle}
                onClick={() => setBillingCycle(cycle)}
                className={cn(
                  "rounded-[10px] px-5 py-3 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]",
                  billingCycle === cycle ? "bg-[#FF6A00] text-white" : "text-[#8A8A8A] hover:text-white",
                )}
              >
                {cycle === "monthly" ? "شهري" : "سنوي"}
                {cycle === "yearly" && <span className="me-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">وفر أكثر</span>}
              </button>
            ))}
          </div>
        </div>

        <section className={cn("rounded-[16px] border p-5", stateCopy[paymentState].tone)}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <StatusIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h2 className="text-lg font-black">{stateCopy[paymentState].title}</h2>
                <p className="mt-1 text-sm leading-6 opacity-85">{stateCopy[paymentState].body}</p>
              </div>
            </div>
            {paymentState === "past_due" && <Button className="rounded-[12px] bg-[#FF6A00] hover:bg-[#E65C00]">إعادة محاولة الدفع</Button>}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-[16px] border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <ShieldCheck className="h-5 w-5 text-[#FF6A00]" />
            <p className="mt-4 text-sm text-[#8A8A8A]">الباقة الحالية</p>
            <h2 className="mt-1 text-2xl font-black">{currentPlan.name}</h2>
          </div>
          <div className="rounded-[16px] border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <CalendarClock className="h-5 w-5 text-[#FF6A00]" />
            <p className="mt-4 text-sm text-[#8A8A8A]">حالة التجربة</p>
            <h2 className="mt-1 text-2xl font-black">٧ أيام متبقية</h2>
          </div>
          <div className="rounded-[16px] border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <ReceiptText className="h-5 w-5 text-[#FF6A00]" />
            <p className="mt-4 text-sm text-[#8A8A8A]">الفوترة المختارة</p>
            <h2 className="mt-1 text-2xl font-black">{billingCycle === "yearly" ? "سنوي" : "شهري"}</h2>
          </div>
          <div className="rounded-[16px] border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <CreditCard className="h-5 w-5 text-[#FF6A00]" />
            <p className="mt-4 text-sm text-[#8A8A8A]">الدفع</p>
            <h2 className="mt-1 text-2xl font-black">جاهز للربط</h2>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {subscriptionPlans.map((plan) => {
            const selected = selectedPlanId === plan.id;
            const current = currentPlanId === plan.id;

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                aria-pressed={selected}
                className={cn(
                  "flex min-h-[360px] flex-col rounded-[16px] border bg-[#1A1A1A] p-5 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]",
                  selected ? "border-[#FF6A00] bg-[#222]" : "border-[#2A2A2A] hover:border-[#FF6A00]/70",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">{plan.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#8A8A8A]">{plan.subtitle}</p>
                  </div>
                  {plan.badge && <span className="rounded-full bg-[#FF6A00] px-2 py-1 text-xs font-black">الأكثر</span>}
                </div>

                <div className="mt-5 flex flex-col">
                  <PlanAmount planId={plan.id} cycle={billingCycle} />
                </div>

                <div className="mt-5 space-y-3">
                  {plan.included.slice(0, 4).map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm leading-6">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2ECC71]" />
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-5">
                  <div className={cn("rounded-[12px] px-4 py-3 text-center text-sm font-black", current ? "bg-[#2ECC71]/15 text-[#BDF2CC]" : "bg-[#0B0B0B] text-white")}>
                    {current ? "باقتك الحالية" : plan.saleType === "sales-led" ? "تواصل مع المبيعات" : selected ? "محددة" : "اختيار"}
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        <section className="rounded-[16px] border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold text-[#FF6A00]">تفاصيل الباقة</p>
              <h2 className="mt-2 text-2xl font-black">{selectedPlan.name}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[#8A8A8A]">{selectedPlan.summary}</p>
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
        </section>

        <section className="rounded-[16px] border border-[#2A2A2A] bg-[#1A1A1A] p-5">
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
                      <td className="bg-[#FF6A00]/5 p-3 text-center font-bold text-white"><CellValue value={row.mofk} /></td>
                      <td className="p-3 text-center text-[#CFCFCF]"><CellValue value={row.family} /></td>
                      <td className="p-3 text-center text-[#CFCFCF]"><CellValue value={row.fleet} /></td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedPlan.id !== "free" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#2A2A2A] bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B]/95 to-transparent px-4 pb-4 pt-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-[16px] border border-[#2A2A2A] bg-[#1A1A1A] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[#8A8A8A]">الترقية المحددة</p>
              <p className="text-lg font-black">{selectedPlan.name}</p>
            </div>
            <Button className="h-12 rounded-[12px] bg-[#FF6A00] px-8 text-base font-black hover:bg-[#E65C00]">
              {selectedPlan.saleType === "sales-led" ? "تواصل مع المبيعات" : "متابعة الدفع"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
