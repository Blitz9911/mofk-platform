import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, Cpu, Smartphone, MessageCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const INSTALLATION_STEPS = [
  {
    num: "1",
    title: "اعثر على منفذ OBD-II في سيارتك",
    desc: "المنفذ موجود أسفل لوحة العدادات، عادة بجانب دواسة الفرامل اليسرى أو تحت المقود مباشرة. شكله مثلث معلق رأساً على عقب — 16 دبوس.",
    img: "🔌",
  },
  {
    num: "2",
    title: "وصّل جهاز MFK",
    desc: "أدخل جهاز MFK في المنفذ بإحكام حتى تسمع صوت نقرة. سيضيء ضوء أزرق خافت يشير للتشغيل. السيارة لا تحتاج للتشغيل في هذه المرحلة.",
    img: "🟢",
  },
  {
    num: "3",
    title: "حمّل تطبيق MFK",
    desc: "ابحث عن 'MFK سيارتي' في App Store أو Google Play وحمّل التطبيق مجاناً. سجّل حسابك بالجوال أو البريد الإلكتروني.",
    img: "📱",
  },
  {
    num: "4",
    title: "ابدأ الإقران عبر البلوتوث",
    desc: "افتح التطبيق وستظهر نافذة 'اتصال تلقائي'. تأكد أن البلوتوث مفعّل وأنت قريب من السيارة. اضغط 'اتصال' وسيجد الجهاز في ثوانٍ.",
    img: "🔵",
  },
  {
    num: "5",
    title: "أضف مركبتك",
    desc: "أدخل ماركة السيارة، الموديل، والسنة. يمكنك إضافة صورة وتسمية السيارة. بعدها ستبدأ بيانات السيارة الحية بالظهور على الفور.",
    img: "🚗",
  },
  {
    num: "6",
    title: "افحص الأعطال",
    desc: "اضغط على 'فحص الأعطال' وانتظر 30 ثانية. ستحصل على قائمة بجميع الأكواد مترجمة للعربية مع شرح الخطورة والتكلفة التقديرية.",
    img: "🔍",
  },
];

const APP_FEATURES = [
  {
    icon: "🩺",
    title: "التشخيص المباشر",
    desc: "راقب بيانات سيارتك حياً — درجة حرارة المحرك، سرعة الدوران، استهلاك الوقود، وأكثر من 50 معلومة في الوقت الفعلي.",
  },
  {
    icon: "⚠️",
    title: "سجل الأعطال",
    desc: "اقرأ وامسح أكواد الأعطال. كل كود يأتي بشرح عربي بسيط وتقدير التكلفة والأولوية — فوري أم يمكن الانتظار؟",
  },
  {
    icon: "🔔",
    title: "تنبيهات الصيانة",
    desc: "حدد موعد تغيير الزيت، الفلاتر، الإطارات. التطبيق يذكّرك تلقائياً بناءً على الكيلومترات الفعلية من الجهاز.",
  },
  {
    icon: "🤖",
    title: "المساعد الذكي",
    desc: "اسأل المساعد الذكي عن أي عطل أو كود واحصل على شرح مفصل وتوصيات خاصة بسيارتك ومناخ منطقتك.",
  },
  {
    icon: "📊",
    title: "صحة السيارة",
    desc: "نقاط صحة من 100 تلخص حالة سيارتك بنظرة واحدة. شارك التقرير مع الميكانيكي أو عند بيع سيارتك.",
  },
  {
    icon: "🔒",
    title: "تاريخ السيارة",
    desc: "سجل كل صيانة يدوياً أو تلقائياً. يصبح توثيقاً رسمياً لعمر سيارتك يزيد قيمتها عند إعادة البيع.",
  },
];

const FAQS = [
  { q: "كيف أبدأ مع MFK؟", a: "اشتر جهاز MFK OBD من موقعنا، ركّبه في منفذ OBD-II أسفل مقود سيارتك، ثم حمّل تطبيق MFK وسجّل حسابك. الجهاز يبدأ الاتصال تلقائياً عبر البلوتوث." },
  { q: "هل الجهاز متوافق مع سيارتي؟", a: "جهاز MFK متوافق مع جميع السيارات التي تدعم بروتوكول OBD-II. هذا يشمل معظم السيارات من عام 2001 وما بعده." },
  { q: "هل يستنزف الجهاز بطارية السيارة؟", a: "لا. تم تصميم الجهاز باستهلاك منخفض جداً للطاقة (أقل من 5mA) بحيث لا يؤثر على البطارية حتى لو تركته موصولاً لأسابيع." },
  { q: "هل يعمل الجهاز مع الإنترنت مقطوعاً؟", a: "بعض الميزات مثل قراءة الأعطال الأساسية تعمل بدون إنترنت. لكن التشخيص الذكي والتوصيات تحتاج اتصالاً بالإنترنت." },
  { q: "ما هي سياسة الاسترجاع؟", a: "نوفر ضمان استرجاع كامل لمدة 14 يوماً من تاريخ استلام الجهاز. إذا لم تكن راضياً لأي سبب، أعد الجهاز ونسترد لك المبلغ بالكامل." },
];

type ActiveSection = "installation" | "features" | null;

export default function Help() {
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const filtered = FAQS.filter(f => f.q.includes(search) || f.a.includes(search));

  const toggleSection = (section: ActiveSection) => {
    setActiveSection(prev => prev === section ? null : section);
  };

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
                  onChange={e => { setSearch(e.target.value); setActiveSection(null); }}
                  className="pr-12 h-14 text-base rounded-2xl"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {!search && (
          <>
            {/* Category Cards */}
            <section className="pb-6">
              <div className="container mx-auto px-4 max-w-3xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                  {/* Device Installation */}
                  <motion.button
                    initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    onClick={() => toggleSection("installation")}
                    className={`bg-card border rounded-2xl p-5 text-center hover:border-blue-500/40 transition-all group ${activeSection === "installation" ? "border-blue-500/60 bg-blue-500/5" : "border-border"}`}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 text-blue-500 bg-blue-500/10">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold mb-1">الجهاز والتركيب</div>
                    <ChevronDown className={`w-4 h-4 mx-auto text-muted-foreground transition-transform ${activeSection === "installation" ? "rotate-180 text-blue-500" : ""}`} />
                  </motion.button>

                  {/* App Features */}
                  <motion.button
                    initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }}
                    onClick={() => toggleSection("features")}
                    className={`bg-card border rounded-2xl p-5 text-center hover:border-purple-500/40 transition-all group ${activeSection === "features" ? "border-purple-500/60 bg-purple-500/5" : "border-border"}`}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 text-purple-500 bg-purple-500/10">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold mb-1">التطبيق والميزات</div>
                    <ChevronDown className={`w-4 h-4 mx-auto text-muted-foreground transition-transform ${activeSection === "features" ? "rotate-180 text-purple-500" : ""}`} />
                  </motion.button>

                  {/* General FAQ */}
                  <motion.button
                    initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                    onClick={() => setActiveSection(null)}
                    className={`bg-card border rounded-2xl p-5 text-center hover:border-primary/40 transition-all group ${activeSection === null ? "border-primary/40 bg-primary/5" : "border-border"}`}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 text-primary bg-primary/10">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold mb-1">الأسئلة الشائعة</div>
                    <ChevronDown className={`w-4 h-4 mx-auto text-muted-foreground transition-transform ${activeSection === null ? "rotate-180 text-primary" : ""}`} />
                  </motion.button>

                </div>
              </div>
            </section>

            {/* Installation Steps Panel */}
            <AnimatePresence>
              {activeSection === "installation" && (
                <motion.section
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="container mx-auto px-4 max-w-3xl pb-8">
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-8 mt-2">
                      <h2 className="text-xl font-bold mb-6 text-blue-400">خطوات تركيب جهاز MFK</h2>
                      <div className="space-y-5">
                        {INSTALLATION_STEPS.map((step, i) => (
                          <motion.div key={i}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="flex gap-5 items-start"
                          >
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl shrink-0">
                              {step.img}
                            </div>
                            <div className="flex-1 pt-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-black flex items-center justify-center shrink-0">{step.num}</span>
                                <h3 className="font-bold text-foreground">{step.title}</h3>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      <div className="mt-8 pt-6 border-t border-blue-500/20 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        <p className="text-sm text-muted-foreground">عادةً يستغرق الإعداد أقل من 5 دقائق. إذا واجهت أي مشكلة، تواصل مع الدعم عبر واتساب.</p>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}

              {/* App Features Panel */}
              {activeSection === "features" && (
                <motion.section
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="container mx-auto px-4 max-w-3xl pb-8">
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-3xl p-8 mt-2">
                      <h2 className="text-xl font-bold mb-6 text-purple-400">ميزات تطبيق MFK</h2>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {APP_FEATURES.map((f, i) => (
                          <motion.div key={i}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="bg-card border border-border rounded-2xl p-5"
                          >
                            <div className="text-3xl mb-3">{f.icon}</div>
                            <h3 className="font-bold mb-2">{f.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </>
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
