import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { CheckCircle2, XCircle, AlertTriangle, Package, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const ELIGIBLE = [
  "الجهاز وصل تالفاً أو معيباً من المصنع",
  "الجهاز غير متوافق مع سيارتك وتعذّر الحل التقني",
  "طلب الإرجاع خلال 14 يوماً من تاريخ الاستلام",
  "الجهاز في حالته الأصلية غير المستخدمة (أو استخدام محدود لمدة أقل من 5 أيام)",
];

const NOT_ELIGIBLE = [
  "مرور أكثر من 14 يوماً على تاريخ الاستلام",
  "الجهاز تعرض للكسر أو التلف من قبل المستخدم",
  "إزالة الملصقات أو علامات المنتج",
  "رسوم الاشتراك الشهري عن أشهر منتهية",
  "الطلب بعد استخدام مكثف يزيد عن 30 يوماً",
];

const STEPS = [
  { icon: Mail, title: "أرسل طلب الإرجاع", desc: "راسلنا على returns@mfk.sa بذكر رقم الطلب وسبب الإرجاع. سنرد خلال 24 ساعة عمل." },
  { icon: Package, title: "أعد الجهاز", desc: "بعد موافقتنا، أرسل الجهاز في عبواته الأصلية. نتحمل نحن تكلفة الشحن في حالة العيب المصنعي." },
  { icon: CheckCircle2, title: "استلام الاسترداد", desc: "بعد استلام الجهاز وفحصه (3-5 أيام عمل)، يُعاد المبلغ لوسيلة الدفع الأصلية خلال 7 أيام." },
];

export default function Refunds() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      <main className="flex-1">

        {/* Hero */}
        <section className="pt-32 pb-16 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-5xl md:text-6xl font-bold mb-4">
                سياسة <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-orange-400">الاسترجاع</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                نثق بمنتجنا ونريدك أن تكون راضياً تماماً. إذا لم يعجبك — نسترده بلا أسئلة.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-4 max-w-4xl space-y-12">

            {/* Warranty badge */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="bg-primary/10 border border-primary/20 rounded-3xl p-8 text-center">
              <div className="text-5xl font-black text-primary mb-2">14 يوم</div>
              <div className="text-xl font-bold mb-2">ضمان الاسترجاع الكامل</div>
              <p className="text-muted-foreground">+ ضمان سنتين على الجهاز ضد العيوب المصنعية</p>
            </motion.div>

            {/* Eligible / Not Eligible */}
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="w-5 h-5" /> حالات الإرجاع المقبولة
                </h2>
                <ul className="space-y-3">
                  {ELIGIBLE.map((e, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {e}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-destructive">
                  <XCircle className="w-5 h-5" /> حالات غير مشمولة
                </h2>
                <ul className="space-y-3">
                  {NOT_ELIGIBLE.map((e, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" /> {e}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Steps */}
            <div>
              <h2 className="text-2xl font-bold mb-8 text-center">خطوات طلب الإرجاع</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {STEPS.map((step, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                    className="bg-card border border-border rounded-2xl p-6 text-center">
                    <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <step.icon className="w-7 h-7" />
                    </div>
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center mx-auto mb-3">{i + 1}</div>
                    <h3 className="font-bold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-500 mb-1">ملاحظة مهمة عن الاشتراك</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  رسوم الاشتراك الشهري أو السنوي غير قابلة للاسترداد عن الفترات المنتهية. لكن يمكنك إلغاء الاشتراك في أي وقت وستحتفظ بالوصول حتى نهاية الفترة المدفوعة. لا رسوم إلغاء.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-card border border-border rounded-3xl p-8 text-center">
              <h2 className="text-2xl font-bold mb-3">تريد الإرجاع؟</h2>
              <p className="text-muted-foreground mb-6">راسلنا مباشرة أو تواصل مع فريق الدعم وسنتولى الأمر.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="mailto:returns@mfk.sa">
                  <Button className="gap-2 w-full sm:w-auto"><Mail className="w-4 h-4" /> returns@mfk.sa</Button>
                </a>
                <a href="https://wa.me/966500000000" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full sm:w-auto gap-2"><Phone className="w-4 h-4" /> واتساب</Button>
                </a>
              </div>
            </div>

          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
