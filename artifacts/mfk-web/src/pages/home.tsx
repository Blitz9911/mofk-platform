import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Activity, 
  Wrench, 
  CalendarCheck, 
  CheckCircle2, 
  ShieldCheck, 
  Smartphone, 
  Zap, 
  ChevronDown
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useListSubscriptionPlans } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: plans, isLoading: isPlansLoading } = useListSubscriptionPlans();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10"></div>
          
          <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8 max-w-2xl"
            >
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                مفك — سيارتك أذكى مما تتخيل
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
                سيارتك،<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-orange-400">
                  أذكى مما تتخيل
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                سيارتك تعطيك لمبات كثير… بس قليل يفهمها صح. مع مفك تعرف وش فيها قبل لا تدخل الورشة، ويفهمك المشكلة ولا احد يلعب عليك
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 rounded-full font-bold shadow-lg shadow-primary/20">
                    اطلب الجهاز الآن
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 rounded-full font-bold">
                    شاهد تجربة حية
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>توصيل مجاني</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>ضمان سنتين</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>استرجاع 14 يوم</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative lg:ml-auto"
            >
              <div className="relative z-10 w-full max-w-md mx-auto aspect-square">
                {/* Glow behind image */}
                <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full -z-10"></div>
                <img 
                  src="/hero-adapter.png" 
                  alt="MFK OBD-II Smart Adapter" 
                  className="w-full h-full object-contain object-center drop-shadow-2xl" 
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Trust Strip */}
        <section className="py-14 border-y border-border relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-l from-primary/5 via-transparent to-primary/5" />
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
              {/* Badge */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-primary leading-none">+20,000</div>
                  <div className="text-sm font-semibold text-muted-foreground mt-0.5">سائق نشط</div>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-16 bg-border" />

              {/* Main statement */}
              <div className="text-center md:text-right">
                <h2 className="text-xl md:text-2xl font-black text-foreground">
                  الخيار الموثوق لأكثر من 20,000 سائق في المملكة
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">يثقون بنا يومياً لحماية سياراتهم</p>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-16 bg-border" />

              {/* Stats */}
              <div className="flex items-center gap-8 shrink-0">
                {[
                  { num: "4.8★", label: "تقييم المستخدمين" },
                  { num: "15+", label: "مدينة سعودية" },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl font-black text-foreground">{s.num}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEM -> SOLUTION */}
        <section className="py-24 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-destructive/5 border border-destructive/10 rounded-3xl p-8 lg:p-12 relative"
              >
                <div className="absolute top-0 right-0 -mt-6 -mr-6 w-12 h-12 bg-destructive/20 text-destructive rounded-full flex items-center justify-center backdrop-blur-md border border-destructive/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-foreground">تعطل سيارتك فجأة كابوس</h3>
                <p className="text-lg text-muted-foreground mb-6">
                  لمبة المحرك تضيء بدون سبب واضح. الميكانيكي يطلب مبالغ باهظة لفحص فقط. سيارتك تتعطل في أسوأ وقت ممكن. أنت تقود وأنت تأمل أن لا يحدث شيء.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-destructive/50" />
                    <span>تشخيص مكلف في الورش (150-300 ريال)</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-destructive/50" />
                    <span>مفاجآت الصيانة وأعطال الطريق</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-destructive/50" />
                    <span>استغلال جهلك بالأعطال الفنية</span>
                  </li>
                </ul>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-primary/5 border border-primary/20 rounded-3xl p-8 lg:p-12 relative"
              >
                <div className="absolute top-0 left-0 -mt-6 -ml-6 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-foreground">MFK تتنبأ قبل أن يحدث</h3>
                <p className="text-lg text-muted-foreground mb-6">
                  نوفر لك جهاز قراءة ذكي يوصل بسيارتك، وتطبيق يحلل مئات البيانات في الثانية ليعطيك تقريراً يفهمك
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-foreground font-medium">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>اكتشف الأعطال المخفية فوراً مجاناً</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground font-medium">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>تنبيهات استباقية قبل تعطل القطع</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground font-medium">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>ترجمة الأعطال المعقدة إلى لغة تفهمك</span>
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* LIVE DEMO STRIP */}
        <section id="demo" className="py-24 bg-card border-y border-border">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">راقب نبض سيارتك في كل لحظة</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-16">
              بيانات حية ومباشرة من قلب محرك سيارتك إلى هاتفك في أجزاء من الثانية.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {/* Gauge Mocks */}
              {[
                { label: "RPM", value: "2,450", unit: "دورة", color: "text-blue-500", progress: 45 },
                { label: "السرعة", value: "110", unit: "كم/س", color: "text-green-500", progress: 60 },
                { label: "الحرارة", value: "90", unit: "°C", color: "text-orange-500", progress: 70 },
                { label: "البطارية", value: "13.8", unit: "V", color: "text-purple-500", progress: 85 },
                { label: "الوقود", value: "65", unit: "%", color: "text-yellow-500", progress: 65 },
                { label: "الصحة", value: "98", unit: "/100", color: "text-primary", progress: 98 },
              ].map((gauge, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-background rounded-2xl p-6 border border-border flex flex-col items-center justify-center relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10">
                    <svg className="w-24 h-24 transform -rotate-90 mb-4" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="8" 
                        strokeDasharray="282.7" 
                        strokeDashoffset={282.7 - (282.7 * gauge.progress) / 100}
                        className={gauge.color}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pb-4">
                      <span className="text-2xl font-bold">{gauge.value}</span>
                      <span className="text-[10px] text-muted-foreground">{gauge.unit}</span>
                    </div>
                    <p className="text-sm font-medium text-center">{gauge.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURE PILLARS */}
        <section id="features" className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">كل ما تحتاجه للعناية بسيارتك</h2>
              <p className="text-lg text-muted-foreground">نظام متكامل يبدأ من التشخيص وينتهي بالصيانة</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Activity,
                  title: "تشخيص فوري",
                  desc: "مسح كامل لأنظمة السيارة واكتشاف أكثر من 15,000 كود عطل في ثوانٍ.",
                },
                {
                  icon: Wrench,
                  title: "فهم بسيط",
                  desc: "نترجم الأعطال المعقدة إلى لغة تفهمك، بسيطة مع تحديد درجة الخطورة وتكلفة الإصلاح التقريبية",
                },
                {
                  icon: CalendarCheck,
                  title: "صيانة استباقية",
                  desc: "نظام ذكي يذكرك بمواعيد الصيانة الدورية بناءً على ممشى سيارتك واستخدامك الفعلي.",
                },
                {
                  icon: Smartphone,
                  title: "تقارير ذكية",
                  desc: "تقارير شاملة بالعربية عن صحة سيارتك، تكاليف الصيانة المتوقعة، وتاريخ الأعطال.",
                }
              ].map((feat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-card border border-border rounded-3xl p-8 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
                >
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-300">
                    <feat.icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24 bg-muted/30 overflow-hidden">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55 }}
              className="text-center max-w-2xl mx-auto mb-20"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-5">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                طريقة عمل MFK
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">3 خطوات بسيطة فقط</h2>
              <p className="text-lg text-muted-foreground">لا تحتاج لخبرة فنية لتبدأ مع MFK</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-12 relative">
              {/* Connector line */}
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-px bg-gradient-to-l from-primary/40 via-primary/20 to-primary/40" />

              {[
                {
                  num: "01",
                  title: "اربط الجهاز",
                  desc: "ركّب جهاز MFK الصغير في منفذ OBD أسفل مقود سيارتك — يأخذ ثوانٍ ولا يحتاج أدوات.",
                  icon: "🔌"
                },
                {
                  num: "02",
                  title: "شغّل التطبيق",
                  desc: "حمّل تطبيق MFK وارتبط بالجهاز عبر البلوتوث بضغطة زر واحدة.",
                  icon: "📱"
                },
                {
                  num: "03",
                  title: "احصل على تشخيصك",
                  desc: "اقرأ بيانات سيارتك الحية، افحص الأعطال، وافهمها بلغتك العربية فوراً.",
                  icon: "✅"
                },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.55, delay: i * 0.15 }}
                  className="relative z-10 text-center flex flex-col items-center group"
                >
                  {/* Glow on hover */}
                  <div className="relative mb-8">
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-150" />
                    <div className="relative w-24 h-24 rounded-full bg-card border-2 border-primary/20 shadow-xl flex items-center justify-center group-hover:border-primary/60 transition-colors duration-300">
                      <span className="text-3xl font-black text-primary">{step.num}</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPARISON */}
        <section className="py-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">لماذا تختار MFK؟</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr>
                    <th className="p-6 text-right w-1/3 bg-muted/50 rounded-tr-2xl border-b border-border">الميزة</th>
                    <th className="p-6 text-center w-1/5 bg-primary/10 text-primary font-bold text-xl border-b border-primary/20">MFK</th>
                    <th className="p-6 text-center w-1/5 bg-muted/30 font-semibold border-b border-border">زيارة الورشة</th>
                    <th className="p-6 text-center w-1/5 bg-muted/30 font-semibold rounded-tl-2xl border-b border-border">أجهزة عامة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["التشخيص باللغة العربية", true, false, false],
                    ["تكلفة الفحص", "مجاني ودائم", "150-300 ريال", "مجاني"],
                    ["توضيح خطورة العطل", true, true, false],
                    ["اقتراح ورش معتمدة للحل", true, false, false],
                    ["تقدير تكلفة الإصلاح", true, "غير مضمون", false],
                    ["تتبع صحة المحرك المباشرة", true, false, true],
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-muted/10 transition-colors">
                      <td className="p-5 font-medium text-foreground">{row[0]}</td>
                      <td className="p-5 text-center bg-primary/5">
                        {typeof row[1] === 'boolean' ? (
                          row[1] ? <CheckCircle2 className="w-6 h-6 text-primary mx-auto" /> : <span className="text-muted-foreground">-</span>
                        ) : <span className="font-bold text-primary">{row[1]}</span>}
                      </td>
                      <td className="p-5 text-center">
                        {typeof row[2] === 'boolean' ? (
                          row[2] ? <CheckCircle2 className="w-6 h-6 text-muted-foreground mx-auto" /> : <span className="text-muted-foreground">-</span>
                        ) : <span className="text-muted-foreground">{row[2]}</span>}
                      </td>
                      <td className="p-5 text-center">
                        {typeof row[3] === 'boolean' ? (
                          row[3] ? <CheckCircle2 className="w-6 h-6 text-muted-foreground mx-auto" /> : <span className="text-muted-foreground">-</span>
                        ) : <span className="text-muted-foreground">{row[3]}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="py-20 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center divide-x divide-x-reverse divide-primary-foreground/20">
              <div>
                <div className="text-4xl md:text-5xl font-black mb-2 tracking-tighter">+20,000</div>
                <div className="text-primary-foreground/80 font-medium">سيارة متصلة</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-black mb-2 tracking-tighter">4.8</div>
                <div className="text-primary-foreground/80 font-medium">تقييم التطبيق</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-black mb-2 tracking-tighter">85%</div>
                <div className="text-primary-foreground/80 font-medium">توفير في وقت الصيانة</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-black mb-2 tracking-tighter">+500</div>
                <div className="text-primary-foreground/80 font-medium">عطل تم تشخيصه يومياً</div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-24 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">ماذا يقول مستخدمونا؟</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: "أحمد الدوسري", role: "الرياض", quote: "وفر علي الجهاز أكثر من 500 ريال قيمة فحوصات كمبيوتر. أول ما تظهر اللمبة أعرف المشكلة مباشرة وأروح للورشة وأنا فاهم." },
                { name: "سارة خالد", role: "جدة", quote: "كنت أخاف أروح الورش ويستغلون عدم معرفتي بالسيارات. الآن مع MFK أفتح التطبيق ويعطيني وش المشكلة وكم تكلفتها التقريبية، ارتحت جداً." },
                { name: "محمد العتيبي", role: "الدمام", quote: "ميزة تذكير الصيانة ومتابعة حرارة القير والماكينة في الخطوط الطويلة ممتازة جداً. تطبيق متعوب عليه صراحة." },
              ].map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  className="bg-muted/30 p-8 rounded-3xl border border-border relative hover:border-primary/30 transition-colors duration-300"
                >
                  <div className="text-primary text-5xl font-serif absolute top-6 right-6 opacity-20">"</div>
                  <p className="text-lg leading-relaxed mb-8 relative z-10">"{t.quote}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="font-bold">{t.name}</div>
                      <div className="text-sm text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING TEASER */}
        <section className="py-24 bg-muted/20 border-y border-border">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">باقات تناسب الجميع</h2>
            <p className="text-lg text-muted-foreground mb-12">اختر الباقة المناسبة لاحتياجاتك وابدأ في متابعة سيارتك بذكاء</p>

            {isPlansLoading ? (
              <div className="grid md:grid-cols-3 gap-6">
                {[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full rounded-3xl" />)}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                {Array.isArray(plans) && plans.slice(0, 3).map((plan) => (
                  <div key={plan.id} className="bg-card p-6 rounded-2xl border border-border flex flex-col">
                    <h3 className="text-xl font-bold mb-2">{plan.nameAr}</h3>
                    <div className="text-3xl font-black text-primary mb-6">{plan.priceMonthlySar} <span className="text-sm text-muted-foreground font-normal">ر.س/شهر</span></div>
                    <ul className="text-sm text-right space-y-3 mb-8 flex-1 text-muted-foreground">
                      {plan.featuresAr?.slice(0, 3).map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="rounded-full px-8">عرض كل الباقات والتفاصيل</Button>
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">الأسئلة الشائعة</h2>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="q1">
                <AccordionTrigger className="text-lg font-semibold text-right">هل الجهاز متوافق مع سيارتي؟</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                  جهاز MFK متوافق مع 99% من السيارات المصنعة بعد عام 2001 (والتي تدعم منفذ OBD-II القياسي). يمكنك التأكد بالبحث عن منفذ OBD أسفل مقود سيارتك.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger className="text-lg font-semibold text-right">هل يمكنني ترك الجهاز موصولاً بالسيارة دائماً؟</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                  نعم، تم تصميم الجهاز باستهلاك منخفض جداً للطاقة بحيث لا يؤثر على بطارية السيارة حتى لو تركته موصولاً لأسابيع والسيارة متوقفة.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3">
                <AccordionTrigger className="text-lg font-semibold text-right">هل يمسح الجهاز أعطال السيارة؟</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                  نعم، يمكنك مسح لمبة المحرك (Check Engine) وأكواد الأعطال عبر التطبيق بعد قراءتها ومعرفة سببها. ملاحظة: إذا لم يتم إصلاح العطل الفعلي، ستعود اللمبة للإضاءة لاحقاً.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q4">
                <AccordionTrigger className="text-lg font-semibold text-right">ما هي سياسة الضمان والاسترجاع؟</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                  نقدم ضماناً شاملاً لمدة سنتين على الجهاز ضد العيوب المصنعية، بالإضافة إلى سياسة استرجاع مجانية خلال 14 يوماً من تاريخ الشراء إذا لم يعجبك المنتج.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary"></div>
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/10 rounded-full blur-[100px] -z-0"></div>
          
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">جاهز لتغيير طريقة عنايتك بسيارتك؟</h2>
            <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
              انضم لآلاف المستخدمين الذين وفروا وقتهم وأموالهم مع منصة MFK.
            </p>
            <Link href="/login">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-xl h-16 px-12 rounded-full font-bold shadow-xl">
                ابدأ تجربتك اليوم
              </Button>
            </Link>
            <p className="text-sm text-primary-foreground/60 mt-6 flex items-center justify-center gap-2">
              <ShieldCheck size={16} /> ضمان سنتين • توصيل سريع • استرجاع 14 يوم
            </p>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
