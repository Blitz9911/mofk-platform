import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useGetVehicle,
  useGetVehicleHealthHistory,
  useListDtcCodes,
  useGetUpcomingMaintenance,
} from "@workspace/api-client-react";
import React from "react";
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

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

const FUEL_LABELS: Record<string, string> = {
  petrol: "بنزين",
  diesel: "ديزل",
  hybrid: "هجين",
  ev: "كهربائي",
};

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: vehicle, isLoading } = useGetVehicle(id);
  const { data: dtcs } = useListDtcCodes({ vehicleId: id, status: "active" });
  const { data: maintenance } = useGetUpcomingMaintenance();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const healthScore = vehicle?.healthScore ?? 0;
  const healthColor = healthScore >= 80 ? colors.success : healthScore >= 60 ? colors.warning : "#ef4444";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>
          {vehicle ? (vehicle.nickname || `${vehicle.make} ${vehicle.model}`) : "المركبة"}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : vehicle ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
          <View style={[styles.heroSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={[styles.healthRing, { borderColor: healthColor }]}>
              <Text style={[styles.healthScore, { color: healthColor }]}>{healthScore}</Text>
              <Text style={[styles.healthPct, { color: colors.mutedForeground }]}>%</Text>
            </View>
            <View style={styles.vehicleDetails}>
              <Text style={[styles.vehicleTitle, { color: colors.foreground }]}>{vehicle.make} {vehicle.model}</Text>
              <Text style={[styles.vehicleYear, { color: colors.mutedForeground }]}>{vehicle.year}</Text>
              {vehicle.plateNumber && (
                <View style={[styles.plateBadge, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.plateText, { color: colors.foreground }]}>{vehicle.plateNumber}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>العداد</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{(vehicle.odometerKm ?? 0).toLocaleString("ar-SA")}</Text>
              <Text style={[styles.infoUnit, { color: colors.mutedForeground }]}>كم</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>الوقود</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{FUEL_LABELS[vehicle.fuelType] ?? vehicle.fuelType}</Text>
            </View>
            {vehicle.engineCc && (
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>المحرك</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{vehicle.engineCc}</Text>
                <Text style={[styles.infoUnit, { color: colors.mutedForeground }]}>سي سي</Text>
              </View>
            )}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>الجهاز</Text>
              <Text style={[styles.infoValue, { color: vehicle.adapterMac ? colors.success : colors.mutedForeground }]}>
                {vehicle.adapterMac ? "متصل" : "غير متصل"}
              </Text>
            </View>
          </View>

          {vehicle.activeDtcCount !== undefined && vehicle.activeDtcCount > 0 && (
            <View style={[styles.alertBanner, { backgroundColor: "#ef444422", borderColor: "#ef4444" }]}>
              <Ionicons name="warning" size={18} color="#ef4444" />
              <Text style={[styles.alertText, { color: "#ef4444" }]}>{vehicle.activeDtcCount} أعطال نشطة تحتاج اهتمام</Text>
            </View>
          )}

          {dtcs && dtcs.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الأعطال النشطة</Text>
              {dtcs.slice(0, 5).map((d) => (
                <View key={d.id} style={[styles.dtcRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.dtcRight}>
                    <Text style={[styles.dtcCode, { color: colors.foreground }]}>{d.code}</Text>
                    <Text style={[styles.dtcDesc, { color: colors.mutedForeground }]}>{d.descriptionAr ?? d.description}</Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: (SEVERITY_COLOR[d.severity] ?? colors.muted) + "22" }]}>
                    <Text style={[styles.severityText, { color: SEVERITY_COLOR[d.severity] ?? colors.mutedForeground }]}>
                      {d.severity === "critical" ? "حرج" : d.severity === "high" ? "عالي" : d.severity === "medium" ? "متوسط" : "منخفض"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {maintenance && maintenance.filter((m) => m.vehicleId === id).length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الصيانة القادمة</Text>
              {maintenance.filter((m) => m.vehicleId === id).slice(0, 4).map((m) => (
                <View key={m.id} style={[styles.maintRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.maintStatus, { backgroundColor: m.status === "overdue" ? "#ef444422" : colors.primary + "22" }]}>
                    <Text style={[styles.maintStatusText, { color: m.status === "overdue" ? "#ef4444" : colors.primary }]}>
                      {m.status === "overdue" ? "متأخرة" : "قادمة"}
                    </Text>
                  </View>
                  <Text style={[styles.maintName, { color: colors.foreground }]}>{m.serviceTypeAr ?? m.serviceType}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>المركبة غير موجودة</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  backBtn: { padding: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroSection: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 20,
    padding: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  healthRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  healthScore: { fontSize: 30, fontWeight: "700", fontFamily: "Inter_700Bold" },
  healthPct: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8 },
  vehicleDetails: { flex: 1, alignItems: "flex-end", gap: 4 },
  vehicleTitle: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  vehicleYear: { fontSize: 14, fontFamily: "Inter_400Regular" },
  plateBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  plateText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  infoGrid: { flexDirection: "row-reverse", flexWrap: "wrap", padding: 16, gap: 10 },
  infoCard: {
    width: "47%",
    padding: 14,
    borderRadius: 12,
    alignItems: "flex-end",
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  infoUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },
  alertBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },
  section: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right", marginBottom: 4 },
  dtcRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  dtcRight: { flex: 1, gap: 2 },
  dtcCode: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right" },
  dtcDesc: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  severityText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  maintRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  maintName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "right" },
  maintStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  maintStatusText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  errorText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
