import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { motion } from "framer-motion";
import { Target, Zap, ShieldCheck, Heart, Users, CheckCircle2, Award } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const VALUES = [
  { icon: Zap, title: "الابتكار أولاً", desc: "كل ميزة نبنيها تبدأ من مشكلة حقيقية يعاني منها سائق حقيقي. التقنية لازم تحل، مو تعقّد." },
  { icon: ShieldCheck, title: "الشفافية الكاملة", desc: "تكاليف الصيانة، حالة سيارتك، معلوماتك — كلها تعود لك أنت. لا نخفي شيئاً." },
  { icon: Heart, title: "نهتم فعلاً", desc: "كل قرار نتخذه يبدأ بسؤال: كيف هذا يفيد مستخدمينا؟ نقيس نجاحنا بنجاح من يثق بنا." },
  { icon: Users, title: "لك ولعائلتك", desc: "بنينا مفك عشان أي شخص — سواء يعرف بالسيارات أو لا — يقدر يفهم سيارته ويحميها." },
];

const MILESTONES = [
  { year: "2021", title: "بداية الفكرة", desc: "نشأت فكرة مفك بعد تجربة شخصية مؤلمة — لمبة اشتغلت، وتشخيصات كثيرة أعطت أرقاماً مختلفة. كان لازم يتغير هذا الشي." },
  { year: "2022", title: "أول نسخة", desc: "أطلقنا أول نسخة تجريبية مع 100 مستخدم أولي في الرياض. كانت الاستجابة أكبر من توقعاتنا." },
  { year: "2023", title: "التوسع في المملكة", desc: "وصلنا إلى 5,000 مستخدم نشط في 5 مدن سعودية وحصلنا على جائزة أفضل تطبيق تقني." },
  { year: "2024", title: "+20,000 سيارة متصلة", desc: "تجاوزنا 20,000 مستخدم نشط في المملكة وأطلقنا جهاز OBD الذكي الخاص بنا." },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, delay },
});

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
                نُغيّر علاقتك{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-orange-400">بسيارتك</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                سوّينا مفك عشان ما تضيع بين التشخيصات المتضاربة —
                ومع مفك، سيارتك أذكى مما تتخيل.
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
                <motion.div key={i} {...fadeUp(i * 0.1)}>
                  <div className="text-4xl font-black text-primary mb-2">{s.num}</div>
                  <div className="text-muted-foreground font-medium">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* لماذا أسسنا مفك — narrative story */}
        <section className="py-24">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div {...fadeUp()} className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">لماذا أسسنا مفك؟</h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-12 items-start">
              {/* Story */}
              <motion.div {...fadeUp(0.1)} className="space-y-6">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  لأن بكل بساطة — كلنا مررنا بهذا الموقف.
                </p>

                <div className="space-y-4">
                  {[
                    { title: "لمبة تشتغل فجأة", desc: "تضيء بدون سبب واضح وأنت ما تعرف هل هي خطيرة أو مجرد تحذير بسيط." },
                    { title: "صوت غريب يطلع", desc: "تسمعه وتتجاهله وتأمل أنه يعدي — وأحياناً لا يعدي." },
                    { title: "التشخيصات تعطيك كلام مختلف", desc: "كل واحد يقول رقم مختلف وأنت في النص ضايع بين الآراء." },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-card border border-border rounded-2xl">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2.5 shrink-0" />
                      <div>
                        <div className="font-bold mb-1">{item.title}</div>
                        <div className="text-sm text-muted-foreground leading-relaxed">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-lg text-muted-foreground leading-relaxed">
                  مع إن سيارتك فيها كل المعلومات — لكن ما أحد يشرحها لك بطريقة تفهمها.
                </p>
                <p className="text-xl font-bold text-foreground">
                  هنا قلنا: لازم يتغير هذا الشي.
                </p>
              </motion.div>

              {/* Conclusion card */}
              <motion.div {...fadeUp(0.2)} className="space-y-6">
                <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8">
                  <Award className="w-12 h-12 text-primary mb-6" />
                  <h3 className="text-2xl font-bold mb-4">الهدف من مفك</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    أسسنا مفك عشان تكون فاهم سيارتك — وتعرف وش فيها قبل لا أحد يقول لك.
                    ببساطة: نخلي سيارتك "تتكلم"… وأنت تفهمها.
                  </p>
                  <p className="text-sm text-primary font-semibold">
                    لأن ما يصير تدفع على مشكلة وأنت أصلاً ما فهمتها.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    "اعرف سبب العطل قبل ما تراجع فني مختص",
                    "فاهم كم تكلفة الإصلاح الحقيقية",
                    "صيانة استباقية تمنع المفاجآت",
                  ].map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      <span className="font-medium">{p}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* من نحن */}
        <section className="py-24 bg-card border-y border-border">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div {...fadeUp()} className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">من نحن</h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div {...fadeUp(0.1)} className="space-y-5 text-lg text-muted-foreground leading-relaxed">
                <p>
                  نحن فريق يؤمن إن التقنية لازم تخدمك — لا أن تعقّدك.
                </p>
                <p>
                  شفنا إن كثير ناس يواجهون نفس المشكلة: سيارتهم تعطيهم إشارات، بس ما يفهمونها —
                  ويضطرون يعتمدون على غيرهم لمعرفة وش فيها.
                </p>
                <p>
                  مفك منصة تربطك بسيارتك بشكل ذكي، وتعطيك كل المعلومات اللي تحتاجها بطريقة بسيطة وواضحة.
                  بدل ما تخمّن أو تسمع آراء مختلفة — مع مفك، أنت تعرف بنفسك.
                </p>
                <p className="text-foreground font-semibold">
                  هدفنا إن كل شخص يصير فاهم سيارته، ولا يكون بموقف "مدري وش فيها" مرة ثانية.
                </p>
              </motion.div>

              <motion.div {...fadeUp(0.2)} className="grid grid-cols-2 gap-4">
                {[
                  { num: "3", label: "سنوات من التطوير" },
                  { num: "+15K", label: "كود عطل مدعوم" },
                  { num: "99%", label: "سيارات ما بعد 2001" },
                  { num: "24/7", label: "دعم المستخدمين" },
                ].map((s, i) => (
                  <div key={i} className="bg-background border border-border rounded-2xl p-5 text-center">
                    <div className="text-3xl font-black text-primary mb-1">{s.num}</div>
                    <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <motion.div {...fadeUp()} className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">قيمنا</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">المبادئ اللي تحكم كل قرار نتخذه</p>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {VALUES.map((v, i) => (
                <motion.div key={i} {...fadeUp(i * 0.1)}
                  className="bg-card border border-border rounded-2xl p-8 text-center hover:border-primary/40 transition-colors group">
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
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
        <section className="py-24 bg-muted/20">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div {...fadeUp()} className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">رحلتنا</h2>
            </motion.div>
            <div className="relative">
              <div className="absolute right-[28px] top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-10">
                {MILESTONES.map((m, i) => (
                  <motion.div key={i} {...fadeUp(i * 0.1)} className="flex gap-6 items-start">
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

        {/* CTA */}
        <section className="py-20 bg-primary text-primary-foreground text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="container mx-auto px-4 relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">جاهز تجرّب مفك؟</h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
              انضم لأكثر من 20,000 سائق يثقون بمفك لحماية سياراتهم يومياً.
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="h-14 px-10 text-lg font-bold rounded-full text-primary">
                ابدأ مجاناً الآن
              </Button>
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
