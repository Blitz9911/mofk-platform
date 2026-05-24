import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  getListVehiclesQueryKey,
  useCreateVehicle,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
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

const CAR_BRANDS: Record<string, { label: string; models: string[] }> = {
  toyota: { label: "تويوتا", models: ["كامري", "كورولا", "لاند كروزر", "هايلاكس", "ييرس", "راف فور", "فورتونر", "بريوس", "إنوفا", "أفالون"] },
  hyundai: { label: "هيونداي", models: ["سوناتا", "إيلانترا", "توكسون", "سانتافي", "كريتا", "أكسنت", "i10", "i20", "باليسيد"] },
  kia: { label: "كيا", models: ["K5", "K8", "سيراتو", "سبورتاج", "تيلورايد", "كارنيفال", "ريو", "ستينغر", "سورينتو"] },
  nissan: { label: "نيسان", models: ["التيما", "باترول", "إكستريل", "صني", "ماكسيما", "مورانو", "نافارا", "باثفايندر"] },
  honda: { label: "هوندا", models: ["أكورد", "سيفيك", "بايلوت", "CR-V", "HR-V", "جاز", "أوديسي"] },
  ford: { label: "فورد", models: ["إكسبلورر", "F-150", "موستانج", "إيدج", "برونكو", "إكسبيدشن", "فيوجن"] },
  chevrolet: { label: "شيفروليه", models: ["كابريس", "ماليبو", "تاهو", "ترافيرس", "سيلفرادو", "ترايلبليزر", "أكينوكس"] },
  lexus: { label: "لكزس", models: ["ES 350", "ES 300h", "LX 570", "LX 600", "RX 350", "GX 460", "LS 500", "NX 350"] },
  bmw: { label: "بي إم دبليو", models: ["الفئة 3", "الفئة 5", "الفئة 7", "X3", "X5", "X7", "M3", "M5"] },
  mercedes: { label: "مرسيدس", models: ["C-Class", "E-Class", "S-Class", "GLE", "GLS", "GLA", "CLA", "G-Class"] },
  audi: { label: "أودي", models: ["A4", "A6", "A8", "Q5", "Q7", "Q8", "RS6", "e-tron"] },
  mitsubishi: { label: "ميتسوبيشي", models: ["باجيرو", "إكليبس كروس", "آوتلاندر", "لانسر", "L200", "ASX"] },
  suzuki: { label: "سوزوكي", models: ["فيتارا", "سويفت", "سيلريو", "جيمني", "إيرتيغا", "بالينو"] },
  mazda: { label: "مازدا", models: ["CX-5", "CX-9", "مازدا 3", "مازدا 6", "CX-30", "MX-5"] },
  gmc: { label: "جي إم سي", models: ["يوكون", "سييرا", "إنفوي", "تيرين", "كانيون"] },
  dodge: { label: "دودج", models: ["تشارجر", "تشالنجر", "دورانجو", "رام 1500"] },
  jeep: { label: "جيب", models: ["جراند شيروكي", "رانجلر", "كومباس", "جلادياتور"] },
  volvo: { label: "فولفو", models: ["XC90", "XC60", "XC40", "S90", "S60"] },
  infiniti: { label: "إنفينيتي", models: ["Q50", "Q60", "QX60", "QX80", "QX55"] },
  cadillac: { label: "كاديلاك", models: ["إسكاليد", "CT5", "CT4", "XT5", "XT6"] },
  other: { label: "أخرى", models: [] },
};

const YEARS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

const FUEL_OPTIONS: { value: "petrol" | "diesel" | "hybrid" | "ev"; label: string; icon: string }[] = [
  { value: "petrol", label: "بنزين", icon: "water-outline" },
  { value: "diesel", label: "ديزل", icon: "speedometer-outline" },
  { value: "hybrid", label: "هجين", icon: "leaf-outline" },
  { value: "ev", label: "كهربائي", icon: "flash-outline" },
];

type PickerOpt = { value: string; label: string };
type PickerCfg = { title: string; options: PickerOpt[]; onSelect: (v: string) => void } | null;

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
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [fuelType, setFuelType] = useState<"petrol" | "diesel" | "hybrid" | "ev">("petrol");
  const [plateNumber, setPlateNumber] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [odometerKm, setOdometerKm] = useState<string>("");
  const [vin, setVin] = useState<string>("");

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

  const canSubmit =
    !!makeLabel && !!model.trim() && !!year && !!fuelType && !createVehicle.isPending;

  const handleSubmit = () => {
    if (!canSubmit) {
      Alert.alert("بيانات ناقصة", "أكمل الشركة والموديل وسنة الصنع");
      return;
    }
    const odo = parseInt(odometerKm, 10);
    createVehicle.mutate(
      {
        data: {
          make: makeLabel,
          model: model.trim(),
          year,
          fuelType,
          plateNumber: plateNumber.trim() || undefined,
          nickname: nickname.trim() || undefined,
          odometerKm: Number.isFinite(odo) ? odo : undefined,
          vin: vin.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
          if (Platform.OS === "web") {
            router.back();
          } else {
            Alert.alert("✓ تمت الإضافة", "تم إضافة المركبة بنجاح", [
              { text: "حسناً", onPress: () => router.back() },
            ]);
          }
        },
        onError: (err: any) => {
          Alert.alert("خطأ", err?.message || "تعذرت إضافة المركبة. حاول مرة أخرى.");
        },
      },
    );
  };

  const fieldStyle = [styles.field, { backgroundColor: colors.card, borderColor: colors.border }];

  const renderRow = (label: string, value: string, placeholder: string, onPress: () => void, required?: boolean) => (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.foreground }]}>
        {label} {required ? <Text style={{ color: "#ef4444" }}>*</Text> : null}
      </Text>
      <Pressable style={fieldStyle} onPress={onPress}>
        <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
        <Text style={[styles.fieldText, { color: value ? colors.foreground : colors.mutedForeground }]}>
          {value || placeholder}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="close" size={26} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>إضافة مركبة</Text>
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
              <View style={fieldStyle}>
                <TextInput
                  value={makeOther}
                  onChangeText={setMakeOther}
                  placeholder="اكتب اسم الشركة"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.fieldText, { color: colors.foreground, padding: 0, flex: 1, textAlign: "right" }]}
                />
              </View>
            </View>
          ) : (
            renderRow(
              "الشركة المصنعة",
              makeLabel,
              "اختر الشركة",
              () => setPicker({
                title: "اختر الشركة",
                options: Object.entries(CAR_BRANDS).map(([k, b]) => ({ value: k, label: b.label })),
                onSelect: (v) => { setMakeKey(v); setMakeOther(""); setModel(""); setModelOther(false); },
              }),
              true,
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
              <View style={fieldStyle}>
                <TextInput
                  value={model}
                  onChangeText={setModel}
                  placeholder="اكتب اسم الموديل"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.fieldText, { color: colors.foreground, padding: 0, flex: 1, textAlign: "right" }]}
                />
              </View>
            </View>
          ) : (
            renderRow(
              "الموديل",
              model,
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
                    else setModel(v);
                  },
                });
              },
              true,
            )
          )}

          {/* Year + Fuel */}
          <View style={styles.gridRow}>
            <View style={{ flex: 1 }}>
              {renderRow(
                "سنة الصنع",
                String(year),
                "",
                () => setPicker({
                  title: "اختر السنة",
                  options: YEARS.map((y) => ({ value: String(y), label: String(y) })),
                  onSelect: (v) => setYear(Number(v)),
                }),
                true,
              )}
            </View>
            <View style={{ flex: 1 }}>
              {renderRow(
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

          {/* Nickname */}
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.foreground }]}>الاسم المستعار</Text>
            <View style={fieldStyle}>
              <TextInput
                value={nickname}
                onChangeText={setNickname}
                placeholder="مثال: سيارة العمل"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.fieldText, { color: colors.foreground, padding: 0, flex: 1, textAlign: "right" }]}
              />
            </View>
          </View>

          {/* Plate */}
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.foreground }]}>رقم اللوحة</Text>
            <View style={fieldStyle}>
              <TextInput
                value={plateNumber}
                onChangeText={setPlateNumber}
                placeholder="مثال: أ ب ج 1234"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.fieldText, { color: colors.foreground, padding: 0, flex: 1, textAlign: "right" }]}
              />
            </View>
          </View>

          {/* Odometer + VIN */}
          <View style={styles.gridRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.foreground, marginBottom: 8 }]}>قراءة العداد (كم)</Text>
              <View style={fieldStyle}>
                <TextInput
                  value={odometerKm}
                  onChangeText={setOdometerKm}
                  placeholder="45000"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  style={[styles.fieldText, { color: colors.foreground, padding: 0, flex: 1, textAlign: "right" }]}
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.foreground, marginBottom: 8 }]}>رقم الهيكل VIN</Text>
              <View style={fieldStyle}>
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
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[
              styles.submitBtn,
              { backgroundColor: canSubmit ? colors.primary : colors.muted, opacity: canSubmit ? 1 : 0.6 },
            ]}
          >
            <Text style={styles.submitText}>
              {createVehicle.isPending ? "جاري الإضافة..." : "إضافة المركبة"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker modal */}
      <Modal
        visible={!!picker}
        transparent
        animationType="slide"
        onRequestClose={() => setPicker(null)}
      >
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
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },

  row: { gap: 8 },
  labelRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  changeText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  field: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth, minHeight: 46,
  },
  fieldText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },

  gridRow: { flexDirection: "row-reverse", gap: 12 },

  submitBtn: {
    paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 12,
  },
  submitText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },

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
