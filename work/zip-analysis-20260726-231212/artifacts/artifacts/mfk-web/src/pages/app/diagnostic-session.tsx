import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Activity, ArrowRight, Clock, AlertTriangle, 
  ShieldAlert, Settings2, CheckCircle2,
  ChevronRight
} from "lucide-react";
import { 
  useGetDiagnosticSession, 
  useGetSessionTelemetry, 
  useCloseDiagnosticSession,
  useClearDtcCode,
  getGetDiagnosticSessionQueryKey,
  getGetSessionTelemetryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function DiagnosticSession() {
  const { sessionId } = useParams<{sessionId: string}>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: session, isLoading } = useGetDiagnosticSession(sessionId || "", { query: { enabled: !!sessionId } as any });
  const { data: telemetry, isLoading: telemetryLoading } = useGetSessionTelemetry(sessionId || "", { query: { enabled: !!sessionId } as any });
  
  const closeSession = useCloseDiagnosticSession();
  const clearDtc = useClearDtcCode();

  const [selectedDtc, setSelectedDtc] = useState<any>(null);

  const onCloseSession = () => {
    closeSession.mutate({ sessionId: sessionId! }, {
      onSuccess: () => {
        toast({ title: "تم إنهاء الجلسة" });
        queryClient.invalidateQueries({ queryKey: getGetDiagnosticSessionQueryKey(sessionId!) });
      }
    });
  };

  const onClearDtc = (dtcId: string) => {
    clearDtc.mutate({ dtcId }, {
      onSuccess: () => {
        toast({ title: "تم مسح العطل من المركبة" });
        queryClient.invalidateQueries({ queryKey: getGetDiagnosticSessionQueryKey(sessionId!) });
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
    return "إجراء غير معروف";
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!session) return <div>الجلسة غير موجودة</div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/app/diagnostics")}>
          <ChevronRight className="h-5 w-5" />
        </Button>
        <span className="text-muted-foreground">رجوع للتشخيص</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-card border border-border rounded-xl">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">جلسة #{session.id.substring(0, 8)}</h1>
            {session.status === 'active' ? (
              <Badge className="bg-blue-500 animate-pulse">نشطة</Badge>
            ) : (
              <Badge variant="outline">مكتملة</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {session.vehicleNickname || session.vehicleMake} {session.vehicleModel} • 
            بدأت {format(new Date(session.startedAt), "d MMM, HH:mm", { locale: ar })}
            {session.durationSec ? ` • استمرت ${Math.floor(session.durationSec/60)} دقيقة` : ''}
          </p>
        </div>
        
        {session.status === 'active' && (
          <Button onClick={onCloseSession} disabled={closeSession.isPending} variant="destructive">
            إنهاء الجلسة
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">الأعطال</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{session.dtcCount || 0}</span>
              {session.dtcCount && session.dtcCount > 0 ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">الصحة قبل / بعد</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{session.healthBefore || 0} <ArrowRight className="inline h-4 w-4 text-muted-foreground"/> {session.healthAfter || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">متوسط RPM</p>
            <span className="text-3xl font-bold">{session.telemetrySummary?.avgRpm || 0}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">أعلى سرعة</p>
            <span className="text-3xl font-bold">{session.telemetrySummary?.maxSpeed || 0} <span className="text-sm font-normal text-muted-foreground">كم/س</span></span>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>أداء المحرك</CardTitle>
            <CardDescription>RPM والسرعة أثناء الجلسة</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {telemetryLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetry || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tickFormatter={(v) => format(new Date(v), "HH:mm")} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip labelFormatter={(v) => format(new Date(v), "HH:mm:ss")} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="rpm" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} name="RPM" />
                  <Line yAxisId="right" type="monotone" dataKey="speedKmh" stroke="hsl(var(--chart-2))" dot={false} strokeWidth={2} name="السرعة" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الحرارة والبطارية</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {telemetryLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetry || []} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tickFormatter={(v) => format(new Date(v), "HH:mm")} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip labelFormatter={(v) => format(new Date(v), "HH:mm:ss")} />
                  <Legend />
                  <Line type="monotone" dataKey="coolantTemp" stroke="hsl(var(--chart-3))" dot={false} strokeWidth={2} name="الحرارة" />
                  <Line type="monotone" dataKey="batteryV" stroke="hsl(var(--chart-4))" dot={false} strokeWidth={2} name="البطارية" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الأعطال المكتشفة</CardTitle>
          <CardDescription>انقر على العطل للتفاصيل ولإرسال أمر مسح</CardDescription>
        </CardHeader>
        <CardContent>
          {!session.dtcCodes || session.dtcCodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border border-dashed border-border rounded-xl">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-2 opacity-50" />
              <p>لم يتم اكتشاف أي أعطال في هذه الجلسة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {session.dtcCodes.map(dtc => (
                <div key={dtc.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedDtc(dtc)}>
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2 rounded font-mono font-bold text-lg bg-muted")}>{dtc.code}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn("text-white", `bg-${getSeverityColor(dtc.severity)}`)}>{dtc.severity}</Badge>
                        {dtc.status === 'cleared' && <Badge variant="outline" className="text-green-500 border-green-500/20">تم المسح</Badge>}
                      </div>
                      <p className="text-sm font-medium">{dtc.descriptionAr || dtc.descriptionEn}</p>
                    </div>
                  </div>
                  {dtc.recommendedAction && (
                    <Badge variant="outline" className={cn("mt-4 md:mt-0 text-white", `bg-${getActionColor(dtc.recommendedAction)}`)}>
                      {getActionLabel(dtc.recommendedAction)}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                      <Button className="w-full">إرسال أمر مسح العطل (Clear DTC)</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد مسح العطل</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من مسح العطل {selectedDtc.code} من ذاكرة المركبة؟ قد يعاود العطل الظهور إذا لم يتم إصلاح المشكلة الجذرية.
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
