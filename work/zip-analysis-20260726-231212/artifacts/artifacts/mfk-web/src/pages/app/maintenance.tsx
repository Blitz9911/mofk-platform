import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { Wrench, Calendar, CheckCircle2, Plus, ClipboardList } from "lucide-react";
import { 
  useGetUpcomingMaintenance, 
  useLogMaintenance, 
  useListVehicles,
  getGetUpcomingMaintenanceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SERVICE_TYPES = [
  { value: "oil_change", label: "تغيير الزيت" },
  { value: "tire_rotation", label: "تدوير الإطارات" },
  { value: "brake_inspection", label: "فحص الفرامل" },
  { value: "battery_check", label: "فحص البطارية" },
  { value: "air_filter", label: "تغيير فلتر الهواء" },
  { value: "transmission_fluid", label: "سائل ناقل الحركة" },
  { value: "coolant_flush", label: "تغيير سائل التبريد" },
  { value: "spark_plugs", label: "تغيير شمعات الإشعال" },
  { value: "timing_belt", label: "سير التوقيت" },
  { value: "wheel_alignment", label: "ضبط زوايا الإطارات" },
  { value: "ac_service", label: "صيانة التكييف" },
  { value: "other", label: "أخرى (اكتب يدوياً)" },
];

export default function Maintenance() {
  const { data: maintenance, isLoading } = useGetUpcomingMaintenance();
  const { data: vehicles } = useListVehicles();
  const logMaintenance = useLogMaintenance();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [logOpen, setLogOpen] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });
  const [manualOpen, setManualOpen] = useState(false);

  const logForm = useForm({
    defaultValues: { doneAt: format(new Date(), "yyyy-MM-dd"), doneAtKm: 0, cost: 0, notes: "" }
  });

  const manualForm = useForm({
    defaultValues: {
      vehicleId: "",
      serviceType: "",
      customServiceType: "",
      doneAt: format(new Date(), "yyyy-MM-dd"),
      doneAtKm: "",
      cost: "",
      notes: "",
    }
  });

  const watchServiceType = manualForm.watch("serviceType");

  const onLogSubmit = (values: any) => {
    if (!logOpen.item) return;
    logMaintenance.mutate({
      vehicleId: logOpen.item.vehicleId,
      data: {
        serviceType: logOpen.item.serviceType,
        doneAt: values.doneAt,
        doneAtKm: Number(values.doneAtKm),
        cost: Number(values.cost) || undefined,
        notes: values.notes,
      }
    }, {
      onSuccess: () => {
        toast({ title: "تم تسجيل الصيانة" });
        queryClient.invalidateQueries({ queryKey: getGetUpcomingMaintenanceQueryKey() });
        setLogOpen({ open: false, item: null });
        logForm.reset();
      }
    });
  };

  const onManualSubmit = (values: any) => {
    if (!values.vehicleId) {
      manualForm.setError("vehicleId", { message: "اختر المركبة" });
      return;
    }
    const serviceType = values.serviceType === "other" ? values.customServiceType : values.serviceType;
    if (!serviceType) {
      manualForm.setError("serviceType", { message: "اختر نوع الصيانة" });
      return;
    }
    logMaintenance.mutate({
      vehicleId: values.vehicleId,
      data: {
        serviceType,
        doneAt: values.doneAt,
        doneAtKm: Number(values.doneAtKm) || 0,
        cost: values.cost ? Number(values.cost) : undefined,
        notes: values.notes || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "تمت إضافة الصيانة", description: "تم تسجيل الصيانة اليدوية بنجاح" });
        queryClient.invalidateQueries({ queryKey: getGetUpcomingMaintenanceQueryKey() });
        setManualOpen(false);
        manualForm.reset();
      },
      onError: () => {
        toast({ title: "خطأ", description: "فشل تسجيل الصيانة، حاول مجدداً", variant: "destructive" });
      }
    });
  };

  const overdue = maintenance?.filter(m => m.status === "overdue") || [];
  const upcoming = maintenance?.filter(m => m.status === "upcoming") || [];
  const scheduled = maintenance?.filter(m => m.status === "scheduled") || [];

  const Section = ({ title, items, icon: Icon, colorClass }: any) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-4 mb-8">
        <h2 className={cn("text-xl font-bold flex items-center gap-2", colorClass)}>
          <Icon className="w-5 h-5" /> {title} ({items.length})
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item: any) => (
            <Card key={item.id} className={cn("border-t-4",
              item.status === "overdue" ? "border-t-destructive" :
              item.status === "upcoming" ? "border-t-amber-500" : "border-t-blue-500"
            )}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{item.serviceTypeAr || item.serviceType}</CardTitle>
                  <Badge variant={item.status === "overdue" ? "destructive" : item.status === "upcoming" ? "secondary" : "outline"}
                    className={item.status === "upcoming" ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30" : ""}>
                    {item.status === "overdue" ? "متأخرة" : item.status === "upcoming" ? "قريباً" : "مجدولة"}
                  </Badge>
                </div>
                <CardDescription className="font-medium text-foreground">{item.vehicleNickname || item.vehicleMake}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted p-2 rounded-md">
                    <span className="text-muted-foreground block text-xs">الاستحقاق</span>
                    <span className="font-bold">{item.nextDueKm ? `${item.nextDueKm} كم` : "-"}</span>
                  </div>
                  <div className="bg-muted p-2 rounded-md">
                    <span className="text-muted-foreground block text-xs">الوقت المتبقي</span>
                    <span className="font-bold">{item.daysUntilDue !== null ? (item.daysUntilDue < 0 ? `متأخر ${Math.abs(item.daysUntilDue)} يوم` : `${item.daysUntilDue} يوم`) : "-"}</span>
                  </div>
                </div>
                {item.estimatedCost && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">التكلفة التقديرية</span>
                    <span className="font-bold">{item.estimatedCost} ر.س</span>
                  </div>
                )}
                <Button
                  className="w-full"
                  variant={item.status === "overdue" ? "default" : "outline"}
                  onClick={() => {
                    logForm.setValue("doneAtKm", item.nextDueKm || 0);
                    logForm.setValue("cost", item.estimatedCost || 0);
                    setLogOpen({ open: true, item });
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 ml-2" /> تسجيل كمنجز
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الصيانة الدورية</h1>
          <p className="text-muted-foreground mt-1">تتبع مواعيد الصيانة لمركباتك وحافظ على أدائها</p>
        </div>
        <Button onClick={() => setManualOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          إضافة صيانة يدوية
        </Button>
      </div>

      {/* Log Scheduled Maintenance Dialog */}
      <Dialog open={logOpen.open} onOpenChange={(o) => !o && setLogOpen({ open: false, item: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل صيانة منجزة</DialogTitle>
          </DialogHeader>
          <Form {...logForm}>
            <form onSubmit={logForm.handleSubmit(onLogSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={logForm.control} name="doneAt" render={({ field }) =>
                  <FormItem><FormLabel>التاريخ</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>} />
                <FormField control={logForm.control} name="doneAtKm" render={({ field }) =>
                  <FormItem><FormLabel>العداد الحالي (كم)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>} />
              </div>
              <FormField control={logForm.control} name="cost" render={({ field }) =>
                <FormItem><FormLabel>التكلفة الفعلية (ر.س)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>} />
              <FormField control={logForm.control} name="notes" render={({ field }) =>
                <FormItem><FormLabel>ملاحظات إضافية</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
              <DialogFooter><Button type="submit" disabled={logMaintenance.isPending}>تأكيد التسجيل</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Manual Maintenance Entry Dialog */}
      <Dialog open={manualOpen} onOpenChange={(o) => { setManualOpen(o); if (!o) manualForm.reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              إضافة صيانة يدوية
            </DialogTitle>
          </DialogHeader>
          <Form {...manualForm}>
            <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="space-y-4">
              <FormField
                control={manualForm.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المركبة <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المركبة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles?.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.nickname || `${v.make} ${v.model} (${v.year})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={manualForm.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الصيانة <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الصيانة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_TYPES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchServiceType === "other" && (
                <FormField
                  control={manualForm.control}
                  name="customServiceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اكتب نوع الصيانة</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: تغيير حزام التوجيه" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={manualForm.control}
                  name="doneAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ الصيانة <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={manualForm.control}
                  name="doneAtKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>قراءة العداد (كم)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="مثال: 45000" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={manualForm.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التكلفة (ر.س)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="اختياري" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={manualForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات</FormLabel>
                    <FormControl>
                      <Textarea placeholder="أي تفاصيل إضافية عن الصيانة..." rows={3} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setManualOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={logMaintenance.isPending} className="gap-2">
                  {logMaintenance.isPending ? "جاري الحفظ..." : (<><Plus className="w-4 h-4" /> حفظ الصيانة</>)}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          {maintenance && maintenance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h3 className="text-xl font-bold">كل مركباتك بصحة جيدة</h3>
              <p className="text-muted-foreground max-w-sm">لا توجد أي صيانة مجدولة في الوقت الحالي. يمكنك إضافة صيانة يدوياً من الزر أعلاه.</p>
            </div>
          ) : (
            <>
              <Section title="صيانة متأخرة" items={overdue} icon={Wrench} colorClass="text-destructive" />
              <Section title="صيانة قريبة" items={upcoming} icon={Calendar} colorClass="text-amber-500" />
              <Section title="صيانة مجدولة" items={scheduled} icon={CheckCircle2} colorClass="text-blue-500" />
            </>
          )}
        </>
      )}
    </div>
  );
}
