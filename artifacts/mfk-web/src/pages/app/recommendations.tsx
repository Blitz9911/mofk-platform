import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Lightbulb, AlertTriangle, Info, 
  Wrench, Activity, ShieldAlert, Zap
} from "lucide-react";
import { 
  useListVehicles, 
  useGetAiRecommendations,
  RecommendationSeverity,
  RecommendationKind
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function Recommendations() {
  const { data: vehicles, isLoading: vehiclesLoading } = useListVehicles();
  
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
  const activeVehicleId = selectedVehicleId || (vehicles?.[0]?.id ?? "");

  const { data: recommendations, isLoading: recommendationsLoading } = useGetAiRecommendations(activeVehicleId, {
    query: { enabled: !!activeVehicleId } as any
  });

  const getSeverityColor = (sev: RecommendationSeverity) => {
    switch (sev) {
      case 'critical': return 'border-destructive bg-destructive/5';
      case 'warning': return 'border-amber-500 bg-amber-500/5';
      case 'info': return 'border-blue-500 bg-blue-500/5';
      default: return 'border-border bg-card';
    }
  };

  const getSeverityIcon = (sev: RecommendationSeverity) => {
    switch (sev) {
      case 'critical': return <ShieldAlert className="w-5 h-5 text-destructive" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      default: return <Lightbulb className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getKindLabel = (kind: RecommendationKind) => {
    switch (kind) {
      case 'predictive_failure': return 'تنبؤ بعطل';
      case 'maintenance_due': return 'صيانة مستحقة';
      case 'telemetry_anomaly': return 'شذوذ في الأداء';
      case 'behavioral': return 'نصيحة قيادة';
      default: return 'توصية';
    }
  };

  const getKindIcon = (kind: RecommendationKind) => {
    switch (kind) {
      case 'predictive_failure': return <Activity className="w-3 h-3 mr-1" />;
      case 'maintenance_due': return <Wrench className="w-3 h-3 mr-1" />;
      case 'telemetry_anomaly': return <Zap className="w-3 h-3 mr-1" />;
      default: return <Lightbulb className="w-3 h-3 mr-1" />;
    }
  };

  // Group recommendations by severity
  const criticalRecs = recommendations?.filter(r => r.severity === 'critical') || [];
  const warningRecs = recommendations?.filter(r => r.severity === 'warning') || [];
  const infoRecs = recommendations?.filter(r => r.severity === 'info') || [];
  
  const sortedRecs = [...criticalRecs, ...warningRecs, ...infoRecs];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">التوصيات الذكية</h1>
        <p className="text-muted-foreground mt-1">توصيات مبنية على تحليل البيانات الحية لمركبتك</p>
      </div>

      {vehiclesLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : vehicles && vehicles.length > 0 ? (
        <Tabs value={activeVehicleId} onValueChange={setSelectedVehicleId} className="w-full">
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

          <TabsContent value={activeVehicleId} className="mt-0">
            {recommendationsLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : !sortedRecs.length ? (
              <EmptyState 
                icon={<Lightbulb className="w-12 h-12" />} 
                title="لا توجد توصيات حالياً" 
                description="مركبتك تعمل بأداء مثالي. سنخبرك إذا وجدنا ما يحتاج انتباهك."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedRecs.map((rec) => (
                  <Card key={rec.id} className={cn("overflow-hidden border-2", getSeverityColor(rec.severity))}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="bg-background">
                          {getKindIcon(rec.kind)}
                          {getKindLabel(rec.kind)}
                        </Badge>
                        {getSeverityIcon(rec.severity)}
                      </div>
                      <CardTitle className="text-xl leading-tight">{rec.titleAr}</CardTitle>
                      {rec.createdAt && (
                        <CardDescription>{format(new Date(rec.createdAt), "d MMMM yyyy", { locale: ar })}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {rec.descriptionAr && (
                        <p className="text-sm text-muted-foreground">{rec.descriptionAr}</p>
                      )}
                      
                      {rec.confidencePct !== undefined && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span>نسبة الثقة بالتوقع</span>
                            <span>{rec.confidencePct}%</span>
                          </div>
                          <Progress value={rec.confidencePct} className={cn(
                            "h-2", 
                            rec.severity === 'critical' ? "[&>div]:bg-destructive" :
                            rec.severity === 'warning' ? "[&>div]:bg-amber-500" :
                            "[&>div]:bg-blue-500"
                          )} />
                        </div>
                      )}

                      {(rec.suggestedAction || rec.suggestedCostSar !== undefined) && (
                        <div className="bg-background/50 rounded-lg p-3 mt-4 space-y-2 border border-border/50">
                          {rec.suggestedAction && (
                            <div className="flex gap-2">
                              <Wrench className="w-4 h-4 shrink-0 text-muted-foreground" />
                              <span className="text-sm font-medium">{rec.suggestedAction}</span>
                            </div>
                          )}
                          {rec.suggestedCostSar !== undefined && (
                            <div className="flex justify-between items-center text-sm pt-2 border-t border-border/50">
                              <span className="text-muted-foreground">التكلفة التقديرية</span>
                              <span className="font-bold text-primary">{rec.suggestedCostSar} ر.س</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
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
