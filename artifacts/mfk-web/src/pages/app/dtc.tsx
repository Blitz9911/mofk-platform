import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  AlertTriangle, CheckCircle2, ShieldAlert,
  TrendingUp, Settings2, Trash2
} from "lucide-react";
import { 
  useListDtcCodes,
  useListVehicles,
  useGetTrendingDtcCodes,
  useClearDtcCode,
  getListDtcCodesQueryKey,
  ListDtcCodesStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function Dtc() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [vehicleId, setVehicleId] = useState<string>("all");
  const [status, setStatus] = useState<string>("active");
  const [selectedDtc, setSelectedDtc] = useState<any>(null);

  const { data: vehicles } = useListVehicles();
  const { data: dtcCodes, isLoading } = useListDtcCodes({
    vehicleId: vehicleId === "all" ? undefined : vehicleId,
    status: status as ListDtcCodesStatus
  });
  const { data: trending, isLoading: trendingLoading } = useGetTrendingDtcCodes();
  
  const clearDtc = useClearDtcCode();

  const onClearDtc = (dtcId: string) => {
    clearDtc.mutate({ dtcId }, {
      onSuccess: () => {
        toast({ title: "تم مسح العطل من المركبة" });
        queryClient.invalidateQueries({ queryKey: getListDtcCodesQueryKey() });
        setSelectedDtc(null);
      }
    });
  };

  const getSeverityColor = (sev: string) => {
    if (sev === "critical") return "destructive";
    if (sev === "high") return "orange-500";
    if (sev === "medium") return "amber-500";
    return "blue-500";
  };

  const getActionColor = (action: string) => {
    if (action === "drive_now") return "destructive";
    if (action === "schedule_week") return "amber-500";
    if (action === "monitor") return "green-500";
    return "secondary";
  };

  const getActionLabel = (action: string) => {
    if (action === "drive_now") return "توقف فوراً";
    if (action === "schedule_week") return "افحص قريباً";
    if (action === "monitor") return "راقب فقط";
    return "غير معروف";
  };

  const groupedDtc = {
    critical: dtcCodes?.filter(d => d.severity === 'critical') || [],
    high: dtcCodes?.filter(d => d.severity === 'high') || [],
    medium: dtcCodes?.filter(d => d.severity === 'medium') || [],
    low: dtcCodes?.filter(d => d.severity === 'low') || [],
  };

  const DtcCard = ({ dtc }: { dtc: any }) => (
    <div 
      className="p-4 border border-border rounded-lg bg-card hover:bg-muted/50 cursor-pointer transition-colors shadow-sm"
      onClick={() => setSelectedDtc(dtc)}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-bold font-mono text-lg bg-muted px-2 py-0.5 rounded">{dtc.code}</span>
        {dtc.status === 'cleared' && <Badge variant="outline" className="text-green-500">تم المسح</Badge>}
      </div>
      <p className="text-sm font-medium line-clamp-2 mb-2">{dtc.descriptionAr || dtc.descriptionEn}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
        <span>{dtc.vehicleMake} {dtc.vehicleModel}</span>
        <span>{format(new Date(dtc.detectedAt), "d MMM", { locale: ar })}</span>
      </div>
      {dtc.recommendedAction && (
        <Badge variant="outline" className={cn("mt-3 w-full justify-center text-white", `bg-${getActionColor(dtc.recommendedAction)}`)}>
          {getActionLabel(dtc.recommendedAction)}
        </Badge>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">سجل الأعطال (DTC)</h1>
        <p className="text-muted-foreground mt-1">تتبع وإدارة أعطال مركباتك</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-xl">
        <div className="w-full sm:w-64">
          <label className="text-sm font-medium mb-1.5 block">المركبة</label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger><SelectValue placeholder="جميع المركبات" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المركبات</SelectItem>
              {vehicles?.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.nickname || `${v.make} ${v.model}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-64">
          <label className="text-sm font-medium mb-1.5 block">الحالة</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">نشطة</SelectItem>
              <SelectItem value="cleared">تم مسحها</SelectItem>
              <SelectItem value="pending">معلقة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : !dtcCodes?.length ? (
            <EmptyState icon={<CheckCircle2 className="h-12 w-12 text-green-500" />} title="لا توجد أعطال" description="لا توجد أعطال مسجلة تطابق الفلتر الحالي" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4 bg-destructive/10 text-destructive p-2 rounded-lg font-bold">
                  <AlertTriangle className="w-5 h-5"/> حرجة ({groupedDtc.critical.length})
                </div>
                {groupedDtc.critical.map(d => <DtcCard key={d.id} dtc={d} />)}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4 bg-orange-500/10 text-orange-500 p-2 rounded-lg font-bold">
                  <AlertTriangle className="w-5 h-5"/> عالية ({groupedDtc.high.length})
                </div>
                {groupedDtc.high.map(d => <DtcCard key={d.id} dtc={d} />)}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4 bg-amber-500/10 text-amber-500 p-2 rounded-lg font-bold">
                  <AlertTriangle className="w-5 h-5"/> متوسطة ({groupedDtc.medium.length})
                </div>
                {groupedDtc.medium.map(d => <DtcCard key={d.id} dtc={d} />)}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4 bg-blue-500/10 text-blue-500 p-2 rounded-lg font-bold">
                  <AlertTriangle className="w-5 h-5"/> منخفضة ({groupedDtc.low.length})
                </div>
                {groupedDtc.low.map(d => <DtcCard key={d.id} dtc={d} />)}
              </div>
            </div>
          )}
        </div>

        <div className="w-full lg:w-80 shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> الأكثر شيوعاً بالسوق
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendingLoading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {trending?.map((t, i) => (
                    <div key={t.code} className="flex items-center gap-3">
                      <div className="w-8 text-center font-bold text-muted-foreground">#{i+1}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-sm">{t.code}</span>
                          <span className="text-xs text-primary font-medium">+{t.trendPct}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.descriptionAr}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={!!selectedDtc} onOpenChange={(o) => !o && setSelectedDtc(null)}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          {selectedDtc && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold font-mono bg-muted px-3 py-1 rounded-md">{selectedDtc.code}</span>
                  <Badge className={cn("text-white", `bg-${getSeverityColor(selectedDtc.severity)}`)}>{selectedDtc.severity}</Badge>
                </div>
                <SheetTitle className="mt-4 leading-relaxed">{selectedDtc.descriptionAr || selectedDtc.descriptionEn}</SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">الأسباب المحتملة</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-4">
                    {selectedDtc.possibleCauses?.map((cause: string, i: number) => (
                      <li key={i}>{cause}</li>
                    ))}
                  </ul>
                </div>

                {selectedDtc.recommendedAction && (
                  <div className={cn("p-4 rounded-xl border", `bg-${getActionColor(selectedDtc.recommendedAction)}/10 border-${getActionColor(selectedDtc.recommendedAction)}/20`)}>
                    <h3 className="font-bold flex items-center gap-2 mb-2">
                      <ShieldAlert className={cn("w-5 h-5", `text-${getActionColor(selectedDtc.recommendedAction)}`)} />
                      الإجراء الموصى به
                    </h3>
                    <p className="text-sm font-medium mb-1">{getActionLabel(selectedDtc.recommendedAction)}</p>
                    {selectedDtc.actionReasonAr && <p className="text-sm text-muted-foreground">{selectedDtc.actionReasonAr}</p>}
                  </div>
                )}

                {selectedDtc.estimatedCostMin && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">التكلفة التقديرية للإصلاح</h3>
                    <p className="text-2xl font-bold text-primary">
                      {selectedDtc.estimatedCostMin} - {selectedDtc.estimatedCostMax} <span className="text-sm font-normal text-muted-foreground">ر.س</span>
                    </p>
                  </div>
                )}
              </div>

              <SheetFooter className="mt-8 pt-6 border-t">
                {selectedDtc.status !== 'cleared' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full" variant="outline">مسح العطل (Clear)</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد مسح العطل</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من مسح العطل من المركبة؟
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onClearDtc(selectedDtc.id)}>تأكيد المسح</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
