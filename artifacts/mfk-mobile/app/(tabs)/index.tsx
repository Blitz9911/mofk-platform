import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useGetDashboardOverview,
  useGetRecentActivity,
  useListVehicles,
  useGetHealthTrend,
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
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function StatCard({ label, value, sub, color, icon }: { label: string; value: string | number; sub?: string; color?: string; icon: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon as any} size={18} color={color ?? colors.primary} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      {sub && <Text style={[styles.statSub, { color: color ?? colors.primary }]}>{sub}</Text>}
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function HealthBar({ score }: { score: number }) {
  const colors = useColors();
  const color = score >= 80 ? colors.success : score >= 60 ? colors.warning : "#ef4444";
  return (
    <View style={[styles.healthBar, { backgroundColor: colors.accent }]}>
      <View style={[styles.healthFill, { width: `${score}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const ACTIVITY_ICONS: Record<string, string> = {
  session: "play-circle-outline",
  dtc: "warning-outline",
  maintenance: "construct-outline",
  booking: "calendar-outline",
};

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: overview, isLoading: ovLoading, refetch: refetchOv } = useGetDashboardOverview();
  const { data: vehicles, refetch: refetchV } = useListVehicles();
  const { data: activity, refetch: refetchA } = useGetRecentActivity({ limit: 8 });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOv(), refetchV(), refetchA()]);
    setRefreshing(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable style={[styles.notifBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>أهلاً،</Text>
          <Text style={[styles.userName, { color: colors.foreground }]}>عبدالله</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {ovLoading ? (
          <View style={styles.loadCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : overview && (
          <>
            <Animated.View entering={FadeInDown.springify()} style={[styles.heroCard, { backgroundColor: colors.primary }]}>
              <Text style={styles.heroLabel}>متوسط صحة المركبات</Text>
              <Text style={styles.heroValue}>{overview.avgHealthScore}%</Text>
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>{overview.vehicleCount}</Text>
                  <Text style={styles.heroStatLabel}>مركبات</Text>
                </View>
                <View style={[styles.heroDivider]} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>{overview.activeDtcCount}</Text>
                  <Text style={styles.heroStatLabel}>أعطال نشطة</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>{overview.upcomingMaintenanceCount}</Text>
                  <Text style={styles.heroStatLabel}>صيانة قادمة</Text>
                </View>
              </View>
            </Animated.View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }} style={styles.statsRow}>
              <StatCard label="كم مقطوعة (30 يوم)" value={(overview.kmDrivenLast30d ?? 0).toLocaleString("ar-SA")} icon="speedometer-outline" />
              <StatCard label="توفير متوقع" value={`${(overview.estimatedSavingsSar ?? 0).toLocaleString("ar-SA")} ر.س`} icon="wallet-outline" color="#22c55e" />
              <StatCard label="حجوزات قادمة" value={overview.upcomingBookingCount ?? 0} icon="calendar-outline" />
              {overview.criticalDtcCount > 0 && (
                <StatCard label="أعطال حرجة" value={overview.criticalDtcCount} icon="warning-outline" color="#ef4444" />
              )}
            </ScrollView>
          </>
        )}

        {vehicles && vehicles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Pressable onPress={() => router.push("/(tabs)/vehicles")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
              </Pressable>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>مركباتي</Text>
            </View>
            {vehicles.map((v, i) => (
              <Animated.View key={v.id} entering={FadeInRight.delay(i * 80).springify()}>
                <Pressable
                  style={({ pressed }) => [styles.vehicleRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => router.push(`/vehicle/${v.id}`)}
                >
                  <View style={styles.vehicleRowLeft}>
                    <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
                  </View>
                  <View style={styles.vehicleRowInfo}>
                    <Text style={[styles.vehicleRowName, { color: colors.foreground }]}>{v.nickname || `${v.make} ${v.model}`}</Text>
                    <HealthBar score={v.healthScore ?? 0} />
                  </View>
                  <View style={[styles.vehicleScoreBadge, { backgroundColor: v.healthScore >= 80 ? colors.success + "22" : v.healthScore >= 60 ? colors.warning + "22" : "#ef444422" }]}>
                    <Text style={[styles.vehicleScore, { color: v.healthScore >= 80 ? colors.success : v.healthScore >= 60 ? colors.warning : "#ef4444" }]}>{v.healthScore}%</Text>
                  </View>
                  <Text style={[styles.vehicleRowName, { color: colors.foreground, textAlign: "right" }]}>{v.nickname || `${v.make} ${v.model}`}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}

        {activity && activity.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: "right" }]}>آخر النشاطات</Text>
            {activity.map((a, i) => (
              <Animated.View key={a.id} entering={FadeInDown.delay(i * 60).springify()}>
                <View style={[styles.activityItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.activityMeta}>
                    <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>
                      {new Date(a.timestamp).toLocaleDateString("ar-SA")}
                    </Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityTitle, { color: colors.foreground }]}>{a.titleAr}</Text>
                    {a.descriptionAr && (
                      <Text style={[styles.activityDesc, { color: colors.mutedForeground }]}>{a.descriptionAr}</Text>
                    )}
                  </View>
                  <View style={[styles.activityIcon, { backgroundColor: colors.primary + "22" }]}>
                    <Ionicons name={ACTIVITY_ICONS[a.type] as any ?? "ellipse-outline"} size={18} color={colors.primary} />
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRight: { alignItems: "flex-end" },
  headerLeft: {},
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  notifBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  loadCenter: { paddingVertical: 60, alignItems: "center" },
  heroCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    gap: 8,
  },
  heroLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  heroValue: { color: "#fff", fontSize: 48, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  heroStats: { flexDirection: "row-reverse", marginTop: 4 },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatVal: { color: "#fff", fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold" },
  heroStatLabel: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Inter_400Regular" },
  heroDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.25)", marginVertical: 4 },
  statsRow: { maxHeight: 110 },
  statCard: {
    width: 150,
    padding: 14,
    borderRadius: 14,
    alignItems: "flex-end",
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statValue: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statSub: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  sectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  vehicleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  vehicleRowLeft: {},
  vehicleRowInfo: { flex: 1, gap: 6 },
  vehicleRowName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  vehicleScoreBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  vehicleScore: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  healthBar: { height: 4, borderRadius: 2, overflow: "hidden", width: "100%" },
  healthFill: { height: "100%", borderRadius: 2 },
  activityItem: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  activityIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  activityContent: { flex: 1, gap: 3 },
  activityTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right" },
  activityDesc: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  activityMeta: {},
  activityTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
