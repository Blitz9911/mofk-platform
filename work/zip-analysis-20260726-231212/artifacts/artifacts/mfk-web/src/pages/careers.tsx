import { useState } from "react";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { motion } from "framer-motion";
import { Briefcase, Heart, Zap, Users, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PERKS = [
  { icon: Zap, title: "عمل بمعنى حقيقي", desc: "كل سطر كود تكتبه يحمي سائقاً من الاستغلال ويوفّر عليه المال." },
  { icon: Heart, title: "بيئة عمل صحية", desc: "فريق صغير، قرارات سريعة، لا بيروقراطية. رأيك يُسمع ويُنفَّذ." },
  { icon: Users, title: "نمو مستمر", desc: "ميزانية سنوية للتطوير المهني، كتب، كورسات، مؤتمرات — نستثمر فيك." },
  { icon: Briefcase, title: "مرونة حقيقية", desc: "عمل هجين، ساعات مرنة، ونتائج تُقاس بالأثر لا بالحضور." },
];

export default function Careers() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) { setSubmitted(true); setEmail(""); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      <main className="flex-1">

        {/* Hero */}
        <section className="pt-32 pb-20 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="text-6xl mb-6">🚀</div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
                انضم إلى <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-orange-400">فريق MFK</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                نبحث دائماً عن أشخاص شغوفين يريدون بناء شيء ذي معنى. إذا كنت تحب حل المشكلات الصعبة وتريد أثراً حقيقياً — هذا مكانك.
              </p>
            </motion.div>
          </div>
        </section>

        {/* No Openings */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <div className="bg-card border border-border rounded-3xl p-12">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-4">لا توجد وظائف شاغرة حالياً</h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                نحن فريق صغير ونمو بعناية. حالياً لا توجد وظائف مفتوحة، لكننا نبحث دائماً عن مواهب استثنائية.
                اترك بريدك الإلكتروني وسنتواصل معك فور فتح أي فرصة.
              </p>

              {submitted ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3 text-green-500">
                  <CheckCircle2 className="w-12 h-12" />
                  <p className="font-bold text-lg">تم التسجيل بنجاح!</p>
                  <p className="text-muted-foreground text-sm">سنتواصل معك فور توفر فرصة مناسبة.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-3 max-w-sm mx-auto">
                  <Input
                    type="email"
                    placeholder="بريدك الإلكتروني"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" className="gap-2 shrink-0">
                    <Send className="w-4 h-4" />
                    أرسل
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Perks */}
        <section className="py-24 bg-muted/20">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-4xl font-bold text-center mb-4">لماذا MFK؟</h2>
            <p className="text-muted-foreground text-center mb-16">نبني شركة نريد أن نعمل فيها بأنفسنا.</p>
            <div className="grid md:grid-cols-2 gap-6">
              {PERKS.map((p, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-2xl p-8 flex gap-6 hover:border-primary/40 transition-colors">
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
                    <p.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{p.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{p.desc}</p>
                  </div>
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
