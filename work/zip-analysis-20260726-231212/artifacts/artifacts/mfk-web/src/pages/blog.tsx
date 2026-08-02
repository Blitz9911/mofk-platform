import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { motion } from "framer-motion";
import { Clock, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ARTICLES, CATEGORY_COLOR } from "@/data/articles";

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
                className="mb-10">
                <Link href={`/blog/${featured.slug}`}>
                  <div className="bg-card border border-border rounded-3xl overflow-hidden hover:border-primary/40 transition-colors group cursor-pointer">
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
                          <div className="text-sm text-muted-foreground font-medium group-hover:text-primary transition-colors">اقرأ المقال كاملاً</div>
                          <ArrowLeft className="w-5 h-5 text-primary mx-auto mt-2 rotate-180" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((article, i) => (
                <motion.div key={article.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <Link href={`/blog/${article.slug}`}>
                    <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-colors group cursor-pointer flex flex-col h-full">
                      <div className="mb-4">
                        <Badge className={CATEGORY_COLOR[article.category]}>{article.category}</Badge>
                      </div>
                      <h3 className="text-lg font-bold mb-3 leading-snug group-hover:text-primary transition-colors flex-1">{article.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">{article.excerpt}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-4 border-t border-border">
                        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {article.readTime}</div>
                        <span>{article.date}</span>
                      </div>
                    </div>
                  </Link>
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
