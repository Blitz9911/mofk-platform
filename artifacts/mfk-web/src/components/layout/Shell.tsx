import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Activity,
  Wrench,
  MapPin,
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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

  const displayName = user?.name || "المستخدم";
  const displayPhone = user?.phone || "";
  const initials = displayName.charAt(0);

  const userNavItems = [
  { href: "/app", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/app/vehicles", label: "مركباتي", icon: Car },
  { href: "/app/diagnostics", label: "التشخيص المباشر", icon: Activity },
  { href: "/app/dtc", label: "سجل الأعطال", icon: Wrench },
  { href: "/app/maintenance", label: "الصيانة", icon: Calendar },
  { href: "/app/fuel", label: "البنزين والصرفية", icon: Fuel },
  { href: "/app/assistant", label: "المساعد الذكي", icon: MessageSquare },
  { href: "/app/recommendations", label: "التوصيات", icon: Lightbulb },
  { href: "/app/profile", label: "الملف الشخصي", icon: User },
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
        const isActive =
          location === item.href ||
          (location.startsWith(item.href) &&
            item.href !== "/app" &&
            item.href !== "/admin");

        return (
          <Link key={item.href} href={item.href} onClick={onNav}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 transition-colors",
                isActive && "bg-primary/10 text-primary font-semibold",
              )}
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
            {isAdmin && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                لوحة الإدارة
              </span>
            )}
          </Link>
        </div>

        <ScrollArea className="flex-1 px-4 py-6">
          <NavLinks />
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => {
              logout();
              setLocation("/");
            }}
          >
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
                  {isAdmin && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      إدارة
                    </span>
                  )}
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
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setNotifOpen((value) => !value)}
              >
                <Bell className="h-5 w-5" />

                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-primary text-primary-foreground rounded-full ring-2 ring-background text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>

              {/* Notification Panel */}
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
                      className="absolute left-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">التنبيهات</span>

                          {unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {unreadCount > 0 && (
                            <button
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
                            className="h-6 w-6"
                            onClick={() => setNotifOpen(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <ScrollArea className="max-h-80">
                        {notificationsLoading ? (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            جاري تحميل التنبيهات...
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="px-4 py-10 text-center">
                            <Bell className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                            <p className="text-sm font-medium">لا توجد تنبيهات</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              سنعرض هنا تذكيرات الصيانة والتنبيهات المهمة.
                            </p>
                          </div>
                        ) : (
                          notifications.map((notification) => {
                            const meta = getNotificationMeta(notification);
                            const Icon = meta.icon;

                            return (
                              <div
                                key={notification.id}
                                onClick={() => openNotification(notification)}
                                className={cn(
                                  "flex gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 transition-colors",
                                  !notification.isRead && "bg-primary/5",
                                )}
                              >
                                <div
                                  className={cn(
                                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                                    meta.bg,
                                  )}
                                >
                                  <Icon className={cn("w-4 h-4", meta.color)} />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <p className="text-sm font-semibold truncate">
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
                              </div>
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
            <div className="flex items-center gap-3">
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                {displayPhone && (
                  <p className="text-xs text-muted-foreground">{displayPhone}</p>
                )}
              </div>

              <Avatar>
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {initials}
                </AvatarFallback>
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
