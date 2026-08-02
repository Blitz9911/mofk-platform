import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useListVehicles } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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

import { useColors } from "@/hooks/useColors";

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

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
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

function StatCard({
  icon,
  materialIcon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  materialIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  sub?: string;
  color: string;
  loading?: boolean;
}) {
  const colors = useColors();

  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        {materialIcon ? (
          <MaterialCommunityIcons name={materialIcon} size={21} color={color} />
        ) : (
          <Ionicons name={icon} size={20} color={color} />
        )}
      </View>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
          {sub ? <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
        </>
      )}
    </View>
  );
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

  const [vehicleId, setVehicleId] = useState(defaultVehicleId || vehicles[0]?.id || "");
  const [odometerKm, setOdometerKm] = useState("");
  const [totalCostSar, setTotalCostSar] = useState("");
  const [liters, setLiters] = useState("");
  const [fuelGrade, setFuelGrade] = useState<"91" | "95" | "diesel">("91");
  const [pricePerLiterSar, setPricePerLiterSar] = useState(FUEL_PRICES["91"]);
  const [stationNameAr, setStationNameAr] = useState("");
  const [filledAt, setFilledAt] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");

  const reset = () => {
    setVehicleId(defaultVehicleId || vehicles[0]?.id || "");
    setOdometerKm("");
    setTotalCostSar("");
    setLiters("");
    setFuelGrade("91");
    setPricePerLiterSar(FUEL_PRICES["91"]);
    setStationNameAr("");
    setFilledAt(new Date().toISOString().slice(0, 16));
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
          stationNameAr: stationNameAr.trim() || undefined,
          filledAt: new Date(filledAt).toISOString(),
          notes: notes.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-logs"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-stats"] });
      Alert.alert("تم", "تم تسجيل التعبئة بنجاح.");
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
            <Field label="تاريخ التعبئة" value={filledAt} onChangeText={setFilledAt} placeholder="YYYY-MM-DDTHH:mm" />
            <Field label="قراءة العداد" value={odometerKm} onChangeText={setOdometerKm} placeholder="اختياري" keyboardType="number-pad" />
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
  const isLoading = vehiclesLoading || logsQuery.isLoading || statsQuery.isLoading;

  const chartBars = useMemo(() => {
    const values = stats?.trendByDay?.slice(-7) ?? [];
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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>البنزين والصرفية</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>تعبئات الوقود واستهلاك البنزين</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 96 : 126, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroText}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>البنزين والصرفية</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>تتبع تعبئات الوقود</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              سجل التعبئات، راقب الإنفاق، واحسب صرفية المركبة بنفس طريقة الويب.
            </Text>
          </View>
          <Pressable
            onPress={() => setModalVisible(true)}
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 }]}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>تعبئة</Text>
          </Pressable>
        </View>

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

            {activeVehicle ? (
              <View style={[styles.vehicleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.vehicleIcon, { backgroundColor: `${colors.primary}18` }]}>
                  <Ionicons name="car-sport-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.vehicleText}>
                  <Text style={[styles.vehicleName, { color: colors.foreground }]}>{activeVehicle.nickname || `${activeVehicle.make} ${activeVehicle.model}`}</Text>
                  <Text style={[styles.vehicleMeta, { color: colors.mutedForeground }]}>{activeVehicle.plateNumber || activeVehicle.year}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.periodRow}>
              {(Object.keys(PERIOD_LABELS) as Array<keyof typeof PERIOD_LABELS>).map((key) => (
                <Pressable
                  key={key}
                  onPress={() => setPeriod(key)}
                  style={[
                    styles.periodChip,
                    {
                      backgroundColor: period === key ? colors.primary : colors.card,
                      borderColor: period === key ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.periodText, { color: period === key ? "#fff" : colors.foreground }]}>
                    {PERIOD_LABELS[key]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.statsGrid}>
              <StatCard icon="water-outline" materialIcon="gas-station-outline" label="إجمالي اللترات" value={stats ? formatLiters(stats.totalLiters) : "—"} sub={`${stats?.fillCount ?? 0} تعبئة`} loading={isLoading} color="#22c55e" />
              <StatCard icon="wallet-outline" label="إجمالي الإنفاق" value={stats ? formatSar(stats.totalCostSar) : "—"} sub={PERIOD_LABELS[period]} loading={isLoading} color="#f97316" />
              <StatCard icon="speedometer-outline" label="متوسط الصرفية" value={stats?.avgConsumptionL100km ? `${stats.avgConsumptionL100km} L/100` : "—"} sub={stats?.avgKmPerLiter ? `${stats.avgKmPerLiter} كم/لتر` : undefined} loading={isLoading} color={colors.primary} />
              <StatCard icon="car-outline" label="آخر قراءة عداد" value={latestLog ? `${latestLog.odometerKm.toLocaleString("ar-SA")} كم` : "—"} sub={activeVehicle ? activeVehicle.nickname || `${activeVehicle.make} ${activeVehicle.model}` : undefined} loading={isLoading} color="#22c55e" />
            </View>

            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>التطور الزمني</Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>آخر أيام فيها تعبئة</Text>
              </View>
              {chartBars.length ? (
                <View style={styles.chartBars}>
                  {chartBars.map((item) => (
                    <View key={item.date} style={styles.barWrap}>
                      <Text style={[styles.barValue, { color: colors.mutedForeground }]}>{Math.round(item.costSar)}</Text>
                      <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
                        <View style={[styles.barFill, { height: item.height, backgroundColor: colors.primary }]} />
                      </View>
                      <Text style={[styles.barDate, { color: colors.mutedForeground }]}>{item.date.slice(5)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyMini}>
                  <Ionicons name="analytics-outline" size={34} color={colors.mutedForeground} />
                  <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>لا توجد بيانات في هذه الفترة</Text>
                </View>
              )}
            </View>

            <View style={styles.cardHeader}>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{logs.length ? `${logs.length} سجل` : "لا يوجد سجلات"}</Text>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>سجل التعبئات</Text>
            </View>

            {logs.length ? (
              logs.map((log) => (
                <View key={log.id} style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.logDateBox}>
                    <Text style={[styles.logDate, { color: colors.foreground }]}>{formatDate(log.filledAt)}</Text>
                    <Text style={[styles.logGrade, { color: colors.primary }]}>{GRADE_LABELS[log.fuelGrade as "91" | "95" | "diesel"] || log.fuelGrade}</Text>
                  </View>
                  <View style={styles.logText}>
                    <Text style={[styles.logTitle, { color: colors.foreground }]}>{formatSar(log.totalCostSar)}</Text>
                    <Text style={[styles.logMeta, { color: colors.mutedForeground }]}>
                      {formatLiters(log.liters)} × {formatSar(log.pricePerLiterSar)} / لتر
                    </Text>
                    {log.consumption ? (
                      <Text style={[styles.logMeta, { color: colors.mutedForeground }]}>
                        {log.consumption.consumptionL100km} L/100 • {log.consumption.distanceKm} كم
                      </Text>
                    ) : (
                      <Text style={[styles.logMeta, { color: colors.mutedForeground }]}>أول تعبئة للحساب</Text>
                    )}
                    {log.stationNameAr ? <Text style={[styles.logMeta, { color: colors.mutedForeground }]}>{log.stationNameAr}</Text> : null}
                  </View>
                  <Pressable
                    onPress={() =>
                      Alert.alert("حذف السجل؟", "لا يمكن التراجع عن الحذف.", [
                        { text: "إلغاء", style: "cancel" },
                        { text: "حذف", style: "destructive", onPress: () => deleteMutation.mutate(log.id) },
                      ])
                    }
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={17} color="#ef4444" />
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="gas-station-outline" size={46} color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد تعبئات مسجلة</Text>
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>سجل أول تعبئة لتبدأ بتتبع صرفية سيارتك.</Text>
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
  hero: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  heroText: { flex: 1, alignItems: "flex-end", gap: 4 },
  eyebrow: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "right" },
  title: { fontSize: 27, fontFamily: "Inter_700Bold", textAlign: "right" },
  subtitle: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "right" },
  addBtn: { minHeight: 42, paddingHorizontal: 14, borderRadius: 12, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 5 },
  addBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  iconBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  vehicleChip: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  vehicleChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  vehicleCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  vehicleIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  vehicleText: { flex: 1, alignItems: "flex-end", gap: 3 },
  vehicleName: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
  vehicleMeta: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  periodRow: { flexDirection: "row-reverse", gap: 8 },
  periodChip: { flex: 1, minHeight: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  periodText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  statsGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  statCard: { width: "48%", minHeight: 132, padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: "flex-end", gap: 5 },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "right" },
  statSub: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "right" },
  chartCard: { padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 14 },
  cardHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "right" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  chartBars: { minHeight: 132, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 },
  barWrap: { flex: 1, alignItems: "center", gap: 5 },
  barTrack: { width: "100%", height: 96, borderRadius: 999, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", borderRadius: 999 },
  barValue: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  barDate: { fontSize: 9, fontFamily: "Inter_400Regular" },
  emptyMini: { minHeight: 132, alignItems: "center", justifyContent: "center", gap: 8 },
  logCard: { flexDirection: "row-reverse", alignItems: "center", gap: 10, padding: 13, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth },
  logDateBox: { width: 74, alignItems: "center", gap: 4 },
  logDate: { fontSize: 11, fontFamily: "Inter_700Bold", textAlign: "center" },
  logGrade: { fontSize: 12, fontFamily: "Inter_700Bold" },
  logText: { flex: 1, alignItems: "flex-end", gap: 3 },
  logTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
  logMeta: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  deleteBtn: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  emptyCard: { alignItems: "center", gap: 10, padding: 28, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  primaryBtn: { minHeight: 50, borderRadius: 15, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 8, paddingHorizontal: 16 },
  primaryText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  fieldWrap: { gap: 8, flex: 1 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
  input: { minHeight: 50, borderRadius: 13, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 90, paddingTop: 12, textAlignVertical: "top" },
  twoCols: { flexDirection: "row-reverse", gap: 10 },
  gradeRow: { flexDirection: "row-reverse", gap: 8 },
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
