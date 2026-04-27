import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { motion } from "framer-motion";
import { Clock, ArrowLeft, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

const ARTICLES = [
  {
    id: 1,
    title: "ماذا تعني لمبة Check Engine؟ دليل شامل لكل الأكواد",
    excerpt: "لمبة المحرك تضيء فجأة ولا تعرف ما تفعل؟ في هذا المقال نشرح أكثر من 50 كود عطل شائع بلغة عربية بسيطة، وكيف تتعامل مع كل منها بدون خبرة تقنية.",
    category: "الأعطال",
    readTime: "8 دقائق",
    date: "15 أبريل 2024",
    featured: true,
  },
  {
    id: 2,
    title: "جدول الصيانة الدورية الكامل لكل سيارة: متى تغير الزيت والفلاتر والإطارات؟",
    excerpt: "الصيانة الدورية هي الفرق بين سيارة تعيش 300,000 كم وسيارة تتعطل في منتصف الطريق. دليل شامل بالمواعيد والتكاليف المتوقعة.",
    category: "الصيانة",
    readTime: "12 دقائق",
    date: "2 أبريل 2024",
  },
  {
    id: 3,
    title: "5 علامات تدل على أن فرامل سيارتك تحتاج صيانة عاجلة",
    excerpt: "الفرامل ليست شيئاً تتهاون فيه. تعرف على العلامات التحذيرية التي تخبرك أن الفرامل تحتاج فحصاً قبل أن تصبح خطراً حقيقياً.",
    category: "السلامة",
    readTime: "5 دقائق",
    date: "20 مارس 2024",
  },
  {
    id: 4,
    title: "كيف توفر 2,000 ريال سنوياً على صيانة سيارتك؟",
    excerpt: "الصيانة الاستباقية ليست تكلفة إضافية — هي استثمار. نشرح كيف يمكنك تجنب الأعطال المكلفة بخطوات بسيطة وبسيطة.",
    category: "نصائح",
    readTime: "7 دقائق",
    date: "10 مارس 2024",
  },
  {
    id: 5,
    title: "تقييم أفضل زيوت المحرك للسيارات اليابانية في السوق السعودية",
    excerpt: "اخترنا 8 ماركات زيت محرك شائعة وقارناها بالمواصفات والأسعار لمساعدتك في اختيار الأنسب لسيارتك في درجات حرارة الخليج العالية.",
    category: "مقارنات",
    readTime: "10 دقائق",
    date: "1 مارس 2024",
  },
  {
    id: 6,
    title: "ما الفرق بين OBD-I و OBD-II؟ ولماذا يهمك هذا؟",
    excerpt: "تقنية OBD هي ما يجعل جهاز MFK ذكياً. نشرح كيف تعمل هذه التقنية وما الذي يمكنها قراءته من سيارتك بلغة بسيطة.",
    category: "تقنية",
    readTime: "6 دقائق",
    date: "15 فبراير 2024",
  },
];

const CATEGORY_COLOR: Record<string, string> = {
  "الأعطال": "bg-destructive/10 text-destructive border-destructive/20",
  "الصيانة": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "السلامة": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "نصائح": "bg-green-500/10 text-green-500 border-green-500/20",
  "مقارنات": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "تقنية": "bg-primary/10 text-primary border-primary/20",
};

export default function Blog() {
  const featured = ARTICLES.find(a => a.featured);
  const rest = ARTICLES.filter(a => !a.featured);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      <main className="flex-1">

        {/* Hero */}
        <section className="pt-32 pb-16 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-5xl md:text-6xl font-bold mb-4">
                مدونة <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-orange-400">MFK</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                كل ما تحتاج معرفته عن سيارتك — بلغة بسيطة، لا تقنية غامضة.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-4 max-w-5xl">

            {/* Featured */}
            {featured && (
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="bg-card border border-border rounded-3xl overflow-hidden mb-10 hover:border-primary/40 transition-colors group cursor-pointer">
                <div className="md:grid md:grid-cols-5">
                  <div className="md:col-span-3 p-10">
                    <div className="flex items-center gap-3 mb-4">
                      <Badge className={CATEGORY_COLOR[featured.category]}>{featured.category}</Badge>
                      <Badge className="bg-primary/10 text-primary border-primary/20">مقال مميز</Badge>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-4 group-hover:text-primary transition-colors">{featured.title}</h2>
                    <p className="text-muted-foreground leading-relaxed mb-6">{featured.excerpt}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {featured.readTime}</div>
                      <span>{featured.date}</span>
                    </div>
                  </div>
                  <div className="md:col-span-2 bg-gradient-to-bl from-primary/20 to-primary/5 flex items-center justify-center p-10 min-h-[200px]">
                    <div className="text-center">
                      <div className="text-6xl mb-3">🔧</div>
                      <div className="text-sm text-muted-foreground font-medium">اقرأ المقال كاملاً</div>
                      <ArrowLeft className="w-5 h-5 text-primary mx-auto mt-2 rotate-180" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((article, i) => (
                <motion.div key={article.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-colors group cursor-pointer flex flex-col">
                  <div className="mb-4">
                    <Badge className={CATEGORY_COLOR[article.category]}>{article.category}</Badge>
                  </div>
                  <h3 className="text-lg font-bold mb-3 leading-snug group-hover:text-primary transition-colors flex-1">{article.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">{article.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-4 border-t border-border">
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {article.readTime}</div>
                    <span>{article.date}</span>
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
