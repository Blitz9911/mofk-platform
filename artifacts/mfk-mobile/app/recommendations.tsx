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

import { ArabicText } from "@/components/ArabicText";
import { useColors } from "@/hooks/useColors";
import { rowDir } from "@/lib/layout";
import { cacheRecommendations } from "@/lib/recommendation-lifecycle";
import { smoothBack } from "@/lib/navigation";
import { exportPdf } from "@/lib/pdf-export";

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

function formatKm(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return `${num.toLocaleString("ar-SA")} كم`;
}

function safeDate(value: unknown) {
  if (!value || typeof value !== "string") return "-";
  return value.slice(0, 10);
}

function getRemainingText(rec: any) {
  if (rec.remainingKm !== undefined && rec.remainingKm !== null) {
    const remaining = Number(rec.remainingKm);
    if (remaining < 0) return `متأخرة ${Math.abs(remaining).toLocaleString("ar-SA")} كم`;
    return `متبقي ${remaining.toLocaleString("ar-SA")} كم`;
  }

  if (rec.daysUntilDue !== undefined && rec.daysUntilDue !== null) {
    const days = Number(rec.daysUntilDue);
    if (days < 0) return `متأخرة ${Math.abs(days).toLocaleString("ar-SA")} يوم`;
    return `متبقي ${days.toLocaleString("ar-SA")} يوم`;
  }

  return "غير محدد";
}

function buildEquation(rec: any) {
  if (
    rec.lastDoneKm !== undefined &&
    rec.lastDoneKm !== null &&
    rec.intervalKm !== undefined &&
    rec.intervalKm !== null &&
    rec.nextDueKm !== undefined &&
    rec.nextDueKm !== null
  ) {
    return `${formatKm(rec.lastDoneKm)} + ${formatKm(rec.intervalKm)} = ${formatKm(rec.nextDueKm)}`;
  }

  if (rec.intervalDays !== undefined && rec.intervalDays !== null && rec.lastDoneAt) {
    return `آخر صيانة ${safeDate(rec.lastDoneAt)} + ${rec.intervalDays} يوم = ${safeDate(rec.nextDueAt)}`;
  }

  return null;
}

function hasRealConfidence(rec: any) {
  return rec.metadata?.confidenceSource === "real" && rec.confidencePct !== undefined;
}

const STATUS_LABEL: Record<string, string> = {
  active: "نشطة",
  in_progress: "قيد المعالجة",
  resolved: "مغلقة",
  deferred: "مؤجلة",
  dismissed: "مستبعدة",
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
  cacheRecommendations(sortedRecs);
  const criticalCount = recommendations?.filter((r) => r.severity === "critical").length ?? 0;
  const warningCount = recommendations?.filter((r) => r.severity === "warning").length ?? 0;
  const maintenanceCount = recommendations?.filter((r) => r.kind === "maintenance_due").length ?? 0;

  const exportRecommendationsPdf = () => {
    if (!sortedRecs.length) return;

    const activeVehicle = vehicles?.find((vehicle) => vehicle.id === activeId);

    void exportPdf({
      title: "تقرير التوصيات الذكية",
      subtitle: `توصيات مفك الحالية${activeVehicle ? ` للمركبة ${activeVehicle.nickname || `${activeVehicle.make} ${activeVehicle.model}`}` : ""}.`,
      fileLabel: "تقرير توصيات مفك",
      sections: [
        {
          title: "ملخص التوصيات",
          items: [
            {
              title: "إحصائيات التوصيات",
              subtitle: "ملخص حسب المركبة المختارة",
              badge: "ملخص",
              fields: [
                { label: "إجمالي التوصيات", value: sortedRecs.length },
                { label: "صيانة قادمة", value: maintenanceCount },
                { label: "تحتاج انتباه", value: criticalCount + warningCount },
                { label: "المركبة", value: activeVehicle ? activeVehicle.nickname || `${activeVehicle.make} ${activeVehicle.model}` : null },
              ],
            },
          ],
        },
        {
          title: "التوصيات",
          items: sortedRecs.map((rec) => {
            const details = rec as any;

            return {
              title: rec.titleAr,
              subtitle: rec.descriptionAr,
              badge: KIND_LABEL[rec.kind] ?? "توصية",
              fields: [
                { label: "درجة الأهمية", value: rec.severity },
                { label: "نسبة الثقة", value: rec.confidencePct !== undefined ? `${rec.confidencePct}%` : null },
                { label: "الإجراء المقترح", value: rec.suggestedAction },
                { label: "التكلفة التقديرية", value: rec.suggestedCostSar !== undefined ? `${rec.suggestedCostSar} ر.س` : null },
                { label: "آخر صيانة", value: details.lastDoneKm !== undefined && details.lastDoneKm !== null ? formatKm(details.lastDoneKm) : safeDate(details.lastDoneAt) },
                { label: "المتبقي", value: getRemainingText(details) },
                { label: "طريقة الحساب", value: buildEquation(details) },
              ],
            };
          }),
        },
      ],
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, flexDirection: rowDir }]}>
        <Pressable onPress={() => smoothBack(router)} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>التوصيات الذكية</Text>
        </View>
        {!vehiclesLoading && !recLoading && sortedRecs.length > 0 ? (
          <Pressable onPress={exportRecommendationsPdf} style={[styles.exportBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={{ width: 34 }} />
        )}
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
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="bulb-outline" size={18} color={colors.primary} />
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{sortedRecs.length}</Text>
              <ArabicText style={[styles.summaryLabel, { color: colors.mutedForeground }]}>إجمالي التوصيات</ArabicText>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="construct-outline" size={18} color="#f59e0b" />
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{maintenanceCount}</Text>
              <ArabicText style={[styles.summaryLabel, { color: colors.mutedForeground }]}>صيانة قادمة</ArabicText>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="warning-outline" size={18} color="#ef4444" />
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{criticalCount + warningCount}</Text>
              <ArabicText style={[styles.summaryLabel, { color: colors.mutedForeground }]}>تحتاج انتباه</ArabicText>
            </View>
          </View>

          <Pressable
            onPress={() => router.push("/maintenance")}
            style={({ pressed }) => [
              styles.maintenanceLink,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.78 : 1, flexDirection: rowDir },
            ]}
          >
            <View style={[styles.maintenanceIcon, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.maintenanceText}>
              <ArabicText style={[styles.maintenanceTitle, { color: colors.foreground }]}>سجل وجدول الصيانة</ArabicText>
              <ArabicText style={[styles.maintenanceDesc, { color: colors.mutedForeground }]}>
                أضف الصيانة المنجزة عشان تصير التوصيات أدق.
              </ArabicText>
            </View>
            <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
          </Pressable>

          {!sortedRecs.length ? (
            <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="bulb-outline" size={52} color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد توصيات حالياً</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                لا توجد توصيات مفتوحة من جدول الصيانة أو القراءات المحفوظة. هذا لا يعني أن المركبة سليمة؛ أعد الفحص التشخيصي عند الحاجة.
              </Text>
            </View>
          ) : (
            sortedRecs.map((rec, i) => {
              const sev = getSeverityColors(rec.severity);
              const recDetails = rec as any;
              return (
                <Animated.View key={rec.id} entering={FadeInDown.delay(i * 60).springify()}>
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: "/recommendation-detail", params: { id: rec.id } })
                    }
                    style={[styles.card, { borderColor: sev.border, backgroundColor: sev.bg }]}
                  >
                    {/* Top Row */}
                    <View style={[styles.cardTop, { flexDirection: rowDir }]}>
                      <Ionicons name={sev.iconName as any} size={22} color={sev.icon} />
                      <View style={[styles.kindBadge, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rowDir }]}>
                        <Ionicons name={KIND_ICON[rec.kind] as any ?? "bulb-outline"} size={12} color={colors.mutedForeground} />
                        <Text style={[styles.kindText, { color: colors.mutedForeground }]}>
                          {(rec as any).category === "diagnostic" ? "فحص تشخيصي" : KIND_LABEL[rec.kind] ?? "توصية"}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.kindBadge, { alignSelf: "flex-end", backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.kindText, { color: sev.icon }]}>
                        {STATUS_LABEL[(rec as any).status] || STATUS_LABEL.active}
                      </Text>
                    </View>

                    {/* Title */}
                    <ArabicText style={[styles.cardTitle, { color: colors.foreground }]}>{rec.titleAr}</ArabicText>

                    {rec.descriptionAr && (
                      <ArabicText style={[styles.cardDesc, { color: colors.mutedForeground }]}>{rec.descriptionAr}</ArabicText>
                    )}

                    {/* Confidence Bar */}
                    {hasRealConfidence(rec) && (
                      <View style={styles.confWrap}>
                        <View style={[styles.confHeader, { flexDirection: rowDir }]}>
                          <Text style={[styles.confPct, { color: sev.icon }]}>{rec.confidencePct}%</Text>
                          <ArabicText style={[styles.confLabel, { color: colors.mutedForeground }]}>نسبة الثقة</ArabicText>
                        </View>
                        <View style={[styles.confBar, { backgroundColor: colors.border }]}>
                          <View style={[styles.confFill, { width: `${rec.confidencePct}%` as any, backgroundColor: sev.icon }]} />
                        </View>
                      </View>
                    )}

                    {(recDetails.lastDoneKm !== undefined || recDetails.lastDoneAt || recDetails.nextDueKm !== undefined || recDetails.remainingKm !== undefined || recDetails.daysUntilDue !== undefined) && (
                      <View style={[styles.maintenanceBox, { backgroundColor: colors.card + "cc", borderColor: colors.border + "80" }]}>
                        <View style={styles.maintenanceStatsRow}>
                          <View style={styles.maintenanceStat}>
                            <ArabicText style={[styles.maintenanceStatLabel, { color: colors.mutedForeground }]}>آخر صيانة</ArabicText>
                            <ArabicText style={[styles.maintenanceStatValue, { color: colors.foreground }]}>
                              {recDetails.lastDoneKm !== undefined && recDetails.lastDoneKm !== null ? formatKm(recDetails.lastDoneKm) : safeDate(recDetails.lastDoneAt)}
                            </ArabicText>
                          </View>
                          <View style={styles.maintenanceStat}>
                            <ArabicText style={[styles.maintenanceStatLabel, { color: colors.mutedForeground }]}>المتبقي</ArabicText>
                            <ArabicText style={[styles.maintenanceStatValue, { color: sev.icon }]}>{getRemainingText(recDetails)}</ArabicText>
                          </View>
                        </View>
                        {buildEquation(recDetails) ? (
                          <View style={[styles.equationRow, { borderTopColor: colors.border + "50", flexDirection: rowDir }]}>
                            <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
                            <Text style={[styles.equationText, { color: colors.mutedForeground }]}>{buildEquation(recDetails)}</Text>
                          </View>
                        ) : null}
                      </View>
                    )}

                    {/* Suggested Action */}
                    {(rec.suggestedAction || rec.suggestedCostSar !== undefined) && (
                      <View style={[styles.actionBox, { backgroundColor: colors.card + "cc", borderColor: colors.border + "80" }]}>
                        {rec.suggestedAction && (
                          <View style={[styles.actionRow, { flexDirection: rowDir }]}>
                            <ArabicText style={[styles.actionText, { color: colors.foreground }]}>{rec.suggestedAction}</ArabicText>
                            <Ionicons name="construct-outline" size={16} color={colors.mutedForeground} />
                          </View>
                        )}
                        {rec.suggestedCostSar !== undefined && (
                          <View style={[styles.costRow, { borderTopColor: colors.border + "50", flexDirection: rowDir }]}>
                            <Text style={[styles.costVal, { color: colors.primary }]}>{rec.suggestedCostSar} ر.س</Text>
                            <ArabicText style={[styles.costLabel, { color: colors.mutedForeground }]}>التكلفة التقديرية</ArabicText>
                          </View>
                        )}
                      </View>
                    )}
                  </Pressable>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerTitleWrap: { flex: 1, direction: "ltr" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  exportBtn: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  tabsRow: { maxHeight: 56, marginVertical: 8 },
  tabChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tabChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  loadCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  summaryGrid: { flexDirection: "row", gap: 8 },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  summaryValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  maintenanceLink: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    padding: 14,
  },
  maintenanceIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  maintenanceText: { flex: 1, minWidth: 0, alignItems: "stretch", gap: 3 },
  maintenanceTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right" },
  maintenanceDesc: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 18 },
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
  cardTop: { alignItems: "center", justifyContent: "space-between" },
  kindBadge: {
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
  confHeader: { alignItems: "center", justifyContent: "space-between" },
  confLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  confPct: { fontSize: 12, fontFamily: "Inter_700Bold" },
  confBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  confFill: { height: "100%", borderRadius: 3 },
  maintenanceBox: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  maintenanceStatsRow: { flexDirection: "row", gap: 10 },
  maintenanceStat: { flex: 1, alignItems: "stretch", gap: 3 },
  maintenanceStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  maintenanceStatValue: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
  equationRow: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingTop: 8,
  },
  equationText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17, textAlign: "right" },
  actionBox: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  actionRow: { alignItems: "flex-start", gap: 8 },
  actionText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "right" },
  costRow: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  costLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  costVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
