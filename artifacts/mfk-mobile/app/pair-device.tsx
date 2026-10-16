import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useSegments } from "expo-router";
import React, { useMemo, useRef, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArabicText } from "@/components/ArabicText";
import { useColors } from "@/hooks/useColors";
import { rowDir } from "@/lib/layout";
import { useObdConnection } from "../src/obd/hooks/use-obd-connection";
import type { ObdConnectionState, ObdDevice } from "../src/obd/types/obd.types";

const STEPS = [
  "شغل السيارة أو ضع المفتاح على وضع ACC",
  "ركب جهاز مفك في منفذ OBD-II أسفل عجلة القيادة",
  "فعل البلوتوث والموقع من إعدادات الجوال",
];

const BUSY_STATES: ObdConnectionState[] = [
  "scanning",
  "connecting",
  "discovering_services",
  "initializing_elm327",
  "vehicle_searching",
  "recovering",
];

function stateTone(state: ObdConnectionState) {
  if (state === "vehicle_connected") return "success";
  if (state === "vehicle_not_ready") return "warning";
  if (state === "error" || state === "permission_required" || state === "bluetooth_disabled") return "danger";
  if (BUSY_STATES.includes(state)) return "search";
  return "idle";
}

function sortDevices(devices: ObdDevice[], lastSuccessfulId?: string | null) {
  return [...devices].sort((a, b) => {
    if (lastSuccessfulId && a.id === lastSuccessfulId && b.id !== lastSuccessfulId) return -1;
    if (lastSuccessfulId && b.id === lastSuccessfulId && a.id !== lastSuccessfulId) return 1;
    if (a.isV011Candidate !== b.isV011Candidate) return a.isV011Candidate ? -1 : 1;
    return (b.rssi ?? -999) - (a.rssi ?? -999);
  });
}

export default function PairDeviceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const obd = useObdConnection();
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const [showTechnical, setShowTechnical] = useState(false);

  const devices = useMemo(
    () => sortDevices(obd.devices, obd.lastSuccessfulDevice?.id),
    [obd.devices, obd.lastSuccessfulDevice?.id],
  );
  const busy = BUSY_STATES.includes(obd.state);
  const tone = stateTone(obd.state);
  const connected = obd.state === "vehicle_connected";
  const adapterReady = obd.state === "vehicle_not_ready";
  const isDark = colors.mode === "dark";
  const pageGradient: readonly [string, string, string] = isDark
    ? ["#050607", "#0B0B0B", "#11100E"]
    : ["#F6F7F9", "#FFFFFF", "#F1F5F9"];
  const cardBg = isDark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.96)";
  const rowBg = isDark ? "rgba(0,0,0,0.18)" : "#F8FAFC";
  const subtleBorder = isDark ? "rgba(255,255,255,0.10)" : "#E3E8EF";

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: busy ? 1200 : 1800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1550,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1550,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    floatLoop.start();

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
      pulse.setValue(0);
      float.setValue(0);
    };
  }, [busy, float, pulse]);

  const segments = useSegments();
  const inTabs = (segments as string[]).includes("(tabs)");
  const tabBarReserve = inTabs ? 118 : 0;

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, busy ? 1.18 : 1.08],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.46, 0.16, 0],
  });

  const floatY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  const primaryAction = async () => {
    if (connected || adapterReady) {
      router.push("/diagnostics");
      return;
    }
    if (devices[0]) {
      await obd.connect(devices[0]);
      router.push("/obd-connect");
      return;
    }
    await obd.scan();
  };

  const heroColors: readonly [string, string, string] =
    tone === "success"
      ? ["#22C55E", "#16A34A", "#0F8A3B"]
      : tone === "warning"
        ? ["#F59E0B", "#FF6A00", "#D97706"]
        : tone === "danger"
          ? ["#EF4444", "#DC2626", "#991B1B"]
          : tone === "search"
            ? ["#2563EB", "#7C3AED", "#06B6D4"]
            : ["#FF8A24", "#FF6A00", "#E65C00"];

  const title =
    connected
      ? "تم ربط جهاز مفك"
      : adapterReady
        ? "الجهاز متصل"
        : busy
          ? "جاري البحث عن جهاز مفك"
          : devices.length > 0
            ? "اختر جهاز مفك"
            : "اقتران جهاز مفك";

  const subtitle =
    connected
      ? "تم الاتصال بالقطعة والسيارة. تقدر الآن تبدأ قراءة بيانات المركبة."
      : adapterReady
        ? "القطعة متصلة، شغل السيارة أو ضع المفتاح على وضع ACC ثم أعد المحاولة."
        : "ركّب قطعة مفك، شغّل السويتش، ثم ابحث. إذا أغلقت التطبيق نعيد الربط تلقائيًا عند فتحه.";

  const primaryLabel =
    connected || adapterReady
      ? "التشخيص"
      : busy
        ? "جاري البحث"
        : devices.length > 0
          ? "الاتصال بأقرب قطعة"
          : "البحث عن جهاز مفك";

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 12 + tabBarReserve, backgroundColor: colors.background }]}>
      <LinearGradient colors={pageGradient} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.glowTop} />

      <View style={[styles.topbar, { flexDirection: rowDir }]}>
        <Pressable style={({ pressed }) => [styles.iconButton, !isDark && styles.lightIconShadow, { backgroundColor: colors.card, borderColor: subtleBorder }, pressed && styles.pressed]} onPress={goBack}>
          <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.topbarCopy}>
          <ArabicText style={[styles.topbarTitle, { color: colors.foreground }]}>اقتران الجهاز</ArabicText>
          <ArabicText style={[styles.topbarSubtitle, { color: colors.mutedForeground }]}>جهاز مفك OBD-II</ArabicText>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient colors={heroColors} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlowOne} />
          <View pointerEvents="none" style={styles.heroGlowTwo} />
          <View style={styles.heroIconWrap}>
            <Animated.View
              pointerEvents="none"
              style={[styles.pulseRing, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]}
            />
            <Animated.View style={[styles.heroPulse, { transform: [{ translateY: floatY }] }]}>
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name={connected ? "checkmark" : "bluetooth-outline"} size={34} color="#FFFFFF" />
              )}
            </Animated.View>
          </View>

          <ArabicText style={styles.heroTitle}>{title}</ArabicText>
          <ArabicText style={styles.heroSubtitle}>{subtitle}</ArabicText>

          <View style={[styles.statusPill, { flexDirection: rowDir }]}>
            <Ionicons
              name={connected ? "checkmark-circle" : busy ? "radio-outline" : tone === "danger" ? "alert-circle-outline" : "information-circle-outline"}
              size={16}
              color="#FFFFFF"
            />
            <ArabicText fill style={styles.statusPillText}>
              {connected
                ? obd.vehicleInfo?.vin
                  ? "الجهاز جاهز للقراءة"
                  : obd.vehicleInfo?.status === "complete"
                    ? "متصل — تعذر قراءة VIN"
                    : "جارٍ قراءة رقم الهيكل"
                : adapterReady
                  ? "القطعة متصلة، بانتظار السيارة"
                  : obd.userMessage ?? "جاهز للبدء"}
            </ArabicText>
          </View>
          {connected && obd.vehicleInfo?.vin ? (
            <Text style={styles.vinText}>{obd.vehicleInfo.vin}</Text>
          ) : null}
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <ArabicText style={styles.sectionHint}>قبل البدء</ArabicText>
          <ArabicText style={[styles.sectionTitle, { color: colors.foreground }]}>تأكد من هذه الخطوات</ArabicText>
        </View>

        <View style={[styles.stepsCard, !isDark && styles.lightCardShadow, { backgroundColor: cardBg, borderColor: subtleBorder }]}>
          {STEPS.map((step, index) => {
            const done = connected || adapterReady || (busy && index === 0);
            const active = !connected && !adapterReady && index === (busy ? 1 : 0);

            return (
              <View key={step} style={[styles.stepRow, { flexDirection: rowDir }]}>
                <View style={[styles.stepIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#F8FAFC", borderColor: subtleBorder }, done ? styles.stepDone : active ? styles.stepActive : null]}>
                  {done ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.stepNumber, { color: colors.mutedForeground }]}>{(index + 1).toLocaleString("ar-SA")}</Text>
                  )}
                </View>
                <ArabicText fill style={[styles.stepText, active && styles.stepTextActive, { color: active ? colors.foreground : colors.mutedForeground }]}>{step}</ArabicText>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <ArabicText style={styles.sectionHint}>الأجهزة القريبة</ArabicText>
          <ArabicText style={[styles.sectionTitle, { color: colors.foreground }]}>{devices.length ? "اختر القطعة للاتصال" : "ابدأ البحث لعرض جهاز مفك"}</ArabicText>
        </View>

        <View style={[styles.devicesCard, !isDark && styles.lightCardShadow, { backgroundColor: cardBg, borderColor: subtleBorder }]}>
          {devices.length ? (
            devices.map((device) => (
              <Pressable
                key={device.id}
                onPress={() => void obd.connect(device)}
                disabled={busy}
                style={({ pressed }) => [styles.deviceRow, { backgroundColor: rowBg, borderColor: subtleBorder, flexDirection: rowDir }, pressed && styles.pressed, busy && styles.disabled]}
              >
                <View style={styles.deviceIcon}>
                  <Ionicons name="hardware-chip-outline" size={21} color="#FF6A00" />
                </View>
                <View style={styles.deviceCopy}>
                  <ArabicText style={[styles.deviceName, { color: colors.foreground }]}>
                    {!device.name || device.name === "جهاز BLE بدون اسم" ? "قطعة مفك" : device.name}
                  </ArabicText>
                  <ArabicText style={[styles.deviceMeta, { color: colors.mutedForeground }]}>
                    تم العثور عليه بالقرب منك
                    {obd.lastSuccessfulDevice?.id === device.id ? " · آخر اتصال ناجح" : ""}
                  </ArabicText>
                </View>
                <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyDevice}>
              <Ionicons name="bluetooth-outline" size={24} color="#FF6A00" style={{ alignSelf: "flex-end" }} />
              <ArabicText style={[styles.emptyTitle, { color: colors.foreground }]}>ما ظهرت أجهزة بعد</ArabicText>
              <ArabicText style={[styles.emptyText, { color: colors.mutedForeground }]}>قرب الجوال من القطعة وتأكد أن البلوتوث مفعل، ثم اضغط البحث.</ArabicText>
            </View>
          )}
        </View>

        {obd.userMessage && (obd.state === "error" || obd.technicalError) ? (
          <View style={[styles.errorCard, { backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "#FEF2F2", borderColor: "rgba(239,68,68,0.28)", flexDirection: rowDir }]}>
            <Ionicons name="alert-circle-outline" size={21} color="#FCA5A5" />
            <ArabicText fill style={[styles.errorText, { color: isDark ? "#FECACA" : "#991B1B" }]}>
              {obd.userMessage}
            </ArabicText>
          </View>
        ) : null}
        {obd.technicalError ? (
          <Pressable onPress={() => setShowTechnical((value) => !value)}>
            <ArabicText style={[styles.deviceMeta, { color: colors.mutedForeground, marginTop: 8 }]}>
              {showTechnical ? "إخفاء التفاصيل التقنية" : "تفاصيل تقنية"}
            </ArabicText>
          </Pressable>
        ) : null}
        {obd.technicalError && showTechnical ? (
          <Text style={[styles.deviceMeta, { color: colors.mutedForeground, marginTop: 6 }]}>{obd.technicalError}</Text>
        ) : null}
      </ScrollView>

      <View style={[styles.actions, { backgroundColor: colors.background }]}>
        <Pressable
          style={({ pressed }) => [styles.primaryButtonFrame, pressed && styles.primaryPressed, busy && styles.disabled]}
          onPress={() => void primaryAction()}
          disabled={busy}
        >
          <LinearGradient colors={heroColors} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.primaryButtonGradient, { flexDirection: rowDir }]}>
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name={connected || adapterReady ? "pulse-outline" : devices.length ? "link-outline" : "search-outline"} size={18} color="#FFFFFF" />
            )}
            <Text style={styles.primaryText}>{primaryLabel}</Text>
          </LinearGradient>
        </Pressable>

        {busy ? (
          <Pressable onPress={() => void obd.stopScan()} style={({ pressed }) => [styles.secondaryButton, !isDark && styles.lightIconShadow, { backgroundColor: colors.card, borderColor: subtleBorder }, pressed && styles.pressed]}>
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>إيقاف البحث</Text>
          </Pressable>
        ) : obd.state === "error" || obd.state === "disconnected" || obd.state === "vehicle_not_ready" ? (
          <Pressable onPress={() => void obd.reconnect()} style={({ pressed }) => [styles.secondaryButton, !isDark && styles.lightIconShadow, { backgroundColor: colors.card, borderColor: subtleBorder }, pressed && styles.pressed]}>
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>إعادة بناء الجلسة</Text>
          </Pressable>
        ) : devices.length > 0 && !connected ? (
          <Pressable onPress={() => void obd.scan()} style={({ pressed }) => [styles.secondaryButton, !isDark && styles.lightIconShadow, { backgroundColor: colors.card, borderColor: subtleBorder }, pressed && styles.pressed]}>
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>إعادة البحث</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1,
    paddingHorizontal: 18,
    backgroundColor: "#0B0B0B",
  },
  glowTop: {
    position: "absolute",
    top: -100,
    right: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,106,0,0.10)",
  },
  topbar: {
    alignItems: "center",
    gap: 12,
    paddingBottom: 14,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  lightIconShadow: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  topbarCopy: {
    flex: 1,
    direction: "ltr",
    alignItems: "stretch",
  },
  topbarTitle: {
    color: "#F7F7F7",
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    textAlign: "right",
    writingDirection: "rtl",
  },
  topbarSubtitle: {
    marginTop: 3,
    color: "rgba(255,255,255,0.54)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textAlign: "right",
    writingDirection: "rtl",
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    gap: 4,
    paddingBottom: 20,
  },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    alignItems: "stretch",
    overflow: "hidden",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  heroGlowOne: {
    position: "absolute",
    top: -72,
    left: -48,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  heroGlowTwo: {
    position: "absolute",
    bottom: -82,
    right: -72,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(0,0,0,0.13)",
  },
  heroIconWrap: {
    alignSelf: "center",
    width: 118,
    height: 118,
    borderRadius: 59,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  pulseRing: {
    position: "absolute",
    width: 102,
    height: 102,
    borderRadius: 51,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  heroPulse: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  heroTitle: {
    alignSelf: "stretch",
    marginTop: 20,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    lineHeight: 36,
    textAlign: "right",
    writingDirection: "rtl",
  },
  heroSubtitle: {
    alignSelf: "stretch",
    marginTop: 9,
    color: "rgba(255,255,255,0.91)",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "right",
    writingDirection: "rtl",
  },
  statusPill: {
    marginTop: 16,
    alignSelf: "stretch",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    backgroundColor: "rgba(0,0,0,0.14)",
  },
  statusPillText: {
    flex: 1,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textAlign: "right",
    writingDirection: "rtl",
  },
  vinText: {
    marginTop: 10,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 1,
    textAlign: "left",
    writingDirection: "ltr",
  },
  sectionHeader: {
    alignItems: "stretch",
    paddingTop: 22,
    paddingBottom: 10,
    gap: 2,
  },
  sectionHint: {
    color: "#FF6A00",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textAlign: "right",
    writingDirection: "rtl",
  },
  sectionTitle: {
    color: "#F7F7F7",
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    textAlign: "right",
    writingDirection: "rtl",
  },
  stepsCard: {
    gap: 12,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.055)",
  },
  lightCardShadow: {
    shadowColor: "#1F2937",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  stepRow: {
    alignItems: "center",
    gap: 11,
    minHeight: 44,
  },
  stepIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  stepDone: {
    borderColor: "rgba(34,197,94,0.50)",
    backgroundColor: "#22C55E",
  },
  stepActive: {
    borderColor: "rgba(255,106,0,0.65)",
    backgroundColor: "rgba(255,106,0,0.20)",
  },
  stepNumber: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  stepText: {
    flex: 1,
    color: "rgba(255,255,255,0.69)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "right",
    writingDirection: "rtl",
  },
  stepTextActive: {
    fontFamily: "Inter_700Bold",
  },
  devicesCard: {
    gap: 10,
    padding: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.055)",
  },
  deviceRow: {
    alignItems: "center",
    gap: 11,
    minHeight: 68,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  deviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,106,0,0.13)",
  },
  deviceCopy: {
    flex: 1,
    minWidth: 0,
    alignItems: "stretch",
    gap: 4,
  },
  deviceName: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    textAlign: "right",
    writingDirection: "rtl",
  },
  deviceMeta: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textAlign: "right",
    writingDirection: "rtl",
  },
  emptyDevice: {
    alignItems: "stretch",
    gap: 8,
    paddingVertical: 18,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    textAlign: "right",
    writingDirection: "rtl",
  },
  emptyText: {
    color: "rgba(255,255,255,0.58)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "right",
    writingDirection: "rtl",
  },
  errorCard: {
    marginTop: 14,
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.28)",
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  errorText: {
    flex: 1,
    color: "#FECACA",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textAlign: "right",
    writingDirection: "rtl",
  },
  actions: {
    gap: 10,
    paddingTop: 12,
    zIndex: 2,
  },
  primaryButtonFrame: {
    borderRadius: 18,
    overflow: "hidden",
  },
  primaryButtonGradient: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
  },
  primaryText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    textAlign: "center",
    writingDirection: "rtl",
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  secondaryText: {
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    textAlign: "center",
    writingDirection: "rtl",
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  primaryPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.72,
  },
});
