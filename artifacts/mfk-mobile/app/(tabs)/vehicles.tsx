import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useListVehicles } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function healthColor(score: number) {
  return score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
}
function healthLabel(score: number) {
  return score >= 80 ? "صحة ممتازة" : score >= 60 ? "صحة جيدة" : "تحتاج اهتمام";
}

const FUEL_AR: Record<string, string> = {
  gasoline: "بنزين",
  diesel: "ديزل",
  hybrid: "هجين",
  electric: "كهربائي",
};

export default function VehiclesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: vehicles, isLoading, refetch } = useListVehicles();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/add-vehicle" as any)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>إضافة مركبة</Text>
        </Pressable>
        <View style={styles.headerRight}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>مركباتي</Text>
          {vehicles && (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {vehicles.length} مركبة مسجلة في حسابك
            </Text>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !vehicles || vehicles.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="car-outline" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد مركبات</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>أضف مركبتك الأولى للبدء</Text>
          <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/add-vehicle" as any)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>إضافة مركبة</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 100 : 120, gap: 14 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item, index }) => {
            const score = item.healthScore ?? 0;
            const hColor = healthColor(score);
            const hLabel = healthLabel(score);
            return (
              <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {/* Card Top */}
                  <View style={styles.cardTop}>
                    {/* Health score */}
                    <View style={[styles.scoreBox, { backgroundColor: hColor + "18", borderColor: hColor + "40", borderWidth: 1 }]}>
                      <Text style={[styles.scoreNum, { color: hColor }]}>{score}</Text>
                      <Text style={[styles.scoreLabel, { color: hColor }]}>صحة المركبة</Text>
                      <Text style={[styles.scoreSub, { color: hColor }]}>{hLabel}</Text>
                    </View>
                    {/* Vehicle info */}
                    <View style={styles.vehicleInfo}>
                      <View style={styles.vehicleNameRow}>
                        {!item.adapterMac && (
                          <View style={[styles.connBadge, { backgroundColor: colors.muted }]}>
                            <Ionicons name="wifi-outline" size={10} color={colors.mutedForeground} />
                            <Text style={[styles.connText, { color: colors.mutedForeground }]}>غير مرتبط</Text>
                          </View>
                        )}
                        {item.adapterMac && (
                          <View style={[styles.connBadge, { backgroundColor: "#22c55e18" }]}>
                            <Ionicons name="wifi" size={10} color="#22c55e" />
                            <Text style={[styles.connText, { color: "#22c55e" }]}>متصل</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.vehicleName, { color: colors.foreground }]} numberOfLines={1}>
                        {item.nickname || `${item.make} ${item.model}`}
                      </Text>
                      <Text style={[styles.vehicleSub, { color: colors.mutedForeground }]}>
                        {item.make} {item.model} • {item.year}
                        {item.fuelType ? ` • ${FUEL_AR[item.fuelType] ?? item.fuelType}` : ""}
                      </Text>
                      {item.plateNumber && (
                        <View style={[styles.plateBadge, { backgroundColor: colors.secondary }]}>
                          <Text style={[styles.plateText, { color: colors.foreground }]}>{item.plateNumber}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.vehicleIconWrap, { backgroundColor: colors.accent }]}>
                      <Ionicons name="car" size={28} color={colors.mutedForeground} />
                    </View>
                  </View>

                  {/* Stats row */}
                  <View style={[styles.statsRow, { borderColor: colors.border }]}>
                    <View style={styles.stat}>
                      <Ionicons name="warning-outline" size={18} color={colors.mutedForeground} />
                      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>أعطال</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.stat}>
                      <Ionicons name={item.adapterMac ? "checkmark-circle" : "close-circle"} size={18} color={item.adapterMac ? "#22c55e" : colors.mutedForeground} />
                      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>الجهاز</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.stat}>
                      <Text style={[styles.statVal, { color: colors.foreground }]}>
                        {(item.odometerKm ?? 0).toLocaleString("ar-SA")}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>كيلومتر</Text>
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => router.push(`/vehicle/${item.id}`)}
                    >
                      <Ionicons name="document-text-outline" size={15} color={colors.foreground} />
                      <Text style={[styles.actionText, { color: colors.foreground }]}>التفاصيل</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: "#8b5cf618", borderColor: "#8b5cf630" }]}
                      onPress={() => router.push("/maintenance")}
                    >
                      <Ionicons name="build-outline" size={15} color="#8b5cf6" />
                      <Text style={[styles.actionText, { color: "#8b5cf6" }]}>الصيانة</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: "#ef444418", borderColor: "#ef444430" }]}
                      onPress={() => router.push("/dtc")}
                    >
                      <Ionicons name="warning-outline" size={15} color="#ef4444" />
                      <Text style={[styles.actionText, { color: "#ef4444" }]}>الأعطال</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "30" }]}
                      onPress={() => router.push("/(tabs)/diagnostics")}
                    >
                      <Ionicons name="pulse-outline" size={15} color={colors.primary} />
                      <Text style={[styles.actionText, { color: colors.primary }]}>تشخيص</Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            );
          }}
        />
      )}
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
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRight: { alignItems: "flex-end", gap: 2 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  addBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular" },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
  },
  scoreBox: {
    width: 90,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    gap: 2,
  },
  scoreNum: { fontSize: 32, fontFamily: "Inter_700Bold", lineHeight: 36 },
  scoreLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  scoreSub: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  vehicleInfo: { flex: 1, gap: 4, alignItems: "flex-end" },
  vehicleNameRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  connBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  connText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  vehicleName: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "right" },
  vehicleSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  plateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  plateText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  vehicleIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  statsRow: {
    flexDirection: "row-reverse",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "space-around",
  },
  stat: { alignItems: "center", gap: 3 },
  statVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: StyleSheet.hairlineWidth, height: 30 },
  actions: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexWrap: "wrap",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 70,
  },
  actionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
