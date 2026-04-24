import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Link } from "wouter";
import { 
  Car, Activity, Wrench, Calendar, 
  AlertTriangle, CheckCircle2, Info, Zap
} from "lucide-react";
import { 
  useListVehicles, 
  useGetDashboardOverview, 
  useGetHealthTrend, 
  useGetLiveTelemetry, 
  useGetUpcomingMaintenance, 
  useGetRecentActivity,
  ActivityItemKind,
  ActivityItemSeverity
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const { data: vehicles, isLoading: loadingVehicles } = useListVehicles();
  const { data: overview, isLoading: loadingOverview } = useGetDashboardOverview();
  const { data: healthTrend, isLoading: loadingTrend } = useGetHealthTrend();
  
  const activeVehicleId = selectedVehicleId || (vehicles?.[0]?.id ?? "");
  
  const { data: liveTelemetry } = useGetLiveTelemetry(activeVehicleId, {
    query: { enabled: !!activeVehicleId, refetchInterval: 3000 } as any
  });
  
  const { data: upcomingMaintenance, isLoading: loadingMaintenance } = useGetUpcomingMaintenance();
  
  const { data: recentActivity, isLoading: loadingActivity } = useGetRecentActivity({ limit: 6 });

  const getHealthColor = (score: number) => {
    if (score >= 80) return "hsl(var(--chart-2))"; // Green
    if (score >= 60) return "hsl(var(--chart-4))"; // Amber
    if (score >= 40) return "hsl(var(--chart-5))"; // Orange
    return "hsl(var(--destructive))"; // Red
  };

  const getActivityIcon = (kind: ActivityItemKind, severity?: ActivityItemSeverity | null) => {
    switch (kind) {
      case "diagnostic_session": return <Activity className="h-4 w-4 text-blue-500" />;
      case "dtc_detected": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "dtc_cleared": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "maintenance_done": return <Wrench className="h-4 w-4 text-amber-500" />;
      case "booking_created": return <Calendar className="h-4 w-4 text-primary" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">مرحباً عبدالله</h1>
          <p className="text-muted-foreground">{format(new Date(), "EEEE، d MMMM yyyy", { locale: ar })}</p>
        </div>
      </div>

      {/* Vehicle Picker */}
      {loadingVehicles ? (
        <Skeleton className="h-24 w-full" />
      ) : vehicles && vehicles.length > 0 ? (
        <ScrollArea className="w-full whitespace-nowrap pb-4">
          <div className="flex w-max space-x-4 space-x-reverse p-1">
            {vehicles.map((v) => (
              <Card 
                key={v.id} 
                className={cn(
                  "w-[280px] cursor-pointer transition-all hover-elevate",
                  activeVehicleId === v.id ? "border-primary ring-1 ring-primary shadow-md" : "hover:border-primary/50"
                )}
                onClick={() => setSelectedVehicleId(v.id)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{v.nickname || `${v.make} ${v.model}`}</p>
                      <p className="text-xs text-muted-foreground">{v.plateNumber || `${v.year}`}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-bold" style={{ color: getHealthColor(v.healthScore) }}>{v.healthScore}</span>
                    <span className="text-[10px] text-muted-foreground">الصحة</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : null}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المركبات</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{overview?.vehicleCount || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الصحة</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? <Skeleton className="h-8 w-16" /> : (
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold" style={{ color: getHealthColor(overview?.avgHealthScore || 0) }}>
                  {overview?.avgHealthScore || 0}%
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الأعطال النشطة</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold text-destructive">{overview?.activeDtcCount || 0}</div>
                {!!overview?.criticalDtcCount && (
                  <p className="text-xs text-destructive mt-1">{overview.criticalDtcCount} حرجة</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الصيانة القادمة</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{overview?.upcomingMaintenanceCount || 0}</div>
                {!!overview?.overdueMaintenanceCount && (
                  <p className="text-xs text-destructive mt-1">{overview.overdueMaintenanceCount} متأخرة</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المسافة (30 يوم)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{overview?.kmDrivenLast30d || 0} <span className="text-sm font-normal text-muted-foreground">كم</span></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التوفير المتوقع</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-green-500">{overview?.estimatedSavingsSar || 0} <span className="text-sm font-normal text-muted-foreground">ر.س</span></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>مؤشر الصحة (30 يوم)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingTrend ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={healthTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), "d MMM", { locale: ar })} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    labelFormatter={(val) => format(new Date(val), "d MMMM yyyy", { locale: ar })}
                  />
                  <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>البيانات الحية</CardTitle>
            <CardDescription>{vehicles?.find(v => v.id === activeVehicleId)?.nickname || 'المركبة المحددة'}</CardDescription>
          </CardHeader>
          <CardContent>
            {!liveTelemetry?.isConnected ? (
              <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground text-center">
                <Car className="h-12 w-12 mb-4 opacity-20" />
                <p>المركبة غير متصلة حالياً</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/app/diagnostics">بدء جلسة</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center p-4 bg-secondary/30 rounded-xl">
                  <span className="text-3xl font-bold font-mono">{liveTelemetry.latest.rpm || 0}</span>
                  <span className="text-xs text-muted-foreground">RPM</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-secondary/30 rounded-xl">
                  <span className="text-3xl font-bold font-mono">{liveTelemetry.latest.speedKmh || 0}</span>
                  <span className="text-xs text-muted-foreground">كم/س</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-secondary/30 rounded-xl">
                  <span className="text-3xl font-bold font-mono">{liveTelemetry.latest.coolantTemp || 0}°</span>
                  <span className="text-xs text-muted-foreground">الحرارة</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-secondary/30 rounded-xl">
                  <span className="text-3xl font-bold font-mono">{liveTelemetry.latest.batteryV?.toFixed(1) || 0}V</span>
                  <span className="text-xs text-muted-foreground">البطارية</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>الصيانة القادمة</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/maintenance">عرض الكل</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingMaintenance ? <Skeleton className="h-40 w-full" /> : (
              <div className="space-y-4">
                {(upcomingMaintenance || []).slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-10 rounded-full", {
                        "bg-destructive": item.status === "overdue",
                        "bg-amber-500": item.status === "upcoming",
                        "bg-blue-500": item.status === "scheduled",
                      })} />
                      <div>
                        <p className="font-medium">{item.serviceTypeAr || item.serviceType}</p>
                        <p className="text-xs text-muted-foreground">{item.vehicleNickname || item.vehicleMake}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <Badge variant={item.status === "overdue" ? "destructive" : "secondary"}>
                        {item.status === "overdue" ? "متأخرة" : item.status === "upcoming" ? "قريباً" : "مجدولة"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{item.nextDueKm} كم</p>
                    </div>
                  </div>
                ))}
                {(!upcomingMaintenance || upcomingMaintenance.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">لا توجد صيانة قادمة</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>النشاط الأخير</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingActivity ? <Skeleton className="h-40 w-full" /> : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {(recentActivity || []).map((item) => (
                  <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-secondary text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      {getActivityIcon(item.kind, item.severity)}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-card shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-foreground">{item.titleAr}</div>
                        <time className="text-xs font-medium text-muted-foreground">{format(new Date(item.occurredAt), "dd MMM", { locale: ar })}</time>
                      </div>
                      {item.subtitleAr && <div className="text-sm text-muted-foreground">{item.subtitleAr}</div>}
                    </div>
                  </div>
                ))}
                {(!recentActivity || recentActivity.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">لا يوجد نشاط مسجل</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
