import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Car,
  Activity,
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  Fuel,
  Gauge,
  Plus,
  ArrowLeft,
  ShieldCheck,
  Battery,
  Thermometer,
  Timer,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListVehicles,
  useGetDashboardOverview,
  useGetHealthTrend,
  useGetLiveTelemetry,
  useGetUpcomingMaintenance,
  useGetRecentActivity,
  ActivityItemKind,
  ActivityItemSeverity,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

type FuelStats = {
  totalLiters: number;
  totalCostSar: number;
  avgConsumptionL100km: number | null;
  avgKmPerLiter: number | null;
  fillCount: number;
  trendByDay: { date: string; liters: number; costSar: number; fills: number }[];
};

const apiFetch = async <T,>(path: string): Promise<T> => {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.error || "حدث خطأ غير متوقع");
  }

  return data as T;
};

function getHealthColor(score: number) {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-amber-500";
  if (score >= 40) return "text-orange-500";
  return "text-destructive";
}

function getHealthBg(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-destructive";
}

function getHealthLabel(score: number) {
  if (score >= 80) return "ممتازة";
  if (score >= 60) return "تحتاج متابعة";
  if (score >= 40) return "تحتاج فحص";
  return "حرجة";
}

function KpiCard({
  title,
  value,
  helper,
  icon: Icon,
  loading,
  tone = "default",
}: {
  title: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  loading?: boolean;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
}) {
  const toneClass = {
    default: "bg-muted text-muted-foreground",
    success: "bg-green-500/10 text-green-500",
    warning: "bg-amber-500/10 text-amber-500",
    danger: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
  }[tone];

  return (
    <Card className="overflow-hidden border-border/80 hover:border-primary/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>

            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-black tracking-tight">{value}</p>
            )}

            {helper && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {helper}
              </p>
            )}
          </div>

          <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center", toneClass)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyVehiclesState() {
  return (
    <Card className="overflow-hidden border-dashed">
      <CardContent className="p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Car className="h-7 w-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold">ابدأ بإضافة مركبتك الأولى</h2>
              <p className="text-muted-foreground mt-1 max-w-2xl">
                أضف بيانات سيارتك عشان مفك يقدر يتابع الصيانة، البنزين، الأعطال، والتنبيهات الذكية.
              </p>
            </div>
          </div>

          <Button asChild className="rounded-full">
            <Link href="/app/vehicles">
              <Plus className="h-4 w-4 ml-2" />
              إضافة مركبة
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const { data: vehicles, isLoading: loadingVehicles } = useListVehicles();
  const { data: overview, isLoading: loadingOverview } = useGetDashboardOverview();
  const { data: healthTrend, isLoading: loadingTrend } = useGetHealthTrend();

  const activeVehicleId = selectedVehicleId || (vehicles?.[0]?.id ?? "");
  const activeVehicle = vehicles?.find((v) => v.id === activeVehicleId);

  const { data: liveTelemetry } = useGetLiveTelemetry(activeVehicleId, {
    query: { enabled: !!activeVehicleId, refetchInterval: 3000 } as any,
  });

  const { data: upcomingMaintenance, isLoading: loadingMaintenance } =
    useGetUpcomingMaintenance();

  const { data: recentActivity, isLoading: loadingActivity } =
    useGetRecentActivity({ limit: 6 });

  const { data: fuelStats, isLoading: loadingFuel } = useQuery<FuelStats>({
    queryKey: ["dashboard-fuel-stats", activeVehicleId],
    queryFn: () =>
      apiFetch<FuelStats>(
        `/api/fuel/stats?period=month${activeVehicleId ? `&vehicleId=${activeVehicleId}` : ""}`,
      ),
    enabled: Boolean(activeVehicleId),
  });

  const firstName = user?.name?.split(" ")[0] || "بك";
  const healthScore = activeVehicle?.healthScore ?? overview?.avgHealthScore ?? 0;
  const healthLabel = getHealthLabel(healthScore);

  const urgentMaintenanceCount = useMemo(() => {
    return (upcomingMaintenance || []).filter((item) => item.status === "overdue")
      .length;
  }, [upcomingMaintenance]);

  const getActivityIcon = (
    kind: ActivityItemKind,
    severity?: ActivityItemSeverity | null,
  ) => {
    switch (kind) {
      case "diagnostic_session":
        return <Activity className="h-4 w-4 text-blue-500" />;
      case "dtc_detected":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "dtc_cleared":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "maintenance_done":
        return <Wrench className="h-4 w-4 text-amber-500" />;
      case "booking_created":
        return <Calendar className="h-4 w-4 text-primary" />;
      default:
        return severity === "critical" ? (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        ) : (
          <Info className="h-4 w-4 text-muted-foreground" />
        );
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-orange-500 to-orange-600 text-white shadow-xl">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 right-24 h-64 w-64 rounded-full bg-black/10 blur-3xl" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="space-y-3">
              <Badge className="bg-white/15 text-white border-white/20 hover:bg-white/20">
                <Sparkles className="h-3.5 w-3.5 ml-1" />
                لوحة مفك الذكية
              </Badge>

              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                  مرحباً {firstName}
                </h1>
                <p className="text-white/80 mt-2">
                  {format(new Date(), "EEEE، d MMMM yyyy", { locale: ar })}
                </p>
              </div>

              <p className="text-white/85 max-w-2xl leading-relaxed">
                تابع صحة مركباتك، الصيانة، البنزين، والتنبيهات من مكان واحد.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 min-w-[280px]">
              <div className="rounded-2xl bg-white/15 border border-white/20 p-4 backdrop-blur">
                <p className="text-xs text-white/70">المركبة النشطة</p>
                <p className="text-lg font-black mt-1 truncate">
                  {activeVehicle
                    ? activeVehicle.nickname ||
                      `${activeVehicle.make} ${activeVehicle.model}`
                    : "لا توجد مركبة"}
                </p>
                <p className="text-xs text-white/70 mt-1">
                  {activeVehicle?.plateNumber || activeVehicle?.year || "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/15 border border-white/20 p-4 backdrop-blur">
                <p className="text-xs text-white/70">حالة المركبة</p>
                <p className="text-3xl font-black mt-1">{healthScore}%</p>
                <p className="text-xs text-white/70 mt-1">{healthLabel}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button asChild className="rounded-full bg-white text-primary hover:bg-white/90">
              <Link href="/app/diagnostics">
                <Activity className="h-4 w-4 ml-2" />
                بدء التشخيص
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link href="/app/vehicles">
                <Plus className="h-4 w-4 ml-2" />
                إضافة مركبة
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {loadingVehicles ? (
        <Skeleton className="h-28 w-full rounded-3xl" />
      ) : vehicles && vehicles.length > 0 ? (
        <ScrollArea className="w-full whitespace-nowrap pb-4">
          <div className="flex w-max space-x-4 space-x-reverse p-1">
            {vehicles.map((vehicle) => {
              const selected = activeVehicleId === vehicle.id;
              const score = vehicle.healthScore ?? 0;

              return (
                <Card
                  key={vehicle.id}
                  className={cn(
                    "w-[310px] cursor-pointer transition-all overflow-hidden",
                    selected
                      ? "border-primary ring-1 ring-primary shadow-md"
                      : "hover:border-primary/50",
                  )}
                  onClick={() => setSelectedVehicleId(vehicle.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Car className="h-6 w-6" />
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold truncate">
                            {vehicle.nickname ||
                              `${vehicle.make} ${vehicle.model}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {vehicle.plateNumber || `${vehicle.year}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <p className={cn("text-2xl font-black", getHealthColor(score))}>
                          {score}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          الصحة
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", getHealthBg(score))}
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <EmptyVehiclesState />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="المركبات"
          value={overview?.vehicleCount || 0}
          helper="إجمالي المركبات المسجلة"
          icon={Car}
          loading={loadingOverview}
          tone="primary"
        />

        <KpiCard
          title="متوسط الحالة"
          value={`${overview?.avgHealthScore || 0}%`}
          helper={getHealthLabel(overview?.avgHealthScore || 0)}
          icon={ShieldCheck}
          loading={loadingOverview}
          tone="success"
        />

        <KpiCard
          title="الصيانة القادمة"
          value={overview?.upcomingMaintenanceCount || 0}
          helper={
            overview?.overdueMaintenanceCount
              ? `${overview.overdueMaintenanceCount} متأخرة`
              : "لا توجد صيانة متأخرة"
          }
          icon={Calendar}
          loading={loadingOverview}
          tone={overview?.overdueMaintenanceCount ? "danger" : "warning"}
        />

        <KpiCard
          title="البنزين هذا الشهر"
          value={
            loadingFuel
              ? "-"
              : `${(fuelStats?.totalCostSar || 0).toLocaleString()} ر.س`
          }
          helper={`${fuelStats?.fillCount || 0} تعبئة`}
          icon={Fuel}
          loading={loadingFuel}
          tone="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>مؤشر صحة المركبات</CardTitle>
              <CardDescription>متابعة آخر 30 يوم</CardDescription>
            </div>

            <Badge variant="secondary">
              {overview?.avgHealthScore || 0}%
            </Badge>
          </CardHeader>

          <CardContent className="h-[320px]">
            {loadingTrend ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={healthTrend || []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) =>
                      format(new Date(val), "d MMM", { locale: ar })
                    }
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    labelFormatter={(val) =>
                      format(new Date(val), "d MMMM yyyy", { locale: ar })
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorScore)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>البيانات الحية</CardTitle>
            <CardDescription>
              {activeVehicle?.nickname ||
                (activeVehicle
                  ? `${activeVehicle.make} ${activeVehicle.model}`
                  : "المركبة المحددة")}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!liveTelemetry?.isConnected ? (
              <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground text-center">
                <div className="h-16 w-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
                  <Car className="h-8 w-8 opacity-40" />
                </div>

                <p className="font-medium">المركبة غير متصلة حالياً</p>
                <p className="text-xs mt-1 max-w-xs">
                  ابدأ جلسة تشخيص لقراءة بيانات السيارة الحية.
                </p>

                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/app/diagnostics">
                    بدء جلسة
                    <ArrowLeft className="h-4 w-4 mr-2" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/40 p-4 text-center">
                  <Timer className="h-5 w-5 mx-auto text-primary mb-2" />
                  <span className="text-2xl font-black font-mono">
                    {liveTelemetry.latest.rpm || 0}
                  </span>
                  <p className="text-xs text-muted-foreground">RPM</p>
                </div>

                <div className="rounded-2xl bg-muted/40 p-4 text-center">
                  <Gauge className="h-5 w-5 mx-auto text-primary mb-2" />
                  <span className="text-2xl font-black font-mono">
                    {liveTelemetry.latest.speedKmh || 0}
                  </span>
                  <p className="text-xs text-muted-foreground">كم/س</p>
                </div>

                <div className="rounded-2xl bg-muted/40 p-4 text-center">
                  <Thermometer className="h-5 w-5 mx-auto text-primary mb-2" />
                  <span className="text-2xl font-black font-mono">
                    {liveTelemetry.latest.coolantTemp || 0}°
                  </span>
                  <p className="text-xs text-muted-foreground">الحرارة</p>
                </div>

                <div className="rounded-2xl bg-muted/40 p-4 text-center">
                  <Battery className="h-5 w-5 mx-auto text-primary mb-2" />
                  <span className="text-2xl font-black font-mono">
                    {liveTelemetry.latest.batteryV?.toFixed(1) || 0}V
                  </span>
                  <p className="text-xs text-muted-foreground">البطارية</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>ملخص البنزين</CardTitle>
            <CardDescription>الشهر الحالي للمركبة المحددة</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {loadingFuel ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-2xl border border-border p-4">
                  <span className="text-sm text-muted-foreground">إجمالي الإنفاق</span>
                  <span className="font-black text-primary">
                    {(fuelStats?.totalCostSar || 0).toLocaleString()} ر.س
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border p-4">
                  <span className="text-sm text-muted-foreground">إجمالي اللترات</span>
                  <span className="font-black">
                    {fuelStats?.totalLiters || 0} لتر
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border p-4">
                  <span className="text-sm text-muted-foreground">متوسط الصرفية</span>
                  <span className="font-black">
                    {fuelStats?.avgKmPerLiter
                      ? `${fuelStats.avgKmPerLiter} كم/لتر`
                      : "-"}
                  </span>
                </div>

                <Button variant="outline" className="w-full" asChild>
                  <Link href="/app/fuel">
                    إدارة البنزين
                    <ArrowLeft className="h-4 w-4 mr-2" />
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>الصيانة القادمة</CardTitle>
              <CardDescription>
                {urgentMaintenanceCount > 0
                  ? `${urgentMaintenanceCount} صيانة متأخرة`
                  : "لا توجد صيانة متأخرة"}
              </CardDescription>
            </div>

            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/maintenance">عرض الكل</Link>
            </Button>
          </CardHeader>

          <CardContent>
            {loadingMaintenance ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="space-y-3">
                {(upcomingMaintenance || []).slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 border border-border rounded-2xl bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn("w-2 h-11 rounded-full shrink-0", {
                          "bg-destructive": item.status === "overdue",
                          "bg-amber-500": item.status === "upcoming",
                          "bg-blue-500": item.status === "scheduled",
                        })}
                      />

                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {item.serviceTypeAr || item.serviceType}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.vehicleNickname || item.vehicleMake || "مركبة"}
                        </p>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <Badge
                        variant={
                          item.status === "overdue" ? "destructive" : "secondary"
                        }
                      >
                        {item.status === "overdue"
                          ? "متأخرة"
                          : item.status === "upcoming"
                            ? "قريباً"
                            : "مجدولة"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.nextDueKm ? `${item.nextDueKm} كم` : "-"}
                      </p>
                    </div>
                  </div>
                ))}

                {(!upcomingMaintenance || upcomingMaintenance.length === 0) && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Wrench className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    لا توجد صيانة قادمة
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>التوصيات الذكية</CardTitle>
            <CardDescription>ملخص سريع من مفك</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Lightbulb className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold">راجع توصيات الصيانة</p>
                <p className="text-sm text-muted-foreground mt-1">
                  لديك {overview?.activeRecommendationsCount || 0} توصية تحتاج متابعة.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold">الأعطال النشطة</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {overview?.activeDtcCount || 0} عطل نشط حالياً.
                </p>
              </div>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/app/recommendations">
                فتح التوصيات
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>النشاط الأخير</CardTitle>
          <CardDescription>آخر الأحداث المسجلة في حسابك</CardDescription>
        </CardHeader>

        <CardContent>
          {loadingActivity ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {(recentActivity || []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-2xl border border-border p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    {getActivityIcon(item.kind, item.severity)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold truncate">{item.titleAr}</p>
                      <time className="text-xs font-medium text-muted-foreground shrink-0">
                        {format(new Date(item.occurredAt), "dd MMM", {
                          locale: ar,
                        })}
                      </time>
                    </div>

                    {item.subtitleAr && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {item.subtitleAr}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {(!recentActivity || recentActivity.length === 0) && (
                <div className="md:col-span-2 text-center py-10 text-muted-foreground">
                  <Info className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  لا يوجد نشاط مسجل
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
