import { useState } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import {
  Wrench,
  Calendar,
  CheckCircle2,
  Plus,
  ClipboardList,
  AlertTriangle,
  Gauge,
  Clock3,
  Info,
} from "lucide-react";
import {
  useGetUpcomingMaintenance,
  useLogMaintenance,
  useListVehicles,
  getGetUpcomingMaintenanceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function formatKm(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return `${num.toLocaleString("ar-SA")} كم`;
}

function formatSar(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return `${num.toLocaleString("ar-SA")} ر.س`;
}

function formatDate(value: unknown) {
  if (!value || typeof value !== "string") return "-";
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusMeta(status: string) {
  if (status === "overdue") {
    return {
      label: "متأخرة",
      sectionTitle: "صيانة متأخرة",
      border: "border-t-destructive",
      text: "text-destructive",
      badge: "destructive" as const,
      icon: AlertTriangle,
    };
  }

  if (status === "upcoming") {
    return {
      label: "قريبة",
      sectionTitle: "صيانة قريبة",
      border: "border-t-amber-500",
      text: "text-amber-500",
      badge: "secondary" as const,
      icon: Calendar,
    };
  }

  if (status === "done") {
    return {
      label: "منجزة",
      sectionTitle: "سجل الصيانة المنجزة",
      border: "border-t-green-500",
      text: "text-green-500",
      badge: "outline" as const,
      icon: CheckCircle2,
    };
  }

  return {
    label: "مجدولة",
    sectionTitle: "صيانة مجدولة",
    border: "border-t-blue-500",
    text: "text-blue-500",
    badge: "outline" as const,
    icon: Clock3,
  };
}

function getVehicleName(item: any) {
  return (
    item.vehicleNickname ||
    [item.vehicleMake, item.vehicleModel].filter(Boolean).join(" ") ||
    "مركبة"
  );
}

function ProgressLine({ value }: { value?: number | null }) {
  if (value === null || value === undefined) return null;

  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>نسبة استهلاك الفاصل</span>
        <span>{safeValue}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            safeValue >= 100
              ? "bg-destructive"
              : safeValue >= 80
                ? "bg-amber-500"
                : "bg-green-500",
          )}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: number;
  icon: any;
  colorClass: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn("text-3xl font-black mt-1", colorClass)}>{value}</p>
        </div>
        <div className={cn("w-11 h-11 rounded-xl bg-muted flex items-center justify-center", colorClass)}>
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Maintenance() {
  const { data: maintenance, isLoading } = useGetUpcomingMaintenance();
  const { data: vehicles } = useListVehicles();
  const logMaintenance = useLogMaintenance();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [logOpen, setLogOpen] = useState<{ open: boolean; item: any | null }>({
    open: false,
    item: null,
  });
  const [manualOpen, setManualOpen] = useState(false);

  const logForm = useForm({
    defaultValues: {
      doneAt: format(new Date(), "yyyy-MM-dd"),
      doneAtKm: 0,
      cost: 0,
      notes: "",
    },
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
    },
  });

  const watchServiceType = manualForm.watch("serviceType");

  const items = maintenance || [];
  const overdue = items.filter((m: any) => m.status === "overdue");
  const upcoming = items.filter((m: any) => m.status === "upcoming");
  const scheduled = items.filter((m: any) => m.status === "scheduled");
  const completed = items.filter((m: any) => m.status === "done");

  const onLogSubmit = (values: any) => {
    if (!logOpen.item) return;

    logMaintenance.mutate(
      {
        vehicleId: logOpen.item.vehicleId,
        data: {
          serviceType: logOpen.item.serviceType,
          doneAt: values.doneAt,
          doneAtKm: Number(values.doneAtKm),
          cost: Number(values.cost) || undefined,
          notes: values.notes,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "تم تسجيل الصيانة" });
          queryClient.invalidateQueries({
            queryKey: getGetUpcomingMaintenanceQueryKey(),
          });
          setLogOpen({ open: false, item: null });
          logForm.reset();
        },
        onError: () => {
          toast({
            title: "خطأ",
            description: "فشل تسجيل الصيانة، حاول مجدداً",
            variant: "destructive",
          });
        },
      },
    );
  };

  const onManualSubmit = (values: any) => {
    if (!values.vehicleId) {
      manualForm.setError("vehicleId", { message: "اختر المركبة" });
      return;
    }

    const serviceType =
      values.serviceType === "other" ? values.customServiceType : values.serviceType;

    if (!serviceType) {
      manualForm.setError("serviceType", { message: "اختر نوع الصيانة" });
      return;
    }

    logMaintenance.mutate(
      {
        vehicleId: values.vehicleId,
        data: {
          serviceType,
          doneAt: values.doneAt,
          doneAtKm: Number(values.doneAtKm) || 0,
          cost: values.cost ? Number(values.cost) : undefined,
          notes: values.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "تمت إضافة الصيانة",
            description: "تم تسجيل الصيانة اليدوية بنجاح",
          });
          queryClient.invalidateQueries({
            queryKey: getGetUpcomingMaintenanceQueryKey(),
          });
          setManualOpen(false);
          manualForm.reset();
        },
        onError: () => {
          toast({
            title: "خطأ",
            description: "فشل تسجيل الصيانة، حاول مجدداً",
            variant: "destructive",
          });
        },
      },
    );
  };

  const Section = ({
    title,
    sectionItems,
    icon: Icon,
    colorClass,
  }: {
    title: string;
    sectionItems: any[];
    icon: any;
    colorClass: string;
  }) => {
    if (sectionItems.length === 0) return null;

    return (
      <div className="space-y-4">
        <h2 className={cn("text-xl font-bold flex items-center gap-2", colorClass)}>
          <Icon className="w-5 h-5" />
          {title} ({sectionItems.length})
        </h2>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sectionItems.map((item: any) => {
            const meta = statusMeta(item.status);
            const isDone = item.status === "done";

            return (
              <Card key={item.id} className={cn("border-t-4", meta.border)}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {item.serviceTypeAr || item.serviceType}
                      </CardTitle>
                      <CardDescription className="font-medium text-foreground mt-1">
                        {getVehicleName(item)}
                      </CardDescription>
                    </div>

                    <Badge
                      variant={meta.badge}
                      className={cn(
                        item.status === "upcoming" &&
                          "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30",
                        item.status === "done" &&
                          "bg-green-500/10 text-green-600 border-green-500/30",
                      )}
                    >
                      {meta.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pb-4">
                  {isDone ? (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-muted p-2 rounded-md">
                          <span className="text-muted-foreground block text-xs">
                            تاريخ التنفيذ
                          </span>
                          <span className="font-bold">{formatDate(item.lastDoneAt)}</span>
                        </div>

                        <div className="bg-muted p-2 rounded-md">
                          <span className="text-muted-foreground block text-xs">
                            العداد وقتها
                          </span>
                          <span className="font-bold">{formatKm(item.lastDoneKm)}</span>
                        </div>
                      </div>

                      {item.estimatedCost !== null && item.estimatedCost !== undefined && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">التكلفة الفعلية</span>
                          <span className="font-bold">{formatSar(item.estimatedCost)}</span>
                        </div>
                      )}

                      {item.notes && (
                        <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                          {item.notes}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-muted p-2 rounded-md">
                          <span className="text-muted-foreground block text-xs">
                            آخر صيانة
                          </span>
                          <span className="font-bold">{formatKm(item.lastDoneKm)}</span>
                        </div>

                        <div className="bg-muted p-2 rounded-md">
                          <span className="text-muted-foreground block text-xs">
                            العداد الحالي
                          </span>
                          <span className="font-bold">
                            {formatKm(item.currentOdometerKm)}
                          </span>
                        </div>

                        <div className="bg-muted p-2 rounded-md">
                          <span className="text-muted-foreground block text-xs">
                            القادمة عند
                          </span>
                          <span className="font-bold">{formatKm(item.nextDueKm)}</span>
                        </div>

                        <div className="bg-muted p-2 rounded-md">
                          <span className="text-muted-foreground block text-xs">
                            المتبقي
                          </span>
                          <span
                            className={cn(
                              "font-bold",
                              Number(item.remainingKm) < 0 && "text-destructive",
                              Number(item.remainingKm) >= 0 &&
                                Number(item.remainingKm) <= 1500 &&
                                "text-amber-500",
                            )}
                          >
                            {item.remainingKm === null || item.remainingKm === undefined
                              ? "-"
                              : Number(item.remainingKm) < 0
                                ? `متأخر ${formatKm(Math.abs(Number(item.remainingKm)))}`
                                : formatKm(item.remainingKm)}
                          </span>
                        </div>
                      </div>

                      <ProgressLine value={item.progressPct} />

                      <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                        <div className="flex items-center gap-2 font-semibold mb-1">
                          <Info className="w-4 h-4 text-primary" />
                          سبب التوصية
                        </div>
                        <p className="text-muted-foreground leading-6">
                          {item.recommendationReason ||
                            "تم احتساب التوصية بناءً على آخر صيانة وقراءة العداد الحالية."}
                        </p>
                      </div>

                      {item.nextDueAt && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">تاريخ الاستحقاق</span>
                          <span className="font-bold">{formatDate(item.nextDueAt)}</span>
                        </div>
                      )}

                      {item.estimatedCost !== null && item.estimatedCost !== undefined && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">التكلفة التقديرية</span>
                          <span className="font-bold">{formatSar(item.estimatedCost)}</span>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        variant={item.status === "overdue" ? "default" : "outline"}
                        onClick={() => {
                          logForm.setValue(
                            "doneAtKm",
                            item.currentOdometerKm || item.nextDueKm || 0,
                          );
                          logForm.setValue("cost", item.estimatedCost || 0);
                          setLogOpen({ open: true, item });
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 ml-2" />
                        تسجيل كمنجز
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الصيانة الدورية</h1>
          <p className="text-muted-foreground mt-1">
            تتبع الصيانة المنجزة والقادمة والمتأخرة بناءً على العداد والتواريخ
          </p>
        </div>

        <Button onClick={() => setManualOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          إضافة صيانة يدوية
        </Button>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            title="متأخرة"
            value={overdue.length}
            icon={AlertTriangle}
            colorClass="text-destructive"
          />
          <SummaryCard
            title="قريبة"
            value={upcoming.length}
            icon={Calendar}
            colorClass="text-amber-500"
          />
          <SummaryCard
            title="مجدولة"
            value={scheduled.length}
            icon={Clock3}
            colorClass="text-blue-500"
          />
          <SummaryCard
            title="منجزة"
            value={completed.length}
            icon={CheckCircle2}
            colorClass="text-green-500"
          />
        </div>
      )}

      {/* Log Scheduled Maintenance Dialog */}
      <Dialog
        open={logOpen.open}
        onOpenChange={(open) => {
          if (!open) setLogOpen({ open: false, item: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل صيانة منجزة</DialogTitle>
          </DialogHeader>

          <Form {...logForm}>
            <form onSubmit={logForm.handleSubmit(onLogSubmit)} className="space-y-4">
              {logOpen.item && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <div className="font-bold">
                    {logOpen.item.serviceTypeAr || logOpen.item.serviceType}
                  </div>
                  <div className="text-muted-foreground mt-1">
                    {getVehicleName(logOpen.item)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={logForm.control}
                  name="doneAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التاريخ</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={logForm.control}
                  name="doneAtKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العداد الحالي (كم)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={logForm.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التكلفة الفعلية (ر.س)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={logForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات إضافية</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={logMaintenance.isPending}>
                  {logMaintenance.isPending ? "جاري التسجيل..." : "تأكيد التسجيل"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Manual Maintenance Entry Dialog */}
      <Dialog
        open={manualOpen}
        onOpenChange={(open) => {
          setManualOpen(open);
          if (!open) manualForm.reset();
        }}
      >
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
                    <FormLabel>
                      المركبة <span className="text-destructive">*</span>
                    </FormLabel>
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
                    <FormLabel>
                      نوع الصيانة <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الصيانة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_TYPES.map((service) => (
                          <SelectItem key={service.value} value={service.value}>
                            {service.label}
                          </SelectItem>
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
                      <FormLabel>
                        تاريخ الصيانة <span className="text-destructive">*</span>
                      </FormLabel>
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
                      <Textarea
                        placeholder="أي تفاصيل إضافية عن الصيانة..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setManualOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={logMaintenance.isPending}
                  className="gap-2"
                >
                  {logMaintenance.isPending ? (
                    "جاري الحفظ..."
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      حفظ الصيانة
                    </>
                  )}
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
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h3 className="text-xl font-bold">لا توجد سجلات صيانة حتى الآن</h3>
          <p className="text-muted-foreground max-w-sm">
            أضف أول صيانة يدوية، وبعدها سيبدأ مفك بحساب الصيانة القادمة والمتبقية.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          <Section
            title="صيانة متأخرة"
            sectionItems={overdue}
            icon={Wrench}
            colorClass="text-destructive"
          />
          <Section
            title="صيانة قريبة"
            sectionItems={upcoming}
            icon={Calendar}
            colorClass="text-amber-500"
          />
          <Section
            title="صيانة مجدولة"
            sectionItems={scheduled}
            icon={Clock3}
            colorClass="text-blue-500"
          />
          <Section
            title="سجل الصيانة المنجزة"
            sectionItems={completed}
            icon={CheckCircle2}
            colorClass="text-green-500"
          />
        </div>
      )}
    </div>
  );
}
