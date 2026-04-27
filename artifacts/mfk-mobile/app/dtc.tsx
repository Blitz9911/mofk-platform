import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useListDtcCodes, useListVehicles } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "حرج",
  high: "عالي",
  medium: "متوسط",
  low: "منخفض",
};

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  cleared: "مُزال",
  pending: "معلق",
};

export default function DtcScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [status, setStatus] = useState<"active" | "cleared">("active");

  const { data: vehicles } = useListVehicles();
  const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);

  const { data: dtcs, isLoading } = useListDtcCodes({ status, vehicleId });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>سجل الأعطال</Text>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-forward" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {(["active", "cleared"] as const).map((s) => (
            <Pressable
              key={s}
              style={[styles.filterChip, { backgroundColor: status === s ? colors.primary : colors.card, borderColor: colors.border }]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.filterChipText, { color: status === s ? "#fff" : colors.foreground }]}>
                {STATUS_LABELS[s]}
              </Text>
            </Pressable>
          ))}
          {vehicles?.map((v) => (
            <Pressable
              key={v.id}
              style={[styles.filterChip, { backgroundColor: vehicleId === v.id ? colors.accent : colors.card, borderColor: vehicleId === v.id ? colors.primary : colors.border }]}
              onPress={() => setVehicleId(vehicleId === v.id ? undefined : v.id)}
            >
              <Text style={[styles.filterChipText, { color: colors.foreground }]}>{v.nickname || `${v.make} ${v.model}`}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={dtcs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد أعطال {STATUS_LABELS[status]}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.dtcCard, { backgroundColor: colors.card, borderColor: colors.border, borderRightColor: SEVERITY_COLOR[item.severity] ?? colors.border, borderRightWidth: 3 }]}>
              <View style={styles.dtcTop}>
                <View style={[styles.severityBadge, { backgroundColor: (SEVERITY_COLOR[item.severity] ?? colors.muted) + "22" }]}>
                  <Text style={[styles.severityText, { color: SEVERITY_COLOR[item.severity] ?? colors.mutedForeground }]}>
                    {SEVERITY_LABEL[item.severity] ?? item.severity}
                  </Text>
                </View>
                <Text style={[styles.dtcCode, { color: colors.foreground }]}>{item.code}</Text>
              </View>
              <Text style={[styles.dtcDesc, { color: colors.foreground }]}>{item.descriptionAr ?? item.description}</Text>
              {item.possibleCauses && (
                <Text style={[styles.dtcCauses, { color: colors.mutedForeground }]}>{item.possibleCauses}</Text>
              )}
              <View style={styles.dtcFooter}>
                <Text style={[styles.dtcDate, { color: colors.mutedForeground }]}>
                  {new Date(item.detectedAt).toLocaleDateString("ar-SA")}
                </Text>
                {item.vehicleMake && (
                  <Text style={[styles.dtcVehicle, { color: colors.mutedForeground }]}>{item.vehicleMake} {item.vehicleModel}</Text>
                )}
              </View>
            </View>
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
  filters: { paddingVertical: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  dtcCard: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  dtcTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  dtcCode: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  severityText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  dtcDesc: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "right" },
  dtcCauses: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  dtcFooter: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  dtcDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  dtcVehicle: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
