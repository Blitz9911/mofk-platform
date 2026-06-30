import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Lightbulb,
  AlertTriangle,
  Info,
  Wrench,
  Activity,
  ShieldAlert,
  Zap,
  Gauge,
  Calculator,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import {
  useListVehicles,
  useGetAiRecommendations,
  RecommendationSeverity,
  RecommendationKind,
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
import { EmptyState } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function formatKm(value: unknown) {
  const num = Number(value);

  if (!Number.isFinite(num)) return "-";

  return `${num.toLocaleString("ar-SA")} كم`;
}

function formatSar(value: unknown) {
  const num = Number(value);

  if (!Number.isFinite(num)) return "-";

  return `${num.toLocaleString("ar-SA")} ر.س`;
}

function safeDate(value: unknown) {
  if (!value || typeof value !== "string") return "-";

  try {
    return format(new Date(value), "d MMMM yyyy", { locale: ar });
  } catch {
    return value.slice(0, 10);
  }
}

function getRemainingText(rec: any) {
  if (rec.remainingKm !== undefined && rec.remainingKm !== null) {
    const remaining = Number(rec.remainingKm);

    if (remaining < 0) {
      return `متأخرة ${Math.abs(remaining).toLocaleString("ar-SA")} كم`;
    }

    return `متبقي ${remaining.toLocaleString("ar-SA")} كم`;
  }

  if (rec.daysUntilDue !== undefined && rec.daysUntilDue !== null) {
    const days = Number(rec.daysUntilDue);

    if (days < 0) {
      return `متأخرة ${Math.abs(days).toLocaleString("ar-SA")} يوم`;
    }

    return `متبقي ${days.toLocaleString("ar-SA")} يوم`;
  }

  return "غير محدد";
}

function buildEquation(rec: any) {
  if (
    rec.lastDoneKm !== undefined &&
    rec.lastDoneKm !== null &&
    rec.intervalKm !== undefined &&
    rec.intervalKm !== null &&
    rec.nextDueKm !== undefined &&
    rec.nextDueKm !== null
  ) {
    return `${formatKm(rec.lastDoneKm)} + ${formatKm(rec.intervalKm)} = ${formatKm(rec.nextDueKm)}`;
  }

  if (
    rec.intervalDays !== undefined &&
    rec.intervalDays !== null &&
    rec.lastDoneAt
  ) {
    return `آخر صيانة ${safeDate(rec.lastDoneAt)} + ${rec.intervalDays} يوم = ${safeDate(rec.nextDueAt)}`;
  }

  return null;
}

export default function Recommendations() {
  const { data: vehicles, isLoading: vehiclesLoading } = useListVehicles();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const activeVehicleId = selectedVehicleId || (vehicles?.[0]?.id ?? "");

  const {
    data: recommendations,
    isLoading: recommendationsLoading,
  } = useGetAiRecommendations(activeVehicleId, {
    query: { enabled: !!activeVehicleId } as any,
  });

  const getSeverityColor = (sev: RecommendationSeverity) => {
    switch (sev) {
      case "critical":
        return "border-destructive bg-destructive/5";
      case "warning":
        return "border-amber-500 bg-amber-500/5";
      case "info":
        return "border-blue-500 bg-blue-500/5";
      default:
        return "border-border bg-card";
    }
  };

  const getSeverityIcon = (sev: RecommendationSeverity) => {
    switch (sev) {
      case "critical":
        return <ShieldAlert className="w-5 h-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Lightbulb className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getSeverityLabel = (sev: RecommendationSeverity) => {
    switch (sev) {
      case "critical":
        return "حرجة";
      case "warning":
        return "تحتاج انتباه";
      case "info":
        return "معلومة";
      default:
        return "توصية";
    }
  };

  const getKindLabel = (kind: RecommendationKind) => {
    switch (kind) {
      case "predictive_failure":
        return "تنبؤ بعطل";
      case "maintenance_due":
        return "صيانة مستحقة";
      case "telemetry_anomaly":
        return "شذوذ في الأداء";
      case "behavioral":
        return "نصيحة قيادة";
      default:
        return "توصية";
    }
  };

  const getKindIcon = (kind: RecommendationKind) => {
    switch (kind) {
      case "predictive_failure":
        return <Activity className="w-3 h-3 ml-1" />;
      case "maintenance_due":
        return <Wrench className="w-3 h-3 ml-1" />;
      case "telemetry_anomaly":
        return <Zap className="w-3 h-3 ml-1" />;
      default:
        return <Lightbulb className="w-3 h-3 ml-1" />;
    }
  };

  const criticalRecs =
    recommendations?.filter((r) => r.severity === "critical") || [];

  const warningRecs =
    recommendations?.filter((r) => r.severity === "warning") || [];

  const infoRecs =
    recommendations?.filter((r) => r.severity === "info") || [];

  const sortedRecs = [...criticalRecs, ...warningRecs, ...infoRecs];

  const activeVehicle = vehicles?.find((v) => v.id === activeVehicleId);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">التوصيات الذكية</h1>
        <p className="text-muted-foreground mt-1">
          توصيات مبنية على سجل الصيانة وقراءة العداد الحالية لكل مركبة
        </p>
      </div>

      {vehiclesLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : vehicles && vehicles.length > 0 ? (
        <Tabs
          value={activeVehicleId}
          onValueChange={setSelectedVehicleId}
          className="w-full"
        >
          <TabsList className="w-full justify-start overflow-x-auto rounded-xl border bg-card p-1 h-auto mb-6">
            {vehicles.map((v) => (
              <TabsTrigger
                key={v.id}
                value={v.id}
                className="rounded-lg px-6 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                {v.nickname || `${v.make} ${v.model}`}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeVehicleId} className="mt-0 space-y-6">
            {activeVehicle && (
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Lightbulb className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          إجمالي التوصيات
                        </p>
                        <p className="text-2xl font-black">
                          {sortedRecs.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                        <ShieldAlert className="w-5 h-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          حرجة / متأخرة
                        </p>
                        <p className="text-2xl font-black">
                          {criticalRecs.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          قريبة
                        </p>
                        <p className="text-2xl font-black">
                          {warningRecs.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Gauge className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          العداد الحالي
                        </p>
                        <p className="text-2xl font-black">
                          {(activeVehicle.odometerKm || 0).toLocaleString("ar-SA")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {recommendationsLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
            ) : !sortedRecs.length ? (
              <EmptyState
                icon={<CheckCircle2 className="w-12 h-12 text-green-500" />}
                title="لا توجد توصيات حالياً"
                description="لا توجد توصيات تحتاج انتباهك الآن. سجّل صيانة جديدة أو حدّث قراءة العداد حتى تظهر توصيات أدق."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedRecs.map((rec) => {
                  const item = rec as any;
                  const equation = buildEquation(item);

                  return (
                    <Card
                      key={rec.id}
                      className={cn(
                        "overflow-hidden border-2",
                        getSeverityColor(rec.severity),
                      )}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-background">
                              {getKindIcon(rec.kind)}
                              {getKindLabel(rec.kind)}
                            </Badge>

                            <Badge
                              variant={
                                rec.severity === "critical"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className={
                                rec.severity === "warning"
                                  ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30"
                                  : rec.severity === "info"
                                    ? "bg-blue-500/20 text-blue-600 hover:bg-blue-500/30"
                                    : ""
                              }
                            >
                              {getSeverityLabel(rec.severity)}
                            </Badge>
                          </div>

                          {getSeverityIcon(rec.severity)}
                        </div>

                        <CardTitle className="text-xl leading-tight">
                          {rec.titleAr}
                        </CardTitle>

                        {rec.createdAt && (
                          <CardDescription>
                            {format(new Date(rec.createdAt), "d MMMM yyyy", {
                              locale: ar,
                            })}
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {rec.descriptionAr && (
                          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                            <div className="flex items-start gap-2">
                              <Info className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {rec.descriptionAr}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-lg bg-muted p-3">
                            <span className="block text-xs text-muted-foreground">
                              آخر صيانة
                            </span>
                            <span className="font-bold">
                              {formatKm(item.lastDoneKm)}
                            </span>
                          </div>

                          <div className="rounded-lg bg-muted p-3">
                            <span className="block text-xs text-muted-foreground">
                              العداد الحالي
                            </span>
                            <span className="font-bold">
                              {formatKm(item.currentOdometerKm)}
                            </span>
                          </div>

                          <div className="rounded-lg bg-muted p-3">
                            <span className="block text-xs text-muted-foreground">
                              القادمة عند
                            </span>
                            <span className="font-bold">
                              {item.nextDueKm ? formatKm(item.nextDueKm) : safeDate(item.nextDueAt)}
                            </span>
                          </div>

                          <div className="rounded-lg bg-muted p-3">
                            <span className="block text-xs text-muted-foreground">
                              المتبقي
                            </span>
                            <span
                              className={cn(
                                "font-bold",
                                rec.severity === "critical"
                                  ? "text-destructive"
                                  : rec.severity === "warning"
                                    ? "text-amber-500"
                                    : "text-blue-500",
                              )}
                            >
                              {getRemainingText(item)}
                            </span>
                          </div>
                        </div>

                        {equation && (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-bold text-primary">
                              <Calculator className="w-4 h-4" />
                              معادلة التوصية
                            </div>
                            <p className="text-sm font-mono leading-relaxed">
                              {equation}
                            </p>
                          </div>
                        )}

                        {(item.lastDoneAt || item.nextDueAt) && (
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-lg border border-border/60 p-3">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                <Calendar className="w-3 h-3" />
                                تاريخ آخر صيانة
                              </div>
                              <div className="font-medium">
                                {safeDate(item.lastDoneAt)}
                              </div>
                            </div>

                            <div className="rounded-lg border border-border/60 p-3">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                <Calendar className="w-3 h-3" />
                                تاريخ الاستحقاق
                              </div>
                              <div className="font-medium">
                                {safeDate(item.nextDueAt)}
                              </div>
                            </div>
                          </div>
                        )}

                        {item.progressPct !== undefined &&
                          item.progressPct !== null && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs font-medium">
                                <span>نسبة استهلاك الفاصل</span>
                                <span>{item.progressPct}%</span>
                              </div>
                              <Progress
                                value={item.progressPct}
                                className={cn(
                                  "h-2",
                                  rec.severity === "critical"
                                    ? "[&>div]:bg-destructive"
                                    : rec.severity === "warning"
                                      ? "[&>div]:bg-amber-500"
                                      : "[&>div]:bg-blue-500",
                                )}
                              />
                            </div>
                          )}

                        {rec.confidencePct !== undefined && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                              <span>نسبة الثقة بالتوصية</span>
                              <span>{rec.confidencePct}%</span>
                            </div>
                            <Progress
                              value={rec.confidencePct}
                              className={cn(
                                "h-2",
                                rec.severity === "critical"
                                  ? "[&>div]:bg-destructive"
                                  : rec.severity === "warning"
                                    ? "[&>div]:bg-amber-500"
                                    : "[&>div]:bg-blue-500",
                              )}
                            />
                          </div>
                        )}

                        {(rec.suggestedAction ||
                          rec.suggestedCostSar !== undefined) && (
                          <div className="bg-background/50 rounded-lg p-3 mt-4 space-y-2 border border-border/50">
                            {rec.suggestedAction && (
                              <div className="flex gap-2">
                                <Wrench className="w-4 h-4 shrink-0 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {rec.suggestedAction}
                                </span>
                              </div>
                            )}

                            {rec.suggestedCostSar !== undefined && (
                              <div className="flex justify-between items-center text-sm pt-2 border-t border-border/50">
                                <span className="text-muted-foreground">
                                  التكلفة التقديرية
                                </span>
                                <span className="font-bold text-primary">
                                  {formatSar(rec.suggestedCostSar)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <EmptyState
          icon={<Lightbulb className="w-12 h-12" />}
          title="لا توجد مركبات"
          description="أضف مركبة للحصول على توصيات ذكية"
        />
      )}
    </div>
  );
}
