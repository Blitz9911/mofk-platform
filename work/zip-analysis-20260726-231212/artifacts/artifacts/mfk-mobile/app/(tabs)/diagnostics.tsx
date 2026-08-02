import { Ionicons } from "@expo/vector-icons";
import { useListVehicles, useGetLiveTelemetry, useListDiagnosticSessions } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function GaugeCard({ label, value, unit, color, icon }: { label: string; value: string | number; unit: string; color: string; icon: string }) {
  const colors = useColors();
  return (
    <View style={[styles.gauge, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.gaugeTop, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.gaugeValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.gaugeUnit, { color }]}>{unit}</Text>
      <Text style={[styles.gaugeLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function DiagnosticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: vehicles } = useListVehicles();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId = selectedId ?? vehicles?.[0]?.id ?? null;

  const { data: telemetry, isLoading: telLoading } = useGetLiveTelemetry(
    activeId ?? "",
    { query: { enabled: !!activeId, refetchInterval: 5000 } as any }
  );

  const { data: sessions } = useListDiagnosticSessions(
    { vehicleId: activeId ?? "", limit: 8 },
    { query: { enabled: !!activeId } as any }
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const activeVehicle = vehicles?.find((v) => v.id === activeId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.newSessionBtn, { backgroundColor: colors.primary }]}
          onPress={() => Alert.alert("جلسة جديدة", "قم بتوصيل جهاز OBD-II ثم ابدأ الجلسة من التطبيق.")}
        >
          <Ionicons name="play-circle-outline" size={18} color="#fff" />
          <Text style={styles.newSessionText}>بدء جلسة جديدة</Text>
        </Pressable>
        <View style={styles.headerRight}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>التشخيص المباشر</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>مراقبة حية لبيانات المركبة</Text>
        </View>
      </View>

      {/* Vehicle selector */}
      {vehicles && vehicles.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.vehiclePicker}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {vehicles.map((v) => (
            <Pressable
              key={v.id}
              style={[
                styles.vehicleChip,
                {
                  backgroundColor: activeId === v.id ? colors.primary : colors.card,
                  borderColor: activeId === v.id ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedId(v.id)}
            >
              <Ionicons name="car-outline" size={14} color={activeId === v.id ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.vehicleChipText, { color: activeId === v.id ? "#fff" : colors.foreground }]}>
                {v.nickname || `${v.make} ${v.model}`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 100 : 120, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Active vehicle info card */}
        {activeVehicle && (
          <View style={[styles.vehicleInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.vehicleInfoLeft}>
              <View style={[styles.connStatus, {
                backgroundColor: activeVehicle.adapterMac ? "#22c55e18" : colors.muted,
              }]}>
                <View style={[styles.connDot, { backgroundColor: activeVehicle.adapterMac ? "#22c55e" : colors.mutedForeground }]} />
                <Text style={[styles.connText, { color: activeVehicle.adapterMac ? "#22c55e" : colors.mutedForeground }]}>
                  {activeVehicle.adapterMac ? "متصل" : "غير متصل"}
                </Text>
              </View>
            </View>
            <View style={styles.vehicleInfoRight}>
              <Text style={[styles.vehicleInfoName, { color: colors.foreground }]}>
                {activeVehicle.nickname || `${activeVehicle.make} ${activeVehicle.model}`}
              </Text>
              <Text style={[styles.vehicleInfoSub, { color: colors.mutedForeground }]}>
                {activeVehicle.make} {activeVehicle.model} • {activeVehicle.year}
              </Text>
            </View>
            <View style={[styles.vehicleIconBox, { backgroundColor: colors.accent }]}>
              <Ionicons name="car" size={28} color={colors.mutedForeground} />
            </View>
          </View>
        )}

        {/* Live telemetry */}
        {telLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : telemetry?.isConnected ? (
          <View style={styles.gaugesSection}>
            <View style={styles.liveHeader}>
              <View style={[styles.liveDot]} />
              <Text style={[styles.liveTitle, { color: colors.foreground }]}>البيانات الحية (Live Telemetry)</Text>
            </View>
            <Text style={[styles.liveSub, { color: colors.mutedForeground }]}>قراءات المحرك المباشرة</Text>
            <View style={styles.gaugeGrid}>
              <GaugeCard label="السرعة" value={telemetry.latest?.speedKmh ?? 0} unit="كم/س" color={colors.primary} icon="speedometer-outline" />
              <GaugeCard label="سرعة المحرك" value={telemetry.latest?.rpm ?? 0} unit="RPM" color="#06b6d4" icon="sync-outline" />
              <GaugeCard label="حرارة المبرد" value={telemetry.latest?.coolantTemp ?? 0} unit="°م" color="#f59e0b" icon="thermometer-outline" />
              <GaugeCard label="البطارية" value={((telemetry.latest?.batteryV ?? 0) as number).toFixed(1)} unit="V" color="#22c55e" icon="battery-half-outline" />
              <GaugeCard label="مستوى الوقود" value={telemetry.latest?.fuelLevelPct ?? 0} unit="%" color="#8b5cf6" icon="water-outline" />
              <GaugeCard label="حمل المحرك" value={telemetry.latest?.engineLoad ?? 0} unit="%" color="#ec4899" icon="analytics-outline" />
            </View>
          </View>
        ) : activeId ? (
          <View style={[styles.noData, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.noDataIcon, { backgroundColor: colors.muted }]}>
              <Ionicons name="pulse-outline" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.noDataTitle, { color: colors.foreground }]}>المركبة غير متصلة حالياً</Text>
            <Text style={[styles.noDataSub, { color: colors.mutedForeground }]}>
              قم بتشغيل المحرك وتأكد من اتصال الجهاز بالإنترنت
            </Text>
          </View>
        ) : null}

        {/* Sessions log */}
        {sessions && sessions.length > 0 && (
          <View style={styles.sessionsSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>سجل الجلسات</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>أحدث جلسات الفحص والتشخيص</Text>
            {sessions.map((s) => (
              <View key={s.id} style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.sessionLeft}>
                  {(s.dtcCount ?? 0) > 0 && (
                    <View style={[styles.dtcBadge, { backgroundColor: "#ef444418" }]}>
                      <Ionicons name="warning-outline" size={12} color="#ef4444" />
                      <Text style={[styles.dtcBadgeText, { color: "#ef4444" }]}>{s.dtcCount} أعطال</Text>
                    </View>
                  )}
                  <View style={[styles.statusBadge, {
                    backgroundColor: s.status === "active" ? "#22c55e18" : colors.muted,
                  }]}>
                    <Text style={[styles.statusText, { color: s.status === "active" ? "#22c55e" : colors.mutedForeground }]}>
                      {s.status === "active" ? "● نشطة" : "مكتملة"}
                    </Text>
                  </View>
                </View>
                <View style={styles.sessionRight}>
                  <Text style={[styles.sessionDate, { color: colors.foreground }]}>
                    {new Date(s.startedAt).toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" })}
                  </Text>
                  {s.durationSec && (
                    <Text style={[styles.sessionDuration, { color: colors.mutedForeground }]}>
                      {Math.round(s.durationSec / 60)} دقيقة
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty sessions */}
        {(!sessions || sessions.length === 0) && !telLoading && activeId && (
          <View style={[styles.noData, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.noDataIcon, { backgroundColor: colors.muted }]}>
              <Ionicons name="document-text-outline" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.noDataTitle, { color: colors.foreground }]}>لا توجد جلسات سابقة</Text>
            <Text style={[styles.noDataSub, { color: colors.mutedForeground }]}>
              ابدأ جلسة جديدة لفحص مركبتك
            </Text>
          </View>
        )}
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
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRight: { alignItems: "flex-end", gap: 2 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  newSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  newSessionText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  vehiclePicker: { maxHeight: 54, marginVertical: 8 },
  vehicleChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  vehicleChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  vehicleInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  vehicleIconBox: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  vehicleInfoRight: { flex: 1, alignItems: "flex-end", gap: 2 },
  vehicleInfoName: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  vehicleInfoSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  vehicleInfoLeft: { alignItems: "flex-start" },
  connStatus: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  connDot: { width: 7, height: 7, borderRadius: 4 },
  connText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  center: { paddingVertical: 40, alignItems: "center" },
  gaugesSection: { gap: 10 },
  liveHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" },
  liveTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  liveSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  gaugeGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  gauge: {
    width: "47%",
    padding: 14,
    borderRadius: 14,
    alignItems: "flex-end",
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  gaugeTop: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  gaugeValue: { fontSize: 26, fontFamily: "Inter_700Bold" },
  gaugeUnit: { fontSize: 12, fontFamily: "Inter_500Medium" },
  gaugeLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  noData: { padding: 32, borderRadius: 16, alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth },
  noDataIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  noDataTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  noDataSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  sessionsSection: { gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: -4 },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sessionRight: { alignItems: "flex-end", gap: 3 },
  sessionDate: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sessionDuration: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sessionLeft: { gap: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  dtcBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  dtcBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
