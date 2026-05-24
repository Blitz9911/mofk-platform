import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  useGetDashboardOverview,
  useGetRecentActivity,
  useGetUpcomingMaintenance,
  useListVehicles,
} from "@workspace/api-client-react";
import React, { useState } from "react";
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

const ACTIVITY_ICONS: Record<string, string> = {
  diagnostic_session: "play-circle-outline",
  dtc_detected: "warning-outline",
  dtc_cleared: "checkmark-circle-outline",
  maintenance_done: "construct-outline",
  booking_created: "calendar-outline",
};

function HealthScore({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "ممتازة" : score >= 60 ? "جيدة" : "تحتاج اهتمام";
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color }}>{score}</Text>
      <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color }}>{label}</Text>
    </View>
  );
}

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: string; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colors = useColors();
  const c = color ?? colors.primary;
  return (
    <View style={[statStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: c + "18" }]}>
        <Ionicons name={icon as any} size={18} color={c} />
      </View>
      <Text style={[statStyles.value, { color: colors.foreground }]}>{value}</Text>
      {sub ? <Text style={[statStyles.sub, { color: c }]}>{sub}</Text> : null}
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    minWidth: 100,
  },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  value: { fontSize: 22, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 11, fontFamily: "Inter_500Medium" },
  label: { fontSize: 11, fontFamily: "Inter_400Regular" },
});

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: overview, isLoading: ovLoading, refetch: refetchOv } = useGetDashboardOverview();
  const { data: vehicles, refetch: refetchV } = useListVehicles();
  const { data: activity, refetch: refetchA } = useGetRecentActivity({ limit: 6 });
  const { data: maintenance, refetch: refetchM } = useGetUpcomingMaintenance();

  const overdueCount = maintenance?.filter((m) => m.status === "overdue").length ?? 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOv(), refetchV(), refetchA(), refetchM()]);
    setRefreshing(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const today = new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

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
            مرحباً بك{user?.name ? `، ${user.name.split(" ")[0]}` : ""}
          </Text>
          <Text style={[styles.greetDate, { color: colors.mutedForeground }]}>{today}</Text>
        </View>

        {/* Overdue alert banner */}
        {overdueCount > 0 && (
          <Pressable onPress={() => router.push("/maintenance")} style={[styles.alertBanner, { backgroundColor: "#ef444415", borderColor: "#ef444440" }]}>
            <Text style={[styles.alertText, { color: "#ef4444" }]}>
              ⚠️ {overdueCount} صيانة متأخرة تحتاج اهتمامك
            </Text>
            <Ionicons name="chevron-back" size={16} color="#ef4444" />
          </Pressable>
        )}

        {/* Vehicle health cards */}
        {vehicles && vehicles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Pressable onPress={() => router.push("/(tabs)/vehicles")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
              </Pressable>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>مركباتي</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
              {vehicles.map((v, i) => {
                const score = v.healthScore ?? 0;
                const hColor = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
                const hLabel = score >= 80 ? "ممتازة" : score >= 60 ? "جيدة" : "تحتاج اهتمام";
                return (
                  <Animated.View key={v.id} entering={FadeInDown.delay(i * 60).springify()}>
                    <Pressable
                      style={[styles.vehicleCard, { backgroundColor: colors.card, borderColor: colors.border, borderTopColor: hColor, borderTopWidth: 3 }]}
                      onPress={() => router.push(`/vehicle/${v.id}`)}
                    >
                      <View style={styles.vehicleCardTop}>
                        <View style={[styles.vehicleScoreWrap, { backgroundColor: hColor + "18" }]}>
                          <Text style={[styles.vehicleScore, { color: hColor }]}>{score}</Text>
                          <Text style={[styles.vehicleScoreLabel, { color: hColor }]}>{hLabel}</Text>
                        </View>
                        <Ionicons name="car" size={32} color={colors.mutedForeground} style={{ marginBottom: 6 }} />
                      </View>
                      <Text style={[styles.vehicleName, { color: colors.foreground }]} numberOfLines={1}>
                        {v.nickname || `${v.make} ${v.model}`}
                      </Text>
                      <Text style={[styles.vehicleSub, { color: colors.mutedForeground }]}>{v.year} • {v.make}</Text>
                      <View style={[styles.connBadge, { backgroundColor: v.adapterMac ? "#22c55e18" : colors.muted }]}>
                        <View style={[styles.connDot, { backgroundColor: v.adapterMac ? "#22c55e" : colors.mutedForeground }]} />
                        <Text style={[styles.connText, { color: v.adapterMac ? "#22c55e" : colors.mutedForeground }]}>
                          {v.adapterMac ? "متصل" : "غير مرتبط"}
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Stats grid */}
        {ovLoading ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : overview ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 4 }]}>نظرة عامة</Text>
            <View style={styles.statsGrid}>
              <StatCard icon="car-outline" label="المركبات" value={overview.vehicleCount ?? 0} />
              <StatCard icon="warning-outline" label="الأعطال النشطة" value={overview.activeDtcCount ?? 0}
                color={(overview.activeDtcCount ?? 0) > 0 ? "#ef4444" : "#22c55e"}
                sub={(overview.criticalDtcCount ?? 0) > 0 ? `${overview.criticalDtcCount} حرجة` : undefined}
              />
              <StatCard icon="build-outline" label="صيانة قادمة" value={overview.upcomingMaintenanceCount ?? 0}
                color={(overdueCount) > 0 ? "#ef4444" : colors.primary}
                sub={overdueCount > 0 ? `${overdueCount} متأخرة` : undefined}
              />
            </View>
            <View style={styles.statsGrid}>
              <StatCard icon="speedometer-outline" label="كم (30 يوم)" value={(overview.kmDrivenLast30d ?? 0).toLocaleString("ar-SA")} />
              <StatCard icon="wallet-outline" label="توفير متوقع" value={`${(overview.estimatedSavingsSar ?? 0).toLocaleString("ar-SA")}`} sub="ر.س" color="#22c55e" />
              <StatCard icon="pulse-outline" label="متوسط الصحة" value={`${overview.avgHealthScore ?? 0}%`}
                color={(overview.avgHealthScore ?? 0) >= 80 ? "#22c55e" : (overview.avgHealthScore ?? 0) >= 60 ? "#f59e0b" : "#ef4444"}
              />
            </View>
          </View>
        ) : null}

        {/* Recent activity */}
        {activity && activity.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>آخر النشاطات</Text>
            {activity.map((a, i) => (
              <Animated.View key={a.id} entering={FadeInDown.delay(i * 50).springify()}>
                <View style={[styles.activityRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>
                    {new Date(a.occurredAt).toLocaleDateString("ar-SA")}
                  </Text>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityTitle, { color: colors.foreground }]}>{a.titleAr}</Text>
                    {a.subtitleAr && (
                      <Text style={[styles.activitySub, { color: colors.mutedForeground }]}>{a.subtitleAr}</Text>
                    )}
                  </View>
                  <View style={[styles.activityIconWrap, { backgroundColor: colors.primary + "18" }]}>
                    <Ionicons name={(ACTIVITY_ICONS[a.kind] ?? "ellipse-outline") as any} size={18} color={colors.primary} />
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Quick actions */}
        <View style={[styles.section, { paddingBottom: 8 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الوصول السريع</Text>
          <View style={styles.quickGrid}>
            {[
              { icon: "pulse-outline", label: "التشخيص", route: "/(tabs)/diagnostics" },
              { icon: "warning-outline", label: "سجل الأعطال", route: "/dtc" },
              { icon: "build-outline", label: "الصيانة", route: "/maintenance" },
              { icon: "construct-outline", label: "الورش", route: "/(tabs)/workshops" },
              { icon: "chatbubble-ellipses-outline", label: "المساعد الذكي", route: "/assistant" },
              { icon: "bulb-outline", label: "التوصيات", route: "/recommendations" },
            ].map((item) => (
              <Pressable
                key={item.label}
                style={({ pressed }) => [styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: colors.primary + "18" }]}>
                  <Ionicons name={item.icon as any} size={22} color={colors.primary} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.foreground }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { height: 34, width: 90 },
  notifBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  greeting: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 4 },
  greetTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "right" },
  greetDate: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  alertBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  sectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "right" },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  vehicleCard: {
    width: 160,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  vehicleCardTop: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between" },
  vehicleScoreWrap: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignItems: "center" },
  vehicleScore: { fontSize: 22, fontFamily: "Inter_700Bold" },
  vehicleScoreLabel: { fontSize: 9, fontFamily: "Inter_500Medium" },
  vehicleName: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  vehicleSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  connBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-end" },
  connDot: { width: 6, height: 6, borderRadius: 3 },
  connText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  statsGrid: { flexDirection: "row-reverse", gap: 10 },
  activityRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  activityIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  activityContent: { flex: 1, gap: 2 },
  activityTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  activitySub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  activityTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  quickGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  quickCard: {
    width: "30.5%",
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 10,
  },
  quickIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
});
