import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  getListMaintenanceLogsQueryKey,
  useCreateMaintenanceLog,
  useListMaintenanceLogs,
  useListVehicles,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { exportPdf } from "@/lib/pdf-export";

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
  { value: "other", label: "أخرى" },
];

const todayIso = () => new Date().toISOString().split("T")[0];

function serviceLabel(value?: string | null) {
  if (!value) return "-";
  return SERVICE_TYPES.find((item) => item.value === value)?.label || value;
}

function vehicleName(item: any) {
  return (
    item.vehicleNickname ||
    [item.vehicleMake, item.vehicleModel].filter(Boolean).join(" ") ||
    "مركبة"
  );
}

function formatKm(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num) || value === null || value === undefined || value === "") return "-";
  return `${num.toLocaleString("ar-SA")} كم`;
}

function formatSar(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num) || value === null || value === undefined || value === "") return "-";
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

function isThisMonth(value: unknown) {
  if (!value || typeof value !== "string") return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function SummaryCard({
  title,
  value,
  icon,
  color,
  suffix,
}: {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  suffix?: string;
}) {
  const colors = useColors();

  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.summaryIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{title}</Text>
      <Text style={[styles.summaryValue, { color }]}>
        {value}
        {suffix ? <Text style={[styles.summarySuffix, { color: colors.mutedForeground }]}> {suffix}</Text> : null}
      </Text>
    </View>
  );
}

function SelectSheet({
  visible,
  title,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{title}</Text>
          <ScrollView contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.optionRow,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
                <Text style={[styles.optionText, { color: colors.foreground }]}>{option.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
}) {
  const colors = useColors();

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlign="right"
        style={[
          styles.input,
          multiline ? styles.textarea : null,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.foreground,
          },
        ]}
      />
    </View>
  );
}

function ManualMaintenanceModal({
  visible,
  vehicles,
  onClose,
}: {
  visible: boolean;
  vehicles: any[] | undefined;
  onClose: () => void;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const logMaintenance = useCreateMaintenanceLog();

  const [picker, setPicker] = useState<null | "vehicle" | "service">(null);
  const [vehicleId, setVehicleId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [customServiceType, setCustomServiceType] = useState("");
  const [doneAt, setDoneAt] = useState(todayIso());
  const [doneAtKm, setDoneAtKm] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  const vehicleOptions = (vehicles ?? []).map((vehicle) => ({
    value: vehicle.id,
    label: vehicle.nickname || `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
  }));
  const selectedVehicle = vehicleOptions.find((item) => item.value === vehicleId)?.label;
  const selectedService = serviceType === "other" ? customServiceType || "أخرى" : serviceLabel(serviceType);

  const reset = () => {
    setVehicleId("");
    setServiceType("");
    setCustomServiceType("");
    setDoneAt(todayIso());
    setDoneAtKm("");
    setCost("");
    setNotes("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    const finalServiceType = serviceType === "other" ? customServiceType.trim() : serviceType;

    if (!vehicleId) {
      Alert.alert("تنبيه", "اختر المركبة.");
      return;
    }

    if (!finalServiceType) {
      Alert.alert("تنبيه", "اختر نوع الصيانة.");
      return;
    }

    if (!doneAt.trim()) {
      Alert.alert("تنبيه", "تاريخ الصيانة مطلوب.");
      return;
    }

    if (serviceType === "other" && !customServiceType.trim()) {
      Alert.alert("تنبيه", "اسم الصيانة المخصصة مطلوب.");
      return;
    }
    if (doneAtKm.trim() && (!Number.isFinite(Number(doneAtKm)) || Number(doneAtKm) < 0)) {
      Alert.alert("تنبيه", "قراءة العداد غير صحيحة.");
      return;
    }
    if (cost.trim() && (!Number.isFinite(Number(cost)) || Number(cost) < 0)) {
      Alert.alert("تنبيه", "التكلفة غير صحيحة.");
      return;
    }

    logMaintenance.mutate(
      {
        vehicleId,
        serviceType: serviceType === "other" ? "other" : finalServiceType,
        customServiceName: serviceType === "other" ? finalServiceType : null,
        doneAt,
        doneAtKm: doneAtKm.trim() ? Number(doneAtKm) : null,
        actualCostSar: cost.trim() ? Number(cost) : null,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMaintenanceLogsQueryKey({ limit: 200 }) });
          Alert.alert("تمت إضافة الصيانة", "تم تسجيل الصيانة بنجاح.");
          close();
        },
        onError: () => {
          Alert.alert("خطأ", "فشل تسجيل الصيانة، حاول مجددًا.");
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={[modalStyles.root, { backgroundColor: colors.background }]}>
        <View style={[modalStyles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={close} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[modalStyles.title, { color: colors.foreground }]}>إضافة صيانة</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={modalStyles.body} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => setPicker("vehicle")}
            style={[modalStyles.selectBox, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
            <View style={modalStyles.selectTextWrap}>
              <Text style={[modalStyles.selectLabel, { color: colors.mutedForeground }]}>المركبة</Text>
              <Text style={[modalStyles.selectValue, { color: selectedVehicle ? colors.foreground : colors.mutedForeground }]}>
                {selectedVehicle || "اختر المركبة"}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setPicker("service")}
            style={[modalStyles.selectBox, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
            <View style={modalStyles.selectTextWrap}>
              <Text style={[modalStyles.selectLabel, { color: colors.mutedForeground }]}>نوع الصيانة</Text>
              <Text style={[modalStyles.selectValue, { color: serviceType ? colors.foreground : colors.mutedForeground }]}>
                {serviceType ? selectedService : "اختر نوع الصيانة"}
              </Text>
            </View>
          </Pressable>

          {serviceType === "other" ? (
            <Field
              label="اكتب نوع الصيانة"
              value={customServiceType}
              onChangeText={setCustomServiceType}
              placeholder="مثال: تغيير حزام التوجيه"
            />
          ) : null}

          <View style={modalStyles.twoCols}>
            <Field label="تاريخ الصيانة" value={doneAt} onChangeText={setDoneAt} placeholder="YYYY-MM-DD" />
            <Field label="قراءة العداد" value={doneAtKm} onChangeText={setDoneAtKm} keyboardType="numeric" placeholder="45000" />
          </View>

          <Field label="التكلفة" value={cost} onChangeText={setCost} keyboardType="numeric" placeholder="اختياري" />
          <Field label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="أي تفاصيل إضافية عن الصيانة..." multiline />

          <Pressable
            onPress={submit}
            disabled={logMaintenance.isPending}
            style={({ pressed }) => [
              modalStyles.submitBtn,
              { backgroundColor: colors.primary, opacity: pressed || logMaintenance.isPending ? 0.78 : 1 },
            ]}
          >
            {logMaintenance.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={modalStyles.submitText}>حفظ الصيانة</Text>
              </>
            )}
          </Pressable>
        </ScrollView>

        <SelectSheet
          visible={picker === "vehicle"}
          title="اختر المركبة"
          options={vehicleOptions}
          onSelect={setVehicleId}
          onClose={() => setPicker(null)}
        />
        <SelectSheet
          visible={picker === "service"}
          title="اختر نوع الصيانة"
          options={SERVICE_TYPES}
          onSelect={setServiceType}
          onClose={() => setPicker(null)}
        />
      </View>
    </Modal>
  );
}

export default function MaintenanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const { data: maintenance, isLoading, refetch } = useListMaintenanceLogs({ limit: 200 });
  const { data: vehicles, refetch: refetchVehicles } = useListVehicles();

  const sortedLogs = useMemo(() => {
    return (maintenance ?? [])
      .filter((item: any) => {
        if (item.isRecommendation) return false;
        if (item.status && item.status !== "done") return false;
        return true;
      })
      .sort((a: any, b: any) => {
        const aDate = new Date(a.lastDoneAt || a.doneAt || a.createdAt || 0).getTime();
        const bDate = new Date(b.lastDoneAt || b.doneAt || b.createdAt || 0).getTime();
        return bDate - aDate;
      });
  }, [maintenance]);

  const logsThisMonth = sortedLogs.filter((item: any) => isThisMonth(item.lastDoneAt || item.doneAt));
  const uniqueVehiclesCount = new Set(sortedLogs.map((item: any) => item.vehicleId).filter(Boolean)).size;
  const totalCost = sortedLogs.reduce((sum: number, item: any) => {
    const value = Number(item.estimatedCost ?? item.cost ?? 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  const exportMaintenancePdf = () => {
    if (!sortedLogs.length) return;

    void exportPdf({
      title: "تقرير سجل الصيانة",
      subtitle: "سجل الصيانات المنجزة والتكاليف المسجلة لكل مركبة داخل تطبيق مفك.",
      fileLabel: "تقرير صيانة مفك",
      sections: [
        {
          title: "ملخص الصيانة",
          items: [
            {
              title: "إحصائيات السجل",
              subtitle: "ملخص سريع حسب البيانات الحالية",
              badge: "ملخص",
              fields: [
                { label: "إجمالي الصيانات", value: sortedLogs.length },
                { label: "هذا الشهر", value: logsThisMonth.length },
                { label: "عدد المركبات", value: uniqueVehiclesCount },
                { label: "إجمالي التكاليف", value: formatSar(totalCost) },
              ],
            },
          ],
        },
        {
          title: "سجلات الصيانة",
          items: sortedLogs.map((item: any) => ({
            title: item.serviceTypeAr || serviceLabel(item.serviceType),
            subtitle: vehicleName(item),
            badge: "منجزة",
            fields: [
              { label: "تاريخ التنفيذ", value: formatDate(item.lastDoneAt || item.doneAt) },
              { label: "العداد وقت التنفيذ", value: formatKm(item.lastDoneKm || item.doneAtKm) },
              { label: "التكلفة", value: formatSar(item.estimatedCost ?? item.cost) },
              { label: "ملاحظات", value: item.notes },
            ],
          })),
        },
      ],
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchVehicles()]);
    setRefreshing(false);
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>الصيانة</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>الصيانة الدورية والتنبيهات</Text>
        </View>
        {!isLoading && sortedLogs.length > 0 ? (
          <Pressable onPress={exportMaintenancePdf} style={[styles.exportBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 96 : 126, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroText}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>الصيانة</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>الصيانة الدورية</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              سجل الصيانات المنجزة لكل مركبة وتابع تاريخها وتكلفتها.
            </Text>
          </View>
          <Pressable
            onPress={() => setManualOpen(true)}
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 }]}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>إضافة</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <SummaryCard title="إجمالي الصيانات" value={sortedLogs.length} icon="clipboard-outline" color={colors.primary} />
              <SummaryCard title="هذا الشهر" value={logsThisMonth.length} icon="calendar-outline" color="#3b82f6" />
              <SummaryCard title="المركبات" value={uniqueVehiclesCount} icon="car-outline" color="#f59e0b" />
              <SummaryCard
                title="إجمالي التكاليف"
                value={Number(totalCost.toFixed(0)).toLocaleString("ar-SA")}
                icon="receipt-outline"
                color="#22c55e"
                suffix="ر.س"
              />
            </View>

            <View style={[styles.noteCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}34` }]}>
              <View style={[styles.noteIcon, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="bulb-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.noteText}>
                <Text style={[styles.noteTitle, { color: colors.foreground }]}>وين راحت الصيانة القريبة والمتأخرة؟</Text>
                <Text style={[styles.noteBody, { color: colors.mutedForeground }]}>
                  التوصيات والقريبة والمتأخرة موجودة في صفحة التوصيات، وهنا الصيانة مخصصة للسجل والتنفيذ فقط.
                </Text>
                <Pressable onPress={() => router.push("/recommendations")} style={styles.noteLink}>
                  <Ionicons name="chevron-back" size={14} color={colors.primary} />
                  <Text style={[styles.noteLinkText, { color: colors.primary }]}>فتح التوصيات</Text>
                </Pressable>
              </View>
            </View>

            {sortedLogs.length === 0 ? (
              <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="checkmark-circle" size={54} color="#22c55e" />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد سجلات صيانة حتى الآن</Text>
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                  أضف أول صيانة، وبعدها يبدأ مفك ببناء سجل للمركبة واستخدامه في صفحة التوصيات.
                </Text>
                <Pressable onPress={() => setManualOpen(true)} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.emptyBtnText}>إضافة أول صيانة</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>جميع الصيانات المسجلة يدويًا</Text>
                  <Text style={[styles.sectionTitle, { color: "#22c55e" }]}>سجل الصيانة المنجزة ({sortedLogs.length})</Text>
                </View>

                {sortedLogs.map((item: any) => (
                  <View key={item.id} style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.logTop}>
                      <View style={[styles.doneBadge, { backgroundColor: "#22c55e18", borderColor: "#22c55e42" }]}>
                        <Ionicons name="checkmark-circle" size={13} color="#22c55e" />
                        <Text style={styles.doneBadgeText}>منجزة</Text>
                      </View>
                      <View style={styles.logTitleWrap}>
                        <Text style={[styles.logTitle, { color: colors.foreground }]}>
                          {item.serviceTypeAr || serviceLabel(item.serviceType)}
                        </Text>
                        <Text style={[styles.logVehicle, { color: colors.mutedForeground }]}>{vehicleName(item)}</Text>
                      </View>
                    </View>

                    <View style={styles.logStats}>
                      <View style={[styles.logStat, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.logStatLabel, { color: colors.mutedForeground }]}>تاريخ التنفيذ</Text>
                        <Text style={[styles.logStatValue, { color: colors.foreground }]}>
                          {formatDate(item.lastDoneAt || item.doneAt)}
                        </Text>
                      </View>
                      <View style={[styles.logStat, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.logStatLabel, { color: colors.mutedForeground }]}>العداد وقتها</Text>
                        <Text style={[styles.logStatValue, { color: colors.foreground }]}>
                          {formatKm(item.lastDoneKm || item.doneAtKm)}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.costRow, { borderColor: colors.border }]}>
                      <Text style={[styles.costValue, { color: colors.foreground }]}>
                        {formatSar(item.estimatedCost ?? item.cost)}
                      </Text>
                      <View style={styles.costLabel}>
                        <Text style={[styles.costText, { color: colors.mutedForeground }]}>التكلفة</Text>
                        <Ionicons name="receipt-outline" size={16} color={colors.mutedForeground} />
                      </View>
                    </View>

                    {item.notes ? (
                      <Text style={[styles.notes, { backgroundColor: colors.background, color: colors.mutedForeground }]}>
                        {item.notes}
                      </Text>
                    ) : null}

                    <View style={[styles.recoFoot, { borderTopColor: colors.border }]}>
                      <Pressable onPress={() => router.push("/recommendations")} style={styles.recoBtn}>
                        <Ionicons name="chevron-back" size={13} color={colors.primary} />
                        <Text style={[styles.recoBtnText, { color: colors.primary }]}>التوصيات</Text>
                      </Pressable>
                      <Text style={[styles.recoText, { color: colors.mutedForeground }]}>
                        يستخدم هذا السجل لحساب التوصيات
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <ManualMaintenanceModal visible={manualOpen} vehicles={vehicles} onClose={() => setManualOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, alignItems: "center", gap: 3 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  headerSpacer: { width: 42 },
  exportBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  hero: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  heroText: { flex: 1, alignItems: "flex-end", gap: 4 },
  eyebrow: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "right" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "right" },
  subtitle: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "right" },
  addBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  loadCenter: { paddingVertical: 60, alignItems: "center", justifyContent: "center" },
  summaryGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  summaryCard: {
    width: "48%",
    minHeight: 116,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  summaryIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "right" },
  summaryValue: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "right" },
  summarySuffix: { fontSize: 11, fontFamily: "Inter_500Medium" },
  noteCard: { flexDirection: "row-reverse", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  noteIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  noteText: { flex: 1, alignItems: "flex-end", gap: 4 },
  noteTitle: { fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "right" },
  noteBody: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", textAlign: "right" },
  noteLink: { flexDirection: "row-reverse", alignItems: "center", gap: 2, paddingTop: 2 },
  noteLinkText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  emptyWrap: {
    padding: 28,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyDesc: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  emptyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  section: { gap: 12 },
  sectionHeader: { alignItems: "flex-end", gap: 2 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
  sectionHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  logCard: {
    padding: 15,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 4,
    borderTopColor: "#22c55e",
    gap: 12,
  },
  logTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  logTitleWrap: { flex: 1, alignItems: "flex-end", gap: 3 },
  logTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
  logVehicle: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "right" },
  doneBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  doneBadgeText: { color: "#22c55e", fontSize: 11, fontFamily: "Inter_700Bold" },
  logStats: { flexDirection: "row-reverse", gap: 8 },
  logStat: { flex: 1, padding: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: "flex-end", gap: 4 },
  logStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "right" },
  logStatValue: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
  costRow: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  costLabel: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  costText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  costValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  notes: { padding: 12, borderRadius: 12, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", textAlign: "right" },
  recoFoot: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  recoText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  recoBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 2 },
  recoBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)", justifyContent: "flex-end" },
  sheet: { maxHeight: "72%", padding: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
  sheetHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 4, backgroundColor: "#666" },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "right" },
  optionRow: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  optionText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  fieldWrap: { gap: 7 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
  input: { minHeight: 48, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  textarea: { minHeight: 92, paddingTop: 12, textAlignVertical: "top" },
});

const modalStyles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  body: { padding: 18, gap: 14, paddingBottom: 42 },
  selectBox: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectTextWrap: { flex: 1, alignItems: "flex-end", gap: 2 },
  selectLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "right" },
  selectValue: { fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "right" },
  twoCols: { flexDirection: "row-reverse", gap: 10 },
  submitBtn: {
    minHeight: 52,
    borderRadius: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  submitText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
