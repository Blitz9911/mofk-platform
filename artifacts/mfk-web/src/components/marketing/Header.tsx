import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MfkLogo } from "@/components/MfkLogo";

const COMPANY_LINKS = [
  { href: "/about", label: "من نحن" },
  { href: "/careers", label: "الوظائف" },
  { href: "/blog", label: "المدونة" },
  { href: "/contact", label: "تواصل معنا" },
];

export function Header() {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setCompanyOpen(false);
  }, [location]);

  useEffect(() => {
    const close = () => setCompanyOpen(false);
    if (companyOpen) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [companyOpen]);

  const isCompanyPage = ["/about", "/careers", "/blog", "/contact"].some(p => location.startsWith(p));

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
            <MfkLogo size="md" className="cursor-pointer" />
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="/#features">
            <span className={cn("cursor-pointer transition-colors hover:text-foreground", "text-muted-foreground")}>
              المميزات
            </span>
          </Link>
          <Link href="/#how-it-works">
            <span className={cn("cursor-pointer transition-colors hover:text-foreground", "text-muted-foreground")}>
              كيف تعمل
            </span>
          </Link>
          <Link href="/pricing">
            <span className={cn("cursor-pointer transition-colors hover:text-foreground", location === "/pricing" ? "text-foreground" : "text-muted-foreground")}>
              الباقات
            </span>
          </Link>

          {/* Company Dropdown */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setCompanyOpen(o => !o)}
              className={cn("flex items-center gap-1 cursor-pointer transition-colors hover:text-foreground", isCompanyPage ? "text-foreground" : "text-muted-foreground")}
            >
              الشركة
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", companyOpen ? "rotate-180" : "")} />
            </button>
            {companyOpen && (
              <div className="absolute top-full mt-2 right-0 w-44 bg-card border border-border rounded-2xl shadow-xl py-2 z-50">
                {COMPANY_LINKS.map(link => (
                  <Link key={link.href} href={link.href}>
                    <span className={cn("block px-4 py-2.5 text-sm hover:bg-muted transition-colors cursor-pointer rounded-lg mx-1",
                      location === link.href ? "text-primary font-semibold" : "text-foreground")}>
                      {link.label}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
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
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg py-4 px-4 flex flex-col gap-1">
          <Link href="/#features"><span className="block py-2.5 px-3 rounded-xl text-foreground font-medium hover:bg-muted">المميزات</span></Link>
          <Link href="/#how-it-works"><span className="block py-2.5 px-3 rounded-xl text-foreground font-medium hover:bg-muted">كيف تعمل</span></Link>
          <Link href="/pricing"><span className="block py-2.5 px-3 rounded-xl text-foreground font-medium hover:bg-muted">الباقات</span></Link>
          <div className="h-px bg-border my-1 mx-3" />
          <p className="text-xs text-muted-foreground font-semibold px-3 py-1">الشركة</p>
          {COMPANY_LINKS.map(link => (
            <Link key={link.href} href={link.href}>
              <span className="block py-2.5 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted">{link.label}</span>
            </Link>
          ))}
          <div className="h-px bg-border my-1 mx-3" />
          <Link href="/login">
            <Button variant="outline" className="w-full justify-center mt-1">تسجيل الدخول</Button>
          </Link>
          <Link href="/login">
            <Button className="w-full justify-center">ابدأ الآن</Button>
          </Link>
        </div>
      )}
    </header>
  );
}
