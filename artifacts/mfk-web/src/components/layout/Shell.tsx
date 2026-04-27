import { Link, useLocation } from "wouter";
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
  User,
  LogOut,
  ShieldAlert,
  Users,
  Settings
} from "lucide-react";
import { MfkLogo } from "@/components/MfkLogo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ShellProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

export function Shell({ children, isAdmin = false }: ShellProps) {
  const [location, setLocation] = useLocation();

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

  const NavLinks = () => (
    <div className="space-y-1">
      {navItems.map((item) => {
        const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/app" && item.href !== "/admin");
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn("w-full justify-start gap-3", isActive && "bg-secondary/50 text-primary")}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-l border-border bg-card">
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
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground" onClick={() => setLocation("/")}>
            <LogOut className="h-5 w-5" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
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
          
          <div className="flex items-center gap-4 mr-auto">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2.5 h-2 w-2 bg-primary rounded-full"></span>
            </Button>
            <div className="flex items-center gap-3">
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium leading-none">عبدالله السلمي</p>
                <p className="text-xs text-muted-foreground">+966 50 123 4567</p>
              </div>
              <Avatar>
                <AvatarFallback className="bg-primary/20 text-primary">ع</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}