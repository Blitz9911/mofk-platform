import { Ionicons } from "@expo/vector-icons";
import { useListVehicles } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArabicText } from "@/components/ArabicText";
import { useColors } from "@/hooks/useColors";
import { bindMfkDeviceVehicle, registerMfkDevice, recordMfkVerification, requestMfkVehicleTransfer } from "@/lib/mfk-binding-api";
import { rowDir } from "@/lib/layout";
import { isDeviceBindingEnabled, isVehicleVerificationEnabled } from "@/src/obd/binding/feature-flags";
import { matchLabelAr, matchVehicleFingerprints } from "@/src/obd/binding/matcher";
import { BINDING_COPY, type FingerprintMatchResult, type VehicleFingerprint } from "@/src/obd/binding/types";
import { useObdConnection } from "@/src/obd";

export default function DeviceBindingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const obd = useObdConnection();
  const { data: vehicles = [] } = useListVehicles();
  const enabled = isDeviceBindingEnabled();
  const verifyEnabled = isVehicleVerificationEnabled();

  const [busy, setBusy] = useState(false);
  const [statusAr, setStatusAr] = useState("لم يتم الربط بعد.");
  const [match, setMatch] = useState<FingerprintMatchResult | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [lastFingerprint, setLastFingerprint] = useState<VehicleFingerprint | null>(null);

  const vehicleId = vehicles[0]?.id ?? null;
  const ready = obd.state === "vehicle_connected";

  const run = async () => {
    if (!enabled) {
      Alert.alert("غير مفعّل", "نظام الربط مطفأ حتى اكتمال الاختبار.");
      return;
    }
    if (!ready) {
      Alert.alert("غير متصل", "اتصل بالقطعة أولًا من شاشة الاقتران.");
      return;
    }
    if (!vehicleId) {
      Alert.alert("لا توجد مركبة", "أضف مركبة من حسابك قبل الربط.");
      return;
    }
    setBusy(true);
    try {
      const registered = await registerMfkDevice({
        deviceModel: "V011",
        hardwareIdentifier: obd.selectedDevice?.id ?? null,
      });
      const id = (registered as { id?: string })?.id ?? null;
      setDeviceId(id);
      const fingerprint = await obd.collectVehicleFingerprint();
      if (!fingerprint) throw new Error("تعذر جمع بصمة المركبة.");
      setLastFingerprint(fingerprint);

      if (id) {
        await bindMfkDeviceVehicle(id, vehicleId, fingerprint);
      }
      setStatusAr(BINDING_COPY.success);
      setMatch("INCONCLUSIVE");
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر الربط.";
      if (message.includes("another vehicle") || message.includes("already bound")) {
        setStatusAr(BINDING_COPY.otherVehicle);
      } else {
        setStatusAr(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!verifyEnabled || !lastFingerprint || !deviceId || !vehicleId) return;
    setBusy(true);
    try {
      const observed = await obd.collectVehicleFingerprint();
      if (!observed) throw new Error(BINDING_COPY.inconclusive);
      const result = matchVehicleFingerprints(lastFingerprint, observed);
      setMatch(result);
      const summary =
        result === "MISMATCH" ? BINDING_COPY.mismatch : result === "VERIFIED" || result === "LIKELY_MATCH" ? BINDING_COPY.success : BINDING_COPY.inconclusive;
      setStatusAr(summary);
      await recordMfkVerification(deviceId, vehicleId, result, summary).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const transfer = async () => {
    if (!deviceId || vehicles.length < 2) {
      Alert.alert("تغيير المركبة", BINDING_COPY.transferHint);
      return;
    }
    const next = vehicles[1]?.id;
    if (!next) return;
    setBusy(true);
    try {
      await requestMfkVehicleTransfer(deviceId, next);
      setStatusAr("تم تسجيل طلب تغيير المركبة. أكمل التحقق من إدارة الأجهزة.");
    } catch (error) {
      setStatusAr(error instanceof Error ? error.message : "تعذر طلب النقل.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, flexDirection: rowDir }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <ArabicText style={[styles.title, { color: colors.foreground }]}>إدارة الأجهزة</ArabicText>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ArabicText style={[styles.cardTitle, { color: colors.foreground }]}>ربط قطعة مفك</ArabicText>
          <ArabicText style={[styles.body, { color: colors.mutedForeground }]}>{BINDING_COPY.unverifiedHardware}</ArabicText>
          <ArabicText style={[styles.body, { color: colors.foreground }]}>{statusAr}</ArabicText>
          {match ? <ArabicText style={[styles.body, { color: colors.primary }]}>{matchLabelAr(match)}</ArabicText> : null}
        </View>
        <Pressable
          disabled={busy || !enabled}
          onPress={() => void run()}
          style={[styles.primary, { backgroundColor: colors.primary, opacity: busy || !enabled ? 0.55 : 1 }]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>تفعيل الربط</Text>}
        </Pressable>
        {verifyEnabled ? (
          <Pressable disabled={busy} onPress={() => void verify()} style={[styles.secondary, { borderColor: colors.border }]}>
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>التحقق من المركبة</Text>
          </Pressable>
        ) : null}
        <Pressable disabled={busy} onPress={() => void transfer()} style={[styles.secondary, { borderColor: colors.border }]}>
          <Text style={[styles.secondaryText, { color: colors.foreground }]}>طلب تغيير المركبة</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
  body: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 20 },
  primary: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold" },
  secondary: { minHeight: 48, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontFamily: "Inter_700Bold" },
});
