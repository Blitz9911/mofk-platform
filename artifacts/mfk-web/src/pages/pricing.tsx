import { useState } from "react";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CheckCircle2, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useListSubscriptionPlans } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const { data: plans, isLoading } = useListSubscriptionPlans();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main className="flex-1 pt-32 pb-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">استثمر في راحة بالك</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              باقات مرنة تناسب احتياجاتك. وفر المال باكتشاف الأعطال مبكراً، وتجنب زيارات الورش غير الضرورية.
            </p>
            
            <div className="mt-10 inline-flex items-center gap-4 bg-muted/50 p-2 rounded-full border border-border">
              <span className={`text-sm font-medium px-4 ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>شهري</span>
              <Switch 
                checked={isYearly} 
                onCheckedChange={setIsYearly} 
                dir="ltr"
                className="data-[state=checked]:bg-primary"
              />
              <span className={`text-sm font-medium px-4 flex items-center gap-2 ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                سنوي
                <span className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">خصم 20%</span>
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-24">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-[600px] w-full rounded-3xl" />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-24">
              {plans?.map((plan) => {
                const isPopular = plan.isPopular;
                const price = isYearly && plan.priceYearlySar 
                  ? Math.round(plan.priceYearlySar / 12) 
                  : plan.priceMonthlySar;

                return (
                  <div 
                    key={plan.id} 
                    className={`relative bg-card rounded-3xl p-8 flex flex-col ${
                      isPopular 
                        ? 'border-2 border-primary shadow-xl shadow-primary/10 scale-105 z-10' 
                        : 'border border-border'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-sm font-bold px-4 py-1 rounded-full">
                        الأكثر طلباً
                      </div>
                    )}
                    
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold mb-2">{plan.nameAr}</h3>
                      <p className="text-muted-foreground text-sm h-10">{plan.descriptionAr}</p>
                    </div>

                    <div className="mb-8 flex items-baseline gap-1">
                      <span className="text-5xl font-black text-foreground">{price}</span>
                      <div className="flex flex-col text-sm text-muted-foreground">
                        <span>ر.س</span>
                        <span>/ {isYearly ? 'شهر (يُدفع سنوياً)' : 'شهر'}</span>
                      </div>
                    </div>

                    {plan.tier === "fleet" ? (
                      <Link href="/contact" className="mt-auto block w-full">
                        <Button className="w-full h-12 text-lg font-medium" variant="outline">
                          تواصل مع المبيعات
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/login" className="mt-auto block w-full">
                        <Button 
                          className="w-full h-12 text-lg font-medium" 
                          variant={isPopular ? "default" : "outline"}
                        >
                          {plan.priceMonthlySar === 0 ? 'ابدأ مجاناً' : 'اشترك الآن'}
                        </Button>
                      </Link>
                    )}

                    <div className="mt-8 pt-8 border-t border-border">
                      <ul className="space-y-4">
                        {plan.featuresAr?.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm text-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Feature Matrix */}
          <div className="max-w-4xl mx-auto mb-24">
            <h2 className="text-3xl font-bold text-center mb-10">مقارنة الباقات بالتفصيل</h2>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="p-4 text-right font-bold text-base w-2/5">الميزات</th>
                    <th className="p-4 text-center font-bold text-base w-1/5">الأساسية</th>
                    <th className="p-4 text-center font-bold text-base text-primary w-1/5">برو</th>
                    <th className="p-4 text-center font-bold text-base w-1/5">الأسطول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { name: "قراءة أكواد الأعطال (OBD2)", free: true, pro: true, fleet: true },
                    { name: "مسح لمبة المحرك", free: true, pro: true, fleet: true },
                    { name: "البيانات الحية الأساسية", free: true, pro: true, fleet: true },
                    { name: "تفسير الأعطال باللغة العربية", free: false, pro: true, fleet: true },
                    { name: "تنبيهات الصيانة الذكية", free: false, pro: true, fleet: true },
                    { name: "المساعد الذكي (AI)", free: false, pro: true, fleet: true },
                    { name: "حجز مواعيد الورش", free: false, pro: true, fleet: true },
                    { name: "تقارير التكلفة التقديرية", free: false, pro: true, fleet: true },
                    { name: "عدد المركبات", free: "مركبة واحدة", pro: "حتى 3 مركبات", fleet: "غير محدود" },
                    { name: "لوحة تحكم إدارية مخصصة", free: false, pro: false, fleet: true },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="p-4 font-medium text-foreground">{row.name}</td>
                      <td className="p-4 text-center">
                        {typeof row.free === 'boolean' ? (
                          row.free ? <CheckCircle2 className="w-5 h-5 text-muted-foreground mx-auto" /> : <X className="w-5 h-5 text-muted/30 mx-auto" />
                        ) : <span className="text-muted-foreground">{row.free}</span>}
                      </td>
                      <td className="p-4 text-center bg-primary/5">
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? <CheckCircle2 className="w-5 h-5 text-primary mx-auto" /> : <X className="w-5 h-5 text-muted/30 mx-auto" />
                        ) : <span className="font-bold text-primary">{row.pro}</span>}
                      </td>
                      <td className="p-4 text-center">
                        {typeof row.fleet === 'boolean' ? (
                          row.fleet ? <CheckCircle2 className="w-5 h-5 text-muted-foreground mx-auto" /> : <X className="w-5 h-5 text-muted/30 mx-auto" />
                        ) : <span className="text-muted-foreground">{row.fleet}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-10">أسئلة متكررة عن الاشتراك</h2>
            <Accordion type="single" collapsible className="w-full bg-card border border-border rounded-2xl px-6 py-2">
              <AccordionItem value="q1" className="border-b border-border">
                <AccordionTrigger className="text-base font-bold">هل أحتاج لشراء الجهاز أولاً؟</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  نعم، التطبيق يتطلب جهاز MFK OBD-II ليعمل. عند اشتراكك في باقة (برو) السنوية، ستحصل على الجهاز مجاناً مع توصيل مجاني. أما في الباقة الأساسية فستحتاج لشراء الجهاز بشكل منفصل.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2" className="border-b border-border">
                <AccordionTrigger className="text-base font-bold">كيف يعمل ضمان استرجاع الأموال؟</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  إذا لم تكن راضياً عن الخدمة لأي سبب خلال أول 14 يوماً من استلام الجهاز، يمكنك إرجاع الجهاز واسترداد كامل مبلغ الاشتراك وقيمة الجهاز بدون أي أسئلة.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3" className="border-b border-border">
                <AccordionTrigger className="text-base font-bold">هل يمكنني تغيير أو إلغاء باقتي لاحقاً؟</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  بالتأكيد. يمكنك ترقية باقتك، أو تخفيضها، أو إلغاء التجديد التلقائي في أي وقت من خلال إعدادات حسابك في التطبيق. لن يتم فرض أي رسوم إلغاء.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q4" className="border-none">
                <AccordionTrigger className="text-base font-bold">لدي أكثر من سيارة، هل أحتاج لاشتراكات متعددة؟</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  باقة (برو) تسمح لك بإدارة حتى 3 مركبات بنفس الحساب والجهاز (يمكنك نقل الجهاز بينها). إذا كان لديك عدد أكبر من السيارات أو تدير أسطولاً، يرجى التواصل معنا للاشتراك في باقة (الأسطول).
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
