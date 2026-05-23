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

function HealthRing({ score }: { score: number }) {
  const colors = useColors();
  const color =
    score >= 80 ? colors.success : score >= 60 ? colors.warning : "#ef4444";
  return (
    <View style={[styles.ringOuter, { borderColor: color }]}>
      <Text style={[styles.ringScore, { color }]}>{score}</Text>
    </View>
  );
}

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
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>مركباتي</Text>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/add-vehicle" as any)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !vehicles || vehicles.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="car-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد مركبات مضافة</Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => router.push(`/vehicle/${item.id}`)}
              >
                <View style={styles.cardLeft}>
                  <Text style={[styles.vehicleName, { color: colors.foreground }]}>
                    {item.nickname || `${item.make} ${item.model}`}
                  </Text>
                  <Text style={[styles.vehicleSub, { color: colors.mutedForeground }]}>
                    {item.make} {item.model} • {item.year}
                  </Text>
                  {item.plateNumber && (
                    <View style={[styles.plateBadge, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.plateText, { color: colors.foreground }]}>{item.plateNumber}</Text>
                    </View>
                  )}
                  <Text style={[styles.odometer, { color: colors.mutedForeground }]}>
                    {(item.odometerKm ?? 0).toLocaleString("ar-SA")} كم
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <HealthRing score={item.healthScore ?? 0} />
                  <Text style={[styles.healthLabel, { color: colors.mutedForeground }]}>الصحة</Text>
                </View>
              </Pressable>
            </Animated.View>
          )}
        />
      )}
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
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardLeft: { flex: 1, gap: 4 },
  cardRight: { alignItems: "center", gap: 4, marginLeft: 12 },
  vehicleName: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  vehicleSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  plateBadge: { alignSelf: "flex-end", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  plateText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  odometer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  ringOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  ringScore: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  healthLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
