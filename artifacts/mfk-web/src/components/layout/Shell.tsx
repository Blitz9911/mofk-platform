import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Car, Activity, Wrench, MapPin, Calendar, MessageSquare, 
  Lightbulb, CreditCard, LayoutDashboard, Bell, Menu, 
  LogOut, ShieldAlert, Users, Settings, X,
  AlertTriangle, CheckCircle2, Info, Zap
} from "lucide-react";
import { MfkLogo } from "@/components/MfkLogo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface ShellProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

const MOCK_NOTIFICATIONS = [
  { id: "1", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", title: "عطل محرك محتمل", desc: "كود P0300 — اهتزاز غير منتظم في أسطوانات المحرك", time: "منذ 5 دقائق", unread: true },
  { id: "2", icon: Calendar, color: "text-primary", bg: "bg-primary/10", title: "موعد صيانة قادم", desc: "تغيير زيت المحرك — بعد 500 كم أو 7 أيام", time: "منذ ساعة", unread: true },
  { id: "3", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", title: "تم تأكيد الحجز", desc: "ورشة النخبة — الثلاثاء 4:00 م", time: "منذ 3 ساعات", unread: false },
  { id: "4", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10", title: "تقرير صحي أسبوعي", desc: "حالة سيارتك جيدة — 87/100", time: "أمس", unread: false },
];

export function Shell({ children, isAdmin = false }: ShellProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, unread: false })));

  const displayName = user?.name || "المستخدم";
  const displayPhone = user?.phone || "";
  const initials = displayName.charAt(0);

  const userNavItems = [
    { href: "/app", label: "نظرة عامة", icon: LayoutDashboard },
    { href: "/app/vehicles", label: "مركباتي", icon: Car },
    { href: "/app/diagnostics", label: "التشخيص المباشر", icon: Activity },
    { href: "/app/dtc", label: "سجل الأعطال", icon: Wrench },
    { href: "/app/maintenance", label: "الصيانة", icon: Calendar },
    { href: "/app/assistant", label: "المساعد الذكي", icon: MessageSquare },
    { href: "/app/recommendations", label: "التوصيات", icon: Lightbulb },
    { href: "/app/subscription", label: "الاشتراك", icon: CreditCard },
  ];

  const adminNavItems = [
    { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard },
    { href: "/admin/users", label: "المستخدمين", icon: Users },
    { href: "/admin/vehicles", label: "المركبات", icon: Car },
    { href: "/admin/diagnostics", label: "التشخيص الحي", icon: Activity },
    { href: "/admin/issues", label: "الأعطال الشائعة", icon: ShieldAlert },
    { href: "/admin/workshops", label: "الورش والعوائد", icon: MapPin },
    { href: "/admin/revenue", label: "المالية", icon: CreditCard },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  const NavLinks = ({ onNav }: { onNav?: () => void }) => (
    <div className="space-y-1">
      {navItems.map((item) => {
        const isActive = location === item.href ||
          (location.startsWith(item.href) && item.href !== "/app" && item.href !== "/admin");
        return (
          <Link key={item.href} href={item.href} onClick={onNav}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn("w-full justify-start gap-3 transition-colors", isActive && "bg-primary/10 text-primary font-semibold")}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );

  const pageKey = location.split("?")[0];

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-l border-border bg-card shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <MfkLogo size="sm" />
            {isAdmin && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">لوحة الإدارة</span>}
          </Link>
        </div>
        <ScrollArea className="flex-1 px-4 py-6">
          <NavLinks />
        </ScrollArea>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => { logout(); setLocation("/"); }}>
            <LogOut className="h-5 w-5" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          {/* Mobile menu */}
          <div className="flex items-center md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0">
                <div className="h-16 flex items-center px-6 border-b border-border gap-2">
                  <MfkLogo size="sm" />
                  {isAdmin && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">إدارة</span>}
                </div>
                <ScrollArea className="h-[calc(100vh-4rem)] px-4 py-6">
                  <NavLinks />
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <MfkLogo size="sm" className="mr-4" />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 mr-auto relative">
            {/* Notification Bell */}
            <div className="relative">
              <Button variant="ghost" size="icon" className="relative"
                onClick={() => setNotifOpen(v => !v)}>
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-primary rounded-full ring-2 ring-background" />
                )}
              </Button>

              {/* Notification Panel */}
              <AnimatePresence>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      className="absolute left-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">التنبيهات</span>
                          {unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {unreadCount > 0 && (
                            <button onClick={markAllRead}
                              className="text-xs text-primary hover:underline ml-2">قراءة الكل</button>
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNotifOpen(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <ScrollArea className="max-h-80">
                        {notifications.map(n => (
                          <div key={n.id}
                            onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x))}
                            className={cn(
                              "flex gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 transition-colors",
                              n.unread && "bg-primary/5"
                            )}>
                            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", n.bg)}>
                              <n.icon className={cn("w-4 h-4", n.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <p className="text-sm font-semibold truncate">{n.title}</p>
                                {n.unread && <div className="w-2 h-2 bg-primary rounded-full shrink-0" />}
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{n.desc}</p>
                              <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                            </div>
                          </div>
                        ))}
                      </ScrollArea>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                {displayPhone && <p className="text-xs text-muted-foreground">{displayPhone}</p>}
              </div>
              <Avatar>
                <AvatarFallback className="bg-primary/20 text-primary font-bold">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Main Content with page transitions */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pageKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
