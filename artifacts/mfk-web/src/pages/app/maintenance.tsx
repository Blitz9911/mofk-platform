import { useState } from "react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import {
  Wrench,
  Calendar,
  CheckCircle2,
  Plus,
  ClipboardList,
  Gauge,
  Receipt,
  Lightbulb,
  Car,
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

function getServiceLabel(value: string) {
  return SERVICE_TYPES.find((item) => item.value === value)?.label || value;
}

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

function getVehicleName(item: any) {
  return (
    item.vehicleNickname ||
    [item.vehicleMake, item.vehicleModel].filter(Boolean).join(" ") ||
    "مركبة"
  );
}

function isThisMonth(value: unknown) {
  if (!value || typeof value !== "string") return false;

  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
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
  icon: any;
  colorClass: string;
  suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn("text-3xl font-black mt-1", colorClass)}>
            {value}
            {suffix && (
              <span className="text-sm font-medium mr-1 text-muted-foreground">
                {suffix}
              </span>
            )}
          </p>
        </div>

        <div
          className={cn(
            "w-11 h-11 rounded-xl bg-muted flex items-center justify-center",
            colorClass,
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Maintenance() {
  const [, setLocation] = useLocation();
  const { data: maintenance, isLoading } = useGetUpcomingMaintenance();
  const { data: vehicles } = useListVehicles();
  const logMaintenance = useLogMaintenance();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [manualOpen, setManualOpen] = useState(false);

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

  /*
    مهم:
    صفحة الصيانة الآن تعرض السجلات المنجزة فقط.
    التوصيات والقريبة والمتأخرة مكانها صفحة التوصيات.
  */
  const maintenanceLogs = (maintenance || []).filter((item: any) => {
    if (item.isRecommendation) return false;
    if (item.status && item.status !== "done") return false;
    return true;
  });

  const sortedLogs = [...maintenanceLogs].sort((a: any, b: any) => {
    const aDate = new Date(a.lastDoneAt || a.doneAt || a.createdAt || 0).getTime();
    const bDate = new Date(b.lastDoneAt || b.doneAt || b.createdAt || 0).getTime();

    return bDate - aDate;
  });

  const logsThisMonth = sortedLogs.filter((item: any) =>
    isThisMonth(item.lastDoneAt || item.doneAt),
  );

  const totalCost = sortedLogs.reduce((sum: number, item: any) => {
    const cost = Number(item.estimatedCost ?? item.cost ?? 0);
    return Number.isFinite(cost) ? sum + cost : sum;
  }, 0);

  const uniqueVehiclesCount = new Set(
    sortedLogs.map((item: any) => item.vehicleId).filter(Boolean),
  ).size;

  const onManualSubmit = (values: any) => {
    if (!values.vehicleId) {
      manualForm.setError("vehicleId", { message: "اختر المركبة" });
      return;
    }

    const serviceType =
      values.serviceType === "other"
        ? String(values.customServiceType || "").trim()
        : values.serviceType;

    if (!serviceType) {
      manualForm.setError("serviceType", { message: "اختر نوع الصيانة" });
      return;
    }

    if (!values.doneAt) {
      manualForm.setError("doneAt", { message: "تاريخ الصيانة مطلوب" });
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
            description: "تم تسجيل الصيانة بنجاح",
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

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الصيانة الدورية</h1>
          <p className="text-muted-foreground mt-1">
            سجّل الصيانات المنجزة لكل مركبة وتابع تاريخها وتكلفتها.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/app/recommendations")}
            className="gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            عرض التوصيات
          </Button>

          <Button onClick={() => setManualOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            إضافة صيانة
          </Button>
        </div>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            title="إجمالي الصيانات"
            value={sortedLogs.length}
            icon={ClipboardList}
            colorClass="text-primary"
          />

          <SummaryCard
            title="هذا الشهر"
            value={logsThisMonth.length}
            icon={Calendar}
            colorClass="text-blue-500"
          />

          <SummaryCard
            title="المركبات"
            value={uniqueVehiclesCount}
            icon={Car}
            colorClass="text-amber-500"
          />

          <SummaryCard
            title="إجمالي التكاليف"
            value={Number(totalCost.toFixed(0)).toLocaleString("ar-SA")}
            icon={Receipt}
            colorClass="text-green-500"
            suffix="ر.س"
          />
        </div>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>

              <div>
                <h3 className="font-bold">وين راحت الصيانة القريبة والمتأخرة؟</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  تم نقل التوصيات والمعادلات إلى صفحة التوصيات عشان تبقى صفحة
                  الصيانة مخصصة للسجل والتنفيذ فقط.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setLocation("/app/recommendations")}
              className="gap-2 shrink-0"
            >
              <Lightbulb className="w-4 h-4" />
              فتح التوصيات
            </Button>
          </div>
        </CardContent>
      </Card>

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
              إضافة صيانة
            </DialogTitle>
          </DialogHeader>

          <Form {...manualForm}>
            <form
              onSubmit={manualForm.handleSubmit(onManualSubmit)}
              className="space-y-4"
            >
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
                        {vehicles?.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.nickname ||
                              `${vehicle.make} ${vehicle.model} (${vehicle.year})`}
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
                      <FormLabel>
                        اكتب نوع الصيانة{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>

                      <FormControl>
                        <Input
                          placeholder="مثال: تغيير حزام التوجيه"
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
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

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={manualForm.control}
                  name="doneAtKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>قراءة العداد</FormLabel>

                      <FormControl>
                        <Input
                          type="number"
                          placeholder="مثال: 45000"
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={manualForm.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التكلفة</FormLabel>

                    <FormControl>
                      <Input type="number" placeholder="اختياري" {...field} />
                    </FormControl>

                    <FormMessage />
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

                    <FormMessage />
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
      ) : sortedLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 rounded-2xl border border-dashed">
          <CheckCircle2 className="h-16 w-16 text-green-500" />

          <div>
            <h3 className="text-xl font-bold">لا توجد سجلات صيانة حتى الآن</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              أضف أول صيانة، وبعدها سيبدأ مفك ببناء سجل للمركبة واستخدامه في
              صفحة التوصيات.
            </p>
          </div>

          <Button onClick={() => setManualOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            إضافة أول صيانة
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-green-500">
              <CheckCircle2 className="w-5 h-5" />
              سجل الصيانة المنجزة ({sortedLogs.length})
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              جميع الصيانات المسجلة يدويًا للمركبات.
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedLogs.map((item: any) => (
              <Card key={item.id} className="border-t-4 border-t-green-500">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {item.serviceTypeAr ||
                          getServiceLabel(item.serviceType) ||
                          item.serviceType}
                      </CardTitle>

                      <CardDescription className="font-medium text-foreground mt-1">
                        {getVehicleName(item)}
                      </CardDescription>
                    </div>

                    <Badge
                      variant="outline"
                      className="bg-green-500/10 text-green-600 border-green-500/30"
                    >
                      منجزة
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pb-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted p-2 rounded-md">
                      <span className="text-muted-foreground block text-xs">
                        تاريخ التنفيذ
                      </span>
                      <span className="font-bold">
                        {formatDate(item.lastDoneAt || item.doneAt)}
                      </span>
                    </div>

                    <div className="bg-muted p-2 rounded-md">
                      <span className="text-muted-foreground block text-xs">
                        العداد وقتها
                      </span>
                      <span className="font-bold">
                        {formatKm(item.lastDoneKm || item.doneAtKm)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm rounded-lg border border-border/60 p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Receipt className="w-4 h-4" />
                      <span>التكلفة</span>
                    </div>

                    <span className="font-bold">
                      {formatSar(item.estimatedCost ?? item.cost)}
                    </span>
                  </div>

                  {item.notes && (
                    <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                      {item.notes}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
                    <div className="flex items-center gap-1.5">
                      <Gauge className="w-3 h-3" />
                      <span>يُستخدم هذا السجل لحساب التوصيات</span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setLocation("/app/recommendations")}
                    >
                      التوصيات
                    </Button>
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
