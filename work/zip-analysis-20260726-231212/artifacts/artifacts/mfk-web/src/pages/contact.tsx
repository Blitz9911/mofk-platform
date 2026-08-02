import { useState } from "react";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const CONTACT_INFO = [
  {
    icon: MessageCircle,
    title: "واتساب",
    value: "+966 50 000 0000",
    desc: "متاح الأحد - الخميس، 9ص - 6م",
    color: "text-green-500 bg-green-500/10",
    href: "https://wa.me/966500000000",
  },
  {
    icon: Mail,
    title: "البريد الإلكتروني",
    value: "hello@mfk.sa",
    desc: "نرد خلال 24 ساعة",
    color: "text-blue-500 bg-blue-500/10",
    href: "mailto:hello@mfk.sa",
  },
  {
    icon: Phone,
    title: "الهاتف",
    value: "920 000 000",
    desc: "الأحد - الخميس، 9ص - 6م",
    color: "text-primary bg-primary/10",
    href: "tel:920000000",
  },
  {
    icon: MapPin,
    title: "العنوان",
    value: "الرياض، المملكة العربية السعودية",
    desc: "حي العليا، شارع التحلية",
    color: "text-purple-500 bg-purple-500/10",
  },
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name && form.email && form.message) setSubmitted(true);
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
                تواصل <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-orange-400">معنا</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                هل لديك سؤال أو اقتراح؟ فريقنا جاهز للمساعدة.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid lg:grid-cols-2 gap-12">

              {/* Contact Cards */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold mb-6">طرق التواصل</h2>
                {CONTACT_INFO.map((info, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                    {info.href ? (
                      <a href={info.href} target={info.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                        className="flex items-center gap-5 bg-card border border-border rounded-2xl p-5 hover:border-primary/40 transition-colors group">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${info.color}`}>
                          <info.icon className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-muted-foreground mb-0.5">{info.title}</div>
                          <div className="font-bold text-lg group-hover:text-primary transition-colors">{info.value}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{info.desc}</div>
                        </div>
                      </a>
                    ) : (
                      <div className="flex items-center gap-5 bg-card border border-border rounded-2xl p-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${info.color}`}>
                          <info.icon className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-0.5">{info.title}</div>
                          <div className="font-bold text-lg">{info.value}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{info.desc}</div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* WhatsApp CTA */}
                <motion.a href="https://wa.me/966500000000" target="_blank" rel="noopener noreferrer"
                  initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                  className="flex items-center justify-center gap-3 w-full bg-green-500 text-white rounded-2xl p-5 font-bold text-lg hover:bg-green-600 transition-colors mt-6">
                  <MessageCircle className="w-6 h-6" />
                  تحدث معنا على واتساب الآن
                </motion.a>
              </div>

              {/* Form */}
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="bg-card border border-border rounded-3xl p-8">
                {submitted ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center gap-4">
                    <CheckCircle2 className="w-16 h-16 text-green-500" />
                    <h3 className="text-2xl font-bold">تم إرسال رسالتك</h3>
                    <p className="text-muted-foreground">سيتواصل معك فريقنا خلال 24 ساعة عمل.</p>
                    <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
                      إرسال رسالة أخرى
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold mb-6">أرسل رسالة</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">الاسم</label>
                          <Input placeholder="اسمك الكريم" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">البريد الإلكتروني</label>
                          <Input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">الموضوع</label>
                        <Input placeholder="ما موضوع رسالتك؟" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">الرسالة</label>
                        <Textarea placeholder="اكتب رسالتك هنا..." rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required />
                      </div>
                      <Button type="submit" className="w-full gap-2" size="lg">
                        <Send className="w-4 h-4" /> إرسال الرسالة
                      </Button>
                    </form>
                  </>
                )}
              </motion.div>

            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
