import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  useGetDashboardOverview,
  useGetLiveTelemetry,
  useGetRecentActivity,
  useGetUpcomingMaintenance,
  useListVehicles,
} from "@workspace/api-client-react";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const ACTIVITY_ICONS: Record<string, { name: string; color: string }> = {
  diagnostic_session: { name: "pulse-outline", color: "#3b82f6" },
  dtc_detected: { name: "warning-outline", color: "#ef4444" },
  dtc_cleared: { name: "checkmark-circle-outline", color: "#22c55e" },
  maintenance_done: { name: "construct-outline", color: "#f59e0b" },
  booking_created: { name: "calendar-outline", color: "#FF6A00" },
};

const MAINT_STATUS: Record<string, { label: string; color: string }> = {
  overdue: { label: "متأخرة", color: "#ef4444" },
  upcoming: { label: "قريباً", color: "#f59e0b" },
  scheduled: { label: "مجدولة", color: "#3b82f6" },
};

function healthColor(s: number) {
  if (s >= 80) return "#22c55e";
  if (s >= 60) return "#f59e0b";
  if (s >= 40) return "#fb923c";
  return "#ef4444";
}

function KpiCard({ icon, label, value, sub, valueColor, subColor }: {
  icon: string; label: string; value: string | number;
  sub?: string; valueColor?: string; subColor?: string;
}) {
  const colors = useColors();
  return (
    <View style={[k.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={k.cardHeader}>
        <Ionicons name={icon as any} size={14} color={colors.mutedForeground} />
        <Text style={[k.label, { color: colors.mutedForeground }]} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[k.value, { color: valueColor ?? colors.foreground }]}>{value}</Text>
      {sub ? <Text style={[k.sub, { color: subColor ?? "#ef4444" }]}>{sub}</Text> : null}
    </View>
  );
}

const k = StyleSheet.create({
  card: { flex: 1, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 6, minHeight: 88 },
  cardHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },
  value: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "right" },
  sub: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "right" },
});

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const { data: overview, isLoading: ovLoading, refetch: refetchOv } = useGetDashboardOverview();
  const { data: vehicles, refetch: refetchV } = useListVehicles();
  const { data: activity, refetch: refetchA } = useGetRecentActivity({ limit: 6 });
  const { data: maintenance, refetch: refetchM } = useGetUpcomingMaintenance();

  const activeVehicleId = selectedVehicleId || vehicles?.[0]?.id || "";
  const activeVehicle = vehicles?.find((v) => v.id === activeVehicleId);
  const { data: live } = useGetLiveTelemetry(activeVehicleId, {
    query: { enabled: !!activeVehicleId, refetchInterval: 3000 } as any,
  });

  const overdueCount = useMemo(
    () => maintenance?.filter((m) => m.status === "overdue").length ?? 0,
    [maintenance],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOv(), refetchV(), refetchA(), refetchM()]);
    setRefreshing(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const today = new Date().toLocaleDateString("ar-SA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable style={[styles.notifBtn, { borderColor: colors.border }]}>
            <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
          </Pressable>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) ?? "م"}</Text>
          </View>
        </View>
        <Image source={require("@/assets/images/logo.png")} style={styles.logo} contentFit="contain" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.greetTitle, { color: colors.foreground }]}>
            مرحباً {user?.name?.split(" ")[0] || "بك"}
          </Text>
          <Text style={[styles.greetDate, { color: colors.mutedForeground }]}>{today}</Text>
        </View>

        {/* Overdue alert banner */}
        {overdueCount > 0 && (
          <Pressable
            onPress={() => router.push("/maintenance")}
            style={[styles.alertBanner, { backgroundColor: "#ef444415", borderColor: "#ef444440" }]}
          >
            <Ionicons name="chevron-back" size={16} color="#ef4444" />
            <Text style={[styles.alertText, { color: "#ef4444" }]}>
              {overdueCount} صيانة متأخرة تحتاج اهتمامك
            </Text>
            <Ionicons name="warning" size={16} color="#ef4444" />
          </Pressable>
        )}

        {/* Vehicle Picker (horizontal scroll, web style) */}
        {vehicles && vehicles.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 16 }}
          >
            {vehicles.map((v) => {
              const score = v.healthScore ?? 0;
              const isActive = v.id === activeVehicleId;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => setSelectedVehicleId(v.id)}
                  style={[
                    styles.vPickCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isActive ? colors.primary : colors.border,
                      borderWidth: isActive ? 1.5 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={styles.vPickInfo}>
                    <View style={[styles.vPickIcon, { backgroundColor: colors.secondary }]}>
                      <Ionicons name="car" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.vPickName, { color: colors.foreground }]} numberOfLines={1}>
                        {v.nickname || `${v.make} ${v.model}`}
                      </Text>
                      <Text style={[styles.vPickPlate, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {v.plateNumber || `${v.year}`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.vPickScore}>
                    <Text style={[styles.vPickScoreNum, { color: healthColor(score) }]}>{score}</Text>
                    <Text style={[styles.vPickScoreLabel, { color: colors.mutedForeground }]}>الحالة</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* KPI Grid: 6 cards, 2 per row */}
        {ovLoading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : overview ? (
          <View style={styles.kpiSection}>
            <View style={styles.kpiRow}>
              <KpiCard icon="car-outline" label="المركبات" value={overview.vehicleCount ?? 0} />
              <KpiCard icon="pulse-outline" label="متوسط الحالة"
                value={`${overview.avgHealthScore ?? 0}%`}
                valueColor={healthColor(overview.avgHealthScore ?? 0)} />
            </View>
            <View style={styles.kpiRow}>
              <KpiCard icon="construct-outline" label="الأعطال النشطة"
                value={overview.activeDtcCount ?? 0}
                valueColor={(overview.activeDtcCount ?? 0) > 0 ? "#ef4444" : colors.foreground}
                sub={(overview.criticalDtcCount ?? 0) > 0 ? `${overview.criticalDtcCount} حرجة` : undefined}
              />
              <KpiCard icon="calendar-outline" label="الصيانة القادمة"
                value={overview.upcomingMaintenanceCount ?? 0}
                sub={overdueCount > 0 ? `${overdueCount} متأخرة` : undefined}
              />
            </View>
            <View style={styles.kpiRow}>
              <KpiCard icon="speedometer-outline" label="المسافة (30 يوم)"
                value={`${(overview.kmDrivenLast30d ?? 0).toLocaleString("ar-SA")} كم`} />
              <KpiCard icon="flash-outline" label="التوفير المتوقع"
                value={`${(overview.estimatedSavingsSar ?? 0).toLocaleString("ar-SA")} ر.س`}
                valueColor="#22c55e" />
            </View>
          </View>
        ) : null}

        {/* Live Data Card */}
        {activeVehicle && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {activeVehicle.nickname || `${activeVehicle.make} ${activeVehicle.model}`}
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>البيانات الحية</Text>
            </View>
            <View style={[styles.liveCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {!live?.isConnected ? (
                <View style={styles.liveOffline}>
                  <Ionicons name="car-outline" size={42} color={colors.mutedForeground} style={{ opacity: 0.3 }} />
                  <Text style={[styles.liveOfflineText, { color: colors.mutedForeground }]}>
                    المركبة غير متصلة حالياً
                  </Text>
                  <Pressable
                    onPress={() => router.push("/(tabs)/diagnostics")}
                    style={[styles.liveBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.liveBtnText, { color: colors.foreground }]}>بدء جلسة</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.liveGrid}>
                  {[
                    { v: live.latest.rpm ?? 0, l: "RPM" },
                    { v: live.latest.speedKmh ?? 0, l: "كم/س" },
                    { v: `${live.latest.coolantTemp ?? 0}°`, l: "الحرارة" },
                    { v: `${(live.latest.batteryV ?? 0).toFixed(1)}V`, l: "البطارية" },
                  ].map((it, i) => (
                    <View key={i} style={[styles.liveTile, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.liveTileVal, { color: colors.foreground }]}>{it.v}</Text>
                      <Text style={[styles.liveTileLabel, { color: colors.mutedForeground }]}>{it.l}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Upcoming Maintenance */}
        {maintenance && maintenance.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Pressable onPress={() => router.push("/maintenance")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
              </Pressable>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الصيانة القادمة</Text>
            </View>
            <View style={{ gap: 8 }}>
              {maintenance.slice(0, 4).map((m) => {
                const status = MAINT_STATUS[m.status] ?? MAINT_STATUS.scheduled;
                return (
                  <View key={m.id} style={[styles.maintRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.maintRight}>
                      <View style={[styles.maintBar, { backgroundColor: status.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.maintTitle, { color: colors.foreground }]} numberOfLines={1}>
                          {m.serviceTypeAr || m.serviceType}
                        </Text>
                        <Text style={[styles.maintSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {m.vehicleNickname || m.vehicleMake}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.maintLeft}>
                      <View style={[styles.maintBadge, { backgroundColor: status.color + "20" }]}>
                        <Text style={[styles.maintBadgeText, { color: status.color }]}>{status.label}</Text>
                      </View>
                      <Text style={[styles.maintKm, { color: colors.mutedForeground }]}>
                        {(m.nextDueKm ?? 0).toLocaleString("ar-SA")} كم
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent Activity */}
        {activity && activity.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>النشاط الأخير</Text>
            <View style={{ gap: 8 }}>
              {activity.map((a, i) => {
                const ai = ACTIVITY_ICONS[a.kind] ?? { name: "ellipse-outline", color: colors.mutedForeground };
                return (
                  <Animated.View key={a.id} entering={FadeInDown.delay(i * 40).springify()}>
                    <View style={[styles.actRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.actTime, { color: colors.mutedForeground }]}>
                        {new Date(a.occurredAt).toLocaleDateString("ar-SA", { day: "numeric", month: "short" })}
                      </Text>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.actTitle, { color: colors.foreground }]} numberOfLines={1}>{a.titleAr}</Text>
                        {a.subtitleAr && (
                          <Text style={[styles.actSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                            {a.subtitleAr}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.actIcon, { backgroundColor: ai.color + "20" }]}>
                        <Ionicons name={ai.name as any} size={16} color={ai.color} />
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { height: 34, width: 90 },
  notifBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },

  greeting: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4, gap: 4 },
  greetTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "right" },
  greetDate: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },

  alertBanner: {
    flexDirection: "row-reverse", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, justifyContent: "space-between",
  },
  alertText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },

  vPickCard: {
    width: 240, padding: 12, borderRadius: 14, flexDirection: "row-reverse",
    alignItems: "center", justifyContent: "space-between", gap: 10,
  },
  vPickInfo: { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  vPickIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  vPickName: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  vPickPlate: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  vPickScore: { alignItems: "center", minWidth: 40 },
  vPickScoreNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  vPickScoreLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },

  kpiSection: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  kpiRow: { flexDirection: "row-reverse", gap: 10 },

  section: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  sectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "right" },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, textAlign: "left", marginLeft: 8 },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },

  liveCard: { padding: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  liveOffline: { alignItems: "center", paddingVertical: 24, gap: 10 },
  liveOfflineText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  liveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  liveBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  liveGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  liveTile: { width: "47%", paddingVertical: 18, borderRadius: 12, alignItems: "center", gap: 4 },
  liveTileVal: { fontSize: 26, fontFamily: "Inter_700Bold" },
  liveTileLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  maintRow: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
  },
  maintRight: { flexDirection: "row-reverse", alignItems: "center", gap: 10, flex: 1 },
  maintBar: { width: 4, height: 36, borderRadius: 2 },
  maintTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  maintSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  maintLeft: { alignItems: "flex-start", gap: 4 },
  maintBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  maintBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  maintKm: { fontSize: 10, fontFamily: "Inter_400Regular" },

  actRow: {
    flexDirection: "row-reverse", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
  },
  actIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  actTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  actSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  actTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
