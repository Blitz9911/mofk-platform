import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useObdConnection } from "@/src/obd";

function fieldText(availability: string, value: string | null) {
  if (availability === "unsupported") return "غير مدعوم";
  if (availability === "malformed") return "صيغة غير صالحة";
  if (availability === "ok" && value) return value;
  if (availability === "unavailable") return "غير متاح";
  return "غير متاح";
}

export default function ObdVehicleInfoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const obd = useObdConnection();
  const ready = obd.state === "vehicle_connected";
  const info = obd.vehicleInfo;

  useEffect(() => {
    if (ready) void obd.readVehicleInformation();
  }, [ready, obd.readVehicleInformation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="chevron-forward" size={19} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={[styles.title, { color: colors.foreground }]}>معلومات السيارة</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>Mode 09 · Adapter · Protocol</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}>
        {!ready ? <Text style={[styles.body, { color: colors.mutedForeground }]}>اتصل بالقطعة أولاً. هذه الشاشة تستخدم نفس جلسة BLE.</Text> : null}
        {info?.status === "running" ? <ActivityIndicator color={colors.primary} /> : null}
        {(info?.fields ?? []).map((field) => (
          <View key={field.key} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.value, { color: colors.foreground }]}>{fieldText(field.availability, field.value)}</Text>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{field.labelAr}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "right" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
  body: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 22 },
  row: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6, alignItems: "flex-end" },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "right" },
  value: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
});
