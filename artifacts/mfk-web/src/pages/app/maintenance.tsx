import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { Calendar, Car, ClipboardList, Pencil, Plus, Receipt, Trash2, Wrench } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListMaintenanceLogsQueryKey,
  getMaintenanceServiceLabel,
  maintenanceServiceTypes,
  type MaintenanceLog,
  useCreateMaintenanceLog,
  useDeleteMaintenanceLog,
  useListMaintenanceLogs,
  useListVehicles,
  useUpdateMaintenanceLog,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type MaintenanceFormValues = {
  vehicleId: string;
  serviceType: string;
  customServiceName: string;
  doneAt: string;
  doneAtKm: string;
  actualCostSar: string;
  notes: string;
};

const emptyForm = (): MaintenanceFormValues => ({
  vehicleId: "",
  serviceType: "",
  customServiceName: "",
  doneAt: format(new Date(), "yyyy-MM-dd"),
  doneAtKm: "",
  actualCostSar: "",
  notes: "",
});

function formatKm(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  return Number.isFinite(num) ? `${num.toLocaleString("ar-SA")} كم` : "-";
}

function formatSar(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  return Number.isFinite(num) ? `${num.toLocaleString("ar-SA")} ر.س` : "-";
}

function formatDate(value: unknown) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "short", day: "numeric" }).format(
      new Date(String(value)),
    );
  } catch {
    return String(value);
  }
}

function isThisMonth(value: unknown) {
  if (!value) return false;
  const date = new Date(String(value));
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function vehicleName(log: MaintenanceLog) {
  return log.vehicleNickname || [log.vehicleMake, log.vehicleModel].filter(Boolean).join(" ") || "مركبة";
}

function sourceLabel(source?: string | null) {
  if (source === "recommendation") return "من توصية";
  if (source === "workshop") return "ورشة";
  return "إدخال يدوي";
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  colorClass,
  suffix,
}: {
  title: string;
  value: string | number;
  icon: typeof ClipboardList;
  colorClass: string;
  suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn("mt-1 text-3xl font-black", colorClass)}>
            {value}
            {suffix ? <span className="mr-1 text-sm font-medium text-muted-foreground">{suffix}</span> : null}
          </p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-muted", colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Maintenance() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: logs = [], isLoading } = useListMaintenanceLogs({ limit: 200 });
  const { data: vehicles = [] } = useListVehicles();
  const createLog = useCreateMaintenanceLog();
  const updateLog = useUpdateMaintenanceLog();
  const deleteLog = useDeleteMaintenanceLog();
  const [open, setOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);

  const form = useForm<MaintenanceFormValues>({ defaultValues: emptyForm() });
  const serviceType = form.watch("serviceType");

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(b.doneAt).getTime() - new Date(a.doneAt).getTime()),
    [logs],
  );
  const logsThisMonth = sortedLogs.filter((log) => isThisMonth(log.doneAt));
  const uniqueVehiclesCount = new Set(sortedLogs.map((log) => log.vehicleId)).size;
  const totalCost = sortedLogs.reduce((sum, log) => sum + (Number(log.actualCostSar ?? log.cost ?? 0) || 0), 0);

  const closeForm = () => {
    setOpen(false);
    setEditingLog(null);
    form.reset(emptyForm());
  };

  const openEdit = (log: MaintenanceLog) => {
    setEditingLog(log);
    form.reset({
      vehicleId: log.vehicleId,
      serviceType: log.serviceType,
      customServiceName: log.customServiceName ?? "",
      doneAt: String(log.doneAt).slice(0, 10),
      doneAtKm: log.doneAtKm === null || log.doneAtKm === undefined ? "" : String(log.doneAtKm),
      actualCostSar: log.actualCostSar === null || log.actualCostSar === undefined ? "" : String(log.actualCostSar),
      notes: log.notes ?? "",
    });
    setOpen(true);
  };

  const onSubmit = (values: MaintenanceFormValues) => {
    const service = values.serviceType.trim();
    const customServiceName = values.customServiceName.trim();
    const doneAtKm = values.doneAtKm.trim() === "" ? null : Number(values.doneAtKm);
    const actualCostSar = values.actualCostSar.trim() === "" ? null : Number(values.actualCostSar);

    if (!values.vehicleId) {
      form.setError("vehicleId", { message: "اختر المركبة" });
      return;
    }
    if (!service) {
      form.setError("serviceType", { message: "اختر نوع الصيانة" });
      return;
    }
    if (service === "other" && !customServiceName) {
      form.setError("customServiceName", { message: "اسم الصيانة المخصصة مطلوب" });
      return;
    }
    if (!values.doneAt || Number.isNaN(new Date(values.doneAt).getTime())) {
      form.setError("doneAt", { message: "تاريخ الصيانة مطلوب" });
      return;
    }
    if (doneAtKm !== null && (!Number.isFinite(doneAtKm) || doneAtKm < 0)) {
      form.setError("doneAtKm", { message: "قراءة العداد غير صحيحة" });
      return;
    }
    if (actualCostSar !== null && (!Number.isFinite(actualCostSar) || actualCostSar < 0)) {
      form.setError("actualCostSar", { message: "التكلفة غير صحيحة" });
      return;
    }

    const payload = {
      serviceType: service,
      customServiceName: service === "other" ? customServiceName : null,
      doneAt: values.doneAt,
      doneAtKm,
      actualCostSar,
      notes: values.notes.trim() || null,
      source: "manual" as const,
    };

    const callbacks = {
      onSuccess: () => {
        toast({ title: "تم حفظ الصيانة بنجاح." });
        queryClient.invalidateQueries({ queryKey: getListMaintenanceLogsQueryKey({ limit: 200 }) });
        closeForm();
      },
      onError: () => {
        toast({
          title: "تعذر حفظ الصيانة. تحقق من البيانات وحاول مرة أخرى.",
          variant: "destructive",
        });
      },
    };

    if (editingLog) {
      updateLog.mutate({ logId: editingLog.id, data: payload }, callbacks);
      return;
    }

    createLog.mutate({ ...payload, vehicleId: values.vehicleId }, callbacks);
  };

  const removeLog = (log: MaintenanceLog) => {
    if (!window.confirm("حذف سجل الصيانة؟")) return;
    deleteLog.mutate(log.id, {
      onSuccess: () => {
        toast({ title: "تم حذف سجل الصيانة." });
        queryClient.invalidateQueries({ queryKey: getListMaintenanceLogsQueryKey({ limit: 200 }) });
      },
      onError: () => {
        toast({ title: "تعذر حذف سجل الصيانة.", variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">سجل الصيانة</h1>
          <p className="mt-1 text-muted-foreground">احتفظ بسجل صيانة مركباتك وتابع ما تم تنفيذه وتكاليفه.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setLocation("/app/recommendations")} className="gap-2">
            <Wrench className="h-4 w-4" />
            عرض التوصيات
          </Button>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة صيانة
          </Button>
        </div>
      </div>

      {!isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard title="إجمالي عمليات الصيانة" value={sortedLogs.length} icon={ClipboardList} colorClass="text-primary" />
          <SummaryCard title="صيانات هذا الشهر" value={logsThisMonth.length} icon={Calendar} colorClass="text-blue-500" />
          <SummaryCard title="المركبات المشمولة" value={uniqueVehiclesCount} icon={Car} colorClass="text-amber-500" />
          <SummaryCard
            title="إجمالي تكاليف الصيانة"
            value={Number(totalCost.toFixed(0)).toLocaleString("ar-SA")}
            icon={Receipt}
            colorClass="text-green-500"
            suffix="ر.س"
          />
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeForm())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              إضافة صيانة
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المركبة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={Boolean(editingLog)}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="اختر المركبة" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.nickname || `${vehicle.make} ${vehicle.model} (${vehicle.year})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الصيانة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="اختر نوع الصيانة" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {maintenanceServiceTypes.map((service) => (
                          <SelectItem key={service.value} value={service.value}>{service.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {serviceType === "other" ? (
                <FormField
                  control={form.control}
                  name="customServiceName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الصيانة المخصصة</FormLabel>
                      <FormControl><Input placeholder="مثال: تغيير حزام التوجيه" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="doneAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ الصيانة</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="doneAtKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>قراءة العداد وقت الصيانة</FormLabel>
                      <FormControl><Input type="number" min={0} placeholder="اختياري" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="actualCostSar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التكلفة الفعلية</FormLabel>
                    <FormControl><Input type="number" min={0} placeholder="اختياري" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الملاحظات</FormLabel>
                    <FormControl>
                      <Textarea placeholder="أضف تفاصيل مثل اسم الورشة أو القطع المستبدلة." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={closeForm}>إلغاء</Button>
                <Button type="submit" disabled={createLog.isPending || updateLog.isPending} className="gap-2">
                  <Plus className="h-4 w-4" />
                  حفظ الصيانة
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
      ) : sortedLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed py-20 text-center">
          <ClipboardList className="h-16 w-16 text-primary" />
          <div>
            <h3 className="text-xl font-bold">لا توجد سجلات صيانة حتى الآن</h3>
            <p className="mt-2 max-w-sm text-muted-foreground">
              أضف أول عملية صيانة لبناء سجل مركبتك وتحسين مواعيد الصيانة القادمة.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة أول صيانة
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <ClipboardList className="h-5 w-5 text-primary" />
              سجل الصيانة
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              جميع عمليات الصيانة المسجلة لمركباتك. يساعد هذا السجل مفك على تحديث مواعيد الصيانة القادمة.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedLogs.map((log) => (
              <Card key={log.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {getMaintenanceServiceLabel(log.serviceType, log.customServiceName)}
                  </CardTitle>
                  <CardDescription className="font-medium text-foreground">{vehicleName(log)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pb-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-muted p-2">
                      <span className="block text-xs text-muted-foreground">تاريخ الصيانة</span>
                      <span className="font-bold">{formatDate(log.doneAt)}</span>
                    </div>
                    <div className="rounded-md bg-muted p-2">
                      <span className="block text-xs text-muted-foreground">قراءة العداد وقت الصيانة</span>
                      <span className="font-bold">{formatKm(log.doneAtKm)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Receipt className="h-4 w-4" />
                      <span>التكلفة الفعلية</span>
                    </div>
                    <span className="font-bold">{formatSar(log.actualCostSar ?? log.cost)}</span>
                  </div>
                  {log.notes ? <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{log.notes}</div> : null}
                  <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
                    <span>{sourceLabel(log.source)}</span>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(log)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLog(log)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
