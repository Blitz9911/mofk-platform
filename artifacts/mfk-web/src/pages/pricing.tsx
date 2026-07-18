import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Crown,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BillingCycle,
  SubscriptionPlanId,
  formatSar,
  formatVehicles,
  getDisplayPrice,
  getFleetPreview,
  getMonthlyEquivalent,
  getPlanById,
  getYearlySavings,
  subscriptionPlans,
} from "@/data/subscriptionPlans";

const statusMessages = [
  { icon: Sparkles, title: "تجربة مجانية", body: "يمكنك البدء الآن، وسجل الصيانة اليدوي يبقى محفوظًا دائمًا." },
  { icon: ShieldCheck, title: "مشترك حالي", body: "سنظهر باقتك الحالية ونقترح الترقية المناسبة بدون إخفاء الميزات المقفلة." },
  { icon: AlertCircle, title: "تعثر الدفع", body: "إذا فشل الدفع ستظهر رسالة واضحة مع زر إعادة المحاولة قبل إيقاف الميزات." },
];

function PlanPrice({
  planId,
  cycle,
}: {
  planId: SubscriptionPlanId;
  cycle: BillingCycle;
}) {
  const plan = getPlanById(planId);

  if (plan.id === "fleet") {
    return (
      <div className="space-y-1">
        <div className="text-3xl font-black text-white">حسب العدد</div>
        <p className="text-sm text-[#8A8A8A]">يبدأ من ٢١ ر.س لكل مركبة</p>
      </div>
    );
  }

  const price = getDisplayPrice(plan, cycle) ?? 0;
  const monthlyEquivalent = getMonthlyEquivalent(plan);

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-2">
        <span className="text-4xl font-black text-white">{formatSar(cycle === "yearly" && monthlyEquivalent ? monthlyEquivalent : price)}</span>
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

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>("plus");
  const [fleetOpen, setFleetOpen] = useState(false);
  const [fleetVehicles, setFleetVehicles] = useState(30);
  const [isLoading] = useState(false);
  const [networkError] = useState(false);

  const selectedPlan = useMemo(() => getPlanById(selectedPlanId), [selectedPlanId]);
  const fleetPreview = getFleetPreview(fleetVehicles);

  return (
    <div className="dark min-h-screen bg-[#0B0B0B] text-white" dir="rtl" style={{ fontFamily: "Tajawal, Cairo, Almarai, system-ui, sans-serif" }}>
      <Header />

      <main className="pb-32 pt-28 md:pt-32">
        <section className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-[#8A8A8A]">
                <Crown className="h-4 w-4 text-[#FF6A00]" />
                اشتراكات موفك الجديدة
              </div>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-normal md:text-6xl">
                  اختر الباقة التي تفهم سيارتك معك
                </h1>
                <p className="max-w-xl text-base leading-8 text-[#8A8A8A] md:text-lg">
                  خطط واضحة للأفراد والعائلات والأساطيل، مع ميزات مقفلة ظاهرة بدل إخفائها حتى تعرف بالضبط ماذا ستحصل عند الترقية.
                </p>
              </div>

              <div
                className="inline-grid grid-cols-2 rounded-[12px] border border-[#2A2A2A] bg-[#1A1A1A] p-1"
                role="tablist"
                aria-label="دورة الفوترة"
              >
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
                      billingCycle === cycle
                        ? "bg-[#FF6A00] text-white"
                        : "text-[#8A8A8A] hover:text-white",
                    )}
                  >
                    {cycle === "monthly" ? "شهري" : "سنوي"}
                    {cycle === "yearly" && <span className="me-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">وفر ٤٠٪</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {statusMessages.map((item) => (
                <div key={item.title} className="rounded-[16px] border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                  <item.icon className="mb-4 h-5 w-5 text-[#FF6A00]" />
                  <h2 className="text-sm font-bold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#8A8A8A]">{item.body}</p>
                </div>
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
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[1, 2, 3, 4, 5].map((item) => (
                <Skeleton key={item} className="h-[420px] rounded-[16px] bg-[#1A1A1A]" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {subscriptionPlans.map((plan) => {
                const selected = selectedPlanId === plan.id;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    aria-pressed={selected}
                    className={cn(
                      "relative flex min-h-[440px] flex-col rounded-[16px] border bg-[#1A1A1A] p-5 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]",
                      selected
                        ? "border-[#FF6A00] bg-[#222]"
                        : "border-[#2A2A2A] hover:border-[#FF6A00]/70",
                    )}
                  >
                    {plan.badge && (
                      <span className="absolute left-4 top-4 rounded-full bg-[#FF6A00] px-3 py-1 text-xs font-black text-white">
                        {plan.badge}
                      </span>
                    )}

                    <div className="space-y-3">
                      <h2 className="text-2xl font-black">{plan.name}</h2>
                      <p className="min-h-12 text-sm leading-6 text-[#8A8A8A]">{plan.subtitle}</p>
                      <PlanPrice planId={plan.id} cycle={billingCycle} />
                    </div>

                    <div className="mt-6 space-y-3">
                      {plan.included.slice(0, 4).map((feature) => (
                        <div key={feature} className="flex items-start gap-2 text-sm leading-6">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2ECC71]" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto pt-6">
                      <div className="rounded-[12px] border border-[#2A2A2A] bg-[#0B0B0B] px-4 py-3 text-center text-sm font-bold text-white">
                        {selected ? "الباقة المحددة" : "اختيار الباقة"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="mx-auto mt-6 grid w-full max-w-7xl gap-6 px-4 md:px-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[16px] border border-[#2A2A2A] bg-[#1A1A1A] p-5 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#FF6A00]">تفاصيل الباقة</p>
                <h2 className="mt-2 text-2xl font-black">{selectedPlan.name}</h2>
                <p className="mt-2 text-sm leading-7 text-[#8A8A8A]">{selectedPlan.summary}</p>
              </div>
              <div className="rounded-[12px] border border-[#2A2A2A] bg-[#222] px-4 py-3 text-sm text-[#8A8A8A]">
                الحد: {selectedPlan.maxVehicles === "fleet" ? "حسب العقد" : `${formatVehicles(selectedPlan.maxVehicles)} مركبة`}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-black">المتاح الآن</h3>
                {selectedPlan.included.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 rounded-[12px] bg-[#222] p-3 text-sm leading-6">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2ECC71]" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="font-black">ميزات مقفلة</h3>
                {selectedPlan.locked.length ? (
                  selectedPlan.locked.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 rounded-[12px] border border-[#2A2A2A] p-3 text-sm leading-6 text-[#8A8A8A]">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#5A5A5A]" />
                      <span>{feature}</span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[12px] border border-[#2A2A2A] p-3 text-sm leading-6 text-[#8A8A8A]">
                    لا توجد ميزات مقفلة لهذه الباقة ضمن العرض الحالي.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {selectedPlan.id === "free" && (
              <div className="rounded-[16px] border border-[#FF6A00]/40 bg-[#FF6A00]/10 p-5">
                <h2 className="text-xl font-black">باقة البداية</h2>
                <p className="mt-2 text-sm leading-7 text-[#E6E6E6]">
                  ابدأ بالمجاني ثم فعّل بلس عندما تحتاج تفسيرًا أوضح وتنبيهات صيانة ذكية.
                </p>
              </div>
            )}

            <Collapsible open={fleetOpen} onOpenChange={setFleetOpen}>
              <div className="rounded-[16px] border border-[#2A2A2A] bg-[#1A1A1A] p-5">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    aria-expanded={fleetOpen}
                    className="flex w-full items-center justify-between gap-4 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
                  >
                    <span>
                      <span className="flex items-center gap-2 text-xl font-black">
                        <Users className="h-5 w-5 text-[#FF6A00]" />
                        حاسبة الأسطول
                      </span>
                      <span className="mt-2 block text-sm text-[#8A8A8A]">مغلقة افتراضيًا، وافتحها لحساب تكلفة المركبات.</span>
                    </span>
                    <ChevronDown className={cn("h-5 w-5 transition", fleetOpen && "rotate-180")} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-6">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between rounded-[12px] bg-[#222] p-4">
                      <span className="text-sm text-[#8A8A8A]">عدد المركبات</span>
                      <span className="text-2xl font-black">{formatVehicles(fleetVehicles)}</span>
                    </div>
                    <Slider
                      min={5}
                      max={120}
                      step={1}
                      value={[fleetVehicles]}
                      onValueChange={(value) => setFleetVehicles(value[0] ?? 5)}
                      aria-label="عدد مركبات الأسطول"
                    />
                    <div className="rounded-[12px] border border-[#2A2A2A] bg-[#0B0B0B] p-4">
                      <p className="text-sm text-[#8A8A8A]">{fleetPreview.label}</p>
                      <p className="mt-2 text-3xl font-black">
                        {fleetPreview.total === null ? "تواصل معنا" : `${formatSar(fleetPreview.total)} ر.س / شهر`}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-[#8A8A8A]">
                        التسعير مسطح حسب الشريحة وليس تراكميًا. مثال: ٣٠ مركبة × ٢٧ ر.س.
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            <div className="rounded-[16px] border border-[#2A2A2A] bg-[#1A1A1A] p-5">
              <h2 className="text-xl font-black">الحصص والاحتفاظ</h2>
              <div className="mt-4 space-y-3">
                {selectedPlan.quotas.map((quota) => (
                  <div key={quota} className="rounded-[12px] bg-[#222] p-3 text-sm leading-6 text-[#E6E6E6]">
                    {quota}
                  </div>
                ))}
              </div>
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
            <Link href={selectedPlan.id === "fleet" ? "/contact" : "/register"}>
              <Button className="h-12 w-full rounded-[12px] bg-[#FF6A00] px-8 text-base font-black hover:bg-[#E65C00] sm:w-auto">
                {selectedPlan.id === "fleet" ? "طلب عرض للأسطول" : "ابدأ الاشتراك"}
              </Button>
            </Link>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
