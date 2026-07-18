import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STEPS = [
  "أدر مفتاح التشغيل إلى وضع ACC",
  "ركّب الجهاز في منفذ OBD-II أسفل عجلة القيادة",
  "فعّل البلوتوث في جوالك",
];

function StatusBarMock() {
  return (
    <View style={styles.status}>
      <Text style={styles.statusText}>٩:٤١</Text>
      <Text style={styles.statusText}>◉ WiFi ▰</Text>
    </View>
  );
}

export default function PairDeviceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "connecting" | "success">("idle");

  useEffect(() => {
    if (status !== "connecting") return;

    const timer = setTimeout(() => setStatus("success"), 2200);
    return () => clearTimeout(timer);
  }, [status]);

  const goHome = () => router.replace("/(tabs)");

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 18 }]}>
      <LinearGradient colors={["#090A0B", "#070707"]} style={StyleSheet.absoluteFill} />
      <StatusBarMock />

      <View style={styles.topbar}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-forward" size={18} color="#F5F5F5" />
        </Pressable>
        <Text style={styles.topbarTitle}>توصيل جهاز مفك</Text>
        <View style={styles.iconGhost} />
      </View>

      <View style={styles.center}>
        <View style={styles.outerRing}>
          <View style={styles.middleRing}>
            <View style={styles.innerRing}>
              {status === "connecting" ? (
                <ActivityIndicator color="#FF6A00" />
              ) : (
                <Ionicons
                  name={status === "success" ? "checkmark" : "wifi-outline"}
                  size={28}
                  color={status === "success" ? "#22C55E" : "#FF6A00"}
                />
              )}
            </View>
          </View>
        </View>

        <Text style={styles.title}>
          {status === "success" ? "تم ربط الجهاز بنجاح" : status === "idle" ? "اربط جهاز مفك" : "جاري البحث عن الجهاز..."}
        </Text>
        <Text style={styles.description}>
          {status === "success"
            ? "جهاز مفك الآن متصل بسيارتك ويبدأ باستقبال البيانات مباشرة."
            : "تأكد من اتباع الخطوات التالية لإتمام الربط"}
        </Text>

        <View style={styles.steps}>
          {STEPS.map((step, index) => {
            const done = status === "success" || index === 0;
            const active = status !== "success" && index === 1;

            return (
              <View key={step} style={styles.step}>
                <View style={[styles.stepDot, done ? styles.doneDot : active ? styles.activeDot : null]}>
                  {done ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                </View>
                <Text style={[styles.stepText, done ? styles.doneText : active ? styles.activeText : null]}>{step}</Text>
              </View>
            );
          })}
        </View>

        {status === "success" ? (
          <View style={styles.vehicleCard}>
            <Text style={styles.vehicleTitle}>تويوتا كامري 2022</Text>
            <Text style={styles.vehicleMeta}>لوحة أ ب ج 1234 · متصل الآن</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, status === "success" ? styles.successButton : null, { opacity: pressed ? 0.86 : 1 }]}
          onPress={() => {
            if (status === "success") {
              goHome();
              return;
            }

            // TODO: Replace this Phase 1 mock with Bluetooth OBD-II pairing logic.
            setStatus("connecting");
          }}
          disabled={status === "connecting"}
        >
          {status === "connecting" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              {status === "success" ? "الانتقال إلى لوحة التحكم" : "تخطي (محاكاة النجاح)"}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={goHome} style={styles.helpButton}>
          <Text style={styles.helpText}>{status === "success" ? "تم" : "الجهاز ما يتوصل؟ عرض المساعدة"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#050505", flex: 1, paddingHorizontal: 22 },
  status: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  statusText: { color: "#F5F5F5", fontFamily: "Inter_700Bold", fontSize: 12 },
  topbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#151618",
    borderColor: "#24262B",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  iconGhost: { height: 36, width: 36 },
  topbarTitle: { color: "#F5F5F5", fontFamily: "Inter_700Bold", fontSize: 18 },
  center: { alignItems: "center", flex: 1, justifyContent: "center", paddingBottom: 20 },
  outerRing: {
    alignItems: "center",
    borderColor: "#2E190A",
    borderRadius: 999,
    borderWidth: 1,
    height: 112,
    justifyContent: "center",
    marginBottom: 46,
    width: 112,
  },
  middleRing: {
    alignItems: "center",
    backgroundColor: "#2A1608",
    borderColor: "#5E2E0C",
    borderRadius: 999,
    borderWidth: 1,
    height: 78,
    justifyContent: "center",
    width: 78,
  },
  innerRing: {
    alignItems: "center",
    borderColor: "#FF6A00",
    borderRadius: 999,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  title: { color: "#F5F5F5", fontFamily: "Inter_700Bold", fontSize: 23, marginBottom: 12, textAlign: "center" },
  description: { color: "#8E949D", fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  steps: { gap: 16, marginTop: 28, width: "100%" },
  step: { alignItems: "center", flexDirection: "row-reverse", gap: 10 },
  stepDot: { backgroundColor: "#303238", borderRadius: 999, height: 13, width: 13, alignItems: "center", justifyContent: "center" },
  doneDot: { backgroundColor: "#22C55E", height: 16, width: 16 },
  activeDot: { backgroundColor: "#050505", borderColor: "#FF6A00", borderWidth: 2 },
  stepText: { color: "#5E646D", flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 22, textAlign: "right" },
  doneText: { color: "#F5F5F5" },
  activeText: { color: "#F5F5F5" },
  vehicleCard: {
    backgroundColor: "#111214",
    borderColor: "#24262B",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 24,
    padding: 14,
    width: "100%",
  },
  vehicleTitle: { color: "#F5F5F5", fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "right" },
  vehicleMeta: { color: "#8E949D", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 5, textAlign: "right" },
  actions: { gap: 10 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#FF6A00",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
  },
  successButton: { backgroundColor: "#22C55E" },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  helpButton: { alignItems: "center", paddingVertical: 8 },
  helpText: { color: "#FF6A00", fontFamily: "Inter_700Bold", fontSize: 13 },
});
