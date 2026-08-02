import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Calendar,
  CheckCircle2,
  Route,
} from "lucide-react";
import {
  useListVehicles,
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RecommendationPriority = "critical" | "high" | "medium" | "low" | "info";
type RecommendationCategory = "maintenance" | "diagnostic" | "battery" | "fuel" | "safety" | "data_quality" | "general";
type RecommendationStatus = "active" | "completed" | "dismissed" | "expired";

type SmartRecommendation = {
  id: string;
  vehicleId: string;
  category?: RecommendationCategory;
  kind: RecommendationKind | string;
  priority?: RecommendationPriority;
  severity: RecommendationSeverity | RecommendationPriority;
  status?: RecommendationStatus;
  source?: string | null;
  sourceReferenceId?: string | null;
  title?: string;
  titleAr: string;
  summary?: string;
  summaryAr?: string;
  reason?: string;
  reasonAr?: string;
  descriptionAr?: string;
  recommendedAction?: string | null;
  recommendedActionAr?: string | null;
  confidencePct?: number;
  suggestedAction?: string | null;
  suggestedCostSar?: number | null;
  dueDate?: string | Date | null;
  dueMileage?: number | null;
  metadata?: Record<string, unknown>;
  createdAt?: string | Date;
};

function hasRealConfidence(rec: SmartRecommendation) {
  return rec.metadata?.confidenceSource === "real" && rec.confidencePct !== undefined;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(data?.error || data?.message || "تعذر الاتصال بالخادم.");
  return data as T;
}

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

export default function Recommendations() {
  const queryClient = useQueryClient();
  const { data: vehicles, isLoading: vehiclesLoading } = useListVehicles();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "urgent" | RecommendationCategory>("all");

  const activeVehicleId = selectedVehicleId || (vehicles?.[0]?.id ?? "");

  const {
    data: recommendations,
    isLoading: recommendationsLoading,
    refetch: refetchRecommendations,
    isError,
    error,
  } = useQuery({
    queryKey: ["smart-recommendations", activeVehicleId],
    queryFn: () => apiFetch<SmartRecommendation[]>(`/api/recommendations?vehicleId=${encodeURIComponent(activeVehicleId)}`),
    enabled: !!activeVehicleId,
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/recommendations/${encodeURIComponent(id)}/complete`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["smart-recommendations", activeVehicleId] }),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/recommendations/${encodeURIComponent(id)}/dismiss`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["smart-recommendations", activeVehicleId] }),
  });

  const getSeverityColor = (sev: RecommendationSeverity | RecommendationPriority | string) => {
    switch (sev) {
      case "critical":
      case "high":
        return "border-destructive bg-destructive/5";
      case "warning":
      case "medium":
        return "border-amber-500 bg-amber-500/5";
      case "info":
      case "low":
        return "border-blue-500 bg-blue-500/5";
      default:
        return "border-border bg-card";
    }
  };

  const getSeverityIcon = (sev: RecommendationSeverity | RecommendationPriority | string) => {
    switch (sev) {
      case "critical":
      case "high":
        return <ShieldAlert className="w-5 h-5 text-destructive" />;
      case "warning":
      case "medium":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "info":
      case "low":
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Lightbulb className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getSeverityLabel = (sev: RecommendationSeverity | RecommendationPriority | string) => {
    switch (sev) {
      case "critical":
        return "حرجة";
      case "high":
        return "مهمة";
      case "warning":
      case "medium":
        return "تحتاج انتباه";
      case "low":
        return "متابعة";
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

  const getCategoryLabel = (category?: string | null) => {
    switch (category) {
      case "maintenance":
        return "الصيانة";
      case "diagnostic":
        return "الأعطال";
      case "fuel":
        return "الوقود";
      case "battery":
        return "البطارية";
      case "data_quality":
        return "البيانات";
      default:
        return "عام";
    }
  };

  const getSourceLabel = (source?: string | null) => {
    switch (source) {
      case "maintenance_record":
        return "سجل الصيانة";
      case "odometer":
        return "قراءة العداد";
      case "dtc":
        return "أكواد الأعطال";
      case "live_data":
        return "البيانات الحية";
      case "fuel_record":
        return "سجل الوقود";
      case "vehicle_profile":
        return "بيانات المركبة";
      default:
        return "نظام مفك";
    }
  };

  const criticalRecs =
    recommendations?.filter((r) => (r.priority ?? r.severity) === "critical" || (r.priority ?? r.severity) === "high") || [];

  const warningRecs =
    recommendations?.filter((r) => (r.priority ?? r.severity) === "medium" || r.severity === "warning") || [];

  const infoRecs =
    recommendations?.filter((r) => ["low", "info"].includes(String(r.priority ?? r.severity))) || [];

  const sortedRecs = [...criticalRecs, ...warningRecs, ...infoRecs].filter((rec) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "urgent") return ["critical", "high"].includes(String(rec.priority ?? rec.severity));
    return rec.category === activeFilter;
  });

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
              <div className="space-y-4">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">المركبة المحددة</p>
                        <h2 className="text-2xl font-black">
                          {activeVehicle.nickname || `${activeVehicle.make} ${activeVehicle.model}`}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          لديك {criticalRecs.length.toLocaleString("ar-SA")} توصية مهمة و{(warningRecs.length + infoRecs.length).toLocaleString("ar-SA")} توصيات للمتابعة.
                        </p>
                      </div>
                      <Button onClick={() => refetchRecommendations()} variant="outline">
                        إعادة التقييم
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                  {[
                    ["all", "الكل"],
                    ["urgent", "عاجلة"],
                    ["maintenance", "الصيانة"],
                    ["diagnostic", "الأعطال"],
                    ["fuel", "الوقود"],
                    ["battery", "البطارية"],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      variant={activeFilter === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFilter(value as typeof activeFilter)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

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
            ) : isError ? (
              <EmptyState
                icon={<AlertTriangle className="w-12 h-12 text-amber-500" />}
                title="تعذر تحميل التوصيات"
                description={(error as Error)?.message || "حدث خطأ غير متوقع أثناء تحميل التوصيات."}
                action={<Button onClick={() => refetchRecommendations()}>إعادة المحاولة</Button>}
              />
            ) : !sortedRecs.length ? (
              <EmptyState
                icon={<CheckCircle2 className="w-12 h-12 text-green-500" />}
                title={recommendations?.length ? "لا توجد توصيات ضمن هذا الفلتر" : "لا توجد توصيات عاجلة"}
                description={recommendations?.length ? "غيّر الفلتر لعرض بقية التوصيات." : "سيارتك لا تحتاج إلى إجراء عاجل حالياً. حدّث العداد وسجل الصيانة للحصول على توصيات أدق."}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedRecs.map((rec) => {
                  const item = rec as any;
                  const severityKey = String(rec.priority ?? rec.severity);

                  return (
                    <Card
                      key={rec.id}
                      className={cn(
                        "overflow-hidden border-2",
                        getSeverityColor(severityKey),
                      )}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-background">
                              {getKindIcon(rec.kind as RecommendationKind)}
                              {getCategoryLabel(rec.category)}
                            </Badge>

                            <Badge
                              variant={
                                severityKey === "critical" || severityKey === "high"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className={
                                severityKey === "warning" || severityKey === "medium"
                                  ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30"
                                  : severityKey === "info" || severityKey === "low"
                                    ? "bg-blue-500/20 text-blue-600 hover:bg-blue-500/30"
                                    : ""
                              }
                            >
                              {getSeverityLabel(severityKey)}
                            </Badge>
                          </div>

                          {getSeverityIcon(severityKey)}
                        </div>

                        <CardTitle className="text-xl leading-tight">
                          {rec.titleAr || rec.title}
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
                        {(rec.summaryAr || rec.summary || rec.descriptionAr) && (
                          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                            <div className="flex items-start gap-2">
                              <Info className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {rec.summaryAr || rec.summary || rec.descriptionAr}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="grid gap-2 text-sm">
                          <div className="rounded-lg bg-muted p-3">
                            <span className="block text-xs text-muted-foreground">سبب التوصية</span>
                            <span className="font-medium leading-relaxed">{rec.reasonAr || rec.reason || rec.descriptionAr || "تم إنشاء التوصية بناءً على بيانات المركبة المتوفرة."}</span>
                          </div>
                          <div className="rounded-lg bg-muted p-3">
                            <span className="block text-xs text-muted-foreground">الإجراء المقترح</span>
                            <span className="font-bold leading-relaxed">{rec.recommendedActionAr || rec.recommendedAction || rec.suggestedAction || "راجع التوصية واتخذ الإجراء المناسب."}</span>
                          </div>
                        </div>

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
                              {rec.dueMileage ? formatKm(rec.dueMileage) : item.nextDueKm ? formatKm(item.nextDueKm) : safeDate(rec.dueDate ?? item.nextDueAt)}
                            </span>
                          </div>

                          <div className="rounded-lg bg-muted p-3">
                            <span className="block text-xs text-muted-foreground">
                              المتبقي
                            </span>
                            <span
                              className={cn(
                                "font-bold",
                                severityKey === "critical" || severityKey === "high"
                                  ? "text-destructive"
                                  : severityKey === "warning" || severityKey === "medium"
                                    ? "text-amber-500"
                                    : "text-blue-500",
                              )}
                            >
                              {getRemainingText(item)}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm font-bold text-primary">
                            <Route className="w-4 h-4" />
                            لماذا ظهرت هذه التوصية؟
                          </div>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            نعتمد على آخر صيانة مسجلة، قراءة العداد الحالية، والموعد المتوقع للخدمة. إذا كانت الخدمة قريبة أو متأخرة نعرضها هنا حتى تتخذ الإجراء المناسب قبل ظهور مشكلة أكبر.
                          </p>
                        </div>

                        <div className="rounded-lg border border-border/60 p-3 text-sm">
                          <span className="block text-xs text-muted-foreground">مصدر التوصية</span>
                          <span className="font-medium">{getSourceLabel(rec.source)}</span>
                        </div>

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
                                  severityKey === "critical" || severityKey === "high"
                                    ? "[&>div]:bg-destructive"
                                    : severityKey === "warning" || severityKey === "medium"
                                      ? "[&>div]:bg-amber-500"
                                      : "[&>div]:bg-blue-500",
                                )}
                              />
                            </div>
                          )}

                        {hasRealConfidence(rec) && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                              <span>نسبة الثقة بالتوصية</span>
                              <span>{rec.confidencePct}%</span>
                            </div>
                            <Progress
                              value={rec.confidencePct}
                              className={cn(
                                "h-2",
                                  severityKey === "critical" || severityKey === "high"
                                    ? "[&>div]:bg-destructive"
                                  : severityKey === "warning" || severityKey === "medium"
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

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            className="flex-1"
                            onClick={() => completeMutation.mutate(rec.id)}
                            disabled={completeMutation.isPending || dismissMutation.isPending}
                          >
                            تم التنفيذ
                          </Button>
                          <Button
                            className="flex-1"
                            variant="outline"
                            onClick={() => dismissMutation.mutate(rec.id)}
                            disabled={completeMutation.isPending || dismissMutation.isPending}
                          >
                            تجاهل مؤقتًا
                          </Button>
                        </div>
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
