import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CheckCircle2, CreditCard, Calendar, Zap, ShieldCheck } from "lucide-react";
import { 
  useGetMySubscription, 
  useListSubscriptionPlans,
  UserSubscriptionTier,
  UserSubscriptionStatus
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export default function Subscription() {
  const { data: subscription, isLoading: subLoading } = useGetMySubscription();
  const { data: plans, isLoading: plansLoading } = useListSubscriptionPlans();
  
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  const getTierName = (tier: UserSubscriptionTier | undefined) => {
    if (tier === "premium") return "الباقة الاحترافية (Premium)";
    if (tier === "fleet") return "باقة الأسطول (Fleet)";
    return "الباقة الأساسية (Free)";
  };

  const getStatusBadge = (status: UserSubscriptionStatus | undefined) => {
    if (status === "active") return <Badge className="bg-green-500 hover:bg-green-600">نشط</Badge>;
    if (status === "expired") return <Badge variant="destructive">منتهي</Badge>;
    if (status === "cancelled") return <Badge variant="secondary">ملغى</Badge>;
    return null;
  };

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الاشتراك والباقات</h1>
        <p className="text-muted-foreground mt-1">إدارة اشتراكك وترقية الباقة للحصول على ميزات إضافية</p>
      </div>

      {subLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                  {getTierName(subscription?.tier)}
                </CardTitle>
                <CardDescription className="mt-1">
                  الباقة الحالية الخاصة بك
                </CardDescription>
              </div>
              {getStatusBadge(subscription?.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground block">تاريخ البدء</span>
                <span className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  {subscription?.startedAt ? format(new Date(subscription.startedAt), "d MMMM yyyy", { locale: ar }) : "—"}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground block">تاريخ الانتهاء</span>
                <span className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-destructive" />
                  {subscription?.endsAt ? format(new Date(subscription.endsAt), "d MMMM yyyy", { locale: ar }) : "—"}
                </span>
              </div>
              <div className="space-y-1 sm:col-span-2 md:col-span-2 flex flex-col justify-center">
                <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-border">
                  <div className="space-y-0.5">
                    <span className="font-medium block">التجديد التلقائي</span>
                    <span className="text-xs text-muted-foreground">سيتم تجديد اشتراكك تلقائياً لتجنب انقطاع الخدمة</span>
                  </div>
                  <Switch checked={subscription?.autoRenew} />
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border/50 flex gap-3">
              <Button variant="outline" className="gap-2">
                <CreditCard className="w-4 h-4" /> إدارة طريقة الدفع
              </Button>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                عرض الفواتير السابقة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6 pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <h2 className="text-2xl font-bold">ارتقِ بتجربة القيادة والصيانة</h2>
          <p className="text-muted-foreground max-w-xl">
            اختر الباقة التي تناسب احتياجاتك. وفر حتى 20% عند الاشتراك السنوي.
          </p>
          
          <div className="flex items-center bg-muted p-1 rounded-full border border-border mt-4">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                billingCycle === "monthly" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              شهري
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                billingCycle === "yearly" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              )}
            >
              سنوي <span className="text-[10px] ml-1 bg-white/20 px-1.5 py-0.5 rounded">-20%</span>
            </button>
          </div>
        </div>

        {plansLoading ? (
          <div className="grid md:grid-cols-3 gap-6 pt-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-[500px] w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 pt-4 items-center">
            {plans?.map((plan) => {
              const isCurrent = subscription?.tier === plan.tier;
              const price = billingCycle === "monthly" ? plan.priceMonthlySar : (plan.priceYearlySar ? Math.round(plan.priceYearlySar / 12) : plan.priceMonthlySar);
              const yearlyTotal = plan.priceYearlySar || (plan.priceMonthlySar * 12);
              
              return (
                <Card 
                  key={plan.id} 
                  className={cn(
                    "relative flex flex-col transition-all duration-200",
                    plan.isPopular ? "border-primary shadow-md scale-105 z-10" : "border-border hover:border-primary/30",
                    isCurrent && !plan.isPopular && "border-primary/50 bg-primary/5"
                  )}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-4 inset-x-0 flex justify-center">
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <Zap className="w-3 h-3 fill-current" /> الأكثر طلباً
                      </span>
                    </div>
                  )}
                  <CardHeader className={cn("text-center pb-2", plan.isPopular && "pt-8")}>
                    <CardTitle className="text-xl">{plan.nameAr}</CardTitle>
                    <CardDescription>{plan.descriptionAr}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 text-center space-y-6">
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{price}</span>
                      <span className="text-muted-foreground font-medium text-sm ml-1">ر.س / شهر</span>
                      {billingCycle === "yearly" && price > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">يُدفع {yearlyTotal} ر.س سنوياً</p>
                      )}
                    </div>
                    
                    <ul className="space-y-3 text-right">
                      {(plan.featuresAr || plan.features).map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                          <span className="text-foreground/90">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={isCurrent ? "outline" : (plan.isPopular ? "default" : "secondary")}
                      disabled={isCurrent}
                    >
                      {isCurrent ? "باقتك الحالية" : (price === 0 ? "ابدأ مجاناً" : "ترقية الباقة")}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
