import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useLogMaintenance,
  useListVehicles,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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

import { ArabicText } from "@/components/ArabicText";
import { ArabicDateField } from "@/components/ArabicDatePicker";
import { useColors } from "@/hooks/useColors";
import { rowDir } from "@/lib/layout";
import { exportPdf } from "@/lib/pdf-export";
import {
  listMaintenanceInvoices,
  pickInvoiceImage,
  pickInvoicePdf,
  saveMaintenanceInvoice,
  type InvoiceDraft,
  type MaintenanceInvoice,
} from "@/lib/maintenance-invoices";
import {
  MAINTENANCE_LOGS_QUERY_KEY,
  SERVICE_TYPES,
  completedLogs,
  costOf,
  doneAtOf,
  doneKmOf,
  fetchMaintenanceLogs,
  formatDate,
  formatKm,
  formatSar,
  isThisMonth,
  logTitle,
  monthHeading,
  serviceIcon,
  serviceLabel,
  vehicleName,
} from "@/lib/maintenance-catalog";

const todayIso = () => new Date().toISOString().split("T")[0];

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
      <ArabicText style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{title}</ArabicText>
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
  selectedValue,
  fallbackIcon = "car-sport-outline",
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Array<{ value: string; label: string; icon?: keyof typeof Ionicons.glyphMap }>;
  selectedValue?: string;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return options;
    return options.filter((option) => option.label.includes(q) || option.value.includes(q));
  }, [options, query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={[styles.sheetHeader, { flexDirection: rowDir }]}>
            <ArabicText fill style={[styles.sheetTitle, { color: colors.foreground }]}>
              {title}
            </ArabicText>
            <Pressable onPress={onClose} hitSlop={10} style={[styles.sheetClose, { backgroundColor: colors.background }]}>
              <Ionicons name="close" size={18} color={colors.foreground} />
            </Pressable>
          </View>
          {options.length > 8 ? (
            <View style={[styles.sheetSearch, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: rowDir }]}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="بحث"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.sheetSearchInput, { color: colors.foreground }]}
              />
              <Ionicons name="search" size={16} color={colors.mutedForeground} />
            </View>
          ) : null}
          <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {filtered.map((option) => {
              const selected = option.value === selectedValue;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      backgroundColor: selected ? `${colors.primary}18` : colors.background,
                      borderColor: selected ? colors.primary : colors.border,
                      opacity: pressed ? 0.82 : 1,
                      flexDirection: rowDir,
                    },
                  ]}
                >
                  <View style={[styles.optionIcon, { backgroundColor: selected ? `${colors.primary}24` : colors.card }]}>
                    <Ionicons
                      name={option.icon ?? fallbackIcon}
                      size={18}
                      color={selected ? colors.primary : colors.foreground}
                    />
                  </View>
                  <ArabicText
                    fill
                    style={[styles.optionText, { color: selected ? colors.primary : colors.foreground }]}
                  >
                    {option.label}
                  </ArabicText>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : (
                    <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
                  )}
                </Pressable>
              );
            })}
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
  suffix,
  ltr,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
  suffix?: string;
  ltr?: boolean;
}) {
  const colors = useColors();

  return (
    <View style={styles.fieldWrap}>
      <ArabicText style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</ArabicText>
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rowDir },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
          multiline={multiline}
          style={[
            styles.input,
            multiline ? styles.textarea : null,
            ltr ? styles.ltrField : null,
            { color: colors.foreground },
          ]}
        />
        {suffix ? (
          <Text style={[styles.fieldSuffix, { color: colors.mutedForeground }]}>{suffix}</Text>
        ) : null}
      </View>
    </View>
  );
}

function ManualMaintenanceModal({
  visible,
  vehicles,
  onClose,
  onCreated,
  initialVehicleId,
  initialServiceType,
  recommendationId,
}: {
  visible: boolean;
  vehicles: any[] | undefined;
  onClose: () => void;
  onCreated?: (id: string) => void;
  initialVehicleId?: string;
  initialServiceType?: string;
  recommendationId?: string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const logMaintenance = useLogMaintenance();

  const [picker, setPicker] = useState<null | "vehicle" | "service">(null);
  const [vehicleId, setVehicleId] = useState(initialVehicleId || "");
  const [serviceType, setServiceType] = useState(initialServiceType || "");
  const [customServiceType, setCustomServiceType] = useState("");
  const [doneAt, setDoneAt] = useState(todayIso());
  const [doneAtKm, setDoneAtKm] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [invoice, setInvoice] = useState<InvoiceDraft | null>(null);

  const vehicleOptions = (vehicles ?? []).map((vehicle) => ({
    value: vehicle.id,
    label: vehicle.nickname || `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
  }));
  const selectedVehicle = vehicleOptions.find((item) => item.value === vehicleId)?.label;
  const selectedService = serviceType === "other" ? customServiceType || "أخرى" : serviceLabel(serviceType);

  useEffect(() => {
    if (!visible) return;
    if (initialVehicleId) setVehicleId(initialVehicleId);
    if (initialServiceType) setServiceType(initialServiceType);
  }, [visible, initialVehicleId, initialServiceType]);

  useEffect(() => {
    if (!vehicleId) return;
    const vehicle = (vehicles ?? []).find((item) => item.id === vehicleId);
    const km = vehicle?.odometerKm;
    if (km != null && !doneAtKm.trim()) setDoneAtKm(String(km));
  }, [vehicleId, vehicles]);

  const reset = () => {
    setVehicleId("");
    setServiceType("");
    setCustomServiceType("");
    setDoneAt(todayIso());
    setDoneAtKm("");
    setCost("");
    setNotes("");
    setInvoice(null);
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

    const payload: Record<string, unknown> = {
      serviceType: serviceType === "other" ? "other" : finalServiceType,
      doneAt,
      doneAtKm: doneAtKm.trim() ? Number(doneAtKm) : 0,
    };
    if (recommendationId) payload.recommendationId = recommendationId;

    if (serviceType === "other") {
      payload.customServiceName = finalServiceType;
    }

    if (cost.trim()) {
      payload.cost = Number(cost);
    }

    if (notes.trim()) {
      payload.notes = notes.trim();
    }

    logMaintenance.mutate(
      {
        vehicleId,
        data: payload as any,
      },
      {
        onSuccess: async (item) => {
          if (invoice && item?.id) {
            await saveMaintenanceInvoice(item.id, invoice);
          }
          queryClient.invalidateQueries({ queryKey: MAINTENANCE_LOGS_QUERY_KEY });
          queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0] || "").includes("recommendations") });
          const createdId = item?.id;
          close();
          if (createdId) onCreated?.(createdId);
        },
        onError: () => {
          Alert.alert("خطأ", "فشل تسجيل الصيانة، حاول مجددًا.");
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView
        style={[modalStyles.root, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[modalStyles.header, { borderBottomColor: colors.border, paddingTop: 12, flexDirection: rowDir }]}>
          <View style={{ flex: 1 }}>
            <ArabicText style={[modalStyles.title, { color: colors.foreground }]}>إضافة صيانة</ArabicText>
            <ArabicText style={[modalStyles.subtitle, { color: colors.mutedForeground }]}>سجل الخدمة بعد إنجازها</ArabicText>
          </View>
          <Pressable onPress={close} style={[modalStyles.closeBtn, { backgroundColor: colors.card }]}>
            <Ionicons name="close" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[modalStyles.body, { paddingBottom: 24 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => setPicker("vehicle")}
            style={[modalStyles.selectBox, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rowDir }]}
          >
            <View style={modalStyles.selectTextWrap}>
              <ArabicText style={[modalStyles.selectLabel, { color: colors.mutedForeground }]}>المركبة</ArabicText>
              <ArabicText style={[modalStyles.selectValue, { color: selectedVehicle ? colors.foreground : colors.mutedForeground }]}>
                {selectedVehicle || "اختر المركبة"}
              </ArabicText>
            </View>
            <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            onPress={() => setPicker("service")}
            style={[modalStyles.selectBox, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rowDir }]}
          >
            <View style={modalStyles.selectTextWrap}>
              <ArabicText style={[modalStyles.selectLabel, { color: colors.mutedForeground }]}>نوع الصيانة</ArabicText>
              <ArabicText style={[modalStyles.selectValue, { color: serviceType ? colors.foreground : colors.mutedForeground }]}>
                {serviceType ? selectedService : "اختر نوع الصيانة"}
              </ArabicText>
            </View>
            <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
          </Pressable>

          {serviceType === "other" ? (
            <Field
              label="اكتب نوع الصيانة"
              value={customServiceType}
              onChangeText={setCustomServiceType}
              placeholder="مثال: تغيير حزام التوجيه"
            />
          ) : null}

          <ArabicDateField label="تاريخ الصيانة" value={doneAt} onChange={setDoneAt} />

          <View style={[modalStyles.twoCols, { flexDirection: rowDir }]}>
            <View style={{ flex: 1 }}>
              <Field label="قراءة العداد" value={doneAtKm} onChangeText={setDoneAtKm} keyboardType="numeric" placeholder="45000" suffix="كم" ltr />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="التكلفة" value={cost} onChangeText={setCost} keyboardType="numeric" placeholder="اختياري" suffix="ر.س" ltr />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <ArabicText style={[styles.fieldLabel, { color: colors.foreground }]}>فاتورة الصيانة</ArabicText>
            <View style={[modalStyles.invoiceBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {invoice ? (
                <View style={[modalStyles.invoicePreview, { flexDirection: rowDir }]}>
                  {invoice.kind === "image" ? (
                    <Image source={{ uri: invoice.uri }} style={modalStyles.invoiceThumb} />
                  ) : (
                    <View style={[modalStyles.pdfBadge, { backgroundColor: colors.background }]}>
                      <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <ArabicText style={[modalStyles.selectValue, { color: colors.foreground }]}>{invoice.name}</ArabicText>
                    <ArabicText style={[modalStyles.selectLabel, { color: colors.mutedForeground }]}>
                      {invoice.kind === "pdf" ? "ملف PDF" : "صورة الفاتورة"}
                    </ArabicText>
                  </View>
                  <Pressable onPress={() => setInvoice(null)} accessibilityRole="button" accessibilityLabel="إزالة الفاتورة">
                    <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ) : (
                <ArabicText style={[modalStyles.selectLabel, { color: colors.mutedForeground }]}>
                  أرفق صورة أو PDF للفاتورة التي تمت عليها الصيانة
                </ArabicText>
              )}
              <View style={[modalStyles.invoiceActions, { flexDirection: rowDir }]}>
                <Pressable
                  onPress={() => void pickInvoiceImage("camera").then((file) => file && setInvoice(file))}
                  style={[modalStyles.invoiceBtn, { borderColor: colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="تصوير الفاتورة"
                >
                  <Ionicons name="camera-outline" size={16} color={colors.foreground} />
                  <Text style={[modalStyles.invoiceBtnText, { color: colors.foreground }]}>كاميرا</Text>
                </Pressable>
                <Pressable
                  onPress={() => void pickInvoiceImage("library").then((file) => file && setInvoice(file))}
                  style={[modalStyles.invoiceBtn, { borderColor: colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="اختيار صورة الفاتورة"
                >
                  <Ionicons name="image-outline" size={16} color={colors.foreground} />
                  <Text style={[modalStyles.invoiceBtnText, { color: colors.foreground }]}>معرض</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void pickInvoicePdf()
                      .then((file) => file && setInvoice(file))
                      .catch(() => {
                        Alert.alert("فاتورة PDF", "تعذر اختيار الملف بدون إغلاق التطبيق.");
                      });
                  }}
                  style={[modalStyles.invoiceBtn, { borderColor: colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="اختيار ملف PDF للفاتورة"
                >
                  <Ionicons name="document-outline" size={16} color={colors.foreground} />
                  <Text style={[modalStyles.invoiceBtnText, { color: colors.foreground }]}>PDF</Text>
                </Pressable>
              </View>
            </View>
          </View>

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
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={modalStyles.submitText}>حفظ الصيانة</Text>
              </>
            )}
          </Pressable>
        </ScrollView>

        <SelectSheet
          visible={picker === "vehicle"}
          title="اختر المركبة"
          options={vehicleOptions}
          selectedValue={vehicleId}
          fallbackIcon="car-sport-outline"
          onSelect={setVehicleId}
          onClose={() => setPicker(null)}
        />
        <SelectSheet
          visible={picker === "service"}
          title="اختر نوع الصيانة"
          options={SERVICE_TYPES}
          selectedValue={serviceType}
          onSelect={setServiceType}
          onClose={() => setPicker(null)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function MaintenanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicleId?: string; serviceType?: string; recommendationId?: string; openLog?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState("all");

  const { data: maintenance, isLoading, refetch } = useQuery({
    queryKey: MAINTENANCE_LOGS_QUERY_KEY,
    queryFn: fetchMaintenanceLogs,
  });
  const { data: vehicles, refetch: refetchVehicles } = useListVehicles();
  const [invoices, setInvoices] = useState<Record<string, MaintenanceInvoice>>({});

  useEffect(() => {
    void listMaintenanceInvoices().then(setInvoices);
  }, [maintenance]);

  useEffect(() => {
    if (params.openLog === "1" || params.serviceType || params.recommendationId) {
      setManualOpen(true);
    }
  }, [params.openLog, params.serviceType, params.recommendationId]);

  const sortedLogs = useMemo(() => completedLogs(maintenance), [maintenance]);
  const visibleLogs = useMemo(
    () =>
      vehicleFilter === "all"
        ? sortedLogs
        : sortedLogs.filter((item: any) => item.vehicleId === vehicleFilter),
    [sortedLogs, vehicleFilter],
  );
  const groupedLogs = useMemo(() => {
    const groups: Array<{ title: string; items: any[] }> = [];
    for (const item of visibleLogs) {
      const title = monthHeading(doneAtOf(item));
      const last = groups[groups.length - 1];
      if (last && last.title === title) last.items.push(item);
      else groups.push({ title, items: [item] });
    }
    return groups;
  }, [visibleLogs]);

  const vehicleFilters = useMemo(() => {
    const ids = Array.from(new Set(sortedLogs.map((item: any) => item.vehicleId).filter(Boolean)));
    return ids.map((id) => ({
      id,
      label: vehicleName(
        sortedLogs.find((item: any) => item.vehicleId === id),
        vehicles,
      ),
    }));
  }, [sortedLogs, vehicles]);

  const logsThisMonth = sortedLogs.filter((item: any) => isThisMonth(doneAtOf(item)));
  const uniqueVehiclesCount = new Set(sortedLogs.map((item: any) => item.vehicleId).filter(Boolean)).size;
  const totalCost = sortedLogs.reduce((sum: number, item: any) => {
    const value = Number(costOf(item) ?? 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  const openLog = (id: string) => {
    router.push({ pathname: "/maintenance-detail", params: { id } });
  };

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
            title: logTitle(item),
            subtitle: vehicleName(item, vehicles),
            badge: "منجزة",
            fields: [
              { label: "تاريخ التنفيذ", value: formatDate(doneAtOf(item)) },
              { label: "العداد وقت التنفيذ", value: formatKm(doneKmOf(item)) },
              { label: "التكلفة", value: formatSar(costOf(item)) },
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
      <View style={[styles.header, { borderBottomColor: colors.border, flexDirection: rowDir }]}>
        <Pressable onPress={goBack} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <ArabicText style={[styles.headerTitle, { color: colors.foreground }]}>الصيانة</ArabicText>
          <ArabicText style={[styles.headerSub, { color: colors.mutedForeground }]}>السجل والتفاصيل لكل عملية</ArabicText>
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
        <View style={[styles.hero, { flexDirection: rowDir }]}>
          <View style={styles.heroText}>
            <ArabicText style={[styles.eyebrow, { color: colors.primary }]}>الصيانة</ArabicText>
            <ArabicText style={[styles.title, { color: colors.foreground }]}>سجل الصيانة</ArabicText>
            <ArabicText style={[styles.subtitle, { color: colors.mutedForeground }]}>
              اضغط أي عملية لفتح تفاصيلها كاملة: التاريخ، العداد، التكلفة، والملاحظات والفاتورة.
            </ArabicText>
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
                color="#F59E0B"
                suffix="ر.س"
              />
            </View>

            <View style={[styles.noteCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}34`, flexDirection: rowDir }]}>
              <View style={[styles.noteIcon, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="bulb-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.noteText}>
                <ArabicText style={[styles.noteTitle, { color: colors.foreground }]}>وين راحت الصيانة القريبة والمتأخرة؟</ArabicText>
                <ArabicText style={[styles.noteBody, { color: colors.mutedForeground }]}>
                  التوصيات القريبة والمتأخرة في صفحة التوصيات. السجل هنا للصيانة الوقائية المنفذة. تسجيل صيانة لا يغلق كود عطل إلا بعد إعادة الفحص التشخيصي.
                </ArabicText>
                <Pressable onPress={() => router.push("/recommendations")} style={[styles.noteLink, { flexDirection: rowDir }]}>
                  <Ionicons name="chevron-back" size={14} color={colors.primary} />
                  <Text style={[styles.noteLinkText, { color: colors.primary }]}>فتح التوصيات</Text>
                </Pressable>
              </View>
            </View>

            {vehicleFilters.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                <Pressable
                  onPress={() => setVehicleFilter("all")}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: vehicleFilter === "all" ? colors.primary : colors.card,
                      borderColor: vehicleFilter === "all" ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: vehicleFilter === "all" ? "#fff" : colors.foreground }]}>الكل</Text>
                </Pressable>
                {vehicleFilters.map((filter) => {
                  const active = vehicleFilter === filter.id;
                  return (
                    <Pressable
                      key={filter.id}
                      onPress={() => setVehicleFilter(filter.id)}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active ? colors.primary : colors.card,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.filterChipText, { color: active ? "#fff" : colors.foreground }]}>{filter.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {sortedLogs.length === 0 ? (
              <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="construct-outline" size={54} color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد سجلات صيانة حتى الآن</Text>
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                  أضف أول صيانة، وبعدها تفتح تفاصيل كل عملية من السجل مباشرة.
                </Text>
                <Pressable onPress={() => setManualOpen(true)} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.emptyBtnText}>إضافة أول صيانة</Text>
                </Pressable>
              </View>
            ) : visibleLogs.length === 0 ? (
              <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد صيانات لهذه المركبة</Text>
                <Pressable onPress={() => setVehicleFilter("all")} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
                  <Text style={styles.emptyBtnText}>عرض كل السجل</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ArabicText style={[styles.sectionHint, { color: colors.mutedForeground }]}>اضغط الكرت لفتح التفاصيل</ArabicText>
                  <ArabicText style={[styles.sectionTitle, { color: colors.foreground }]}>
                    السجل ({visibleLogs.length})
                  </ArabicText>
                </View>

                {groupedLogs.map((group) => (
                  <View key={group.title} style={styles.monthGroup}>
                    <ArabicText style={[styles.monthTitle, { color: colors.mutedForeground }]}>{group.title}</ArabicText>
                    {group.items.map((item: any) => {
                      const invoice = invoices[item.id];
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => openLog(item.id)}
                          style={({ pressed }) => [
                            styles.logCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                              opacity: pressed ? 0.86 : 1,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`تفاصيل ${logTitle(item)}`}
                        >
                          <View style={[styles.logTop, { flexDirection: rowDir }]}>
                            <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
                            <View style={[styles.logIcon, { backgroundColor: `${colors.primary}18` }]}>
                              <Ionicons name={serviceIcon(item.serviceType)} size={20} color={colors.primary} />
                            </View>
                            <View style={styles.logTitleWrap}>
                              <ArabicText style={[styles.logTitle, { color: colors.foreground }]}>{logTitle(item)}</ArabicText>
                              <ArabicText style={[styles.logVehicle, { color: colors.mutedForeground }]}>
                                {vehicleName(item, vehicles)}
                              </ArabicText>
                            </View>
                          </View>
                          <View style={[styles.logMeta, { flexDirection: rowDir }]}>
                            <View style={[styles.metaPill, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: rowDir }]}>
                              <ArabicText style={[styles.metaText, { color: colors.foreground }]}>{formatDate(doneAtOf(item))}</ArabicText>
                              <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
                            </View>
                            <View style={[styles.metaPill, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: rowDir }]}>
                              <ArabicText style={[styles.metaText, { color: colors.foreground }]}>{formatKm(doneKmOf(item))}</ArabicText>
                              <Ionicons name="speedometer-outline" size={13} color={colors.mutedForeground} />
                            </View>
                            <View style={[styles.metaPill, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: rowDir }]}>
                              <ArabicText style={[styles.metaText, { color: colors.foreground }]}>{formatSar(costOf(item))}</ArabicText>
                              <Ionicons name="cash-outline" size={13} color={colors.mutedForeground} />
                            </View>
                            {invoice ? (
                              <View style={[styles.metaPill, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}40`, flexDirection: rowDir }]}>
                                <ArabicText style={[styles.metaText, { color: colors.primary }]}>فاتورة</ArabicText>
                                <Ionicons name="attach-outline" size={13} color={colors.primary} />
                              </View>
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <ManualMaintenanceModal
        visible={manualOpen}
        vehicles={vehicles}
        initialVehicleId={typeof params.vehicleId === "string" ? params.vehicleId : undefined}
        initialServiceType={typeof params.serviceType === "string" ? params.serviceType : undefined}
        recommendationId={typeof params.recommendationId === "string" ? params.recommendationId : undefined}
        onClose={() => setManualOpen(false)}
        onCreated={(id) => openLog(id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
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
  headerText: { flex: 1, direction: "ltr", alignItems: "stretch", gap: 3 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  headerSpacer: { width: 42 },
  exportBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  hero: { alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  heroText: { flex: 1, minWidth: 0, alignItems: "stretch", gap: 4 },
  eyebrow: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "right" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "right" },
  subtitle: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "right" },
  addBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  loadCenter: { paddingVertical: 60, alignItems: "center", justifyContent: "center" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
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
  noteCard: { gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  noteIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  noteText: { flex: 1, minWidth: 0, alignItems: "stretch", gap: 4 },
  noteTitle: { fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "right" },
  noteBody: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", textAlign: "right" },
  noteLink: { flexDirection: "row", alignItems: "center", gap: 2, paddingTop: 2 },
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  emptyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  section: { gap: 12 },
  sectionHeader: { alignItems: "stretch", gap: 2 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
  sectionHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  monthGroup: { gap: 8 },
  monthTitle: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "right", paddingHorizontal: 4 },
  logCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  logTop: { justifyContent: "space-between", alignItems: "center", gap: 10 },
  logIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  logTitleWrap: { flex: 1, minWidth: 0, alignItems: "stretch", gap: 3 },
  logTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
  logVehicle: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "right" },
  logMeta: { flexWrap: "wrap", gap: 6, justifyContent: "flex-end" },
  metaPill: {
    minHeight: 30,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 4,
  },
  metaText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "82%",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  sheetHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 4, backgroundColor: "#666" },
  sheetHeader: { alignItems: "center", justifyContent: "space-between", gap: 10 },
  sheetClose: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sheetSearch: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
  },
  sheetSearchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", paddingVertical: 8 },
  sheetList: { gap: 8, paddingBottom: 8 },
  optionRow: {
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 10,
  },
  optionIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  optionText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  fieldWrap: { gap: 7, flex: 1 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  inputWrap: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
  },
  input: { flex: 1, minHeight: 48, fontSize: 14, fontFamily: "Inter_400Regular" },
  ltrField: { writingDirection: "ltr", textAlign: "left", fontFamily: "Inter_600SemiBold" },
  fieldSuffix: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  textarea: { minHeight: 92, paddingTop: 12, textAlignVertical: "top" },
});

const modalStyles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  body: { padding: 16, gap: 14 },
  selectBox: {
    minHeight: 62,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectTextWrap: { flex: 1, gap: 2 },
  selectLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  selectValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  twoCols: { gap: 10 },
  invoiceBox: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 10 },
  invoicePreview: { alignItems: "center", gap: 10 },
  invoiceThumb: { width: 52, height: 52, borderRadius: 10 },
  pdfBadge: { width: 52, height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  invoiceActions: { gap: 8 },
  invoiceBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
  },
  invoiceBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  submitBtn: {
    minHeight: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  submitText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
