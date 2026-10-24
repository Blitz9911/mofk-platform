import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetLiveTelemetry, useListVehicles } from "@workspace/api-client-react";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useToast } from "@/components/Toast";
import { useColors } from "@/hooks/useColors";
import { rowDir } from "@/lib/layout";
import { useObdConnection } from "@/src/obd";

type FuelConsumption = {
  distanceKm: number;
  consumptionL100km: number;
  kmPerLiter: number;
};

type FuelLog = {
  id: string;
  vehicleId: string;
  filledAt: string;
  odometerKm: number;
  liters: number;
  pricePerLiterSar: number;
  totalCostSar: number;
  fuelGrade: string;
  stationNameAr?: string;
  notes?: string;
  consumption: FuelConsumption | null;
};

type FuelStats = {
  totalLiters: number;
  totalCostSar: number;
  avgConsumptionL100km: number | null;
  avgKmPerLiter: number | null;
  fillCount: number;
  trendByDay: { date: string; liters: number; costSar: number; fills: number }[];
};

const PERIOD_LABELS: Record<"week" | "month" | "year" | "all", string> = {
  week: "آخر 7 أيام",
  month: "هذا الشهر",
  year: "هذا العام",
  all: "الكل",
};

const GRADE_LABELS: Record<"91" | "95" | "diesel", string> = {
  "91": "91",
  "95": "95",
  diesel: "ديزل",
};

const FUEL_PRICES: Record<"91" | "95" | "diesel", string> = {
  "91": "2.18",
  "95": "2.33",
  diesel: "1.66",
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new Error(data?.error || data?.message || "تعذر الاتصال بالخادم.");
  }

  return data as T;
}

function formatSar(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return "—";
  return `${Number(value).toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س`;
}

function formatLiters(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return "—";
  return `${Number(value).toLocaleString("ar-SA", { maximumFractionDigits: 1 })} لتر`;
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateToApiIso(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  const now = new Date();
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), now.getHours(), now.getMinutes(), now.getSeconds())
    : now;
  return date.toISOString();
}

function formatDate(value: string) {
  try {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return value?.slice(0, 10) ?? "—";
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return value?.slice(0, 10) ?? "—";
  }
}

function calculateLiters(totalCostSar: string, pricePerLiterSar: string) {
  const total = Number(totalCostSar);
  const price = Number(pricePerLiterSar);

  if (!Number.isFinite(total) || !Number.isFinite(price) || total <= 0 || price <= 0) {
    return "";
  }

  return (total / price).toFixed(2);
}

function AddFuelModal({
  visible,
  vehicles,
  defaultVehicleId,
  onClose,
}: {
  visible: boolean;
  vehicles: any[];
  defaultVehicleId: string | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [vehicleId, setVehicleId] = useState(defaultVehicleId || vehicles[0]?.id || "");
  const [odometerKm, setOdometerKm] = useState("");
  const [totalCostSar, setTotalCostSar] = useState("");
  const [liters, setLiters] = useState("");
  const [fuelGrade, setFuelGrade] = useState<"91" | "95" | "diesel">("91");
  const [isFull, setIsFull] = useState(true);
  const [pricePerLiterSar, setPricePerLiterSar] = useState(FUEL_PRICES["91"]);
  const [stationNameAr, setStationNameAr] = useState("");
  const [filledAt, setFilledAt] = useState(localIsoDate);
  const [notes, setNotes] = useState("");

  const reset = () => {
    setVehicleId(defaultVehicleId || vehicles[0]?.id || "");
    setOdometerKm("");
    setTotalCostSar("");
    setLiters("");
    setFuelGrade("91");
    setIsFull(true);
    setPricePerLiterSar(FUEL_PRICES["91"]);
    setStationNameAr("");
    setFilledAt(localIsoDate());
    setNotes("");
  };

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<FuelLog>("/api/fuel", {
        method: "POST",
        body: JSON.stringify({
          vehicleId,
          odometerKm: odometerKm ? Number(odometerKm) : undefined,
          liters: Number(liters),
          pricePerLiterSar: Number(pricePerLiterSar),
          fuelGrade,
          isFull,
          stationNameAr: stationNameAr.trim() || undefined,
          filledAt: localDateToApiIso(filledAt),
          notes: notes.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-logs"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-stats"] });
      showToast("تم حفظ التعبئة");
      reset();
      onClose();
    },
    onError: (error) => {
      Alert.alert("تعذر الحفظ", error instanceof Error ? error.message : "تأكد من البيانات وحاول مجددًا.");
    },
  });

  const updateTotalCost = (value: string) => {
    setTotalCostSar(value);
    setLiters(calculateLiters(value, pricePerLiterSar));
  };

  const updateFuelGrade = (grade: "91" | "95" | "diesel") => {
    const price = FUEL_PRICES[grade];
    setFuelGrade(grade);
    setPricePerLiterSar(price);
    setLiters(calculateLiters(totalCostSar, price));
  };

  const canSubmit =
    Boolean(vehicleId) &&
    Number(odometerKm) > 0 &&
    Number(totalCostSar) > 0 &&
    Number(pricePerLiterSar) > 0 &&
    Number(liters) > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.modalRoot, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>تسجيل تعبئة جديدة</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
          {vehicles.length > 1 ? (
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>المركبة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {vehicles.map((vehicle) => (
                  <Pressable
                    key={vehicle.id}
                    onPress={() => setVehicleId(vehicle.id)}
                    style={[
                      styles.choiceChip,
                      {
                        backgroundColor: vehicleId === vehicle.id ? colors.primary : colors.card,
                        borderColor: vehicleId === vehicle.id ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.choiceText, { color: vehicleId === vehicle.id ? "#fff" : colors.foreground }]}>
                      {vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.twoCols}>
            <ArabicDateField label="تاريخ التعبئة" value={filledAt} onChange={setFilledAt} />
            <Field label="قراءة العداد (مطلوبة)" value={odometerKm} onChangeText={setOdometerKm} placeholder="مثال: 125000" keyboardType="number-pad" />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>نوع التعبئة</Text>
            <View style={styles.gradeRow}>
              {([
                [true, "كاملة"],
                [false, "جزئية"],
              ] as const).map(([value, label]) => (
                <Pressable
                  key={label}
                  onPress={() => setIsFull(value)}
                  style={[
                    styles.gradeChip,
                    {
                      backgroundColor: isFull === value ? colors.primary : colors.card,
                      borderColor: isFull === value ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.gradeText, { color: isFull === value ? "#fff" : colors.foreground }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>تُحسب الصرفية بين تعبئتين كاملتين مع تجميع التعبئات الجزئية بينهما.</Text>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>نوع الوقود</Text>
            <View style={styles.gradeRow}>
              {(["91", "95", "diesel"] as const).map((grade) => (
                <Pressable
                  key={grade}
                  onPress={() => updateFuelGrade(grade)}
                  style={[
                    styles.gradeChip,
                    {
                      backgroundColor: fuelGrade === grade ? colors.primary : colors.card,
                      borderColor: fuelGrade === grade ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.gradeText, { color: fuelGrade === grade ? "#fff" : colors.foreground }]}>
                    {GRADE_LABELS[grade]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.twoCols}>
            <Field label="كم عبيت؟ ر.س" value={totalCostSar} onChangeText={updateTotalCost} placeholder="مثال: 100" keyboardType="decimal-pad" />
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>سعر اللتر</Text>
              <View style={[styles.lockedInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.lockedText, { color: colors.foreground }]}>{pricePerLiterSar} ر.س</Text>
              </View>
            </View>
          </View>

          <View style={[styles.litersPreview, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}32` }]}>
            <Text style={[styles.litersValue, { color: colors.primary }]}>{liters || "0.00"} لتر</Text>
            <Text style={[styles.litersLabel, { color: colors.mutedForeground }]}>الكمية المحسوبة تلقائيًا</Text>
          </View>

          <Field label="اسم المحطة" value={stationNameAr} onChangeText={setStationNameAr} placeholder="اختياري" />
          <Field label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="اختياري" multiline />

          <Pressable
            disabled={!canSubmit || mutation.isPending}
            onPress={() => mutation.mutate()}
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: !canSubmit || mutation.isPending ? 0.55 : 1 },
            ]}
          >
            {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>حفظ التعبئة</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardType?: "default" | "number-pad" | "decimal-pad";
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
          multiline ? styles.textArea : null,
          { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
        ]}
      />
    </View>
  );
}

export default function FuelScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: vehicles = [], isLoading: vehiclesLoading, refetch: refetchVehicles } = useListVehicles();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [period, setPeriod] = useState<"week" | "month" | "year" | "all">("month");
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activeVehicleId = selectedVehicleId ?? vehicles[0]?.id ?? null;
  const activeVehicle = vehicles.find((vehicle) => vehicle.id === activeVehicleId);
  const obd = useObdConnection();
  const storedTelemetry = useGetLiveTelemetry(activeVehicleId ?? "", {
    query: { enabled: Boolean(activeVehicleId) } as never,
  });
  const storedFuelPct =
    storedTelemetry.data?.recent?.length && storedTelemetry.data.latest.fuelLevelPct != null
      ? storedTelemetry.data.latest.fuelLevelPct
      : null;

  useFocusEffect(
    useCallback(() => {
      obd.startLivePolling();
      return () => obd.stopLivePolling();
    }, [obd.startLivePolling, obd.stopLivePolling]),
  );

  const logsQuery = useQuery({
    queryKey: ["fuel-logs", activeVehicleId],
    queryFn: () => apiFetch<{ logs: FuelLog[] }>(`/api/fuel${activeVehicleId ? `?vehicleId=${activeVehicleId}` : ""}`),
    enabled: vehicles.length > 0,
  });

  const statsQuery = useQuery({
    queryKey: ["fuel-stats", activeVehicleId, period],
    queryFn: () => apiFetch<FuelStats>(`/api/fuel/stats?period=${period}${activeVehicleId ? `&vehicleId=${activeVehicleId}` : ""}`),
    enabled: vehicles.length > 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/fuel/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-logs"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-stats"] });
      Alert.alert("تم", "تم حذف السجل.");
    },
    onError: () => Alert.alert("تعذر الحذف", "حاول مرة أخرى."),
  });

  const logs = logsQuery.data?.logs ?? [];
  const stats = statsQuery.data;
  const latestLog = logs[0];
  const visibleLogs = useMemo(() => {
    if (period === "all") return logs;
    const now = new Date();
    return logs.filter((log) => {
      const date = new Date(log.filledAt);
      if (!Number.isFinite(date.getTime())) return false;
      if (period === "week") return now.getTime() - date.getTime() <= 7 * 24 * 60 * 60 * 1000;
      if (period === "month") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      if (period === "year") return date.getFullYear() === now.getFullYear();
      return true;
    });
  }, [logs, period]);
  const isLoading = vehiclesLoading || logsQuery.isLoading || statsQuery.isLoading;

  const chartBars = useMemo(() => {
    const values = stats?.trendByDay ?? [];
    const max = Math.max(...values.map((item) => item.costSar), 1);
    return values.map((item) => ({ ...item, height: Math.max(8, (item.costSar / max) * 92) }));
  }, [stats]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchVehicles(), logsQuery.refetch(), statsQuery.refetch()]);
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
          <ArabicText fill numberOfLines={1} style={[styles.headerTitle, { color: colors.foreground }]}>
            البنزين والصرفية
          </ArabicText>
          <ArabicText fill numberOfLines={1} style={[styles.headerSub, { color: colors.mutedForeground }]}>
            التعبئة والإنفاق والاستهلاك
          </ArabicText>
        </View>
        <Pressable
          onPress={() => setModalVisible(true)}
          style={[styles.headerAdd, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="تسجيل تعبئة جديدة"
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 96 : 126, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {obd.state === "vehicle_connected" || storedFuelPct != null ? (
          <View style={[styles.liveFuelCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rowDir }]}>
            <View style={[styles.statIcon, { backgroundColor: "#22C55E16" }]}>
              <MaterialCommunityIcons name="gas-station-outline" size={22} color="#22C55E" />
            </View>
            <View style={{ flex: 1, alignItems: "stretch" }}>
              <ArabicText style={[styles.statLabel, { color: colors.foreground }]}>
                {obd.state === "vehicle_connected" ? "مستوى الخزان من القطعة" : "آخر مستوى خزان محفوظ"}
              </ArabicText>
              <Text style={[styles.statValue, { color: colors.foreground, writingDirection: "ltr" }]}>
                {obd.state === "vehicle_connected"
                  ? obd.liveValues.fuelLevel?.status === "ok" && obd.liveValues.fuelLevel.value != null
                    ? `${Math.round(Number(obd.liveValues.fuelLevel.value))}%`
                    : obd.liveValues.fuelLevel?.status === "unsupported"
                      ? "السيارة لا ترسل مستوى الوقود"
                      : "جارٍ القراءة"
                  : `${Math.round(Number(storedFuelPct))}%`}
              </Text>
            </View>
          </View>
        ) : null}

        {!vehicles.length && !vehiclesLoading ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="car-outline" size={46} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد مركبة</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              أضف مركبة أولًا عشان تبدأ تتبع البنزين والصرفية.
            </Text>
            <Pressable onPress={() => router.push("/add-vehicle")} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.primaryText}>إضافة مركبة</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {vehicles.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {vehicles.map((vehicle) => (
                  <Pressable
                    key={vehicle.id}
                    onPress={() => setSelectedVehicleId(vehicle.id)}
                    style={[
                      styles.vehicleChip,
                      {
                        backgroundColor: activeVehicleId === vehicle.id ? colors.primary : colors.card,
                        borderColor: activeVehicleId === vehicle.id ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons name="car-outline" size={14} color={activeVehicleId === vehicle.id ? "#fff" : colors.mutedForeground} />
                    <Text style={[styles.vehicleChipText, { color: activeVehicleId === vehicle.id ? "#fff" : colors.foreground }]}>
                      {vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {activeVehicle && vehicles.length === 1 ? (
              <View style={[styles.vehicleCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rowDir }]}>
                <View style={[styles.vehicleIcon, { backgroundColor: `${colors.primary}18` }]}>
                  <Ionicons name="car-sport-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.vehicleText}>
                  <ArabicText style={[styles.vehicleName, { color: colors.foreground }]}>{activeVehicle.nickname || `${activeVehicle.make} ${activeVehicle.model}`}</ArabicText>
                  <ArabicText style={[styles.vehicleMeta, { color: colors.mutedForeground }]}>{activeVehicle.plateNumber || activeVehicle.year}</ArabicText>
                </View>
              </View>
            ) : null}

            <View style={[styles.periodTrack, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {(Object.keys(PERIOD_LABELS) as Array<keyof typeof PERIOD_LABELS>).map((key) => (
                <Pressable
                  key={key}
                  onPress={() => setPeriod(key)}
                  style={[
                    styles.periodChip,
                    { backgroundColor: period === key ? colors.primary : "transparent" },
                  ]}
                >
                  <Text style={[styles.periodText, { color: period === key ? "#fff" : colors.mutedForeground }]}>
                    {PERIOD_LABELS[key]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {period !== "all" && !isLoading && (stats?.fillCount ?? 0) === 0 && logs.length > 0 ? (
              <Pressable
                onPress={() => setPeriod("all")}
                style={[styles.periodHint, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30`, flexDirection: rowDir }]}
              >
                <Ionicons name="chevron-back" size={16} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <ArabicText style={[styles.periodHintTitle, { color: colors.foreground }]}>لا توجد تعبئة في {PERIOD_LABELS[period]}</ArabicText>
                  <ArabicText style={[styles.periodHintBody, { color: colors.mutedForeground }]}>
                    آخر تعبئة {formatDate(latestLog?.filledAt || "")} — اضغط لعرض كل السجلات.
                  </ArabicText>
                </View>
              </Pressable>
            ) : null}

            <View style={[styles.insightBar, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rowDir }]}>
              <View style={styles.insightCell}>
                <ArabicText style={[styles.insightValue, { color: colors.primary }]}>
                  {isLoading ? "…" : stats && (stats.fillCount ?? 0) > 0 ? formatSar(stats.totalCostSar) : "—"}
                </ArabicText>
                <ArabicText style={[styles.insightLabel, { color: colors.mutedForeground }]}>إجمالي الإنفاق</ArabicText>
              </View>
              <View style={[styles.insightDivider, { backgroundColor: colors.border }]} />
              <View style={styles.insightCell}>
                <ArabicText style={[styles.insightValue, { color: colors.foreground }]}>
                  {isLoading ? "…" : stats && (stats.fillCount ?? 0) > 0 ? formatLiters(stats.totalLiters) : "—"}
                </ArabicText>
                <ArabicText style={[styles.insightLabel, { color: colors.mutedForeground }]}>إجمالي اللترات</ArabicText>
              </View>
              <View style={[styles.insightDivider, { backgroundColor: colors.border }]} />
              <View style={styles.insightCell}>
                <ArabicText numberOfLines={1} style={[styles.insightValue, { color: colors.foreground }]}>
                  {isLoading ? "…" : stats?.avgKmPerLiter ? `${stats.avgKmPerLiter}` : "—"}
                </ArabicText>
                <ArabicText style={[styles.insightLabel, { color: colors.mutedForeground }]}>كم لكل لتر</ArabicText>
              </View>
            </View>
            {!isLoading && logs.length > 0 && !stats?.avgKmPerLiter ? (
              <View style={[styles.periodHint, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ArabicText style={[styles.periodHintTitle, { color: colors.foreground }]}>الصرفية لم تُحسب بعد</ArabicText>
                <ArabicText style={[styles.periodHintBody, { color: colors.mutedForeground }]}>
                  تُحسب فقط بين تعبئتين كاملتين إذا زادت قراءة العداد. تعبئتان بنفس العداد لا تُنتجان صرفية.
                </ArabicText>
              </View>
            ) : null}
            {latestLog ? (
              <View style={[styles.odometerStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ArabicText style={[styles.odometerLabel, { color: colors.mutedForeground }]}>آخر قراءة عداد</ArabicText>
                <Text style={[styles.odometerValue, { color: colors.foreground }]}>
                  {latestLog.odometerKm.toLocaleString("ar-SA")} كم
                </Text>
              </View>
            ) : null}

            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHead}>
                <ArabicText style={[styles.cardTitle, { color: colors.foreground }]}>التطور الزمني</ArabicText>
                <ArabicText style={[styles.cardSub, { color: colors.mutedForeground }]}>الإنفاق خلال {PERIOD_LABELS[period]}</ArabicText>
              </View>
              {chartBars.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScrollContent}>
                  <View
                    style={[
                      styles.chartBars,
                      chartBars.length === 1 ? styles.chartBarsSingle : { minWidth: Math.max(280, chartBars.length * 64) },
                    ]}
                  >
                    {chartBars.map((item) => (
                      <View key={item.date} style={[styles.barWrap, chartBars.length === 1 ? styles.singleBarWrap : null]}>
                        <Text numberOfLines={1} style={[styles.barValue, { color: colors.mutedForeground }]}>
                          {Math.round(item.costSar)} ر.س
                        </Text>
                        <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
                          <View style={[styles.barFill, { height: item.height, backgroundColor: colors.primary }]} />
                        </View>
                        <Text numberOfLines={1} style={[styles.barDate, { color: colors.mutedForeground }]}>
                          {item.date.slice(5)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.emptyMini}>
                  <Ionicons name="analytics-outline" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                    {logs.length ? `لا يوجد إنفاق خلال ${PERIOD_LABELS[period]}` : "سجّل تعبئة ليظهر المنحنى هنا"}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.sectionHead}>
              <ArabicText style={[styles.cardTitle, { color: colors.foreground }]}>سجل التعبئات</ArabicText>
              <ArabicText style={[styles.cardSub, { color: colors.mutedForeground }]}>
                {visibleLogs.length ? `${visibleLogs.length} سجل` : "لا يوجد سجلات في الفترة"}
              </ArabicText>
            </View>

            {visibleLogs.length ? (
              visibleLogs.map((log) => (
                <View key={log.id} style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.logAccent, { backgroundColor: colors.primary }]} />
                  <View style={styles.logBody}>
                    <View style={[styles.logTop, { flexDirection: rowDir }]}>
                      <Pressable
                        onPress={() =>
                          Alert.alert("حذف السجل؟", "لا يمكن التراجع عن الحذف.", [
                            { text: "إلغاء", style: "cancel" },
                            { text: "حذف", style: "destructive", onPress: () => deleteMutation.mutate(log.id) },
                          ])
                        }
                        style={styles.deleteBtn}
                        accessibilityRole="button"
                        accessibilityLabel="حذف التعبئة"
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </Pressable>
                      <View style={[styles.gradeBadge, { backgroundColor: `${colors.primary}18` }]}>
                        <ArabicText style={[styles.gradeBadgeText, { color: colors.primary }]}>
                          {GRADE_LABELS[log.fuelGrade as "91" | "95" | "diesel"] || log.fuelGrade}
                        </ArabicText>
                      </View>
                      <View style={styles.logText}>
                        <ArabicText style={[styles.logTitle, { color: colors.foreground }]}>{formatSar(log.totalCostSar)}</ArabicText>
                        <ArabicText style={[styles.logMeta, { color: colors.mutedForeground }]}>
                          {formatDate(log.filledAt)}
                          {log.stationNameAr ? ` • ${log.stationNameAr}` : ""}
                        </ArabicText>
                      </View>
                    </View>
                    <View style={[styles.metrics, { backgroundColor: colors.background, flexDirection: rowDir }]}>
                      <View style={styles.metric}>
                        <ArabicText style={[styles.metricLabel, { color: colors.mutedForeground }]}>الكمية</ArabicText>
                        <ArabicText style={[styles.metricValue, { color: colors.foreground }]}>{formatLiters(log.liters)}</ArabicText>
                      </View>
                      <View style={[styles.metricSplit, { backgroundColor: colors.border }]} />
                      <View style={styles.metric}>
                        <ArabicText style={[styles.metricLabel, { color: colors.mutedForeground }]}>سعر اللتر</ArabicText>
                        <ArabicText style={[styles.metricValue, { color: colors.foreground }]}>{formatSar(log.pricePerLiterSar)}</ArabicText>
                      </View>
                      <View style={[styles.metricSplit, { backgroundColor: colors.border }]} />
                      <View style={styles.metric}>
                        <ArabicText style={[styles.metricLabel, { color: colors.mutedForeground }]}>الصرفية</ArabicText>
                        <ArabicText numberOfLines={2} style={[styles.metricValue, { color: colors.foreground }]}>
                          {log.consumption
                            ? `${log.consumption.consumptionL100km} ل/100كم`
                            : "يلزم عداد أعلى"}
                        </ArabicText>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="gas-station-outline" size={46} color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {logs.length ? `لا توجد تعبئات في ${PERIOD_LABELS[period]}` : "لا توجد تعبئات مسجلة"}
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                  {logs.length ? "غيّر الفترة أو سجّل تعبئة جديدة." : "سجّل أول تعبئة لتبدأ بتتبع صرفية سيارتك."}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <AddFuelModal
        visible={modalVisible}
        vehicles={vehicles}
        defaultVehicleId={activeVehicleId}
        onClose={() => setModalVisible(false)}
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
  headerText: { flex: 1, minWidth: 0, alignItems: "stretch", gap: 3 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  headerAdd: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  liveFuelCard: {
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  vehicleChip: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  vehicleChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  vehicleCard: { alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  vehicleIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  vehicleText: { flex: 1, minWidth: 0, alignItems: "stretch", gap: 2 },
  vehicleName: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
  vehicleMeta: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  periodTrack: {
    flexDirection: "row-reverse",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  periodChip: { flex: 1, minHeight: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  periodText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  periodHint: {
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  periodHintTitle: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
  periodHintBody: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
  insightBar: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  insightCell: { flex: 1, minWidth: 0, alignItems: "center", gap: 5, paddingHorizontal: 3 },
  insightValue: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center", includeFontPadding: false },
  insightLabel: { fontSize: 10, lineHeight: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  insightDivider: { width: StyleSheet.hairlineWidth, height: 42 },
  odometerStrip: {
    alignItems: "stretch",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  odometerLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "right" },
  odometerValue: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right", writingDirection: "ltr" },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "right" },
  chartCard: { padding: 16, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, gap: 14 },
  sectionHead: { alignItems: "stretch", gap: 4 },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "right" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  chartScrollContent: { flexGrow: 1, justifyContent: "center" },
  chartBars: { minHeight: 150, flexDirection: "row-reverse", alignItems: "flex-end", justifyContent: "space-between", gap: 10, paddingHorizontal: 4 },
  chartBarsSingle: { minWidth: "100%", justifyContent: "center", paddingTop: 8 },
  barWrap: { flex: 1, minWidth: 52, alignItems: "center", gap: 6 },
  singleBarWrap: { flex: 0, width: 72 },
  barTrack: { width: 28, height: 104, borderRadius: 999, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", borderRadius: 999 },
  barValue: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  barDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyMini: { minHeight: 88, alignItems: "center", justifyContent: "center", gap: 8 },
  logCard: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", flexDirection: "row" },
  logAccent: { width: 4 },
  logBody: { flex: 1, padding: 14, gap: 12 },
  logTop: { alignItems: "center", justifyContent: "space-between", gap: 10 },
  logText: { flex: 1, minWidth: 0, alignItems: "stretch", gap: 3 },
  logTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
  logMeta: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  gradeBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  metrics: { borderRadius: 14, paddingVertical: 10, paddingHorizontal: 6, alignItems: "stretch" },
  metric: { flex: 1, alignItems: "center", gap: 3, minWidth: 0 },
  metricLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  metricValue: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "center" },
  metricSplit: { width: StyleSheet.hairlineWidth, marginVertical: 2 },
  deleteBtn: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  emptyCard: { alignItems: "center", gap: 10, padding: 28, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  primaryBtn: { minHeight: 50, borderRadius: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  primaryText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  fieldWrap: { gap: 8, flex: 1 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right", writingDirection: "rtl" },
  input: { minHeight: 50, borderRadius: 13, borderWidth: 1, paddingHorizontal: 14, paddingStart: 14, fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "right", writingDirection: "rtl" },
  textArea: { minHeight: 90, paddingTop: 12, textAlignVertical: "top" },
  twoCols: { flexDirection: "row-reverse", gap: 10 },
  gradeRow: { flexDirection: "row-reverse", gap: 8 },
  fieldHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 18 },
  gradeChip: { flex: 1, minHeight: 44, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  gradeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  choiceChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  choiceText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  lockedInput: { minHeight: 50, borderRadius: 13, borderWidth: 1, paddingHorizontal: 14, justifyContent: "center", alignItems: "flex-end" },
  lockedText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  litersPreview: { minHeight: 64, borderRadius: 14, borderWidth: 1, alignItems: "flex-end", justifyContent: "center", paddingHorizontal: 14, gap: 3 },
  litersValue: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "right" },
  litersLabel: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
});
