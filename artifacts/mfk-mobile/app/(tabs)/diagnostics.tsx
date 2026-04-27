import { Ionicons } from "@expo/vector-icons";
import { useListVehicles, useGetLiveTelemetry, useListDiagnosticSessions } from "@workspace/api-client-react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function GaugeCard({ label, value, unit, color }: { label: string; value: string | number; unit: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.gauge, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.gaugeAccent, { backgroundColor: color }]} />
      <Text style={[styles.gaugeValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.gaugeUnit, { color: color }]}>{unit}</Text>
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
    { query: { enabled: !!activeId, refetchInterval: 5000 } }
  );

  const { data: sessions } = useListDiagnosticSessions(
    { vehicleId: activeId ?? "", limit: 5 },
    { query: { enabled: !!activeId } }
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const activeVehicle = vehicles?.find((v) => v.id === activeId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>التشخيص المباشر</Text>
      </View>

      {vehicles && vehicles.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehiclePicker} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {vehicles.map((v) => (
            <Pressable
              key={v.id}
              style={[
                styles.vehicleChip,
                { backgroundColor: activeId === v.id ? colors.primary : colors.card, borderColor: colors.border },
              ]}
              onPress={() => setSelectedId(v.id)}
            >
              <Text style={[styles.vehicleChipText, { color: activeId === v.id ? "#fff" : colors.foreground }]}>
                {v.nickname || `${v.make} ${v.model}`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 100 : 120, gap: 16 }}>
        {activeVehicle && (
          <View style={[styles.vehicleInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.vehicleInfoRow}>
              <Ionicons name="car" size={20} color={colors.primary} />
              <Text style={[styles.vehicleInfoName, { color: colors.foreground }]}>
                {activeVehicle.nickname || `${activeVehicle.make} ${activeVehicle.model}`}
              </Text>
            </View>
            <View style={[styles.connStatus, { backgroundColor: activeVehicle.adapterMac ? colors.success + "22" : colors.muted }]}>
              <View style={[styles.connDot, { backgroundColor: activeVehicle.adapterMac ? colors.success : colors.mutedForeground }]} />
              <Text style={[styles.connText, { color: activeVehicle.adapterMac ? colors.success : colors.mutedForeground }]}>
                {activeVehicle.adapterMac ? "متصل" : "غير متصل"}
              </Text>
            </View>
          </View>
        )}

        {telLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : telemetry ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>بيانات حية</Text>
            <View style={styles.gaugeGrid}>
              <GaugeCard label="السرعة" value={telemetry.speedKmh ?? 0} unit="كم/س" color={colors.primary} />
              <GaugeCard label="سرعة المحرك" value={telemetry.rpm ?? 0} unit="RPM" color="#06b6d4" />
              <GaugeCard label="حرارة المبرد" value={telemetry.engineTempC ?? 0} unit="°م" color="#f59e0b" />
              <GaugeCard label="البطارية" value={(telemetry.batteryV ?? 0).toFixed(1)} unit="V" color="#22c55e" />
              <GaugeCard label="مستوى الوقود" value={telemetry.fuelLevelPct ?? 0} unit="%" color="#8b5cf6" />
              <GaugeCard label="حمل المحرك" value={telemetry.engineLoadPct ?? 0} unit="%" color="#ec4899" />
            </View>
          </>
        ) : activeId ? (
          <View style={[styles.noData, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="wifi-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.noDataText, { color: colors.mutedForeground }]}>لا توجد بيانات حية</Text>
            <Text style={[styles.noDataSub, { color: colors.mutedForeground }]}>تأكد من توصيل جهاز OBD-II</Text>
          </View>
        ) : null}

        {sessions && sessions.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>آخر الجلسات</Text>
            {sessions.map((s) => (
              <View key={s.id} style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.sessionRow}>
                  <View style={[styles.statusBadge, { backgroundColor: s.status === "active" ? colors.success + "22" : colors.accent }]}>
                    <Text style={[styles.statusText, { color: s.status === "active" ? colors.success : colors.mutedForeground }]}>
                      {s.status === "active" ? "نشطة" : "مكتملة"}
                    </Text>
                  </View>
                  <Text style={[styles.sessionDate, { color: colors.mutedForeground }]}>
                    {new Date(s.startedAt).toLocaleDateString("ar-SA")}
                  </Text>
                </View>
                <View style={styles.sessionStats}>
                  <Text style={[styles.sessionStat, { color: colors.foreground }]}>
                    <Text style={{ color: colors.primary }}>{s.dtcCount}</Text> أعطال
                  </Text>
                  {s.durationSec && (
                    <Text style={[styles.sessionStat, { color: colors.mutedForeground }]}>
                      {Math.round(s.durationSec / 60)} دقيقة
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold" },
  vehiclePicker: { maxHeight: 56, marginVertical: 8 },
  vehicleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  vehicleChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  vehicleInfo: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  vehicleInfoRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  vehicleInfoName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  connStatus: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  connDot: { width: 7, height: 7, borderRadius: 4 },
  connText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  center: { paddingVertical: 40, alignItems: "center" },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "right", textTransform: "uppercase", letterSpacing: 0.5 },
  gaugeGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  gauge: {
    width: "47%",
    padding: 16,
    borderRadius: 14,
    alignItems: "flex-end",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    position: "relative",
  },
  gaugeAccent: { position: "absolute", top: 0, right: 0, width: 4, height: "100%", borderTopRightRadius: 14, borderBottomRightRadius: 14 },
  gaugeValue: { fontSize: 28, fontWeight: "700", fontFamily: "Inter_700Bold", marginTop: 4 },
  gaugeUnit: { fontSize: 12, fontFamily: "Inter_500Medium" },
  gaugeLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  noData: { padding: 32, borderRadius: 16, alignItems: "center", gap: 8, borderWidth: StyleSheet.hairlineWidth },
  noDataText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  noDataSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sessionCard: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  sessionRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sessionDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sessionStats: { flexDirection: "row-reverse", gap: 16 },
  sessionStat: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
