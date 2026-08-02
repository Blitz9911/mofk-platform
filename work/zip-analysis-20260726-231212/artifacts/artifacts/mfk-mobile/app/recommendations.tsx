import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useListVehicles, useGetAiRecommendations } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const KIND_LABEL: Record<string, string> = {
  predictive_failure: "تنبؤ بعطل",
  maintenance_due: "صيانة مستحقة",
  telemetry_anomaly: "شذوذ في الأداء",
  behavioral: "نصيحة قيادة",
};

const KIND_ICON: Record<string, string> = {
  predictive_failure: "pulse-outline",
  maintenance_due: "construct-outline",
  telemetry_anomaly: "flash-outline",
  behavioral: "car-sport-outline",
};

function getSeverityColors(sev: string) {
  switch (sev) {
    case "critical": return { border: "#ef4444", bg: "#ef444410", icon: "#ef4444", iconName: "shield-outline" };
    case "warning": return { border: "#f59e0b", bg: "#f59e0b10", icon: "#f59e0b", iconName: "warning-outline" };
    case "info": return { border: "#3b82f6", bg: "#3b82f610", icon: "#3b82f6", iconName: "information-circle-outline" };
    default: return { border: "#6b7280", bg: "#6b728010", icon: "#6b7280", iconName: "bulb-outline" };
  }
}

export default function RecommendationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: vehicles, isLoading: vehiclesLoading } = useListVehicles();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId = selectedId ?? vehicles?.[0]?.id ?? "";

  const { data: recommendations, isLoading: recLoading } = useGetAiRecommendations(activeId, {
    query: { enabled: !!activeId } as any,
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const sortedRecs = [
    ...(recommendations?.filter((r) => r.severity === "critical") ?? []),
    ...(recommendations?.filter((r) => r.severity === "warning") ?? []),
    ...(recommendations?.filter((r) => r.severity === "info") ?? []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>التوصيات الذكية</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Vehicle Tabs */}
      {vehicles && vehicles.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsRow}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {vehicles.map((v) => (
            <Pressable
              key={v.id}
              style={[
                styles.tabChip,
                {
                  backgroundColor: activeId === v.id ? colors.primary : colors.card,
                  borderColor: activeId === v.id ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedId(v.id)}
            >
              <Text style={[styles.tabChipText, { color: activeId === v.id ? "#fff" : colors.foreground }]}>
                {v.nickname || `${v.make} ${v.model}`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {vehiclesLoading || recLoading ? (
        <View style={styles.loadCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {!sortedRecs.length ? (
            <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="bulb-outline" size={52} color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد توصيات حالياً</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                مركبتك تعمل بأداء مثالي. سنخبرك إذا وجدنا ما يحتاج انتباهك.
              </Text>
            </View>
          ) : (
            sortedRecs.map((rec, i) => {
              const sev = getSeverityColors(rec.severity);
              return (
                <Animated.View key={rec.id} entering={FadeInDown.delay(i * 60).springify()}>
                  <View style={[styles.card, { borderColor: sev.border, backgroundColor: sev.bg }]}>
                    {/* Top Row */}
                    <View style={styles.cardTop}>
                      <Ionicons name={sev.iconName as any} size={22} color={sev.icon} />
                      <View style={[styles.kindBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name={KIND_ICON[rec.kind] as any ?? "bulb-outline"} size={12} color={colors.mutedForeground} />
                        <Text style={[styles.kindText, { color: colors.mutedForeground }]}>
                          {KIND_LABEL[rec.kind] ?? "توصية"}
                        </Text>
                      </View>
                    </View>

                    {/* Title */}
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{rec.titleAr}</Text>

                    {/* Description */}
                    {rec.descriptionAr && (
                      <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{rec.descriptionAr}</Text>
                    )}

                    {/* Confidence Bar */}
                    {rec.confidencePct !== undefined && (
                      <View style={styles.confWrap}>
                        <View style={styles.confHeader}>
                          <Text style={[styles.confPct, { color: sev.icon }]}>{rec.confidencePct}%</Text>
                          <Text style={[styles.confLabel, { color: colors.mutedForeground }]}>نسبة الثقة</Text>
                        </View>
                        <View style={[styles.confBar, { backgroundColor: colors.border }]}>
                          <View style={[styles.confFill, { width: `${rec.confidencePct}%` as any, backgroundColor: sev.icon }]} />
                        </View>
                      </View>
                    )}

                    {/* Suggested Action */}
                    {(rec.suggestedAction || rec.suggestedCostSar !== undefined) && (
                      <View style={[styles.actionBox, { backgroundColor: colors.card + "cc", borderColor: colors.border + "80" }]}>
                        {rec.suggestedAction && (
                          <View style={styles.actionRow}>
                            <Text style={[styles.actionText, { color: colors.foreground }]}>{rec.suggestedAction}</Text>
                            <Ionicons name="construct-outline" size={16} color={colors.mutedForeground} />
                          </View>
                        )}
                        {rec.suggestedCostSar !== undefined && (
                          <View style={[styles.costRow, { borderTopColor: colors.border + "50" }]}>
                            <Text style={[styles.costVal, { color: colors.primary }]}>{rec.suggestedCostSar} ر.س</Text>
                            <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>التكلفة التقديرية</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  tabsRow: { maxHeight: 56, marginVertical: 8 },
  tabChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tabChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  loadCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: {
    padding: 40,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { padding: 16, borderRadius: 16, borderWidth: 1.5, gap: 10 },
  cardTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  kindBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  kindText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 20 },
  confWrap: { gap: 6 },
  confHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  confLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  confPct: { fontSize: 12, fontFamily: "Inter_700Bold" },
  confBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  confFill: { height: "100%", borderRadius: 3 },
  actionBox: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  actionRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 8 },
  actionText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "right" },
  costRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  costLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  costVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
