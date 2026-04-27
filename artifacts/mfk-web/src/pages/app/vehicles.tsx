import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Car, Plus, Settings2, Activity, Wrench, CalendarCheck,
  Gauge, Wifi, WifiOff, ShieldCheck, AlertTriangle, ChevronLeft
} from "lucide-react";
import {
  useListVehicles,
  useCreateVehicle,
  usePairAdapter,
  getListVehiclesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const createVehicleSchema = z.object({
  make: z.string().min(1, "مطلوب"),
  model: z.string().min(1, "مطلوب"),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  plateNumber: z.string().optional(),
  nickname: z.string().optional(),
  odometerKm: z.coerce.number().optional(),
  fuelType: z.enum(["petrol", "diesel", "hybrid", "ev"]),
  engineCc: z.coerce.number().optional(),
  vin: z.string().optional(),
});

const FUEL_LABEL: Record<string, string> = {
  petrol: "بنزين",
  diesel: "ديزل",
  hybrid: "هجين",
  ev: "كهربائي",
};

export default function Vehicles() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: vehicles, isLoading } = useListVehicles();
  const createVehicle = useCreateVehicle();
  const pairAdapter = usePairAdapter();

  const [createOpen, setCreateOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState<{ open: boolean; vehicleId: string | null }>({ open: false, vehicleId: null });

  const form = useForm<z.infer<typeof createVehicleSchema>>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: { make: "", model: "", year: new Date().getFullYear(), fuelType: "petrol" },
  });

  const pairForm = useForm<{ adapterMac: string }>({
    defaultValues: { adapterMac: "" },
  });

  const onSubmit = (values: z.infer<typeof createVehicleSchema>) => {
    createVehicle.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "تم إضافة المركبة بنجاح" });
        queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
        setCreateOpen(false);
        form.reset();
      },
    });
  };

  const onPairSubmit = (values: { adapterMac: string }) => {
    if (!pairOpen.vehicleId) return;
    pairAdapter.mutate({ vehicleId: pairOpen.vehicleId, data: { adapterMac: values.adapterMac } }, {
      onSuccess: () => {
        toast({ title: "تم ربط الجهاز بنجاح" });
        queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
        setPairOpen({ open: false, vehicleId: null });
        pairForm.reset();
      },
    });
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    if (score >= 40) return "text-orange-500";
    return "text-destructive";
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return "from-green-500/20 to-green-500/5";
    if (score >= 60) return "from-amber-500/20 to-amber-500/5";
    if (score >= 40) return "from-orange-500/20 to-orange-500/5";
    return "from-destructive/20 to-destructive/5";
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return "ممتازة";
    if (score >= 60) return "جيدة";
    if (score >= 40) return "تحتاج عناية";
    return "تحتاج صيانة";
  };

  const ACTIONS = (v: any) => [
    {
      label: "التشخيص المباشر",
      desc: "راقب بيانات المحرك في الوقت الفعلي",
      icon: Activity,
      color: "text-primary bg-primary/10 hover:bg-primary/20",
      onClick: () => setLocation(`/app/diagnostics`),
    },
    {
      label: "سجل الأعطال",
      desc: "اعرض أكواد الأعطال المحفوظة",
      icon: Wrench,
      color: "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20",
      onClick: () => setLocation(`/app/dtc`),
    },
    {
      label: "الصيانة الدورية",
      desc: "جداول ومواعيد الصيانة",
      icon: CalendarCheck,
      color: "text-purple-500 bg-purple-500/10 hover:bg-purple-500/20",
      onClick: () => setLocation(`/app/maintenance`),
    },
    {
      label: "إقران جهاز MFK",
      desc: (v as any).isPaired ? "الجهاز مرتبط" : "اربط جهازك الذكي",
      icon: (v as any).isPaired ? Wifi : WifiOff,
      color: (v as any).isPaired
        ? "text-green-500 bg-green-500/10 hover:bg-green-500/20"
        : "text-muted-foreground bg-muted hover:bg-muted/80",
      onClick: () => {
        if (!(v as any).isPaired) setPairOpen({ open: true, vehicleId: v.id });
      },
      disabled: (v as any).isPaired,
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">مركباتي</h1>
          <p className="text-muted-foreground mt-1">
            {vehicles?.length
              ? `${vehicles.length} مركبة مسجلة في حسابك`
              : "أضف مركباتك وتحكم بها من مكان واحد"}
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              إضافة مركبة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>إضافة مركبة جديدة</DialogTitle>
              <DialogDescription>أدخل بيانات المركبة لإضافتها إلى حسابك.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="make" render={({ field }) => (
                    <FormItem><FormLabel>الشركة المصنعة</FormLabel><FormControl><Input placeholder="تويوتا" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="model" render={({ field }) => (
                    <FormItem><FormLabel>الموديل</FormLabel><FormControl><Input placeholder="كامري" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="year" render={({ field }) => (
                    <FormItem><FormLabel>سنة الصنع</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="fuelType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع الوقود</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="petrol">بنزين</SelectItem>
                          <SelectItem value="diesel">ديزل</SelectItem>
                          <SelectItem value="hybrid">هجين</SelectItem>
                          <SelectItem value="ev">كهربائي</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="nickname" render={({ field }) => (
                    <FormItem><FormLabel>الاسم المستعار</FormLabel><FormControl><Input placeholder="اختياري" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="plateNumber" render={({ field }) => (
                    <FormItem><FormLabel>رقم اللوحة</FormLabel><FormControl><Input placeholder="اختياري" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="odometerKm" render={({ field }) => (
                    <FormItem><FormLabel>قراءة العداد (كم)</FormLabel><FormControl><Input type="number" placeholder="اختياري" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="vin" render={({ field }) => (
                    <FormItem><FormLabel>رقم الهيكل (VIN)</FormLabel><FormControl><Input placeholder="اختياري" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
                  <Button type="submit" disabled={createVehicle.isPending}>
                    {createVehicle.isPending ? "جاري الإضافة..." : "إضافة المركبة"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pair Dialog */}
      <Dialog open={pairOpen.open} onOpenChange={(open) => !open && setPairOpen({ open: false, vehicleId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إقران جهاز OBD</DialogTitle>
            <DialogDescription>أدخل عنوان MAC الخاص بجهاز MFK لربطه بهذه المركبة.</DialogDescription>
          </DialogHeader>
          <Form {...pairForm}>
            <form onSubmit={pairForm.handleSubmit(onPairSubmit)} className="space-y-4">
              <FormField control={pairForm.control} name="adapterMac" render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان MAC</FormLabel>
                  <FormControl><Input placeholder="00:11:22:33:44:55" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPairOpen({ open: false, vehicleId: null })}>إلغاء</Button>
                <Button type="submit" disabled={pairAdapter.isPending}>ربط الجهاز</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map(i => <Skeleton key={i} className="h-56 w-full rounded-2xl" />)}
        </div>
      ) : !vehicles?.length ? (
        /* Empty */
        <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <Car className="h-12 w-12 text-muted-foreground/40" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">لا توجد مركبات مسجلة</h3>
            <p className="text-muted-foreground max-w-sm">أضف مركبتك الأولى لتبدأ في مراقبة صحتها واكتشاف الأعطال.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> أضف أول مركبة
          </Button>
        </div>
      ) : (
        /* Vehicle Cards */
        <div className="space-y-6">
          {vehicles.map((v) => {
            const activeFaults = (v as any).activeDtcCount ?? 0;
            const isPaired = (v as any).isPaired;

            return (
              <div key={v.id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">

                {/* Top: Identity + Health */}
                <div className={cn("bg-gradient-to-l p-6 flex flex-col sm:flex-row sm:items-center gap-4", getHealthBg(v.healthScore))}>
                  {/* Car Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-background/60 border border-border/50 flex items-center justify-center shrink-0">
                    {v.imageUrl
                      ? <img src={v.imageUrl} alt={v.make} className="w-full h-full object-cover rounded-2xl" />
                      : <Car className="h-8 w-8 text-muted-foreground" />
                    }
                  </div>

                  {/* Name + Meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold">{v.nickname || `${v.make} ${v.model}`}</h2>
                      {v.plateNumber && (
                        <Badge variant="outline" className="font-mono text-xs">{v.plateNumber}</Badge>
                      )}
                      {isPaired ? (
                        <Badge className="gap-1 bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30">
                          <Wifi className="w-3 h-3" /> مرتبط
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <WifiOff className="w-3 h-3" /> غير مرتبط
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {v.make} {v.model} • {v.year} • {FUEL_LABEL[v.fuelType] || v.fuelType}
                    </p>
                  </div>

                  {/* Health Score */}
                  <div className="shrink-0 text-center">
                    <div className={cn("text-4xl font-black leading-none mb-1", getHealthColor(v.healthScore))}>
                      {v.healthScore}
                    </div>
                    <div className="text-xs text-muted-foreground">صحة المركبة</div>
                    <div className={cn("text-xs font-semibold mt-0.5", getHealthColor(v.healthScore))}>
                      {getHealthLabel(v.healthScore)}
                    </div>
                  </div>
                </div>

                {/* Middle: Stats Strip */}
                <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border border-b border-border bg-muted/20">
                  <div className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Gauge className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">المسافة</span>
                    </div>
                    <div className="font-bold text-lg">{(v.odometerKm || 0).toLocaleString("ar-SA")}</div>
                    <div className="text-xs text-muted-foreground">كيلومتر</div>
                  </div>
                  <div className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      {activeFaults > 0
                        ? <AlertTriangle className="w-4 h-4 text-destructive" />
                        : <ShieldCheck className="w-4 h-4 text-green-500" />}
                      <span className="text-xs text-muted-foreground">الأعطال</span>
                    </div>
                    {activeFaults > 0 ? (
                      <div className="font-bold text-lg text-destructive">{activeFaults}</div>
                    ) : (
                      <div className="font-bold text-lg text-green-500">0</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {activeFaults > 0 ? "عطل نشط" : "لا أعطال"}
                    </div>
                  </div>
                  <div className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Settings2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">الجهاز</span>
                    </div>
                    <div className={cn("font-bold text-lg", isPaired ? "text-green-500" : "text-muted-foreground")}>
                      {isPaired ? "نشط" : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{isPaired ? "OBD مرتبط" : "لم يُربط"}</div>
                  </div>
                </div>

                {/* Bottom: Actions */}
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ACTIONS(v).map((action) => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl p-4 transition-colors text-center cursor-pointer disabled:opacity-50 disabled:cursor-default",
                        action.color
                      )}
                    >
                      <action.icon className="w-6 h-6" />
                      <div>
                        <div className="text-sm font-semibold leading-tight">{action.label}</div>
                        <div className="text-[11px] opacity-70 mt-0.5 leading-tight">{action.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Footer: Full Details Link */}
                <div className="px-4 pb-4">
                  <button
                    onClick={() => setLocation(`/app/vehicles/${v.id}`)}
                    className="w-full flex items-center justify-between rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <span>عرض التفاصيل الكاملة</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
