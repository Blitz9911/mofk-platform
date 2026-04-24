import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        isScrolled
          ? "h-16 bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm"
          : "h-20 bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/">
            <span className="text-3xl font-bold text-primary tracking-tighter cursor-pointer">MFK</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="/#features">
            <span className={cn("cursor-pointer transition-colors hover:text-foreground", location === "/" && !window.location.hash.includes("features") ? "text-foreground" : "text-muted-foreground")}>
              المميزات
            </span>
          </Link>
          <Link href="/#how-it-works">
            <span className={cn("cursor-pointer transition-colors hover:text-foreground", window.location.hash.includes("how-it-works") ? "text-foreground" : "text-muted-foreground")}>
              كيف تعمل
            </span>
          </Link>
          <Link href="/pricing">
            <span className={cn("cursor-pointer transition-colors hover:text-foreground", location === "/pricing" ? "text-foreground" : "text-muted-foreground")}>
              الباقات
            </span>
          </Link>
          <Link href="/workshops">
            <span className={cn("cursor-pointer transition-colors hover:text-foreground", location.startsWith("/workshops") ? "text-foreground" : "text-muted-foreground")}>
              الورش
            </span>
          </Link>
        </nav>
        
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-semibold">تسجيل الدخول</Button>
          </Link>
          <Link href="/login">
            <Button className="font-semibold px-6">ابدأ الآن</Button>
          </Link>
        </div>

        <button 
          className="md:hidden text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg py-4 px-4 flex flex-col gap-4">
          <Link href="/#features"><span className="block py-2 text-foreground font-medium">المميزات</span></Link>
          <Link href="/#how-it-works"><span className="block py-2 text-foreground font-medium">كيف تعمل</span></Link>
          <Link href="/pricing"><span className="block py-2 text-foreground font-medium">الباقات</span></Link>
          <Link href="/workshops"><span className="block py-2 text-foreground font-medium">الورش</span></Link>
          <div className="h-px bg-border my-2"></div>
          <Link href="/login">
            <Button variant="outline" className="w-full justify-center">تسجيل الدخول</Button>
          </Link>
          <Link href="/login">
            <Button className="w-full justify-center">ابدأ الآن</Button>
          </Link>
        </div>
      )}
    </header>
  );
}
