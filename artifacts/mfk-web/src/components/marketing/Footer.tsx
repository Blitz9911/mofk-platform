import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="bg-card border-t border-border pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
          <div className="lg:col-span-2">
            <Link href="/">
              <span className="text-3xl font-bold text-primary tracking-tighter mb-4 inline-block">MFK</span>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-sm leading-relaxed">
              منصة تشخيص السيارات الذكية الأولى في المملكة. حوّل سيارتك إلى مركبة ذكية، افهم الأعطال قبل تفاقمها، واحجز صيانتك بثقة وسهولة.
            </p>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full hover:text-primary hover:bg-primary/10">
                <Twitter className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full hover:text-primary hover:bg-primary/10">
                <Instagram className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full hover:text-primary hover:bg-primary/10">
                <Linkedin className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-4 text-foreground">المنتج</h3>
            <ul className="space-y-3">
              <li><Link href="/#features"><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">المميزات</span></Link></li>
              <li><Link href="/#how-it-works"><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">كيف تعمل</span></Link></li>
              <li><Link href="/pricing"><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">الباقات</span></Link></li>
              <li><Link href="/workshops"><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">دليل الورش</span></Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-4 text-foreground">الشركة</h3>
            <ul className="space-y-3">
              <li><Link href="/about"><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">من نحن</span></Link></li>
              <li><Link href="/careers"><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">الوظائف</span></Link></li>
              <li><Link href="/blog"><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">المدونة</span></Link></li>
              <li><Link href="/contact"><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">تواصل معنا</span></Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-4 text-foreground">الدعم</h3>
            <ul className="space-y-3">
              <li><Link href="/help"><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">مركز المساعدة</span></Link></li>
              <li><Link href="/terms"><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">الشروط والأحكام</span></Link></li>
              <li><Link href="/privacy"><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">سياسة الخصوصية</span></Link></li>
              <li><Link href="/refunds"><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">سياسة الاسترجاع</span></Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} MFK. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="cursor-pointer hover:text-foreground font-bold text-foreground">عربي</span>
            <span className="w-px h-4 bg-border"></span>
            <span className="cursor-pointer hover:text-foreground">English</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
