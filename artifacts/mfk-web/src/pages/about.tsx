import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { motion } from "framer-motion";
import { Zap, ShieldCheck, Users, Target, Heart, Award, CheckCircle2 } from "lucide-react";

const TEAM = [
  { name: "محمد العمري", role: "المؤسس والرئيس التنفيذي", bio: "خبرة أكثر من 12 عاماً في صناعة السيارات والتقنية. درس هندسة الحاسب في KFUPM وقضى سنوات في قيادة فرق تقنية في شركات كبرى." },
  { name: "سارة الزهراني", role: "مديرة المنتج", bio: "متخصصة في تجربة المستخدم وتطوير المنتجات. شغفها بجعل التقنية في متناول الجميع دفعها لبناء منصة MFK بأبسط صورة ممكنة." },
  { name: "فيصل الحربي", role: "المدير التقني", bio: "مهندس برمجيات بتجربة واسعة في أنظمة السيارات المتصلة وإنترنت الأشياء. يقود الفريق التقني بشغف لا يتوقف." },
  { name: "نورة القحطاني", role: "مديرة العمليات", bio: "خبرة 8 سنوات في إدارة العمليات وخدمة العملاء. تضمن أن كل مستخدم يحصل على تجربة استثنائية مع MFK." },
];

const VALUES = [
  { icon: Zap, title: "الابتكار أولاً", desc: "نؤمن أن التكنولوجيا يجب أن تحل مشاكل حقيقية. كل ميزة نبنيها تبدأ من مشكلة يعاني منها سائق حقيقي." },
  { icon: ShieldCheck, title: "الثقة والشفافية", desc: "لا نخفي شيئاً. تكاليف الصيانة، حالة سيارتك، معلوماتك — كلها تعود لك أنت." },
  { icon: Heart, title: "نهتم بعملائنا", desc: "كل قرار نتخذه يبدأ بسؤال: كيف هذا يفيد مستخدمينا؟ نحن نقيس نجاحنا بنجاح عملائنا." },
  { icon: Users, title: "فريق واحد", desc: "نؤمن بقوة التنوع والتعاون. فريقنا مكوّن من خيرة المواهب السعودية التي تعمل بهدف مشترك." },
];

const MILESTONES = [
  { year: "2021", title: "بداية الفكرة", desc: "نشأت فكرة MFK بعد تجربة شخصية مؤلمة مع مركز صيانة استغل جهل صاحبها بالأعطال." },
  { year: "2022", title: "أول نسخة", desc: "أطلقنا أول نسخة تجريبية لـ MFK مع 100 مستخدم أولي في الرياض." },
  { year: "2023", title: "التوسع في المملكة", desc: "وصلنا إلى 5,000 مستخدم نشط في 5 مدن سعودية وحصلنا على جائزة أفضل تطبيق تقني." },
  { year: "2024", title: "+20,000 سيارة متصلة", desc: "تجاوزنا 20,000 مستخدم نشط وأطلقنا جهاز OBD الذكي الخاص بنا." },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      <main className="flex-1">

        {/* Hero */}
        <section className="pt-32 pb-20 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                <Target className="w-4 h-4" /> قصتنا ومهمتنا
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
                نُغيّر علاقتك <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-orange-400">بسيارتك</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                وُلدت MFK من إحساس الإحباط الذي يشعر به كل سائق حين تضيء لمبة المحرك ولا يعرف ماذا يفعل.
                مهمتنا بسيطة: نعطيك المعرفة التي تحميك.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { num: "+20,000", label: "سائق يثق بنا" },
                { num: "15+", label: "مدينة سعودية" },
                { num: "4.8/5", label: "تقييم المستخدمين" },
                { num: "2021", label: "سنة التأسيس" },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <div className="text-4xl font-black text-primary mb-2">{s.num}</div>
                  <div className="text-muted-foreground font-medium">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-4xl font-bold mb-6">لماذا أسسنا MFK؟</h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  في عام 2021، كان مؤسسنا في موقف صعب — سيارته أرسلت تحذيراً غامضاً، وأول ورشة زارها طلبت 800 ريال للفحص فقط.
                  وعندما فحصها بنفسه، اكتشف أن المشكلة بالغة التكلفة 150 ريال.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  من ذلك اليوم، قررنا أن لا يتعرض أي سائق سعودي لهذا الموقف مرة أخرى.
                  MFK هي مساواة في المعرفة — لا فرق بين من يعرف الميكانيك ومن لا يعرف.
                </p>
                <div className="space-y-3">
                  {["تشخيص دقيق بدون خبرة تقنية", "معرفة التكلفة قبل الذهاب للورشة", "صيانة استباقية تمنع المفاجآت"].map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      <span className="font-medium">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-3xl p-10 text-center">
                <Award className="w-16 h-16 text-primary mx-auto mb-6" />
                <h3 className="text-2xl font-bold mb-4">رؤيتنا 2030</h3>
                <p className="text-muted-foreground leading-relaxed">
                  أن تكون كل سيارة في المملكة العربية السعودية متصلة ذكية، وأن يكون كل سائق مُمكَّناً من اتخاذ قرارات سيارته بثقة ومعرفة.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16">قيمنا</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {VALUES.map((v, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-2xl p-8 text-center hover:border-primary/40 transition-colors">
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <v.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{v.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{v.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-24">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-4xl font-bold text-center mb-16">رحلتنا</h2>
            <div className="relative">
              <div className="absolute right-[28px] top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-10">
                {MILESTONES.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                    className="flex gap-6 items-start">
                    <div className="w-14 h-14 rounded-full bg-primary/10 border-4 border-background text-primary font-black text-sm flex items-center justify-center shrink-0 z-10">
                      {m.year.slice(2)}
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-6 flex-1">
                      <div className="text-xs text-primary font-bold mb-1">{m.year}</div>
                      <h3 className="text-xl font-bold mb-2">{m.title}</h3>
                      <p className="text-muted-foreground">{m.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-4">الفريق</h2>
            <p className="text-muted-foreground text-center mb-16 max-w-xl mx-auto">مواهب سعودية شغوفة تعمل بهدف واحد: تمكين كل سائق في المملكة.</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {TEAM.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-2xl p-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 text-primary font-black text-2xl flex items-center justify-center mx-auto mb-4">
                    {t.name[0]}
                  </div>
                  <h3 className="text-lg font-bold mb-1">{t.name}</h3>
                  <div className="text-sm text-primary font-medium mb-3">{t.role}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.bio}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
