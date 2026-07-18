import { useState } from "react";
import { useLocation } from "wouter";
import { Crown } from "lucide-react";

import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { BillingCycle, plans } from "@/config/plans";
import { BillingCycleSelector, PlanCard } from "@/components/commerce/commerce-components";
import { Button } from "@/components/ui/button";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [selectedPlanId, setSelectedPlanId] = useState(plans[1].id);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[1];

  const selectPlan = (planId: string) => {
    const plan = plans.find((item) => item.id === planId);
    if (!plan) return;
    setSelectedPlanId(plan.id);
    if (plan.isFree) {
      setLocation("/onboarding?plan=free");
      return;
    }
    if (plan.isFleet) {
      setLocation("/fleet-contact");
      return;
    }
    setLocation(`/checkout/${plan.id}`);
  };

  return (
    <div className="dark min-h-screen bg-[#0B0B0B] text-white" dir="rtl">
      <Header />
      <main className="pb-24 pt-28 md:pt-32">
        <section className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-[#8A8A8A]">
              <Crown className="h-4 w-4 text-[#FF6A00]" />
              باقات مفك
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black leading-tight tracking-normal md:text-6xl">
                اختر الباقة وابدأ مسار الاشتراك الصحيح
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#8A8A8A] md:text-lg">
                العميل يشتري الباقة فقط. الجهاز ليس منتجًا مستقلًا، بل يكون مشمولًا داخل باقات الأفراد المدفوعة أو حسب عقد الأسطول.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-8 w-full max-w-7xl px-4 md:px-6">
          <div className="max-w-md rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-3">
            <BillingCycleSelector plan={selectedPlan.supportsMonthly ? selectedPlan : plans[1]} value={billingCycle} onChange={setBillingCycle} />
          </div>
        </section>

        <section className="mx-auto mt-8 w-full max-w-7xl px-4 md:px-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                cycle={billingCycle}
                selected={selectedPlanId === plan.id}
                onSelect={() => selectPlan(plan.id)}
              />
            ))}
          </div>
        </section>

        <section className="mx-auto mt-8 w-full max-w-7xl px-4 md:px-6">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#FF6A00]">تفاصيل المسار</p>
                <h2 className="mt-2 text-2xl font-black">{selectedPlan.nameAr}</h2>
                <p className="mt-2 text-sm leading-7 text-[#8A8A8A]">{selectedPlan.descriptionAr}</p>
              </div>
              <Button className="rounded-xl bg-[#FF6A00] font-bold hover:bg-[#E65C00]" onClick={() => selectPlan(selectedPlan.id)}>
                {selectedPlan.ctaLabelAr}
              </Button>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-[#222] p-4">
                <div className="text-xs text-[#8A8A8A]">الجهاز</div>
                <div className="mt-1 font-bold">{selectedPlan.includesDevice ? "مشمول في المسار" : "غير مطلوب"}</div>
              </div>
              <div className="rounded-xl bg-[#222] p-4">
                <div className="text-xs text-[#8A8A8A]">الشحن</div>
                <div className="mt-1 font-bold">{selectedPlan.requiresShipping ? "مطلوب" : "غير مطلوب"}</div>
              </div>
              <div className="rounded-xl bg-[#222] p-4">
                <div className="text-xs text-[#8A8A8A]">الدفع</div>
                <div className="mt-1 font-bold">{selectedPlan.isFree ? "لا يوجد دفع" : selectedPlan.isFleet ? "عبر عرض مبيعات" : "Checkout الأفراد"}</div>
              </div>
              <div className="rounded-xl bg-[#222] p-4">
                <div className="text-xs text-[#8A8A8A]">الدعم</div>
                <div className="mt-1 font-bold">{selectedPlan.supportLevelAr}</div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
