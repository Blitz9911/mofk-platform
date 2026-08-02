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

const SEVERITY: Record<string, { color: string; label: string; icon: string }> = {
  critical: { color: "#ef4444", label: "حرج", icon: "alert-circle" },
  high:     { color: "#f97316", label: "عالي", icon: "warning" },
  medium:   { color: "#f59e0b", label: "متوسط", icon: "warning-outline" },
  low:      { color: "#22c55e", label: "منخفض", icon: "checkmark-circle-outline" },
};

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  critical: { label: "توقف فوراً", color: "#ef4444" },
  high:     { label: "افحص قريباً", color: "#f97316" },
  medium:   { label: "افحص قريباً", color: "#f59e0b" },
  low:      { label: "راقب الوضع", color: "#22c55e" },
};

export default function DtcScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [status, setStatus] = useState<"active" | "cleared">("active");
  const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);

  const { data: vehicles } = useListVehicles();
  const { data: dtcs, isLoading } = useListDtcCodes({ status, vehicleId });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const counts = {
    critical: dtcs?.filter((d) => d.severity === "critical").length ?? 0,
    high:     dtcs?.filter((d) => d.severity === "high").length ?? 0,
    medium:   dtcs?.filter((d) => d.severity === "medium").length ?? 0,
    low:      dtcs?.filter((d) => d.severity === "low").length ?? 0,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>سجل الأعطال (DTC)</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>تتبع وإدارة أعطال مركباتك</Text>
        </View>
      </View>

      {/* Severity summary row */}
      {!isLoading && dtcs && dtcs.length > 0 && (
        <View style={[styles.summaryRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(["critical", "high", "medium", "low"] as const).map((sev) => {
            const s = SEVERITY[sev];
            return (
              <View key={sev} style={styles.summaryItem}>
                <View style={[styles.summaryBadge, { backgroundColor: s.color + "20" }]}>
                  <Ionicons name={s.icon as any} size={14} color={s.color} />
                  <Text style={[styles.summaryCount, { color: s.color }]}>{counts[sev]}</Text>
                </View>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Filters */}
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
          {(["active", "cleared"] as const).map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, { backgroundColor: status === s ? colors.primary : colors.card, borderColor: status === s ? colors.primary : colors.border }]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.chipText, { color: status === s ? "#fff" : colors.foreground }]}>
                {s === "active" ? "نشطة" : "مُزالة"}
              </Text>
            </Pressable>
          ))}
          <View style={[styles.chipDivider, { backgroundColor: colors.border }]} />
          {vehicles?.map((v) => (
            <Pressable
              key={v.id}
              style={[styles.chip, {
                backgroundColor: vehicleId === v.id ? colors.accent : colors.card,
                borderColor: vehicleId === v.id ? colors.primary : colors.border,
              }]}
              onPress={() => setVehicleId(vehicleId === v.id ? undefined : v.id)}
            >
              <Ionicons name="car-outline" size={12} color={vehicleId === v.id ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.chipText, { color: vehicleId === v.id ? colors.primary : colors.foreground }]}>
                {v.nickname || `${v.make} ${v.model}`}
              </Text>
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
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 60 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {status === "active" ? "لا توجد أعطال نشطة" : "لا توجد أعطال مُزالة"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {status === "active" ? "مركباتك تعمل بشكل جيد" : "لم يتم إزالة أي أعطال بعد"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const s = SEVERITY[item.severity] ?? { color: colors.mutedForeground, label: item.severity, icon: "ellipse-outline" };
            const action = ACTION_LABEL[item.severity];
            return (
              <View style={[styles.dtcCard, { backgroundColor: colors.card, borderColor: colors.border, borderRightColor: s.color }]}>
                {/* Top row */}
                <View style={styles.dtcTop}>
                  <View style={[styles.severityBadge, { backgroundColor: s.color + "20" }]}>
                    <Ionicons name={s.icon as any} size={12} color={s.color} />
                    <Text style={[styles.severityText, { color: s.color }]}>{s.label}</Text>
                  </View>
                  <Text style={[styles.dtcCode, { color: colors.foreground }]}>{item.code}</Text>
                </View>

                {/* Description */}
                <Text style={[styles.dtcDesc, { color: colors.foreground }]}>
                  {item.descriptionAr ?? item.descriptionEn}
                </Text>

                {item.possibleCauses && (
                  <Text style={[styles.dtcCauses, { color: colors.mutedForeground }]}>
                    🔧 {item.possibleCauses}
                  </Text>
                )}

                {/* Footer */}
                <View style={styles.dtcFooter}>
                  {action && (
                    <Pressable style={[styles.actionBtn, { backgroundColor: s.color }]}>
                      <Text style={styles.actionBtnText}>{action.label}</Text>
                    </Pressable>
                  )}
                  <View style={styles.dtcMeta}>
                    {item.vehicleMake && (
                      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                        {item.vehicleMake} {item.vehicleModel}
                      </Text>
                    )}
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                      {item.detectedAt ? new Date(item.detectedAt).toLocaleDateString("ar-SA") : "—"}
                    </Text>
                  </View>
                </View>
              </View>
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
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: "flex-end", gap: 2 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  summaryRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryItem: { alignItems: "center", gap: 5 },
  summaryBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  summaryCount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  filters: {},
  chip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  chipDivider: { width: 1, marginHorizontal: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  dtcCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRightWidth: 4,
    gap: 8,
  },
  dtcTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  dtcCode: { fontSize: 18, fontFamily: "Inter_700Bold" },
  severityBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  severityText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  dtcDesc: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "right" },
  dtcCauses: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  dtcFooter: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  actionBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  dtcMeta: { gap: 2, alignItems: "flex-start" },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
