import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { motion } from "framer-motion";
import { Search, BookOpen, Cpu, CreditCard, Smartphone, MessageCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const CATEGORIES = [
  { icon: BookOpen, label: "البداية مع MFK", color: "text-primary bg-primary/10" },
  { icon: Cpu, label: "الجهاز والتركيب", color: "text-blue-500 bg-blue-500/10" },
  { icon: Smartphone, label: "التطبيق والميزات", color: "text-purple-500 bg-purple-500/10" },
  { icon: CreditCard, label: "الفواتير والاشتراك", color: "text-green-500 bg-green-500/10" },
];

const FAQS = [
  { q: "كيف أبدأ مع MFK؟", a: "اشتر جهاز MFK OBD من موقعنا، ركّبه في منفذ OBD-II أسفل مقود سيارتك، ثم حمّل تطبيق MFK وسجّل حسابك. الجهاز يبدأ الاتصال تلقائياً عبر البلوتوث." },
  { q: "أين أجد منفذ OBD-II في سيارتي؟", a: "منفذ OBD-II موجود في 99% من السيارات المصنعة بعد 2001. ابحث عنه أسفل لوحة عدادات القيادة، عادة بجانب دواسة الدعسة اليسرى أو تحت المقود مباشرة." },
  { q: "هل الجهاز متوافق مع سيارتي؟", a: "جهاز MFK متوافق مع جميع السيارات التي تدعم بروتوكول OBD-II. هذا يشمل معظم السيارات من عام 2001 وما بعده. يمكنك التحقق من التوافق بكتابة موديل سيارتك في صفحة التوافق." },
  { q: "هل يستنزف الجهاز بطارية السيارة؟", a: "لا. تم تصميم الجهاز باستهلاك منخفض جداً للطاقة (أقل من 5mA) بحيث لا يؤثر على البطارية حتى لو تركته موصولاً لأسابيع." },
  { q: "كيف أقرأ أكواد الأعطال؟", a: "افتح التطبيق، اختر مركبتك، ثم اضغط على 'فحص الأعطال'. سيقرأ الجهاز جميع الأكواد ويترجمها لك بلغة عربية بسيطة مع شرح الخطورة والتكلفة التقديرية للإصلاح." },
  { q: "هل يمكنني إلغاء الاشتراك في أي وقت؟", a: "نعم. يمكنك إلغاء الاشتراك في أي وقت من إعدادات حسابك. لن تُحاسب على أي دورة فوترة بعد الإلغاء." },
  { q: "ما هي سياسة الاسترجاع؟", a: "نوفر ضمان استرجاع كامل لمدة 14 يوماً من تاريخ استلام الجهاز. إذا لم تكن راضياً لأي سبب، أعد الجهاز ونسترد لك المبلغ بالكامل." },
  { q: "هل يعمل الجهاز مع الإنترنت مقطوعاً؟", a: "بعض الميزات مثل قراءة الأعطال الأساسية تعمل بدون إنترنت. لكن التشخيص الذكي والتوصيات تحتاج اتصالاً بالإنترنت لمزامنة البيانات مع خوادمنا." },
];

export default function Help() {
  const [search, setSearch] = useState("");
  const filtered = FAQS.filter(f => f.q.includes(search) || f.a.includes(search));

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
                مركز <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-orange-400">المساعدة</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">كيف يمكننا مساعدتك اليوم؟</p>
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن سؤالك..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pr-12 h-14 text-base rounded-2xl"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Categories */}
        {!search && (
          <section className="pb-12">
            <div className="container mx-auto px-4 max-w-3xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CATEGORIES.map((c, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                    className="bg-card border border-border rounded-2xl p-5 text-center hover:border-primary/40 transition-colors cursor-pointer">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${c.color}`}>
                      <c.icon className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold">{c.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="pb-24">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold mb-8">{search ? `نتائج البحث (${filtered.length})` : "الأسئلة الشائعة"}</h2>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">لم نجد نتائج مطابقة. جرّب كلمة أخرى.</div>
            ) : (
              <Accordion type="single" collapsible className="space-y-3">
                {filtered.map((faq, i) => (
                  <AccordionItem key={i} value={`q${i}`} className="bg-card border border-border rounded-2xl px-6">
                    <AccordionTrigger className="text-right font-semibold py-5 hover:no-underline hover:text-primary">{faq.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pb-5">{faq.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-16 bg-card border-y border-border">
          <div className="container mx-auto px-4 text-center max-w-xl">
            <h2 className="text-2xl font-bold mb-3">لم تجد إجابتك؟</h2>
            <p className="text-muted-foreground mb-6">فريق الدعم جاهز لمساعدتك. تواصل معنا عبر واتساب أو البريد الإلكتروني.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="https://wa.me/966500000000" target="_blank" rel="noopener noreferrer">
                <Button className="gap-2 w-full sm:w-auto bg-green-500 hover:bg-green-600">
                  <MessageCircle className="w-4 h-4" /> واتساب
                </Button>
              </a>
              <a href="mailto:support@mfk.sa">
                <Button variant="outline" className="w-full sm:w-auto">البريد الإلكتروني</Button>
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
