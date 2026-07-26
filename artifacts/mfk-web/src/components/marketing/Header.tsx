import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Menu, X, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MfkLogo } from "@/components/MfkLogo";
import { useTheme } from "@/contexts/ThemeContext";

const PENDING_SCROLL_TARGET_KEY = "mfk-pending-scroll-target";

const NAV_LINKS = [
  { href: "/#features", label: "المميزات", hash: true },
  { href: "/#how-it-works", label: "كيف تعمل", hash: true },
  { href: "/pricing", label: "الباقات", hash: false },
  { href: "/about", label: "من نحن", hash: false },
  { href: "/contact", label: "تواصل معنا", hash: false },
];

export function Header() {
  const [location, setLocation] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const headerOffset = isScrolled ? 72 : 88;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({
      top: Math.max(top, 0),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (location !== "/") return;

    const targetId = window.sessionStorage.getItem(PENDING_SCROLL_TARGET_KEY);
    if (!targetId) return;

    window.sessionStorage.removeItem(PENDING_SCROLL_TARGET_KEY);

    const timer = window.setTimeout(() => {
      scrollToSection(targetId);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [location]);

  const isActive = (link: typeof NAV_LINKS[0]) => {
    if (link.hash) return false;
    return location === link.href;
  };

  const handleHashLink = (href: string) => {
    if (!href.startsWith("/#")) return;

    const id = href.slice(2);

    if (location !== "/") {
      window.sessionStorage.setItem(PENDING_SCROLL_TARGET_KEY, id);
      setLocation("/");
    } else {
      scrollToSection(id);
    }

    setMobileMenuOpen(false);
  };

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        isScrolled
          ? "h-16 bg-background/90 backdrop-blur-md border-b border-border/60 shadow-sm"
          : "h-20 bg-transparent",
      )}
    >
      <div className="container mx-auto px-4 h-full flex items-center justify-between gap-4">
        <Link href="/">
          <MfkLogo size="md" className="cursor-pointer shrink-0" />
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {NAV_LINKS.map((link) =>
            link.hash ? (
              <button
                key={link.href}
                type="button"
                onClick={() => handleHashLink(link.href)}
                className="relative px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                {link.label}
              </button>
            ) : (
              <Link key={link.href} href={link.href}>
                <span
                  className={cn(
                    "relative px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors duration-200",
                    isActive(link)
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {link.label}

                  <span
                    className={cn(
                      "absolute bottom-0 right-3 left-3 h-0.5 rounded-full bg-primary transition-all duration-300",
                      isActive(link)
                        ? "opacity-100 scale-x-100"
                        : "opacity-0 scale-x-0",
                    )}
                  />
                </span>
              </Link>
            ),
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggle}
            aria-label="تبديل المظهر"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link href="/login">
            <Button variant="ghost" size="sm" className="font-semibold text-sm">
              دخول
            </Button>
          </Link>

          <Link href="/register">
            <Button
              size="sm"
              className="font-semibold text-sm px-5 shadow-sm shadow-primary/20"
            >
              إنشاء حساب
            </Button>
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            aria-label="تبديل المظهر"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="القائمة"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border shadow-xl py-3 px-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) =>
            link.hash ? (
              <button
                key={link.href}
                type="button"
                onClick={() => handleHashLink(link.href)}
                className="block py-2.5 px-3 rounded-xl text-sm font-medium transition-colors cursor-pointer text-foreground hover:bg-muted text-right w-full"
              >
                {link.label}
              </button>
            ) : (
              <Link key={link.href} href={link.href}>
                <span
                  className={cn(
                    "block py-2.5 px-3 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                    isActive(link)
                      ? "text-primary bg-primary/5"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  {link.label}
                </span>
              </Link>
            ),
          )}

          <div className="h-px bg-border my-2" />

          <div className="grid grid-cols-2 gap-2">
            <Link href="/login">
              <Button variant="outline" className="w-full text-sm" size="sm">
                دخول
              </Button>
            </Link>

            <Link href="/register">
              <Button className="w-full text-sm" size="sm">
                إنشاء حساب
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
