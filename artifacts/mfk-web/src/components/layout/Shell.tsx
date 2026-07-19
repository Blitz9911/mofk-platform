import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Activity,
  Wrench,
  Calendar,
  MessageSquare,
  Lightbulb,
  CreditCard,
  LayoutDashboard,
  Bell,
  Menu,
  LogOut,
  ShieldAlert,
  Users,
  User,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  Fuel,
  MoreHorizontal,
  Package,
  Smartphone,
  Building2,
  BarChart3,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MfkLogo } from "@/components/MfkLogo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface ShellProps {
  children: ReactNode;
  isAdmin?: boolean;
}

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
};

type AppNotification = {
  id: string;
  type?: string | null;
  severity?: "info" | "warning" | "critical" | "success" | string | null;
  titleAr: string;
  bodyAr?: string | null;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt?: string | null;
  scheduledAt?: string | null;
};

const apiFetch = async (path: string, opts?: RequestInit) => {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });

  if (!res.ok) throw new Error(await res.text());

  return res.json();
};

function formatRelativeArabic(value?: string | null) {
  if (!value) return "الآن";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (!Number.isFinite(diffMinutes) || diffMinutes < 1) return "الآن";
  if (diffMinutes < 60) return `منذ ${diffMinutes.toLocaleString("ar-SA")} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours.toLocaleString("ar-SA")} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays.toLocaleString("ar-SA")} يوم`;

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getNotificationMeta(notification: AppNotification) {
  if (notification.severity === "critical") {
    return {
      icon: ShieldAlert,
      color: "text-destructive",
      bg: "bg-destructive/10",
    };
  }

  if (notification.severity === "warning") {
    return {
      icon: AlertTriangle,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    };
  }

  if (notification.severity === "success") {
    return {
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10",
    };
  }

  if (notification.type === "fuel") {
    return {
      icon: Fuel,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    };
  }

  if (notification.type === "maintenance" || notification.type === "reminder") {
    return {
      icon: Calendar,
      color: "text-primary",
      bg: "bg-primary/10",
    };
  }

  if (notification.type === "recommendation") {
    return {
      icon: Lightbulb,
      color: "text-primary",
      bg: "bg-primary/10",
    };
  }

  if (notification.type === "diagnostic") {
    return {
      icon: Zap,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    };
  }

  return {
    icon: Info,
    color: "text-muted-foreground",
    bg: "bg-muted",
  };
}

export function Shell({ children, isAdmin = false }: ShellProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<
    AppNotification[]
  >({
    queryKey: ["notifications"],
    queryFn: async () => {
      const data = await apiFetch("/api/notifications");
      return Array.isArray(data) ? data : data.notifications ?? [];
    },
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiFetch("/api/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const userNavItems: NavItem[] = [
    { href: "/app", label: "نظرة عامة", shortLabel: "الرئيسية", icon: LayoutDashboard },
    { href: "/app/vehicles", label: "مركباتي", shortLabel: "مركباتي", icon: Car },
    { href: "/app/diagnostics", label: "التشخيص المباشر", shortLabel: "تشخيص", icon: Activity },
    { href: "/app/dtc", label: "سجل الأعطال", shortLabel: "الأعطال", icon: Wrench },
    { href: "/app/maintenance", label: "الصيانة", shortLabel: "الصيانة", icon: Calendar },
    { href: "/app/fuel", label: "البنزين والصرفية", shortLabel: "البنزين", icon: Fuel },
    { href: "/app/assistant", label: "المساعد الذكي", shortLabel: "المساعد", icon: MessageSquare },
    { href: "/app/recommendations", label: "التوصيات", shortLabel: "التوصيات", icon: Lightbulb },
    { href: "/app/profile", label: "الملف الشخصي", shortLabel: "حسابي", icon: User },
    { href: "/app/subscription", label: "الاشتراك", shortLabel: "الاشتراك", icon: CreditCard },
  ];

  const adminNavItems: NavItem[] = [
    { href: "/admin", label: "نظرة عامة", shortLabel: "الرئيسية", icon: LayoutDashboard },
    { href: "/admin/users", label: "المستخدمين", shortLabel: "المستخدمين", icon: Users },
    { href: "/admin/vehicles", label: "المركبات", shortLabel: "المركبات", icon: Car },
    { href: "/admin/orders", label: "الطلبات", shortLabel: "الطلبات", icon: Package },
    { href: "/admin/devices", label: "الأجهزة", shortLabel: "الأجهزة", icon: Smartphone },
    { href: "/admin/subscriptions", label: "الاشتراكات", shortLabel: "الاشتراكات", icon: CreditCard },
    { href: "/admin/fleet-accounts", label: "حسابات الأسطول", shortLabel: "الأسطول", icon: Building2 },
    { href: "/admin/reports", label: "التقارير", shortLabel: "التقارير", icon: BarChart3 },
    { href: "/admin/settings", label: "الإعدادات", shortLabel: "الإعدادات", icon: Settings },
    { href: "/admin/revenue", label: "المالية", shortLabel: "المالية", icon: CreditCard },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  const bottomNavItems = isAdmin
    ? adminNavItems.slice(0, 4)
    : [
        userNavItems[0],
        userNavItems[1],
        userNavItems[5],
        userNavItems[4],
        userNavItems[6],
      ];

  const isActivePath = (href: string) => {
    if (href === "/app" || href === "/admin") return location === href;

    return location === href || location.startsWith(`${href}/`);
  };

  const markAllRead = () => {
    if (unreadCount > 0) markAllReadMutation.mutate();
  };

  const openNotification = (notification: AppNotification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }

    setNotifOpen(false);

    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
    }
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    setLocation("/");
  };

  const displayName = user?.name || "المستخدم";
  const displayPhone = user?.phone || "";
  const initials = displayName.charAt(0);
  const pageKey = location.split("?")[0];

  const NavLinks = ({
    onNav,
    compact = false,
  }: {
    onNav?: () => void;
    compact?: boolean;
  }) => (
    <div className={cn("space-y-1", compact && "space-y-0.5")}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = isActivePath(item.href);

        return (
          <Link key={item.href} href={item.href} onClick={onNav}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 rounded-2xl transition-all",
                compact ? "h-10 px-3 text-sm" : "h-11 px-4",
                isActive
                  ? "bg-primary/10 text-primary font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Button>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex w-full" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[280px] flex-col border-l border-border/80 bg-card/80 backdrop-blur shrink-0 sticky top-0 h-screen">
        <div className="h-16 flex items-center px-5 border-b border-border/80">
          <Link href="/" className="flex items-center gap-2">
            <MfkLogo size="sm" />
            {isAdmin && (
              <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold">
                لوحة الإدارة
              </span>
            )}
          </Link>
        </div>

        <ScrollArea className="flex-1 px-4 py-5">
          <NavLinks />
        </ScrollArea>

        <div className="p-4 border-t border-border/80">
          <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3 mb-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/20 text-primary font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{displayName}</p>
              {displayPhone && (
                <p className="text-xs text-muted-foreground truncate">
                  {displayPhone}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground rounded-2xl"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-border/80 bg-card/90 backdrop-blur flex items-center justify-between px-3 sm:px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <div className="lg:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-2xl">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>

                <SheetContent side="right" className="w-[290px] p-0">
                  <div className="h-16 flex items-center px-5 border-b border-border gap-2">
                    <MfkLogo size="sm" />
                    {isAdmin && (
                      <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold">
                        إدارة
                      </span>
                    )}
                  </div>

                  <ScrollArea className="h-[calc(100vh-9rem)] px-4 py-5">
                    <NavLinks
                      compact
                      onNav={() => setMobileMenuOpen(false)}
                    />
                  </ScrollArea>

                  <div className="p-4 border-t border-border">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 rounded-2xl text-muted-foreground"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5" />
                      تسجيل الخروج
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <Link href="/app" className="lg:hidden flex items-center shrink-0">
              <MfkLogo size="sm" />
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 relative">
            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-2xl"
                onClick={() => setNotifOpen((value) => !value)}
              >
                <Bell className="h-5 w-5" />

                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-primary text-primary-foreground rounded-full ring-2 ring-background text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>

              <AnimatePresence>
                {notifOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setNotifOpen(false)}
                    />

                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      className="fixed left-4 right-4 top-20 sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:w-96 bg-card border border-border rounded-3xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">التنبيهات</span>

                          {unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {unreadCount > 0 && (
                            <button
                              type="button"
                              onClick={markAllRead}
                              disabled={markAllReadMutation.isPending}
                              className="text-xs text-primary hover:underline ml-2 disabled:opacity-50"
                            >
                              قراءة الكل
                            </button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => setNotifOpen(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <ScrollArea className="max-h-[70vh] sm:max-h-96">
                        {notificationsLoading ? (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            جاري تحميل التنبيهات...
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="px-4 py-10 text-center">
                            <Bell className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                            <p className="text-sm font-bold">لا توجد تنبيهات</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              سنعرض هنا تذكيرات الصيانة والتنبيهات المهمة.
                            </p>
                          </div>
                        ) : (
                          notifications.map((notification) => {
                            const meta = getNotificationMeta(notification);
                            const Icon = meta.icon;

                            return (
                              <button
                                key={notification.id}
                                type="button"
                                onClick={() => openNotification(notification)}
                                className={cn(
                                  "w-full text-right flex gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 transition-colors",
                                  !notification.isRead && "bg-primary/5",
                                )}
                              >
                                <div
                                  className={cn(
                                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5",
                                    meta.bg,
                                  )}
                                >
                                  <Icon className={cn("w-4 h-4", meta.color)} />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <p className="text-sm font-bold truncate">
                                      {notification.titleAr}
                                    </p>

                                    {!notification.isRead && (
                                      <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                                    )}
                                  </div>

                                  {notification.bodyAr && (
                                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                      {notification.bodyAr}
                                    </p>
                                  )}

                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatRelativeArabic(notification.createdAt)}
                                  </p>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </ScrollArea>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* User info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold leading-none">{displayName}</p>
                {displayPhone && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {displayPhone}
                  </p>
                )}
              </div>

              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden p-3 sm:p-4 md:p-6 pb-24 lg:pb-6">
          <div className="mx-auto w-full max-w-[1600px]">
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
          </div>
        </main>

        {/* Mobile / Tablet Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="grid grid-cols-6 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.href);

              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition-colors",
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="truncate max-w-full">
                      {item.shortLabel || item.label}
                    </span>
                  </span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <MoreHorizontal className="h-5 w-5" />
              المزيد
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
