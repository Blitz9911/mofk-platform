import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Fuel,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  DropletIcon,
  Wallet,
  Gauge,
  Car,
  CalendarIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  nickname?: string;
  odometerKm: number;
  fuelType: string;
}

interface FuelConsumption {
  distanceKm: number;
  consumptionL100km: number;
  kmPerLiter: number;
}

interface FuelLog {
  id: string;
  vehicleId: string;
  filledAt: string;
  odometerKm: number;
  liters: number;
  pricePerLiterSar: number;
  totalCostSar: number;
  fuelGrade: string;
  stationNameAr?: string;
  isFull: boolean;
  notes?: string;
  consumption: FuelConsumption | null;
}

interface FuelStats {
  totalLiters: number;
  totalCostSar: number;
  avgConsumptionL100km: number | null;
  avgKmPerLiter: number | null;
  fillCount: number;
  trendByDay: { date: string; liters: number; costSar: number; fills: number }[];
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const apiFetch = async (path: string, opts?: RequestInit) => {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });

  if (!res.ok) throw new Error(await res.text());

  return res.json();
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<string, string> = {
  week: "آخر 7 أيام",
  month: "هذا الشهر",
  year: "هذا العام",
  all: "الكل",
};

const GRADE_LABELS: Record<string, string> = {
  "91": "91",
  "95": "95",
  diesel: "ديزل",
};

const GRADE_COLORS: Record<string, string> = {
  "91": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "95": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  diesel: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  loading,
  color = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
  color?: string;
}) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const trendColor =
    trend === "up"
      ? "text-green-500"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10",
              color === "text-primary"
                ? "bg-primary/10"
                : color.replace("text-", "bg-").replace("500", "500/10"),
            )}
          >
            <Icon className={cn("h-5 w-5", color)} />
          </div>

          {trend && <TrendIcon className={cn("h-4 w-4", trendColor)} />}
        </div>

        {loading ? (
          <>
            <Skeleton className="h-7 w-24 mb-1" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>

            {sub && (
              <p className="text-xs text-muted-foreground mt-1 opacity-70">
                {sub}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add Fuel Log Dialog ──────────────────────────────────────────────────────

function AddFuelDialog({
  vehicles,
  defaultVehicleId,
  onSuccess,
}: {
  vehicles: Vehicle[];
  defaultVehicleId: string | null;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const FUEL_PRICES: Record<"91" | "95" | "diesel", string> = {
    "91": "2.18",
    "95": "2.33",
    diesel: "1.66",
  };

  const [form, setForm] = useState({
    vehicleId: defaultVehicleId || (vehicles[0]?.id ?? ""),
    odometerKm: "",
    totalCostSar: "",
    liters: "",
    pricePerLiterSar: FUEL_PRICES["91"],
    fuelGrade: "91" as "91" | "95" | "diesel",
    stationNameAr: "",
    filledAt: new Date().toISOString().slice(0, 16),
    notes: "",
  });

  const calculateLiters = (totalCostSar: string, pricePerLiterSar: string) => {
    const total = parseFloat(totalCostSar);
    const price = parseFloat(pricePerLiterSar);

    if (
      !Number.isFinite(total) ||
      !Number.isFinite(price) ||
      total <= 0 ||
      price <= 0
    ) {
      return "";
    }

    return (total / price).toFixed(2);
  };

  const updateTotalCost = (value: string) => {
    setForm((current) => ({
      ...current,
      totalCostSar: value,
      liters: calculateLiters(value, current.pricePerLiterSar),
    }));
  };

  const updateFuelGrade = (grade: "91" | "95" | "diesel") => {
    const fixedPrice = FUEL_PRICES[grade];

    setForm((current) => ({
      ...current,
      fuelGrade: grade,
      pricePerLiterSar: fixedPrice,
      liters: calculateLiters(current.totalCostSar, fixedPrice),
    }));
  };

  const resetForm = () => {
    setForm({
      vehicleId: defaultVehicleId || (vehicles[0]?.id ?? ""),
      odometerKm: "",
      totalCostSar: "",
      liters: "",
      pricePerLiterSar: FUEL_PRICES["91"],
      fuelGrade: "91",
      stationNameAr: "",
      filledAt: new Date().toISOString().slice(0, 16),
      notes: "",
    });
  };

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch("/api/fuel", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: data.vehicleId,
          odometerKm: data.odometerKm ? parseInt(data.odometerKm) : undefined,
          liters: parseFloat(data.liters),
          pricePerLiterSar: parseFloat(data.pricePerLiterSar),
          fuelGrade: data.fuelGrade,
          stationNameAr: data.stationNameAr || undefined,
          filledAt: new Date(data.filledAt).toISOString(),
          notes: data.notes || undefined,
        }),
      }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel-logs"] });
      qc.invalidateQueries({ queryKey: ["fuel-stats"] });
      toast({ title: "✅ تم تسجيل التعبئة بنجاح" });
      setOpen(false);
      resetForm();
      onSuccess();
    },

    onError: () =>
      toast({
        title: "حدث خطأ",
        description: "تأكد من اختيار المركبة وإدخال المبلغ بشكل صحيح",
        variant: "destructive",
      }),
  });

  const canSubmit =
    Boolean(form.vehicleId) &&
    Boolean(form.totalCostSar) &&
    Boolean(form.pricePerLiterSar) &&
    Boolean(form.liters) &&
    Number(form.totalCostSar) > 0 &&
    Number(form.pricePerLiterSar) > 0 &&
    Number(form.liters) > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-full">
          <Plus className="h-4 w-4" />
          تسجيل تعبئة
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Fuel className="h-5 w-5 text-primary" />
            تسجيل تعبئة جديدة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Vehicle */}
          <div>
            <Label className="mb-1.5 block">المركبة</Label>

            <Select
              value={form.vehicleId}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, vehicleId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.nickname || `${vehicle.make} ${vehicle.model}`} —{" "}
                    {vehicle.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date/Time + Odometer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">تاريخ التعبئة</Label>

              <Input
                type="datetime-local"
                value={form.filledAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    filledAt: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label className="mb-1.5 block">قراءة العداد (اختياري)</Label>

              <Input
                type="number"
                placeholder="اختياري — مثال: 52400"
                value={form.odometerKm}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    odometerKm: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          {/* Fuel Grade */}
          <div>
            <Label className="mb-1.5 block">نوع الوقود</Label>

            <div className="flex gap-2">
              {(["91", "95", "diesel"] as const).map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => updateFuelGrade(grade)}
                  className={cn(
                    "flex-1 py-2 rounded-xl border text-sm font-bold transition-all",
                    form.fuelGrade === grade
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {GRADE_LABELS[grade]}
                </button>
              ))}
            </div>
          </div>

          {/* Total + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">كم عبيت؟ (ر.س)</Label>

              <Input
                type="number"
                step="0.01"
                placeholder="مثال: 100"
                value={form.totalCostSar}
                onChange={(event) => updateTotalCost(event.target.value)}
              />
            </div>

            <div>
              <Label className="mb-1.5 block">سعر اللتر</Label>

              <div className="h-10 rounded-md border border-border bg-muted px-3 flex items-center">
                <span className="font-bold">{form.pricePerLiterSar} ر.س</span>
              </div>
            </div>
          </div>

          {/* Station */}
          <div>
            <Label className="mb-1.5 block">اسم المحطة (اختياري)</Label>

            <Input
              placeholder="مثال: محطة الوطنية — الملقا"
              value={form.stationNameAr}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  stationNameAr: event.target.value,
                }))
              }
            />
          </div>

          <Button
            className="w-full"
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !canSubmit}
          >
            {mutation.isPending ? "جارٍ الحفظ..." : "حفظ التعبئة"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl text-right">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>

      {payload.map((p: any) => (
        <p
          key={p.dataKey}
          className="text-sm font-bold"
          style={{ color: p.color }}
        >
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FuelPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [period, setPeriod] = useState<"week" | "month" | "year" | "all">(
    "month",
  );
  const [chartType, setChartType] = useState<"cost" | "liters" | "consumption">(
    "cost",
  );

  // Fetch vehicles
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<
    Vehicle[]
  >({
    queryKey: ["vehicles"],
    queryFn: () => apiFetch("/api/vehicles"),
    select: (d) => (Array.isArray(d) ? d : []),
  });

  const activeVehicleId = selectedVehicleId ?? vehicles[0]?.id ?? null;

  // Fetch fuel logs
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["fuel-logs", activeVehicleId],
    queryFn: () =>
      apiFetch(
        `/api/fuel${activeVehicleId ? `?vehicleId=${activeVehicleId}` : ""}`,
      ),
    enabled: vehicles.length > 0,
  });

  const logs: FuelLog[] = Array.isArray(logsData?.logs) ? logsData.logs : [];

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<FuelStats>({
    queryKey: ["fuel-stats", activeVehicleId, period],
    queryFn: () =>
      apiFetch(
        `/api/fuel/stats?period=${period}${activeVehicleId ? `&vehicleId=${activeVehicleId}` : ""}`,
      ),
    enabled: vehicles.length > 0,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/fuel/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel-logs"] });
      qc.invalidateQueries({ queryKey: ["fuel-stats"] });
      toast({ title: "تم حذف السجل" });
    },
  });

  // Chart data
  const chartData = useMemo(() => {
    if (!stats?.trendByDay) return [];

    return stats.trendByDay.map((d) => ({
      date: format(parseISO(d.date), "d MMM", { locale: ar }),
      "التكلفة (ر.س)": d.costSar,
      "الكمية (لتر)": d.liters,
    }));
  }, [stats]);

  // Per-vehicle comparison
  const { data: allStats } = useQuery({
    queryKey: ["fuel-stats-all", period],
    queryFn: async () => {
      const results = await Promise.all(
        vehicles.map((v) =>
          apiFetch(`/api/fuel/stats?period=${period}&vehicleId=${v.id}`).then(
            (s) => ({
              vehicle: v.nickname || `${v.make} ${v.model}`,
              avgL100: s.avgConsumptionL100km,
              totalCost: s.totalCostSar,
              totalLiters: s.totalLiters,
            }),
          ),
        ),
      );

      return results;
    },
    enabled: vehicles.length > 1,
  });

  const activeVehicle = vehicles.find((v) => v.id === activeVehicleId);
  const latestLog = logs[0];
  const prevLog = logs[1];

  const consumptionTrend: "up" | "down" | "neutral" = useMemo(() => {
    if (!latestLog?.consumption || !prevLog?.consumption) return "neutral";

    const diff =
      latestLog.consumption.consumptionL100km -
      prevLog.consumption.consumptionL100km;

    return diff > 0.3 ? "up" : diff < -0.3 ? "down" : "neutral";
  }, [latestLog, prevLog]);

  const isLoading = vehiclesLoading || logsLoading || statsLoading;

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir="rtl">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fuel className="h-6 w-6 text-primary" />
            إدارة البنزين والصرفية
          </h1>

          <p className="text-muted-foreground text-sm mt-1">
            تتبع استهلاك الوقود وتكاليف التعبئة لكل مركبة
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Vehicle selector */}
          {vehicles.length > 1 && (
            <Select
              value={activeVehicleId ?? "all"}
              onValueChange={(v) => setSelectedVehicleId(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-[180px]">
                <Car className="h-4 w-4 ml-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">جميع المركبات</SelectItem>

                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nickname || `${v.make} ${v.model}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Period picker */}
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as typeof period)}
          >
            <SelectTrigger className="w-[150px]">
              <CalendarIcon className="h-4 w-4 ml-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AddFuelDialog
            vehicles={vehicles}
            defaultVehicleId={activeVehicleId}
            onSuccess={() => {}}
          />
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DropletIcon}
          label="إجمالي اللترات"
          value={stats ? `${stats.totalLiters} L` : "—"}
          sub={`${stats?.fillCount ?? 0} تعبئة`}
          loading={isLoading}
          color="text-blue-500"
        />

        <StatCard
          icon={Wallet}
          label="إجمالي الإنفاق"
          value={stats ? `${stats.totalCostSar.toLocaleString()} ر.س` : "—"}
          sub={PERIOD_LABELS[period]}
          loading={isLoading}
          color="text-orange-500"
        />

        <StatCard
          icon={Gauge}
          label="متوسط الصرفية"
          value={
            stats?.avgConsumptionL100km
              ? `${stats.avgConsumptionL100km} L/100`
              : "—"
          }
          sub={
            stats?.avgKmPerLiter ? `${stats.avgKmPerLiter} كم/لتر` : undefined
          }
          trend={
            consumptionTrend === "up"
              ? "down"
              : consumptionTrend === "down"
                ? "up"
                : "neutral"
          }
          loading={isLoading}
          color="text-primary"
        />

        <StatCard
          icon={Car}
          label="آخر قراءة عداد"
          value={latestLog ? `${latestLog.odometerKm.toLocaleString()} كم` : "—"}
          sub={
            activeVehicle
              ? activeVehicle.nickname ||
                `${activeVehicle.make} ${activeVehicle.model}`
              : undefined
          }
          loading={isLoading}
          color="text-green-500"
        />
      </div>

      {/* ─── Charts Row ─── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">
              التطور الزمني
            </CardTitle>

            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {(
                [
                  { key: "cost", label: "التكلفة" },
                  { key: "liters", label: "الكمية" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setChartType(key)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    chartType === key
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Fuel className="h-10 w-10 opacity-20" />
                <p className="text-sm">لا توجد بيانات في هذه الفترة</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gCost" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.02}
                      />
                    </linearGradient>

                    <linearGradient id="gLiters" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />

                  {chartType === "cost" && (
                    <Area
                      type="monotone"
                      dataKey="التكلفة (ر.س)"
                      stroke="hsl(var(--primary))"
                      fill="url(#gCost)"
                      strokeWidth={2}
                    />
                  )}

                  {chartType === "liters" && (
                    <Area
                      type="monotone"
                      dataKey="الكمية (لتر)"
                      stroke="#3b82f6"
                      fill="url(#gLiters)"
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Per-vehicle comparison */}
        {vehicles.length > 1 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                مقارنة المركبات
              </CardTitle>
            </CardHeader>

            <CardContent>
              {!allStats ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={allStats}
                    layout="vertical"
                    margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      dataKey="vehicle"
                      type="category"
                      tick={{ fontSize: 10 }}
                      width={72}
                    />
                    <Tooltip
                      formatter={(v: number) => [
                        `${v.toFixed(1)} L/100km`,
                        "الصرفية",
                      ]}
                    />
                    <Bar
                      dataKey="avgL100"
                      fill="hsl(var(--primary))"
                      radius={[0, 6, 6, 0]}
                      name="الصرفية"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                تفاصيل آخر تعبئة
              </CardTitle>
            </CardHeader>

            <CardContent>
              {logsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : latestLog ? (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="text-5xl font-black text-primary">
                      {latestLog.consumption?.consumptionL100km ?? "—"}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      لتر / 100 كم
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        المسافة المقطوعة
                      </span>
                      <span className="font-medium">
                        {latestLog.consumption?.distanceKm ?? "—"} كم
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">كم لكل لتر</span>
                      <span className="font-medium">
                        {latestLog.consumption?.kmPerLiter ?? "—"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الكمية</span>
                      <span className="font-medium">{latestLog.liters} لتر</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">التكلفة</span>
                      <span className="font-bold text-primary">
                        {latestLog.totalCostSar} ر.س
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                  لا توجد تعبئات مسجلة بعد
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Log Table ─── */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">
            سجل التعبئات
            {logs.length > 0 && (
              <Badge variant="secondary" className="mr-2 text-xs">
                {logs.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {logsLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-muted-foreground gap-3">
              <Fuel className="h-12 w-12 opacity-15" />
              <p className="font-medium">لا توجد تعبئات مسجلة</p>
              <p className="text-sm opacity-60">
                سجّل أول تعبئة لتبدأ بتتبع صرفية سيارتك
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[520px]">
              <div className="divide-y divide-border">
                {logs.map((log, idx) => {
                  const vehicle = vehicles.find((v) => v.id === log.vehicleId);

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors group"
                    >
                      {/* Date */}
                      <div className="w-20 shrink-0 text-center">
                        <p className="text-sm font-semibold">
                          {format(parseISO(log.filledAt), "d MMM", {
                            locale: ar,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(log.filledAt), "yyyy")}
                        </p>
                      </div>

                      {/* Vehicle badge */}
                      <div className="w-28 shrink-0">
                        <p className="text-xs font-medium truncate text-muted-foreground">
                          {vehicle?.nickname ||
                            (vehicle
                              ? `${vehicle.make} ${vehicle.model}`
                              : "—")}
                        </p>
                      </div>

                      {/* Fuel grade */}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs shrink-0 w-14 justify-center",
                          GRADE_COLORS[log.fuelGrade] || "",
                        )}
                      >
                        {GRADE_LABELS[log.fuelGrade] || log.fuelGrade}
                      </Badge>

                      {/* Odometer */}
                      <div className="hidden sm:block w-28 shrink-0">
                        <p className="text-xs text-muted-foreground">عداد</p>
                        <p className="text-sm font-medium">
                          {log.odometerKm
                            ? `${log.odometerKm.toLocaleString()} كم`
                            : "—"}
                        </p>
                      </div>

                      {/* Liters + Cost */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-sm font-medium text-blue-500">
                            {log.liters} L
                          </span>
                          <span className="text-muted-foreground text-xs">×</span>
                          <span className="text-xs text-muted-foreground">
                            {log.pricePerLiterSar} ر.س/L
                          </span>
                          <span className="text-sm font-bold text-primary">
                            {log.totalCostSar} ر.س
                          </span>
                        </div>

                        {log.stationNameAr && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {log.stationNameAr}
                          </p>
                        )}
                      </div>

                      {/* Consumption */}
                      <div className="hidden md:block w-28 shrink-0 text-right">
                        {log.consumption ? (
                          <>
                            <p className="text-sm font-bold">
                              {log.consumption.consumptionL100km}
                              <span className="text-xs font-normal text-muted-foreground mr-1">
                                L/100
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {log.consumption.distanceKm} كم
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            أول تعبئة
                          </span>
                        )}
                      </div>

                      {/* Delete */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف السجل؟</AlertDialogTitle>
                            <AlertDialogDescription>
                              سيتم حذف تعبئة {log.liters} لتر بتاريخ{" "}
                              {format(parseISO(log.filledAt), "d MMMM yyyy", {
                                locale: ar,
                              })}
                              . لا يمكن التراجع عن هذا.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter className="flex-row-reverse gap-2">
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90 text-white"
                              onClick={() => deleteMutation.mutate(log.id)}
                            >
                              حذف
                            </AlertDialogAction>

                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
