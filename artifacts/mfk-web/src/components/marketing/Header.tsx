import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MfkLogo } from "@/components/MfkLogo";

const NAV_LINKS = [
  { href: "/#features", label: "المميزات", exact: false },
  { href: "/#how-it-works", label: "كيف تعمل", exact: false },
  { href: "/pricing", label: "الباقات", exact: true },
  { href: "/about", label: "من نحن", exact: true },
  { href: "/contact", label: "تواصل معنا", exact: true },
];

export function Header() {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const isActive = (link: typeof NAV_LINKS[0]) => {
    if (!link.exact) return false;
    return location === link.href;
  };

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        isScrolled
          ? "h-16 bg-background/90 backdrop-blur-md border-b border-border/50 shadow-sm"
          : "h-20 bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 h-full flex items-center justify-between gap-6">

        {/* Logo */}
        <Link href="/">
          <MfkLogo size="md" className="cursor-pointer shrink-0" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              <span
                className={cn(
                  "relative px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors duration-200 group",
                  isActive(link)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {link.label}
                {/* Underline indicator for active */}
                <span
                  className={cn(
                    "absolute bottom-0 right-3 left-3 h-0.5 rounded-full bg-primary transition-all duration-300",
                    isActive(link) ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                  )}
                />
              </span>
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="font-semibold text-sm">
              دخول
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="font-semibold text-sm px-5">
              إنشاء حساب
            </Button>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-foreground p-1"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="القائمة"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border shadow-xl py-3 px-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              <span className={cn(
                "block py-2.5 px-3 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                isActive(link)
                  ? "text-primary bg-primary/5"
                  : "text-foreground hover:bg-muted"
              )}>
                {link.label}
              </span>
            </Link>
          ))}
          <div className="h-px bg-border my-2" />
          <div className="grid grid-cols-2 gap-2">
            <Link href="/login">
              <Button variant="outline" className="w-full text-sm" size="sm">دخول</Button>
            </Link>
            <Link href="/register">
              <Button className="w-full text-sm" size="sm">إنشاء حساب</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
