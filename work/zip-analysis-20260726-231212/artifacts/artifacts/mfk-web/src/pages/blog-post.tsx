import { useParams, Link } from "wouter";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Tag, AlertTriangle, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ARTICLES, CATEGORY_COLOR, type ArticleSection } from "@/data/articles";

function renderSection(s: ArticleSection, i: number) {
  switch (s.type) {
    case "h2":
      return <h2 key={i} className="text-2xl font-bold mt-10 mb-4 text-foreground">{s.content as string}</h2>;
    case "h3":
      return <h3 key={i} className="text-xl font-bold mt-7 mb-3 text-foreground">{s.content as string}</h3>;
    case "p":
      return <p key={i} className="text-muted-foreground leading-relaxed mb-4">{s.content as string}</p>;
    case "ul":
      return (
        <ul key={i} className="space-y-2 mb-6 mr-4">
          {(s.content as string[]).map((item, j) => (
            <li key={j} className="flex items-start gap-3 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "tip":
      return (
        <div key={i} className="my-6 flex gap-4 bg-primary/5 border border-primary/20 rounded-2xl p-5">
          <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed text-foreground">{s.content as string}</p>
        </div>
      );
    case "warning":
      return (
        <div key={i} className="my-6 flex gap-4 bg-destructive/5 border border-destructive/20 rounded-2xl p-5">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed text-foreground">{s.content as string}</p>
        </div>
      );
    default:
      return null;
  }
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const article = ARTICLES.find(a => a.slug === slug || String(a.id) === slug);

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">المقال غير موجود</h1>
            <Link href="/blog">
              <Button>العودة للمدونة</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const related = ARTICLES.filter(a => a.id !== article.id && a.category === article.category).slice(0, 2);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      <main className="flex-1">

        {/* Hero */}
        <section className="pt-32 pb-12 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-background to-background" />
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Link href="/blog">
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  العودة للمدونة
                </button>
              </Link>
              <Badge className={CATEGORY_COLOR[article.category] + " mb-4"}>{article.category}</Badge>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{article.title}</h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">{article.excerpt}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground pb-8 border-b border-border">
                <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {article.readTime}</div>
                <span>{article.date}</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="pb-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              className="prose prose-invert max-w-none">
              {article.sections.map((s, i) => renderSection(s, i))}
            </motion.div>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="pb-24 pt-8 bg-muted/20 border-t border-border">
            <div className="container mx-auto px-4 max-w-3xl">
              <h2 className="text-2xl font-bold mb-6">مقالات ذات صلة</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {related.map(rel => (
                  <Link key={rel.id} href={`/blog/${rel.slug}`}>
                    <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 transition-colors cursor-pointer group">
                      <Badge className={CATEGORY_COLOR[rel.category] + " mb-3 text-xs"}>{rel.category}</Badge>
                      <h3 className="font-bold mb-2 leading-snug group-hover:text-primary transition-colors">{rel.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                        <Clock className="w-3.5 h-3.5" /> {rel.readTime}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>
      <Footer />
    </div>
  );
}
