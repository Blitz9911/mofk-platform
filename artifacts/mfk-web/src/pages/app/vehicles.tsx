import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Car, Plus, Settings2, Activity, Wrench, CalendarCheck,
  Gauge, Wifi, WifiOff, ShieldCheck, AlertTriangle, ChevronLeft,
  X
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
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ─── Car Brand / Model Data ──────────────────────────────── */
const CAR_BRANDS: Record<string, { label: string; models: string[] }> = {
  toyota:     { label: "تويوتا",      models: ["كامري","كورولا","لاند كروزر","هايلاكس","ييرس","راف فور","فورتونر","بريوس","إنوفا","أفالون"] },
  hyundai:    { label: "هيونداي",     models: ["سوناتا","إيلانترا","توكسون","سانتافي","كريتا","أكسنت","i10","i20","باليسيد"] },
  kia:        { label: "كيا",         models: ["K5","K8","سيراتو","سبورتاج","تيلورايد","كارنيفال","ريو","ستينغر","سورينتو"] },
  nissan:     { label: "نيسان",       models: ["التيما","باترول","إكستريل","صني","ماكسيما","مورانو","إكس تريل","نافارا","باثفايندر"] },
  honda:      { label: "هوندا",       models: ["أكورد","سيفيك","بايلوت","CR-V","HR-V","جاز","أوديسي"] },
  ford:       { label: "فورد",        models: ["إكسبلورر","F-150","موستانج","إيدج","برونكو","إكسبيدشن","فيوجن"] },
  chevrolet:  { label: "شيفروليه",    models: ["كابريس","ماليبو","تاهو","تيلورايد","ترافيرس","سيلفرادو","ترايلبليزر","أكينوكس"] },
  lexus:      { label: "لكزس",        models: ["ES 350","ES 300h","LX 570","LX 600","RX 350","GX 460","LS 500","NX 350"] },
  bmw:        { label: "بي إم دبليو", models: ["الفئة 3","الفئة 5","الفئة 7","X3","X5","X7","M3","M5"] },
  mercedes:   { label: "مرسيدس",      models: ["C-Class","E-Class","S-Class","GLE","GLS","GLA","CLA","G-Class"] },
  audi:       { label: "أودي",        models: ["A4","A6","A8","Q5","Q7","Q8","RS6","e-tron"] },
  mitsubishi: { label: "ميتسوبيشي",   models: ["باجيرو","إكليبس كروس","آوتلاندر","لانسر","L200","ASX"] },
  suzuki:     { label: "سوزوكي",      models: ["فيتارا","سويفت","سيلريو","جيمني","إيرتيغا","بالينو"] },
  mazda:      { label: "مازدا",       models: ["CX-5","CX-9","مازدا 3","مازدا 6","CX-30","MX-5"] },
  gmc:        { label: "جي إم سي",    models: ["يوكون","سييرا","إنفوي","أكانيا","تيرين","كانيون"] },
  dodge:      { label: "دودج",        models: ["تشارجر","تشالنجر","دورانجو","رام 1500"] },
  jeep:       { label: "جيب",         models: ["جراند شيروكي","رانجلر","كومباس","ريكنيد","جلادياتور"] },
  volvo:      { label: "فولفو",       models: ["XC90","XC60","XC40","S90","S60"] },
  infiniti:   { label: "إنفينيتي",    models: ["Q50","Q60","QX60","QX80","QX55"] },
  cadillac:   { label: "كاديلاك",     models: ["إسكاليد","CT5","CT4","XT5","XT6"] },
  other:      { label: "أخرى",        models: [] },
};

const YEARS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

/* ─── الأحرف السعودية المعتمدة على اللوحات فقط ──────────── */
const SAUDI_PLATE_LETTERS = [
  "أ","ب","ح","د","ر","س","ص",
  "ط","ع","ق","ك","ل","م","ن",
  "ه","و","ي",
];

/* ─── Saudi Plate Input ─── FIXED ────────────────────────── */
/*
 * الإصلاح الجوهري:
 * ١. خانات الحروف أصبحت Pressable buttons تفتح grid اختيار
 *    بدل TextInput — يمنع أي إدخال خاطئ من الـ keyboard
 * ٢. خانات الأرقام تقبل 0-9 فقط
 * ٣. Preview تتحدث فوراً عند كل تغيير
 */
function PlateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  const parseValue = (v: string) => {
    const clean = v.replace(/\s/g, "");
    const letters = clean.split("").filter((c) => /[\u0600-\u06FF]/.test(c)).slice(0, 3);
    const digits  = clean.split("").filter((c) => /[0-9]/.test(c)).slice(0, 4);
    return { letters, digits };
  };

  const { letters, digits } = parseValue(value || "");

  const d0 = useRef<HTMLInputElement>(null);
  const d1 = useRef<HTMLInputElement>(null);
  const d2 = useRef<HTMLInputElement>(null);
  const d3 = useRef<HTMLInputElement>(null);
  const digitRefs = [d0, d1, d2, d3];

  const buildValue = (ltrs: string[], dgts: string[]) =>
    ([...ltrs].join("") + " " + dgts.join("")).trim();

  /* اختيار حرف من الـ picker */
  const handleSelectLetter = useCallback((slotIdx: number, letter: string) => {
    const n = [...letters];
    n[slotIdx] = letter;
    onChange(buildValue(n, digits));
    setPickerSlot(null);
    // بعد الحرف الثالث انتقل لأول رقم
    if (slotIdx === 2) setTimeout(() => digitRefs[0].current?.focus(), 50);
  }, [letters, digits, onChange]);

  /* مسح حرف */
  const clearLetter = useCallback((slotIdx: number) => {
    const n = [...letters];
    n[slotIdx] = "";
    onChange(buildValue(n, digits));
    setPickerSlot(null);
  }, [letters, digits, onChange]);

  /* إدخال رقم */
  const handleDigit = useCallback((idx: number, char: string) => {
    if (!/^[0-9]?$/.test(char)) return;
    const n = [...digits];
    n[idx] = char.slice(-1);
    onChange(buildValue(letters, n));
    if (char && idx < 3) digitRefs[idx + 1].current?.focus();
  }, [digits, letters, onChange]);

  const handleDigitKey = useCallback((idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx]) {
      if (idx > 0) digitRefs[idx - 1].current?.focus();
    }
  }, [digits]);

  const hasContent = letters.some(Boolean) || digits.some(Boolean);

  /* ─── Render ─── */
  return (
    <div className="space-y-4">

      {/* صف الخانات — RTL: حروف يمين، أرقام يسار */}
      <div className="flex items-center gap-2" dir="rtl">

        {/* خانات الحروف: اضغط لاختيار */}
        {[0, 1, 2].map((i) => (
          <button
            key={`l${i}`}
            type="button"
            onClick={() => setPickerSlot(pickerSlot === i ? null : i)}
            className={cn(
              "w-11 h-12 rounded-lg border-2 text-xl font-bold transition-all outline-none select-none",
              "flex items-center justify-center",
              letters[i]
                ? "border-primary text-foreground bg-primary/5"
                : "border-border text-muted-foreground bg-background",
              pickerSlot === i
                ? "border-primary ring-2 ring-primary/30 bg-primary/10"
                : "hover:border-primary/60",
            )}
            title={`اختر الحرف ${i + 1}`}
          >
            {letters[i] || <span className="text-muted-foreground/40 text-lg">أ</span>}
          </button>
        ))}

        {/* فاصل */}
        <div className="w-px h-10 bg-border mx-1 shrink-0" />

        {/* خانات الأرقام: TextInput عادي */}
        {[0, 1, 2, 3].map((i) => (
          <input
            key={`d${i}`}
            ref={digitRefs[i]}
            value={digits[i] || ""}
            maxLength={1}
            inputMode="numeric"
            pattern="[0-9]*"
            dir="ltr"
            onChange={(e) => handleDigit(i, e.target.value)}
            onKeyDown={(e) => handleDigitKey(i, e)}
            className={cn(
              "w-11 h-12 text-center text-xl font-bold rounded-lg border-2 bg-background transition-all outline-none",
              digits[i]
                ? "border-primary text-foreground"
                : "border-border text-muted-foreground",
              "focus:border-primary focus:ring-2 focus:ring-primary/20",
            )}
            placeholder={String(i + 1)}
          />
        ))}
      </div>

      {/* ── Letter Picker Grid ── */}
      {pickerSlot !== null && (
        <div className="rounded-xl border border-border bg-card shadow-lg p-4 space-y-3">
          {/* رأس الـ picker */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPickerSlot(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              اختر الحرف {pickerSlot + 1}
            </span>
          </div>

          {/* شبكة الأحرف */}
          <div className="grid grid-cols-6 gap-2" dir="rtl">
            {SAUDI_PLATE_LETTERS.map((letter) => {
              const isSelected = letters[pickerSlot] === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handleSelectLetter(pickerSlot, letter)}
                  className={cn(
                    "h-11 rounded-lg border-2 text-xl font-bold transition-all",
                    "flex items-center justify-center",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-foreground hover:border-primary/60 hover:bg-primary/5",
                  )}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          {/* زر مسح الحرف */}
          {letters[pickerSlot] && (
            <button
              type="button"
              onClick={() => clearLetter(pickerSlot)}
              className="w-full py-2 rounded-lg border border-border text-sm text-destructive hover:bg-destructive/5 transition-colors"
            >
              مسح الحرف
            </button>
          )}
        </div>
      )}

      {/* ── معاينة اللوحة الحية ── */}
      {hasContent && (
        <div className="inline-flex rounded-xl overflow-hidden border-2 border-border shadow-md" dir="ltr">
          {/* الأرقام يسار */}
          <div className="bg-white text-black px-5 py-2 text-center border-r border-gray-300 min-w-[80px]">
            <div className="text-xl font-black tracking-widest font-mono">
              {digits.join("") || "- - -"}
            </div>
            <div className="text-sm font-bold tracking-widest text-gray-500">
              {digits.join("") || ""}
            </div>
          </div>
          {/* الحروف + شارة KSA يمين */}
          <div className="bg-white text-black flex items-stretch">
            <div className="px-5 py-2 text-center min-w-[70px]">
              <div className="text-xl font-black tracking-widest" dir="rtl">
                {letters.join(" ") || "- - -"}
              </div>
              <div className="text-sm font-bold tracking-widest text-gray-500" dir="ltr">
                {letters.join(" ") || ""}
              </div>
            </div>
            <div className="bg-[#006c35] flex flex-col items-center justify-center px-2 text-white min-w-[36px]">
              <div className="text-[8px] font-bold leading-tight">السعودية</div>
              <div className="text-xs font-black">KSA</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Schema ──────────────────────────────────────────────── */
const createVehicleSchema = z.object({
  make:        z.string().min(1, "مطلوب"),
  model:       z.string().min(1, "مطلوب"),
  year:        z.coerce.number().min(1990).max(new Date().getFullYear() + 1),
  plateNumber: z.string().optional(),
  odometerKm:  z.coerce.number().optional(),
  fuelType:    z.enum(["petrol", "diesel", "hybrid", "ev"]),
  vin:         z.string().optional(),
});

const FUEL_LABEL: Record<string, string> = {
  petrol: "بنزين", diesel: "ديزل", hybrid: "هجين", ev: "كهربائي",
};

/* ─── Main Component ──────────────────────────────────────── */
export default function Vehicles() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: vehicles, isLoading } = useListVehicles();
  const createVehicle = useCreateVehicle();
  const pairAdapter = usePairAdapter();

  const [createOpen, setCreateOpen] = useState(false);
  const [pairOpen, setPairOpen]     = useState<{ open: boolean; vehicleId: string | null }>({ open: false, vehicleId: null });
  const [selectedMake, setSelectedMake]   = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [plateValue, setPlateValue] = useState(""); // ← state منفصل للوحة

  const form = useForm<z.infer<typeof createVehicleSchema>>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: {
      make: "", model: "",
      year: new Date().getFullYear(),
      fuelType: "petrol",
    },
  });

  const pairForm = useForm<{ adapterMac: string }>({ defaultValues: { adapterMac: "" } });

  /* ─── إعادة ضبط الـ Dialog ─── */
  const handleCloseCreate = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      form.reset();
      setSelectedMake("");
      setSelectedModel("");
      setPlateValue("");        // ← نمسح اللوحة
    }
  };

  /* ─── Submit ─── */
  const onSubmit = (values: z.infer<typeof createVehicleSchema>) => {
    // نُدمج قيمة اللوحة من state المنفصل
    createVehicle.mutate(
      { data: { ...values, plateNumber: plateValue.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: "✓ تم إضافة المركبة بنجاح" });
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
          handleCloseCreate(false);
        },
        onError: (err: any) => {
          toast({
            title: "خطأ",
            description: err?.message || "تعذرت إضافة المركبة",
            variant: "destructive",
          });
        },
      }
    );
  };

  const onPairSubmit = (values: { adapterMac: string }) => {
    if (!pairOpen.vehicleId) return;
    pairAdapter.mutate(
      { vehicleId: pairOpen.vehicleId, data: { adapterMac: values.adapterMac } },
      {
        onSuccess: () => {
          toast({ title: "✓ تم ربط الجهاز بنجاح" });
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
          setPairOpen({ open: false, vehicleId: null });
          pairForm.reset();
        },
      }
    );
  };

  /* ─── Helpers ─── */
  const getHealthColor = (s: number) =>
    s >= 80 ? "text-green-500" : s >= 60 ? "text-amber-500" : s >= 40 ? "text-orange-500" : "text-destructive";
  const getHealthBg = (s: number) =>
    s >= 80 ? "from-green-500/20 to-green-500/5"
    : s >= 60 ? "from-amber-500/20 to-amber-500/5"
    : s >= 40 ? "from-orange-500/20 to-orange-500/5"
    : "from-destructive/20 to-destructive/5";
  const getHealthLabel = (s: number) =>
    s >= 80 ? "ممتازة" : s >= 60 ? "جيدة" : s >= 40 ? "تحتاج عناية" : "تحتاج صيانة";

  const ACTIONS = (v: any) => [
    { label: "التشخيص المباشر",  desc: "راقب بيانات المحرك حياً",      icon: Activity,     color: "text-primary bg-primary/10 hover:bg-primary/20",          onClick: () => setLocation("/app/diagnostics") },
    { label: "سجل الأعطال",      desc: "أكواد الأعطال المحفوظة",       icon: Wrench,       color: "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20",       onClick: () => setLocation("/app/dtc") },
    { label: "الصيانة الدورية",  desc: "جداول ومواعيد الصيانة",        icon: CalendarCheck, color: "text-purple-500 bg-purple-500/10 hover:bg-purple-500/20", onClick: () => setLocation("/app/maintenance") },
    {
      label: "إقران جهاز MFK",
      desc:  v.isPaired ? "الجهاز مرتبط" : "اربط جهازك الذكي",
      icon:  v.isPaired ? Wifi : WifiOff,
      color: v.isPaired
        ? "text-green-500 bg-green-500/10 hover:bg-green-500/20"
        : "text-muted-foreground bg-muted hover:bg-muted/80",
      onClick:  () => { if (!v.isPaired) setPairOpen({ open: true, vehicleId: v.id }); },
      disabled: v.isPaired,
    },
  ];

  const currentModels = selectedMake && CAR_BRANDS[selectedMake]
    ? CAR_BRANDS[selectedMake].models : [];

  /* ════════════════════════════════════════════════ RENDER */
  return (
    <div className="space-y-8 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">مركباتي</h1>
          <p className="text-muted-foreground mt-1">
            {vehicles?.length
              ? `${vehicles.length} مركبة مسجلة في حسابك`
              : "أضف مركباتك وتحكم بها من مكان واحد"}
          </p>
        </div>

        {/* ── Create Dialog ── */}
        <Dialog open={createOpen} onOpenChange={handleCloseCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="w-4 h-4" /> إضافة مركبة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة مركبة جديدة</DialogTitle>
              <DialogDescription>أدخل بيانات مركبتك للبدء في مراقبتها.</DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* الشركة */}
                <FormField
                  control={form.control}
                  name="make"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الشركة المصنعة <span className="text-destructive">*</span></FormLabel>
                      {selectedMake === "other" ? (
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder="اكتب اسم الشركة"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <Button
                            type="button" variant="outline" size="sm"
                            onClick={() => {
                              setSelectedMake("");
                              field.onChange("");
                              form.setValue("model", "");
                              setSelectedModel("");
                            }}
                          >تغيير</Button>
                        </div>
                      ) : (
                        <Select
                          onValueChange={(v) => {
                            if (v === "other") {
                              setSelectedMake("other");
                              field.onChange("");
                            } else {
                              field.onChange(CAR_BRANDS[v]?.label || v);
                              setSelectedMake(v);
                            }
                            form.setValue("model", "");
                            setSelectedModel("");
                          }}
                          value={Object.keys(CAR_BRANDS).find((k) => CAR_BRANDS[k].label === field.value) || ""}
                        >
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="اختر الشركة" /></SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {Object.entries(CAR_BRANDS).map(([key, brand]) => (
                              <SelectItem key={key} value={key}>{brand.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* الموديل */}
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الموديل <span className="text-destructive">*</span></FormLabel>
                      {selectedMake === "other" || selectedModel === "other" ? (
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="اكتب اسم الموديل" {...field} />
                          </FormControl>
                          {selectedModel === "other" && (
                            <Button
                              type="button" variant="outline" size="sm"
                              onClick={() => { setSelectedModel(""); field.onChange(""); }}
                            >تغيير</Button>
                          )}
                        </div>
                      ) : (
                        <Select
                          onValueChange={(v) => {
                            if (v === "__other__") { setSelectedModel("other"); field.onChange(""); }
                            else { field.onChange(v); setSelectedModel(v); }
                          }}
                          value={field.value}
                          disabled={!selectedMake || selectedMake === "other"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={selectedMake ? "اختر الموديل" : "اختر الشركة أولاً"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {currentModels.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                            <SelectItem value="__other__">أخرى (اكتب يدوياً)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* السنة + الوقود */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سنة الصنع <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {YEARS.map((y) => (
                              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fuelType"
                    render={({ field }) => (
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
                      </FormItem>
                    )}
                  />
                </div>

                {/* ── رقم اللوحة — PlateInput الصحيح ── */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    رقم اللوحة
                    <span className="text-xs text-muted-foreground mr-2">
                      (اضغط على مربع الحرف لاختياره)
                    </span>
                  </label>
                  <PlateInput
                    value={plateValue}
                    onChange={setPlateValue}
                  />
                </div>

                {/* العداد + VIN */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="odometerKm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>قراءة العداد (كم)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="مثال: 45000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الهيكل VIN</FormLabel>
                        <FormControl>
                          <Input placeholder="اختياري" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleCloseCreate(false)}>إلغاء</Button>
                  <Button type="submit" disabled={createVehicle.isPending}>
                    {createVehicle.isPending ? "جاري الإضافة..." : "إضافة المركبة"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Pair Dialog ── */}
      <Dialog open={pairOpen.open} onOpenChange={(o) => !o && setPairOpen({ open: false, vehicleId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إقران جهاز OBD</DialogTitle>
            <DialogDescription>أدخل عنوان MAC الخاص بجهاز MFK لربطه بهذه المركبة.</DialogDescription>
          </DialogHeader>
          <Form {...pairForm}>
            <form onSubmit={pairForm.handleSubmit(onPairSubmit)} className="space-y-4">
              <FormField
                control={pairForm.control}
                name="adapterMac"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان MAC</FormLabel>
                    <FormControl>
                      <Input placeholder="00:11:22:33:44:55" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPairOpen({ open: false, vehicleId: null })}>إلغاء</Button>
                <Button type="submit" disabled={pairAdapter.isPending}>ربط الجهاز</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Loading ── */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => <Skeleton key={i} className="h-56 w-full rounded-2xl" />)}
        </div>

      ) : !vehicles?.length ? (
        /* ── Empty State ── */
        <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <Car className="h-12 w-12 text-muted-foreground/40" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">لا توجد مركبات مسجلة</h3>
            <p className="text-muted-foreground max-w-sm">
              أضف مركبتك الأولى لتبدأ في مراقبة صحتها واكتشاف الأعطال.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> أضف أول مركبة
          </Button>
        </div>

      ) : (
        /* ── Vehicle Cards ── */
        <div className="space-y-6">
          {vehicles.map((v) => {
            const activeFaults = (v as any).activeDtcCount ?? 0;
            const isPaired     = (v as any).isPaired;
            return (
              <div
                key={v.id}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Top — gradient header */}
                <div className={cn("bg-gradient-to-l p-6 flex flex-col sm:flex-row sm:items-center gap-4", getHealthBg(v.healthScore))}>
                  {/* Vehicle icon */}
                  <div className="w-16 h-16 rounded-2xl bg-background/60 border border-border/50 flex items-center justify-center shrink-0">
                    {v.imageUrl
                      ? <img src={v.imageUrl} alt={v.make} className="w-full h-full object-cover rounded-2xl" />
                      : <Car className="h-8 w-8 text-muted-foreground" />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold">
                        {v.nickname || `${v.make} ${v.model}`}
                      </h2>
                      {v.plateNumber && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {v.plateNumber}
                        </Badge>
                      )}
                      {isPaired
                        ? <Badge className="gap-1 bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30"><Wifi className="w-3 h-3" /> مرتبط</Badge>
                        : <Badge variant="outline" className="gap-1 text-muted-foreground"><WifiOff className="w-3 h-3" /> غير مرتبط</Badge>}
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

                {/* Stats Strip */}
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
                    <div className={cn("font-bold text-lg", activeFaults > 0 ? "text-destructive" : "text-green-500")}>
                      {activeFaults}
                    </div>
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
                    <div className="text-xs text-muted-foreground">
                      {isPaired ? "OBD مرتبط" : "لم يُربط"}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ACTIONS(v).map((action) => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl p-4 transition-colors text-center cursor-pointer",
                        "disabled:opacity-50 disabled:cursor-default",
                        action.color,
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

                {/* Footer — detail link */}
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
