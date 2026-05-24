import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  getListVehiclesQueryKey,
  useCreateVehicle,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useRef, useState } from "react";
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

import { useColors } from "@/hooks/useColors";

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
function PlateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const colors = useColors();

  const parseValue = (v: string) => {
    const clean = v.replace(/\s/g, "");
    const letters = clean.split("").filter((c) => /[\u0600-\u06FF]/.test(c)).slice(0, 3);
    const digits = clean.split("").filter((c) => /[0-9]/.test(c)).slice(0, 4);
    return { letters, digits };
  };

  const { letters, digits } = parseValue(value || "");

  const lRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
  const dRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  const buildValue = (ltrs: string[], dgts: string[]) =>
    ([...ltrs].join("") + " " + dgts.join("")).trim();

  const handleLetter = (idx: number, char: string) => {
    const c = char.slice(-1);
    if (c !== "" && !/[\u0600-\u06FF]/.test(c)) return;
    const n = [...letters];
    n[idx] = c;
    onChange(buildValue(n, digits));
    if (c && idx < 2) lRefs[idx + 1].current?.focus();
    if (c && idx === 2) dRefs[0].current?.focus();
  };

  const handleDigit = (idx: number, char: string) => {
    const c = char.slice(-1);
    if (c !== "" && !/^[0-9]$/.test(c)) return;
    const n = [...digits];
    n[idx] = c;
    onChange(buildValue(letters, n));
    if (c && idx < 3) dRefs[idx + 1].current?.focus();
  };

  const handleLetterKey = (idx: number, key: string) => {
    if (key === "Backspace" && !letters[idx] && idx > 0) lRefs[idx - 1].current?.focus();
  };

  const handleDigitKey = (idx: number, key: string) => {
    if (key === "Backspace" && !digits[idx]) {
      if (idx > 0) dRefs[idx - 1].current?.focus();
      else lRefs[2].current?.focus();
    }
  };

  const Box = ({
    val, refObj, onInput, onKey, hint, isLetter,
  }: {
    val: string;
    refObj: React.RefObject<TextInput | null>;
    onInput: (v: string) => void;
    onKey: (key: string) => void;
    hint: string;
    isLetter?: boolean;
  }) => (
    <TextInput
      ref={refObj}
      value={val}
      maxLength={1}
      onChangeText={onInput}
      onKeyPress={(e) => onKey(e.nativeEvent.key)}
      keyboardType={isLetter ? "default" : "number-pad"}
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

  const hasContent = letters.length > 0 || digits.length > 0;

  return (
    <View style={{ gap: 12 }}>
      {/* Input boxes: letters on right, digits on left (RTL) */}
      <View style={plateStyles.boxRow}>
        {[0, 1, 2].map((i) => (
          <Box
            key={`l${i}`}
            val={letters[i] || ""}
            refObj={lRefs[i]}
            onInput={(v) => handleLetter(i, v)}
            onKey={(k) => handleLetterKey(i, k)}
            hint="أ"
            isLetter
          />
        ))}
        <View style={[plateStyles.divider, { backgroundColor: colors.border }]} />
        {[0, 1, 2, 3].map((i) => (
          <Box
            key={`d${i}`}
            val={digits[i] || ""}
            refObj={dRefs[i]}
            onInput={(v) => handleDigit(i, v)}
            onKey={(k) => handleDigitKey(i, k)}
            hint={String(i + 1)}
          />
        ))}
      </View>

      {/* KSA Plate visual preview */}
      {hasContent && (
        <View style={plateStyles.previewWrap}>
          <View style={plateStyles.preview}>
            {/* Numbers (left) */}
            <View style={plateStyles.previewNumCell}>
              <Text style={plateStyles.previewBig}>
                {digits.join(" ") || "- - -"}
              </Text>
              <Text style={plateStyles.previewSmall}>
                {digits.join(" ") || ""}
              </Text>
            </View>
            {/* Letters cell */}
            <View style={plateStyles.previewDivider} />
            <View style={plateStyles.previewLetterCell}>
              <Text style={plateStyles.previewBig}>
                {letters.join(" ") || "- - -"}
              </Text>
              <Text style={plateStyles.previewSmall}>
                {letters.join(" ") || ""}
              </Text>
            </View>
            {/* KSA badge */}
            <View style={plateStyles.ksaBadge}>
              <Text style={plateStyles.ksaArText}>السعودية</Text>
              <Text style={plateStyles.ksaEnText}>KSA</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const plateStyles = StyleSheet.create({
  boxRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  box: {
    width: 38, height: 48, textAlign: "center",
    fontSize: 20, fontFamily: "Inter_700Bold",
    borderRadius: 10, borderWidth: 2,
  },
  divider: { width: 1, height: 32 },
  previewWrap: { alignItems: "flex-end" },
  preview: {
    flexDirection: "row", borderRadius: 10, overflow: "hidden",
    borderWidth: 2, borderColor: "#d4d4d4",
  },
  previewNumCell: { backgroundColor: "#fff", paddingHorizontal: 18, paddingVertical: 8, alignItems: "center", minWidth: 90 },
  previewLetterCell: { backgroundColor: "#fff", paddingHorizontal: 18, paddingVertical: 8, alignItems: "center", minWidth: 80 },
  previewDivider: { width: 1, backgroundColor: "#d4d4d4" },
  previewBig: { fontSize: 20, color: "#000", fontFamily: "Inter_700Bold", letterSpacing: 2 },
  previewSmall: { fontSize: 12, color: "#666", fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  ksaBadge: {
    backgroundColor: "#006c35", paddingHorizontal: 8,
    alignItems: "center", justifyContent: "center", minWidth: 40,
  },
  ksaArText: { fontSize: 8, color: "#fff", fontFamily: "Inter_700Bold" },
  ksaEnText: { fontSize: 11, color: "#fff", fontFamily: "Inter_700Bold", marginTop: 2 },
});

/* ── Main Screen ─────────────────────────────────────────── */
type PickerOpt = { value: string; label: string };
type PickerCfg = { title: string; options: PickerOpt[]; onSelect: (v: string) => void } | null;

const CURRENT_YEAR = new Date().getFullYear();

export default function AddVehicleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const createVehicle = useCreateVehicle();

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
          plateNumber: plateNumber.trim() || undefined,
          odometerKm: Number.isFinite(odo) ? odo : undefined,
          vin: vin.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
          if (Platform.OS === "web") router.back();
          else Alert.alert("✓ تمت الإضافة", "تم إضافة المركبة بنجاح", [
            { text: "حسناً", onPress: () => router.back() },
          ]);
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

  const renderSelectRow = (
    label: string, value: string, placeholder: string,
    onPress: () => void, required?: boolean, error?: string,
  ) => (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.foreground }]}>
        {label} {required ? <Text style={{ color: "#ef4444" }}>*</Text> : null}
      </Text>
      <Pressable style={fieldStyle(!!error)} onPress={onPress}>
        <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
        <Text style={[styles.fieldText, { color: value ? colors.foreground : colors.mutedForeground }]}>
          {value || placeholder}
        </Text>
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="close" size={26} color={colors.foreground} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>إضافة مركبة جديدة</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            أدخل بيانات مركبتك للبدء في مراقبتها
          </Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          {makeKey === "other" ? (
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Pressable onPress={() => { setMakeKey(""); setMakeOther(""); setModel(""); setModelOther(false); }}>
                  <Text style={[styles.changeText, { color: colors.primary }]}>تغيير</Text>
                </Pressable>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  الشركة المصنعة <Text style={{ color: "#ef4444" }}>*</Text>
                </Text>
              </View>
              <View style={fieldStyle(!!errors.make)}>
                <TextInput
                  value={makeOther}
                  onChangeText={setMakeOther}
                  placeholder="اكتب اسم الشركة"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.fieldText, { color: colors.foreground, padding: 0, flex: 1, textAlign: "right" }]}
                />
              </View>
              {errors.make ? <Text style={styles.errorText}>{errors.make}</Text> : null}
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

          {/* Model */}
          {modelOther || makeKey === "other" ? (
            <View style={styles.row}>
              <View style={styles.labelRow}>
                {modelOther && (
                  <Pressable onPress={() => { setModelOther(false); setModel(""); }}>
                    <Text style={[styles.changeText, { color: colors.primary }]}>تغيير</Text>
                  </Pressable>
                )}
                <Text style={[styles.label, { color: colors.foreground }]}>
                  الموديل <Text style={{ color: "#ef4444" }}>*</Text>
                </Text>
              </View>
              <View style={fieldStyle(!!errors.model)}>
                <TextInput
                  value={model}
                  onChangeText={(t) => { setModel(t); if (t) setErrors((e) => ({ ...e, model: "" })); }}
                  placeholder="اكتب اسم الموديل"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.fieldText, { color: colors.foreground, padding: 0, flex: 1, textAlign: "right" }]}
                />
              </View>
              {errors.model ? <Text style={styles.errorText}>{errors.model}</Text> : null}
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

          {/* Year + Fuel */}
          <View style={styles.gridRow}>
            <View style={{ flex: 1 }}>
              {renderSelectRow(
                "سنة الصنع", String(year), "",
                () => setPicker({
                  title: "اختر السنة",
                  options: YEARS.map((y) => ({ value: String(y), label: String(y) })),
                  onSelect: (v) => { setYear(Number(v)); setErrors((e) => ({ ...e, year: "" })); },
                }),
                true, errors.year,
              )}
            </View>
            <View style={{ flex: 1 }}>
              {renderSelectRow(
                "نوع الوقود",
                FUEL_OPTIONS.find((f) => f.value === fuelType)?.label ?? "",
                "",
                () => setPicker({
                  title: "نوع الوقود",
                  options: FUEL_OPTIONS.map((f) => ({ value: f.value, label: f.label })),
                  onSelect: (v) => setFuelType(v as any),
                }),
              )}
            </View>
          </View>

          {/* Plate Number — KSA Box Style */}
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.foreground }]}>رقم اللوحة</Text>
            <PlateInput value={plateNumber} onChange={setPlateNumber} />
          </View>

          {/* Odometer + VIN */}
          <View style={styles.gridRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.foreground, marginBottom: 8 }]}>قراءة العداد (كم)</Text>
              <View style={fieldStyle(!!errors.odometerKm)}>
                <TextInput
                  value={odometerKm}
                  onChangeText={(t) => { setOdometerKm(t); if (t) setErrors((e) => ({ ...e, odometerKm: "" })); }}
                  placeholder="مثال: 45000"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  style={[styles.fieldText, { color: colors.foreground, padding: 0, flex: 1, textAlign: "right" }]}
                />
              </View>
              {errors.odometerKm ? <Text style={styles.errorText}>{errors.odometerKm}</Text> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.foreground, marginBottom: 8 }]}>رقم الهيكل VIN</Text>
              <View style={fieldStyle()}>
                <TextInput
                  value={vin}
                  onChangeText={setVin}
                  placeholder="اختياري"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                  style={[styles.fieldText, { color: colors.foreground, padding: 0, flex: 1, textAlign: "right" }]}
                />
              </View>
            </View>
          </View>

          {/* Submit */}
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.cancelBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Text style={[styles.cancelText, { color: colors.foreground }]}>إلغاء</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={createVehicle.isPending}
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: createVehicle.isPending ? 0.7 : 1 }]}
            >
              <Text style={styles.submitText}>
                {createVehicle.isPending ? "جاري الإضافة..." : "إضافة المركبة"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker modal */}
      <Modal visible={!!picker} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPicker(null)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setPicker(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{picker?.title}</Text>
              <View style={{ width: 22 }} />
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
                  <Text style={[styles.modalOptionText, { color: colors.foreground }]}>{opt.label}</Text>
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
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  row: { gap: 8 },
  labelRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  changeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  errorText: { fontSize: 12, color: "#ef4444", fontFamily: "Inter_500Medium", textAlign: "right" },

  field: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth, minHeight: 46,
  },
  fieldText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },

  gridRow: { flexDirection: "row-reverse", gap: 12 },

  actions: { flexDirection: "row-reverse", gap: 10, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 8, paddingHorizontal: 8, borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#666", marginBottom: 4 },
  modalHeader: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 12,
  },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalOption: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalOptionText: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "right" },
});
