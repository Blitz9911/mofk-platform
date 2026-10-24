import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  getListVehiclesQueryKey,
  useCreateVehicle,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArabicText } from "@/components/ArabicText";
import { useToast } from "@/components/Toast";
import { useColors } from "@/hooks/useColors";
import { rowDir } from "@/lib/layout";
import { smoothBack } from "@/lib/navigation";
import { useObdConnection } from "@/src/obd";

/* ── Brand / Model data (identical to web) ───────────────── */
const CAR_BRANDS: Record<string, { label: string; models: string[] }> = {
  toyota: { label: "تويوتا", models: ["كامري", "كورولا", "لاند كروزر", "هايلاكس", "ييرس", "راف فور", "فورتونر", "بريوس", "إنوفا", "أفالون"] },
  hyundai: { label: "هيونداي", models: ["سوناتا", "إيلانترا", "توكسون", "سانتافي", "كريتا", "أكسنت", "i10", "i20", "باليسيد"] },
  kia: { label: "كيا", models: ["K5", "K8", "سيراتو", "سبورتاج", "تيلورايد", "كارنيفال", "ريو", "ستينغر", "سورينتو"] },
  nissan: { label: "نيسان", models: ["التيما", "باترول", "إكستريل", "صني", "ماكسيما", "مورانو", "إكس تريل", "نافارا", "باثفايندر"] },
  honda: { label: "هوندا", models: ["أكورد", "سيفيك", "بايلوت", "CR-V", "HR-V", "جاز", "أوديسي"] },
  ford: { label: "فورد", models: ["إكسبلورر", "F-150", "موستانج", "إيدج", "برونكو", "إكسبيدشن", "فيوجن"] },
  chevrolet: { label: "شيفروليه", models: ["كابريس", "ماليبو", "تاهو", "تيلورايد", "ترافيرس", "سيلفرادو", "ترايلبليزر", "أكينوكس"] },
  lexus: { label: "لكزس", models: ["ES 350", "ES 300h", "LX 570", "LX 600", "RX 350", "GX 460", "LS 500", "NX 350"] },
  bmw: { label: "بي إم دبليو", models: ["الفئة 3", "الفئة 5", "الفئة 7", "X3", "X5", "X7", "M3", "M5"] },
  mercedes: { label: "مرسيدس", models: ["C-Class", "E-Class", "S-Class", "GLE", "GLS", "GLA", "CLA", "G-Class"] },
  audi: { label: "أودي", models: ["A4", "A6", "A8", "Q5", "Q7", "Q8", "RS6", "e-tron"] },
  mitsubishi: { label: "ميتسوبيشي", models: ["باجيرو", "إكليبس كروس", "آوتلاندر", "لانسر", "L200", "ASX"] },
  suzuki: { label: "سوزوكي", models: ["فيتارا", "سويفت", "سيلريو", "جيمني", "إيرتيغا", "بالينو"] },
  mazda: { label: "مازدا", models: ["CX-5", "CX-9", "مازدا 3", "مازدا 6", "CX-30", "MX-5"] },
  gmc: { label: "جي إم سي", models: ["يوكون", "سييرا", "إنفوي", "أكانيا", "تيرين", "كانيون"] },
  dodge: { label: "دودج", models: ["تشارجر", "تشالنجر", "دورانجو", "رام 1500"] },
  jeep: { label: "جيب", models: ["جراند شيروكي", "رانجلر", "كومباس", "ريكنيد", "جلادياتور"] },
  volvo: { label: "فولفو", models: ["XC90", "XC60", "XC40", "S90", "S60"] },
  infiniti: { label: "إنفينيتي", models: ["Q50", "Q60", "QX60", "QX80", "QX55"] },
  cadillac: { label: "كاديلاك", models: ["إسكاليد", "CT5", "CT4", "XT5", "XT6"] },
  other: { label: "أخرى", models: [] },
};

const YEARS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

const FUEL_OPTIONS: { value: "petrol" | "diesel" | "hybrid" | "ev"; label: string }[] = [
  { value: "petrol", label: "بنزين" },
  { value: "diesel", label: "ديزل" },
  { value: "hybrid", label: "هجين" },
  { value: "ev", label: "كهربائي" },
];

/* ── KSA Plate Input (RN port of web PlateInput) ─────────── */
function normalizeDigit(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
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
    ه: "هـ",
    هـ: "هـ",
    و: "و",
    ي: "ي",
  };

  return map[char] || char.toUpperCase();
}

function parsePlate(value: string) {
  const normalized = normalizeDigit(value || "");
  const digits = normalized.replace(/[^0-9]/g, "").slice(0, 4).split("");
  const letters = normalized
    .replace(/[0-9\s\-_/]/g, "")
    .split("")
    .filter((char) => /[\u0600-\u06FFa-zA-Z]/.test(char))
    .slice(0, 3)
    .map(normalizeLetter);

  return {
    letters: [letters[0] || "", letters[1] || "", letters[2] || ""],
    digits: [digits[0] || "", digits[1] || "", digits[2] || "", digits[3] || ""],
  };
}

function PlateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const colors = useColors();

  const letterRefs = useRef<Array<TextInput | null>>([]);
  const digitRefs = useRef<Array<TextInput | null>>([]);
  const { letters, digits } = parsePlate(value || "");

  const buildValue = (ltrs: string[], dgts: string[]) =>
    [ltrs.filter(Boolean).join(" "), dgts.filter(Boolean).join("")]
      .filter(Boolean)
      .join(" ")
      .trim();

  const focusBox = (visualIndex: number) => {
    if (visualIndex < 0 || visualIndex > 6) return;
    setTimeout(() => {
      const target =
        visualIndex < 4 ? digitRefs.current[visualIndex] : letterRefs.current[visualIndex - 4];
      target?.focus();
    }, 80);
  };

  const updateBox = (globalIndex: number, nextValue: string) => {
    const nextLetters = [...letters];
    const nextDigits = [...digits];

    if (globalIndex < 3) {
      nextLetters[globalIndex] = nextValue;
    } else {
      nextDigits[globalIndex - 3] = nextValue;
    }

    onChange(buildValue(nextLetters, nextDigits));
  };

  const handleLetter = (idx: number, char: string) => {
    const raw = char.slice(-1);

    if (!raw) {
      updateBox(idx, "");
      return;
    }

    if (!/[\u0600-\u06FFa-zA-Z]/.test(raw)) return;

    updateBox(idx, normalizeLetter(raw));
    if (idx < 2) focusBox(5 + idx);
  };

  const handleDigit = (idx: number, char: string) => {
    const rawDigits = normalizeDigit(char).replace(/[^0-9]/g, "");
    const raw = rawDigits.slice(-1);

    if (!raw) {
      updateBox(idx + 3, "");
      return;
    }

    const nextDigits = [...digits];
    const incoming = rawDigits.slice(0, 4 - idx).split("");
    incoming.forEach((digit, offset) => {
      nextDigits[idx + offset] = digit;
    });

    onChange(buildValue(letters, nextDigits));
    focusBox(Math.min(idx + incoming.length, 4));
  };

  const handleKey = (visualIndex: number, key: string) => {
    if (key !== "Backspace") return;

    const currentValue =
      visualIndex < 4 ? digits[visualIndex] : letters[visualIndex - 4];

    if (currentValue) {
      if (visualIndex < 4) updateBox(visualIndex + 3, "");
      else updateBox(visualIndex - 4, "");
      focusBox(Math.max(visualIndex - 1, 0));
      return;
    }

    if (visualIndex > 0) {
      const previous = visualIndex - 1;
      if (previous < 4) updateBox(previous + 3, "");
      else updateBox(previous - 4, "");
      focusBox(previous);
    }
  };

  const Box = ({
    visualIndex, val, onInput, setRef, hint, isLetter,
  }: {
    visualIndex: number;
    val: string;
    onInput: (v: string) => void;
    setRef: (input: TextInput | null) => void;
    hint: string;
    isLetter?: boolean;
  }) => (
    <TextInput
      ref={setRef}
      value={val}
      maxLength={isLetter ? 1 : 4}
      onChangeText={onInput}
      onKeyPress={(event) => handleKey(visualIndex, event.nativeEvent.key)}
      keyboardType={isLetter ? "default" : "number-pad"}
      blurOnSubmit={false}
      selectTextOnFocus
      placeholder={hint}
      placeholderTextColor={colors.mutedForeground}
      style={[
        plateStyles.box,
        {
          backgroundColor: colors.background,
          borderColor: val ? colors.primary : colors.border,
          color: val ? colors.foreground : colors.mutedForeground,
        },
      ]}
    />
  );

  const hasContent = letters.some(Boolean) || digits.some(Boolean);
  const previewDigits = digits.filter(Boolean).join("") || "1111";
  const previewLetters = letters.filter(Boolean).join(" ") || "أ ب ج";

  return (
    <View style={{ gap: 12 }}>
      <View style={plateStyles.boxRow}>
        {[0, 1, 2, 3].map((i) => (
          <Box
            key={`d${i}`}
            val={digits[i] || ""}
            visualIndex={i}
            onInput={(v) => handleDigit(i, v)}
            setRef={(input) => {
              digitRefs.current[i] = input;
            }}
            hint={String(i + 1)}
          />
        ))}
        <View style={[plateStyles.divider, { backgroundColor: colors.border }]} />
        {[0, 1, 2].map((i) => (
          <Box
            key={`l${i}`}
            val={letters[i] || ""}
            visualIndex={i + 4}
            onInput={(v) => handleLetter(i, v)}
            setRef={(input) => {
              letterRefs.current[i] = input;
            }}
            hint="أ"
            isLetter
          />
        ))}
      </View>

      {/* KSA Plate visual preview — matches web exactly */}
      {hasContent && (
        <View style={plateStyles.plate}>
          {/* Numbers — left side */}
          <View style={plateStyles.numCell}>
            <Text style={plateStyles.numText}>{previewDigits}</Text>
            <Text style={plateStyles.subText}>{previewDigits}</Text>
          </View>
          {/* Vertical separator */}
          <View style={plateStyles.plateSep} />
          {/* Letters — middle */}
          <View style={plateStyles.letterCell}>
            <Text style={plateStyles.letterText}>{previewLetters}</Text>
            <Text style={plateStyles.subText}>{previewLetters}</Text>
          </View>
          {/* Green KSA badge — rightmost */}
          <View style={plateStyles.ksaBadge}>
            <Text style={plateStyles.ksaAr}>السعودية</Text>
            <Text style={plateStyles.ksaEn}>KSA</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const plateStyles = StyleSheet.create({
  boxRow: { flexDirection: "row", direction: "ltr", alignItems: "center", justifyContent: "center", gap: 6 },
  box: {
    width: 42, height: 52, textAlign: "center",
    fontSize: 20, fontFamily: "Inter_700Bold",
    borderRadius: 12, borderWidth: 1.5,
  },
  divider: { width: 1, height: 28, marginHorizontal: 6 },
  /* Plate visual */
  plate: {
    flexDirection: "row",          /* LTR: numbers | sep | letters | badge */
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#d4d4d4",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  numCell: {
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8,
    alignItems: "center", justifyContent: "center", minWidth: 90,
  },
  plateSep: { width: 1, backgroundColor: "#d4d4d4" },
  letterCell: {
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8,
    alignItems: "center", justifyContent: "center", minWidth: 74,
  },
  numText: {
    fontSize: 22, color: "#000", fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  letterText: {
    fontSize: 22, color: "#000", fontFamily: "Inter_700Bold",
    letterSpacing: 4, textAlign: "center",
  },
  subText: {
    fontSize: 11, color: "#666", fontFamily: "Inter_600SemiBold",
    letterSpacing: 2, marginTop: 1,
  },
  ksaBadge: {
    backgroundColor: "#006c35", paddingHorizontal: 10,
    alignItems: "center", justifyContent: "center", minWidth: 38,
  },
  ksaAr: { fontSize: 7, color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  ksaEn: { fontSize: 12, color: "#fff", fontFamily: "Inter_700Bold", marginTop: 2 },
});

/* ── Main Screen ─────────────────────────────────────────── */
type PickerOpt = { value: string; label: string };
type PickerCfg = { title: string; options: PickerOpt[]; onSelect: (v: string) => void } | null;

const CURRENT_YEAR = new Date().getFullYear();

export default function AddVehicleScreen() {
  const colors = useColors();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const createVehicle = useCreateVehicle();
  const obd = useObdConnection();

  const [makeKey, setMakeKey] = useState<string>("");
  const [makeOther, setMakeOther] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [modelOther, setModelOther] = useState<boolean>(false);
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [fuelType, setFuelType] = useState<"petrol" | "diesel" | "hybrid" | "ev">("petrol");
  const [plateNumber, setPlateNumber] = useState<string>("");
  const [odometerKm, setOdometerKm] = useState<string>("");
  const [vin, setVin] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [picker, setPicker] = useState<PickerCfg>(null);

  useEffect(() => {
    const liveVin = obd.vehicleInfo?.vin?.trim();
    if (liveVin && !vin.trim()) setVin(liveVin);
  }, [obd.vehicleInfo?.vin, vin]);

  const makeLabel = useMemo(() => {
    if (!makeKey) return "";
    if (makeKey === "other") return makeOther;
    return CAR_BRANDS[makeKey]?.label ?? "";
  }, [makeKey, makeOther]);

  const availableModels = useMemo(() => {
    if (!makeKey || makeKey === "other") return [];
    return CAR_BRANDS[makeKey]?.models ?? [];
  }, [makeKey]);

  /* Same validation rules as web Zod schema:
     make.min(1), model.min(1), year 1990..CURRENT_YEAR+1, fuelType enum */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!makeLabel.trim()) e.make = "مطلوب";
    if (!model.trim()) e.model = "مطلوب";
    if (!year || year < 1990 || year > CURRENT_YEAR + 1) e.year = `بين 1990 و ${CURRENT_YEAR + 1}`;
    if (!["petrol", "diesel", "hybrid", "ev"].includes(fuelType)) e.fuelType = "مطلوب";
    const parsedPlate = parsePlate(plateNumber);
    if (!plateNumber.trim()) {
      e.plateNumber = "رقم اللوحة إجباري";
    } else if (!parsedPlate.letters.every(Boolean) || !parsedPlate.digits.every(Boolean)) {
      e.plateNumber = "أدخل ٣ أحرف و٤ أرقام للوحة";
    }
    if (odometerKm.trim() && (!/^\d+$/.test(odometerKm.trim()) || Number(odometerKm) < 0)) {
      e.odometerKm = "رقم غير صحيح";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const odo = parseInt(odometerKm, 10);
    createVehicle.mutate(
      {
        data: {
          make: makeLabel.trim(),
          model: model.trim(),
          year,
          fuelType,
          plateNumber: plateNumber.trim(),
          odometerKm: Number.isFinite(odo) ? odo : undefined,
          vin: vin.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
          showToast("تمت إضافة السيارة");
          smoothBack(router);
        },
        onError: (err: any) => {
          Alert.alert("خطأ", err?.message || "تعذرت إضافة المركبة. حاول مرة أخرى.");
        },
      },
    );
  };

  const fieldStyle = (hasError?: boolean) => [
    styles.field,
    { backgroundColor: colors.card, borderColor: hasError ? "#ef4444" : colors.border },
  ];

  const RequiredMark = () => <Text style={{ color: "#ef4444" }}> *</Text>;

  const renderSelectRow = (
    label: string, value: string, placeholder: string,
    onPress: () => void, required?: boolean, error?: string,
  ) => (
    <View style={styles.row}>
      <ArabicText style={[styles.label, { color: colors.foreground }]}>
        {label}{required ? <RequiredMark /> : null}
      </ArabicText>
      <Pressable style={[fieldStyle(!!error), { flexDirection: rowDir }]} onPress={onPress}>
        <ArabicText fill style={[styles.fieldText, { color: value ? colors.foreground : colors.mutedForeground }]}>
          {value || placeholder}
        </ArabicText>
        <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
      </Pressable>
      {error ? <ArabicText style={styles.errorText}>{error}</ArabicText> : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border, flexDirection: rowDir }]}>
        <View style={styles.headerTitles}>
          <ArabicText style={[styles.headerTitle, { color: colors.foreground }]}>إضافة مركبة</ArabicText>
          <ArabicText style={[styles.headerSub, { color: colors.mutedForeground }]}>بيانات أساسية لمراقبة المركبة</ArabicText>
        </View>
        <Pressable onPress={() => smoothBack(router)} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={12}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 36, gap: 14 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {makeKey === "other" ? (
              <View style={styles.row}>
                <View style={[styles.labelRow, { flexDirection: rowDir }]}>
                  <ArabicText style={[styles.label, { color: colors.foreground }]}>
                    الشركة المصنعة<RequiredMark />
                  </ArabicText>
                  <Pressable onPress={() => { setMakeKey(""); setMakeOther(""); setModel(""); setModelOther(false); }}>
                    <ArabicText style={[styles.changeText, { color: colors.primary }]}>تغيير</ArabicText>
                  </Pressable>
                </View>
                <View style={fieldStyle(!!errors.make)}>
                  <TextInput
                    value={makeOther}
                    onChangeText={setMakeOther}
                    placeholder="اكتب اسم الشركة"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.fieldText, { color: colors.foreground, padding: 0, flex: 1 }]}
                  />
                </View>
                {errors.make ? <ArabicText style={styles.errorText}>{errors.make}</ArabicText> : null}
              </View>
            ) : (
              renderSelectRow(
                "الشركة المصنعة", makeLabel, "اختر الشركة",
                () => setPicker({
                  title: "اختر الشركة",
                  options: Object.entries(CAR_BRANDS).map(([k, b]) => ({ value: k, label: b.label })),
                  onSelect: (v) => { setMakeKey(v); setMakeOther(""); setModel(""); setModelOther(false); setErrors((e) => ({ ...e, make: "" })); },
                }),
                true, errors.make,
              )
            )}

            {modelOther || makeKey === "other" ? (
              <View style={styles.row}>
                <View style={[styles.labelRow, { flexDirection: rowDir }]}>
                  <ArabicText style={[styles.label, { color: colors.foreground }]}>
                    الموديل<RequiredMark />
                  </ArabicText>
                  {modelOther ? (
                    <Pressable onPress={() => { setModelOther(false); setModel(""); }}>
                      <ArabicText style={[styles.changeText, { color: colors.primary }]}>تغيير</ArabicText>
                    </Pressable>
                  ) : null}
                </View>
                <View style={fieldStyle(!!errors.model)}>
                  <TextInput
                    value={model}
                    onChangeText={(t) => { setModel(t); if (t) setErrors((e) => ({ ...e, model: "" })); }}
                    placeholder="اكتب اسم الموديل"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.fieldText, { color: colors.foreground, padding: 0, flex: 1 }]}
                  />
                </View>
                {errors.model ? <ArabicText style={styles.errorText}>{errors.model}</ArabicText> : null}
              </View>
            ) : (
              renderSelectRow(
                "الموديل", model,
                makeKey ? "اختر الموديل" : "اختر الشركة أولاً",
                () => {
                  if (!makeKey) return;
                  setPicker({
                    title: "اختر الموديل",
                    options: [
                      ...availableModels.map((m) => ({ value: m, label: m })),
                      { value: "__other__", label: "أخرى (اكتب يدوياً)" },
                    ],
                    onSelect: (v) => {
                      if (v === "__other__") { setModelOther(true); setModel(""); }
                      else { setModel(v); setErrors((e) => ({ ...e, model: "" })); }
                    },
                  });
                },
                true, errors.model,
              )
            )}

            {renderSelectRow(
              "سنة الصنع", String(year), "",
              () => setPicker({
                title: "اختر السنة",
                options: YEARS.map((y) => ({ value: String(y), label: String(y) })),
                onSelect: (v) => { setYear(Number(v)); setErrors((e) => ({ ...e, year: "" })); },
              }),
              true, errors.year,
            )}

            <View style={styles.row}>
              <ArabicText style={[styles.label, { color: colors.foreground }]}>نوع الوقود</ArabicText>
              <View style={[styles.chipRow, { flexDirection: rowDir }]}>
                {FUEL_OPTIONS.map((opt) => {
                  const active = fuelType === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setFuelType(opt.value as typeof fuelType)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? colors.primary : colors.background,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? "#fff" : colors.foreground }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.row}>
              <ArabicText style={[styles.label, { color: colors.foreground }]}>رقم اللوحة<RequiredMark /></ArabicText>
              <PlateInput value={plateNumber} onChange={setPlateNumber} />
              {errors.plateNumber ? <ArabicText style={styles.errorText}>{errors.plateNumber}</ArabicText> : null}
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.row}>
              <ArabicText style={[styles.label, { color: colors.foreground }]}>رقم الهيكل VIN</ArabicText>
              <View style={fieldStyle()}>
                <TextInput
                  value={vin}
                  onChangeText={setVin}
                  placeholder="اختياري — يُملأ تلقائياً بعد التوصيل"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[styles.ltrInput, { color: colors.foreground }]}
                />
              </View>
            </View>
            <View style={styles.row}>
              <ArabicText style={[styles.label, { color: colors.foreground }]}>قراءة العداد</ArabicText>
              <View style={[fieldStyle(!!errors.odometerKm), { flexDirection: rowDir }]}>
                <TextInput
                  value={odometerKm}
                  onChangeText={(t) => { setOdometerKm(t); if (t) setErrors((e) => ({ ...e, odometerKm: "" })); }}
                  placeholder="45000"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  style={[styles.ltrInput, { color: colors.foreground, flex: 1 }]}
                />
                <ArabicText style={[styles.unit, { color: colors.mutedForeground }]}>كم</ArabicText>
              </View>
              {errors.odometerKm ? <ArabicText style={styles.errorText}>{errors.odometerKm}</ArabicText> : null}
            </View>
          </View>

          <View style={[styles.actions, { flexDirection: rowDir }]}>
            <Pressable
              onPress={handleSubmit}
              disabled={createVehicle.isPending}
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: createVehicle.isPending ? 0.7 : 1 }]}
            >
              <Text style={styles.submitText}>
                {createVehicle.isPending ? "جاري الإضافة..." : "إضافة المركبة"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => smoothBack(router)}
              style={[styles.cancelBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <Text style={[styles.cancelText, { color: colors.foreground }]}>إلغاء</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!picker} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPicker(null)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.modalHandle} />
            <View style={[styles.modalHeader, { flexDirection: rowDir }]}>
              <ArabicText style={[styles.modalTitle, { color: colors.foreground }]}>{picker?.title}</ArabicText>
              <Pressable onPress={() => setPicker(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              {picker?.options.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => { picker?.onSelect(opt.value); setPicker(null); }}
                  style={({ pressed }) => [
                    styles.modalOption,
                    { borderBottomColor: colors.border, backgroundColor: pressed ? colors.secondary : "transparent" },
                  ]}
                >
                  <ArabicText style={[styles.modalOptionText, { color: colors.foreground }]}>{opt.label}</ArabicText>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTitles: { flex: 1, gap: 2 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },

  section: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 14 },
  row: { gap: 8 },
  labelRow: { alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  changeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  errorText: { fontSize: 12, color: "#ef4444", fontFamily: "Inter_500Medium" },

  field: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 50,
  },
  fieldText: { fontSize: 15, fontFamily: "Inter_500Medium", flex: 1 },
  ltrInput: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, writingDirection: "ltr", textAlign: "left" },
  unit: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  chipRow: { flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  actions: { gap: 10, marginTop: 4 },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, borderWidth: 1, minWidth: 88, alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 8, paddingHorizontal: 8, borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#666", marginBottom: 4 },
  modalHeader: {
    alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 12, gap: 8,
  },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1 },
  modalOption: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalOptionText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
