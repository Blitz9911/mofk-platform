import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Activity, Car, PlayCircle, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import { 
  useListVehicles, 
  useGetLiveTelemetry, 
  useListDiagnosticSessions,
  useStartDiagnosticSession
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

const startSessionSchema = z.object({
  vehicleId: z.string().min(1, "يرجى اختيار مركبة"),
  odometerKm: z.coerce.number().optional()
});

export default function Diagnostics() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: vehicles } = useListVehicles();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
  const activeVehicleId = selectedVehicleId || (vehicles?.[0]?.id ?? "");

  const { data: telemetry } = useGetLiveTelemetry(activeVehicleId, {
    query: { enabled: !!activeVehicleId, refetchInterval: 3000 } as any
  });

  const { data: sessions, isLoading: loadingSessions } = useListDiagnosticSessions(
    { vehicleId: activeVehicleId || undefined },
    { query: { enabled: true } as any }
  );

  const startSession = useStartDiagnosticSession();
  const [startOpen, setStartOpen] = useState(false);

  const form = useForm<z.infer<typeof startSessionSchema>>({
    resolver: zodResolver(startSessionSchema),
    defaultValues: { vehicleId: activeVehicleId, odometerKm: 0 }
  });

  useEffect(() => {
    if (activeVehicleId && !form.getValues("vehicleId")) {
      form.setValue("vehicleId", activeVehicleId);
      const v = vehicles?.find(v => v.id === activeVehicleId);
      if (v?.odometerKm) form.setValue("odometerKm", v.odometerKm);
    }
  }, [activeVehicleId, vehicles, form]);

  const onSubmit = (values: z.infer<typeof startSessionSchema>) => {
    startSession.mutate({ data: values }, {
      onSuccess: (session) => {
        toast({ title: "تم بدء الجلسة" });
        setStartOpen(false);
        setLocation(`/app/diagnostics/${session.id}`);
      }
    });
  };

  const Gauge = ({ value, max, label, unit, color }: { value: number, max: number, label: string, unit: string, color: string }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const circumference = 2 * Math.PI * 40; // r=40
    const offset = circumference - (percentage / 100) * circumference;
    
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-muted/20 rounded-xl relative">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle cx="64" cy="64" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/30" />
          <circle cx="64" cy="64" r="40" stroke={color} strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono">{Math.round(value)}</span>
          <span className="text-[10px] text-muted-foreground">{unit}</span>
        </div>
        <span className="mt-2 text-sm font-medium">{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">التشخيص المباشر</h1>
          <p className="text-muted-foreground mt-1">مراقبة حية لبيانات المركبة وجلسات الفحص</p>
        </div>
        
        <Dialog open={startOpen} onOpenChange={setStartOpen}>
          <DialogTrigger asChild>
            <Button><PlayCircle className="ml-2 w-4 h-4" /> بدء جلسة جديدة</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>بدء جلسة تشخيص جديدة</DialogTitle>
              <DialogDescription>سيتم الاتصال بجهاز OBD لجمع البيانات وفحص الأعطال.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="vehicleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>المركبة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر مركبة..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {vehicles?.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.nickname || `${v.make} ${v.model}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="odometerKm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>العداد الحالي (كم)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={startSession.isPending}>بدء الفحص</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>البيانات الحية (Live Telemetry)</CardTitle>
            <CardDescription>قراءات المحرك المباشرة</CardDescription>
          </div>
          {vehicles && vehicles.length > 0 && (
            <Select value={activeVehicleId} onValueChange={setSelectedVehicleId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="اختر مركبة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المركبات</SelectItem>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.nickname || `${v.make} ${v.model}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent>
          {!telemetry?.isConnected ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-muted rounded-xl">
              <Activity className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">المركبة غير متصلة حالياً</p>
              <p className="text-sm opacity-70">قم بتشغيل المحرك وتأكد من اتصال الجهاز بالإنترنت</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Gauge value={telemetry.latest.rpm || 0} max={8000} label="سرعة المحرك" unit="RPM" color="hsl(var(--primary))" />
              <Gauge value={telemetry.latest.speedKmh || 0} max={240} label="السرعة" unit="كم/س" color="hsl(var(--chart-2))" />
              <Gauge value={telemetry.latest.coolantTemp || 0} max={130} label="حرارة المبرد" unit="°C" color={telemetry.latest.coolantTemp! > 105 ? "hsl(var(--destructive))" : "hsl(var(--chart-3))"} />
              <Gauge value={telemetry.latest.batteryV || 0} max={16} label="البطارية" unit="V" color={telemetry.latest.batteryV! < 11.5 ? "hsl(var(--destructive))" : "hsl(var(--chart-4))"} />
              <Gauge value={telemetry.latest.fuelLevelPct || 0} max={100} label="مستوى الوقود" unit="%" color="hsl(var(--chart-5))" />
              <Gauge value={telemetry.latest.engineLoad || 0} max={100} label="حمل المحرك" unit="%" color="hsl(var(--primary))" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل الجلسات</CardTitle>
          <CardDescription>أحدث جلسات الفحص والتشخيص</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : !sessions?.length ? (
            <EmptyState icon={<Activity className="w-10 h-10"/>} title="لا توجد جلسات" description="لم يتم إجراء أي جلسات فحص بعد" />
          ) : (
            <div className="space-y-4">
              {sessions.map(session => (
                <div 
                  key={session.id} 
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/50 cursor-pointer transition-colors gap-4" 
                  onClick={() => setLocation(`/app/diagnostics/${session.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", session.status === 'active' ? "bg-blue-500/10 text-blue-500" : "bg-secondary text-primary")}>
                      <Activity className="w-6 h-6"/>
                    </div>
                    <div>
                      <h3 className="font-bold">{session.vehicleNickname || session.vehicleMake} {session.vehicleModel}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3"/> {format(new Date(session.startedAt), "d MMMM, HH:mm", { locale: ar })}
                        <span className="text-border">•</span>
                        {session.durationSec ? `${Math.floor(session.durationSec / 60)} دقيقة` : 'مستمرة'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1">
                      {session.status === 'active' ? (
                        <Badge className="bg-blue-500 animate-pulse">مستمرة</Badge>
                      ) : (
                        <Badge variant="outline">مكتملة</Badge>
                      )}
                      {session.dtcCount !== undefined && session.dtcCount > 0 && (
                        <span className="text-xs text-destructive font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {session.dtcCount} أعطال مكتشفة</span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground rotate-180 hidden md:block" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
