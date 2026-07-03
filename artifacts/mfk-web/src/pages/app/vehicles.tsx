import { useState, useRef } from "react";
import type { KeyboardEvent, ClipboardEvent } from "react";
import { useLocation } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Car,
  Plus,
  Settings2,
  Activity,
  Wrench,
  CalendarCheck,
  Gauge,
  Wifi,
  WifiOff,
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
} from "lucide-react";
import {
  useListVehicles,
  useCreateVehicle,
  usePairAdapter,
  getListVehiclesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { cn } from "@/lib/utils";

/* ─── Car Brand / Model Data ──────────────────────────────── */
const CAR_BRANDS: Record<string, { label: string; models: string[] }> = {
  toyota: {
    label: "تويوتا",
    models: [
      "كامري",
      "كورولا",
      "لاند كروزر",
      "هايلكس",
      "يارس",
      "راف 4",
      "فورتشنر",
      "بريوس",
      "إنوفا",
      "أفالون",
      "برادو",
      "كراون",
    ],
  },
  hyundai: {
    label: "هيونداي",
    models: [
      "سوناتا",
      "إلنترا",
      "توكسون",
      "سانتا في",
      "كريتا",
      "أكسنت",
      "باليسيد",
      "أزيرا",
      "فيلوستر",
      "i10",
      "i20",
    ],
  },
  kia: {
    label: "كيا",
    models: [
      "K5",
      "K8",
      "سيراتو",
      "سبورتاج",
      "تيلورايد",
      "كارنفال",
      "ريو",
      "ستينجر",
      "سورينتو",
      "بيجاس",
      "سيلتوس",
    ],
  },
  nissan: {
    label: "نيسان",
    models: [
      "ألتيما",
      "باترول",
      "إكس-تريل",
      "صني",
      "ماكسيما",
      "مورانو",
      "نافارا",
      "باثفايندر",
      "أرمادا",
      "سنترا",
      "كيكس",
    ],
  },
  honda: {
    label: "هوندا",
    models: [
      "أكورد",
      "سيفيك",
      "بايلوت",
      "CR-V",
      "HR-V",
      "جاز",
      "أوديسي",
      "سيتي",
    ],
  },
  ford: {
    label: "فورد",
    models: [
      "إكسبلورر",
      "F-150",
      "موستانج",
      "إيدج",
      "برونكو",
      "إكسبديشن",
      "فيوجن",
      "توروس",
      "رينجر",
    ],
  },
  chevrolet: {
    label: "شيفروليه",
    models: [
      "كابريس",
      "ماليبو",
      "تاهو",
      "ترافيرس",
      "سيلفرادو",
      "ترايل بليزر",
      "إكوينوكس",
      "سوبربان",
      "كامارو",
      "كورفيت",
    ],
  },
  lexus: {
    label: "لكزس",
    models: [
      "ES 350",
      "ES 300h",
      "LX 570",
      "LX 600",
      "RX 350",
      "GX 460",
      "GX 550",
      "LS 500",
      "NX 350",
      "IS 300",
    ],
  },
  bmw: {
    label: "بي إم دبليو",
    models: [
      "الفئة 3",
      "الفئة 5",
      "الفئة 7",
      "X3",
      "X5",
      "X6",
      "X7",
      "M3",
      "M5",
    ],
  },
  mercedes: {
    label: "مرسيدس بنز",
    models: [
      "C-Class",
      "E-Class",
      "S-Class",
      "GLE",
      "GLS",
      "GLA",
      "CLA",
      "G-Class",
      "A-Class",
    ],
  },
  audi: {
    label: "أودي",
    models: [
      "A3",
      "A4",
      "A6",
      "A8",
      "Q3",
      "Q5",
      "Q7",
      "Q8",
      "RS6",
      "e-tron",
    ],
  },
  mitsubishi: {
    label: "ميتسوبيشي",
    models: [
      "باجيرو",
      "إكليبس كروس",
      "أوتلاندر",
      "لانسر",
      "L200",
      "ASX",
      "مونتيرو",
    ],
  },
  suzuki: {
    label: "سوزوكي",
    models: [
      "فيتارا",
      "سويفت",
      "سيليريو",
      "جيمني",
      "إرتيجا",
      "بالينو",
      "ديزاير",
    ],
  },
  mazda: {
    label: "مازدا",
    models: [
      "مازدا 3",
      "مازدا 6",
      "CX-3",
      "CX-30",
      "CX-5",
      "CX-9",
      "MX-5",
    ],
  },
  gmc: {
    label: "جي إم سي",
    models: [
      "يوكون",
      "سييرا",
      "أكاديا",
      "تيرين",
      "كانيون",
      "سافانا",
    ],
  },
  dodge: {
    label: "دودج",
    models: [
      "تشارجر",
      "تشالنجر",
      "دورانجو",
      "رام 1500",
      "رام 2500",
    ],
  },
  jeep: {
    label: "جيب",
    models: [
      "جراند شيروكي",
      "شيروكي",
      "رانجلر",
      "كومباس",
      "رينيجيد",
      "جلادياتور",
    ],
  },
  volvo: {
    label: "فولفو",
    models: [
      "XC90",
      "XC60",
      "XC40",
      "S90",
      "S60",
    ],
  },
  infiniti: {
    label: "إنفينيتي",
    models: [
      "Q50",
      "Q60",
      "QX50",
      "QX55",
      "QX60",
      "QX80",
    ],
  },
  cadillac: {
    label: "كاديلاك",
    models: [
      "إسكاليد",
      "CT4",
      "CT5",
      "XT4",
      "XT5",
      "XT6",
    ],
  },
  genesis: {
    label: "جينيسيس",
    models: [
      "G70",
      "G80",
      "G90",
      "GV60",
      "GV70",
      "GV80",
    ],
  },
  mg: {
    label: "إم جي",
    models: [
      "MG 5",
      "MG 6",
      "MG GT",
      "MG ZS",
      "MG HS",
      "MG RX8",
    ],
  },
  changan: {
    label: "شانجان",
    models: [
      "السفن",
      "إيدو",
      "CS35",
      "CS75",
      "CS85",
      "CS95",
      "يوني-T",
      "يوني-K",
    ],
  },
  geely: {
    label: "جيلي",
    models: [
      "كولراي",
      "أزكارا",
      "مونجارو",
      "توجيلا",
      "إمجراند",
      "جيومتري C",
    ],
  },
  haval: {
    label: "هافال",
    models: [
      "H6",
      "H9",
      "جوليان",
      "دارجو",
    ],
  },
  other: {
    label: "أخرى",
    models: [],
  },
};

const YEARS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

/* ─── Saudi Plate Input ───────────────────────────────────── */
function normalizeDigit(value: string) {
  return value
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function normalizeLetter(value: string) {
  const char = value.slice(-1);

  const map: Record<string, string> = {
    ا: "ا",
    أ: "أ",
    إ: "إ",
    آ: "آ",
    ب: "ب",
    ح: "ح",
    د: "د",
    ر: "ر",
    س: "س",
    ص: "ص",
    ط: "ط",
    ع: "ع",
    ق: "ق",
    ك: "ك",
    ل: "ل",
    م: "م",
    ن: "ن",
    هـ: "هـ",
    ه: "هـ",
    و: "و",
    ي: "ي",
  };

  return map[char] || char.toUpperCase();
}

function parsePlate(value: string) {
  const raw = value || "";
  const normalized = normalizeDigit(raw);

  const digits = normalized.replace(/[^0-9]/g, "").slice(0, 4).split("");

  const letters = normalized
    .replace(/[0-9\s\-_/]/g, "")
    .split("")
    .filter((c) => /[\u0600-\u06FFa-zA-Z]/.test(c))
    .slice(0, 3)
    .map(normalizeLetter);

  return {
    letters: [letters[0] || "", letters[1] || "", letters[2] || ""],
    digits: [digits[0] || "", digits[1] || "", digits[2] || "", digits[3] || ""],
  };
}

function PlateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const parsed = parsePlate(value || "");
  const letters = parsed.letters;
  const digits = parsed.digits;

  const buildPlate = (nextLetters: string[], nextDigits: string[]) => {
    const lettersPart = nextLetters.filter(Boolean).join(" ");
    const digitsPart = nextDigits.filter(Boolean).join("");
    return [lettersPart, digitsPart].filter(Boolean).join(" ").trim();
  };

  const focusBox = (index: number) => {
    if (index < 0 || index > 6) return;

    window.setTimeout(() => {
      const el = refs.current[index];
      el?.focus();
      el?.select();
    }, 25);
  };

  const updateBox = (globalIndex: number, nextValue: string) => {
    const nextLetters = [...letters];
    const nextDigits = [...digits];

    if (globalIndex < 3) {
      nextLetters[globalIndex] = nextValue;
    } else {
      nextDigits[globalIndex - 3] = nextValue;
    }

    onChange(buildPlate(nextLetters, nextDigits));
  };

  const handleLetterChange = (idx: number, input: string) => {
    const globalIndex = idx;
    const raw = input.slice(-1);

    if (!raw) {
      updateBox(globalIndex, "");
      return;
    }

    if (!/[\u0600-\u06FFa-zA-Z]/.test(raw)) return;

    const char = normalizeLetter(raw);
    updateBox(globalIndex, char);

    if (globalIndex < 6) {
      focusBox(globalIndex + 1);
    }
  };

  const handleDigitChange = (idx: number, input: string) => {
    const globalIndex = idx + 3;
    const raw = normalizeDigit(input).slice(-1);

    if (!raw) {
      updateBox(globalIndex, "");
      return;
    }

    if (!/^[0-9]$/.test(raw)) return;

    updateBox(globalIndex, raw);

    if (globalIndex < 6) {
      focusBox(globalIndex + 1);
    }
  };

  const handleKeyDown = (
    globalIndex: number,
    e: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();

      const currentValue =
        globalIndex < 3 ? letters[globalIndex] : digits[globalIndex - 3];

      const nextLetters = [...letters];
      const nextDigits = [...digits];

      if (currentValue) {
        if (globalIndex < 3) {
          nextLetters[globalIndex] = "";
        } else {
          nextDigits[globalIndex - 3] = "";
        }

        onChange(buildPlate(nextLetters, nextDigits));
        focusBox(Math.max(globalIndex - 1, 0));
        return;
      }

      const prevIndex = globalIndex - 1;

      if (prevIndex >= 0) {
        if (prevIndex < 3) {
          nextLetters[prevIndex] = "";
        } else {
          nextDigits[prevIndex - 3] = "";
        }

        onChange(buildPlate(nextLetters, nextDigits));
        focusBox(prevIndex);
      }

      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(Math.min(globalIndex + 1, 6));
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(Math.max(globalIndex - 1, 0));
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const pasted = event.clipboardData.getData("text");
    const next = parsePlate(pasted);

    onChange(buildPlate(next.letters, next.digits));

    const nextEmptyLetter = next.letters.findIndex((v) => !v);
    const nextEmptyDigit = next.digits.findIndex((v) => !v);

    if (nextEmptyLetter !== -1) {
      focusBox(nextEmptyLetter);
    } else if (nextEmptyDigit !== -1) {
      focusBox(nextEmptyDigit + 3);
    } else {
      focusBox(6);
    }
  };

  const Box = ({
    globalIndex,
    val,
    onInput,
    hint,
    isLetter,
  }: {
    globalIndex: number;
    val: string;
    onInput: (v: string) => void;
    hint?: string;
    isLetter?: boolean;
  }) => (
    <input
      ref={(el) => {
        refs.current[globalIndex] = el;
      }}
      value={val}
      maxLength={1}
      dir={isLetter ? "rtl" : "ltr"}
      inputMode={isLetter ? "text" : "numeric"}
      onChange={(e) => onInput(e.target.value)}
      onKeyDown={(e) => handleKeyDown(globalIndex, e)}
      onPaste={handlePaste}
      className={cn(
        "w-11 h-12 text-center text-xl font-bold rounded-lg border-2 bg-background transition-all outline-none",
        val ? "border-primary text-foreground" : "border-border text-muted-foreground",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
      )}
      placeholder={hint}
    />
  );

  const hasContent = letters.some(Boolean) || digits.some(Boolean);
  const previewDigits = digits.filter(Boolean).join("") || "1111";
  const previewLetters = letters.filter(Boolean).join(" ") || "أ ب ج";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2" dir="rtl">
        {[0, 1, 2].map((i) => (
          <Box
            key={`l${i}`}
            globalIndex={i}
            val={letters[i] || ""}
            onInput={(v) => handleLetterChange(i, v)}
            hint="أ"
            isLetter
          />
        ))}

        <div className="w-px h-10 bg-border mx-1" />

        {[0, 1, 2, 3].map((i) => (
          <Box
            key={`d${i}`}
            globalIndex={i + 3}
            val={digits[i] || ""}
            onInput={(v) => handleDigitChange(i, v)}
            hint={String(i + 1)}
          />
        ))}
      </div>

      {hasContent && (
        <div className="flex justify-center">
          <div
            className="inline-flex rounded-xl overflow-hidden border-2 border-border shadow-md bg-white"
            dir="ltr"
          >
            <div className="bg-white text-black px-5 py-2 text-center border-r border-gray-300 min-w-[85px]">
              <div className="text-xl font-black tracking-widest font-mono">
                {previewDigits}
              </div>
              <div className="text-sm font-bold tracking-widest text-gray-600">
                {previewDigits}
              </div>
            </div>

            <div className="bg-white text-black flex items-stretch">
              <div className="px-5 py-2 text-center min-w-[75px]">
                <div className="text-xl font-black tracking-widest" dir="rtl">
                  {previewLetters}
                </div>
                <div className="text-sm font-bold tracking-widest text-gray-600" dir="rtl">
                  {previewLetters}
                </div>
              </div>

              <div className="bg-[#006c35] flex flex-col items-center justify-center px-2 text-white min-w-[38px]">
                <div className="text-[8px] font-bold leading-tight">السعودية</div>
                <div className="text-xs font-black">KSA</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Schema ──────────────────────────────────────────────── */
const createVehicleSchema = z.object({
  make: z.string().min(1, "مطلوب"),
  model: z.string().min(1, "مطلوب"),
  year: z.coerce.number().min(1990).max(new Date().getFullYear() + 1),
  plateNumber: z.string().optional(),
  odometerKm: z.coerce.number().optional(),
  fuelType: z.enum(["petrol", "diesel", "hybrid", "ev"]),
  vin: z.string().optional(),
});

const FUEL_LABEL: Record<string, string> = {
  petrol: "بنزين",
  diesel: "ديزل",
  hybrid: "هجين",
  ev: "كهربائي",
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
  const [pairOpen, setPairOpen] = useState<{
    open: boolean;
    vehicleId: string | null;
  }>({ open: false, vehicleId: null });
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  const form = useForm<z.infer<typeof createVehicleSchema>>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      fuelType: "petrol",
      plateNumber: "",
      odometerKm: undefined,
      vin: "",
    },
  });

  const pairForm = useForm<{ adapterMac: string }>({
    defaultValues: { adapterMac: "" },
  });

  const onSubmit = (values: z.infer<typeof createVehicleSchema>) => {
    createVehicle.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: "تم إضافة المركبة بنجاح" });
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
          setCreateOpen(false);
          form.reset();
          setSelectedMake("");
          setSelectedModel("");
        },
      },
    );
  };

  const onPairSubmit = (values: { adapterMac: string }) => {
    if (!pairOpen.vehicleId) return;

    pairAdapter.mutate(
      {
        vehicleId: pairOpen.vehicleId,
        data: { adapterMac: values.adapterMac },
      },
      {
        onSuccess: () => {
          toast({ title: "تم ربط الجهاز بنجاح" });
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
          setPairOpen({ open: false, vehicleId: null });
          pairForm.reset();
        },
      },
    );
  };

  const getHealthColor = (s: number) =>
    s >= 80
      ? "text-green-500"
      : s >= 60
        ? "text-amber-500"
        : s >= 40
          ? "text-orange-500"
          : "text-destructive";

  const getHealthBg = (s: number) =>
    s >= 80
      ? "from-green-500/20 to-green-500/5"
      : s >= 60
        ? "from-amber-500/20 to-amber-500/5"
        : s >= 40
          ? "from-orange-500/20 to-orange-500/5"
          : "from-destructive/20 to-destructive/5";

  const getHealthLabel = (s: number) =>
    s >= 80
      ? "ممتازة"
      : s >= 60
        ? "جيدة"
        : s >= 40
          ? "تحتاج عناية"
          : "تحتاج صيانة";

  const ACTIONS = (v: any) => [
    {
      label: "التشخيص المباشر",
      desc: "راقب بيانات المحرك حياً",
      icon: Activity,
      color: "text-primary bg-primary/10 hover:bg-primary/20",
      onClick: () => setLocation(`/app/diagnostics`),
    },
    {
      label: "سجل الأعطال",
      desc: "أكواد الأعطال المحفوظة",
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
      desc: v.isPaired ? "الجهاز مرتبط" : "اربط جهازك الذكي",
      icon: v.isPaired ? Wifi : WifiOff,
      color: v.isPaired
        ? "text-green-500 bg-green-500/10 hover:bg-green-500/20"
        : "text-muted-foreground bg-muted hover:bg-muted/80",
      onClick: () => {
        if (!v.isPaired) setPairOpen({ open: true, vehicleId: v.id });
      },
      disabled: v.isPaired,
    },
  ];

  const currentModels =
    selectedMake && CAR_BRANDS[selectedMake]
      ? CAR_BRANDS[selectedMake].models
      : [];

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

        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) {
              form.reset();
              setSelectedMake("");
              setSelectedModel("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              إضافة مركبة
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة مركبة جديدة</DialogTitle>
              <DialogDescription>
                أدخل بيانات مركبتك للبدء في مراقبتها.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Brand */}
                <FormField
                  control={form.control}
                  name="make"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        الشركة المصنعة <span className="text-destructive">*</span>
                      </FormLabel>

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
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMake("");
                              field.onChange("");
                              form.setValue("model", "");
                              setSelectedModel("");
                            }}
                          >
                            تغيير
                          </Button>
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
                          value={
                            Object.keys(CAR_BRANDS).find(
                              (key) => CAR_BRANDS[key].label === field.value,
                            ) || ""
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الشركة" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent className="max-h-60">
                            {Object.entries(CAR_BRANDS).map(([key, brand]) => (
                              <SelectItem key={key} value={key}>
                                {brand.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Model */}
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        الموديل <span className="text-destructive">*</span>
                      </FormLabel>

                      {selectedMake === "other" || selectedModel === "other" ? (
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="اكتب اسم الموديل" {...field} />
                          </FormControl>

                          {selectedModel === "other" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedModel("");
                                field.onChange("");
                              }}
                            >
                              تغيير
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Select
                          onValueChange={(v) => {
                            if (v === "__other__") {
                              setSelectedModel("other");
                              field.onChange("");
                            } else {
                              field.onChange(v);
                              setSelectedModel(v);
                            }
                          }}
                          value={field.value}
                          disabled={!selectedMake || selectedMake === "other"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  selectedMake
                                    ? "اختر الموديل"
                                    : "اختر الشركة أولاً"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent className="max-h-60">
                            {currentModels.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                            <SelectItem value="__other__">
                              أخرى (اكتب يدوياً)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Year + Fuel */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          سنة الصنع <span className="text-destructive">*</span>
                        </FormLabel>

                        <Select
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent className="max-h-60">
                            {YEARS.map((year) => (
                              <SelectItem key={year} value={String(year)}>
                                {year}
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
                    name="fuelType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع الوقود</FormLabel>

                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>

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

                {/* Plate Number */}
                <Controller
                  control={form.control}
                  name="plateNumber"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">
                        رقم اللوحة
                      </label>

                      <PlateInput
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </div>
                  )}
                />

                {/* Odometer + VIN */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="odometerKm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>قراءة العداد (كم)</FormLabel>

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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                  >
                    إلغاء
                  </Button>

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
      <Dialog
        open={pairOpen.open}
        onOpenChange={(open) => {
          if (!open) setPairOpen({ open: false, vehicleId: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إقران جهاز OBD</DialogTitle>
            <DialogDescription>
              أدخل عنوان MAC الخاص بجهاز MFK لربطه بهذه المركبة.
            </DialogDescription>
          </DialogHeader>

          <Form {...pairForm}>
            <form
              onSubmit={pairForm.handleSubmit(onPairSubmit)}
              className="space-y-4"
            >
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPairOpen({ open: false, vehicleId: null })}
                >
                  إلغاء
                </Button>

                <Button type="submit" disabled={pairAdapter.isPending}>
                  ربط الجهاز
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Loading / Empty / List */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : !vehicles?.length ? (
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
            <Plus className="w-4 h-4" />
            أضف أول مركبة
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {vehicles.map((v) => {
            const activeFaults = (v as any).activeDtcCount ?? 0;
            const isPaired = (v as any).isPaired;

            return (
              <div
                key={v.id}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Top */}
                <div
                  className={cn(
                    "bg-gradient-to-l p-6 flex flex-col sm:flex-row sm:items-center gap-4",
                    getHealthBg(v.healthScore),
                  )}
                >
                  <div className="w-16 h-16 rounded-2xl bg-background/60 border border-border/50 flex items-center justify-center shrink-0">
                    {v.imageUrl ? (
                      <img
                        src={v.imageUrl}
                        alt={v.make}
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : (
                      <Car className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

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

                      {isPaired ? (
                        <Badge className="gap-1 bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30">
                          <Wifi className="w-3 h-3" />
                          مرتبط
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="gap-1 text-muted-foreground"
                        >
                          <WifiOff className="w-3 h-3" />
                          غير مرتبط
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {v.make} {v.model} • {v.year} •{" "}
                      {FUEL_LABEL[v.fuelType] || v.fuelType}
                    </p>
                  </div>

                  <div className="shrink-0 text-center">
                    <div
                      className={cn(
                        "text-4xl font-black leading-none mb-1",
                        getHealthColor(v.healthScore),
                      )}
                    >
                      {v.healthScore}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      صحة المركبة
                    </div>

                    <div
                      className={cn(
                        "text-xs font-semibold mt-0.5",
                        getHealthColor(v.healthScore),
                      )}
                    >
                      {getHealthLabel(v.healthScore)}
                    </div>
                  </div>
                </div>

                {/* Stats Strip */}
                <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border border-b border-border bg-muted/20">
                  <div className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Gauge className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        المسافة
                      </span>
                    </div>

                    <div className="font-bold text-lg">
                      {(v.odometerKm || 0).toLocaleString("ar-SA")}
                    </div>

                    <div className="text-xs text-muted-foreground">كيلومتر</div>
                  </div>

                  <div className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      {activeFaults > 0 ? (
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-green-500" />
                      )}

                      <span className="text-xs text-muted-foreground">
                        الأعطال
                      </span>
                    </div>

                    <div
                      className={cn(
                        "font-bold text-lg",
                        activeFaults > 0 ? "text-destructive" : "text-green-500",
                      )}
                    >
                      {activeFaults}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {activeFaults > 0 ? "عطل نشط" : "لا أعطال"}
                    </div>
                  </div>

                  <div className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Settings2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        الجهاز
                      </span>
                    </div>

                    <div
                      className={cn(
                        "font-bold text-lg",
                        isPaired ? "text-green-500" : "text-muted-foreground",
                      )}
                    >
                      {isPaired ? "نشط" : "—"}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {isPaired ? "OBD مرتبط" : "لم يُربط"}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ACTIONS(v).map((action) => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl p-4 transition-colors text-center cursor-pointer disabled:opacity-50 disabled:cursor-default",
                        action.color,
                      )}
                    >
                      <action.icon className="w-6 h-6" />

                      <div>
                        <div className="text-sm font-semibold leading-tight">
                          {action.label}
                        </div>

                        <div className="text-[11px] opacity-70 mt-0.5 leading-tight">
                          {action.desc}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Footer */}
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
