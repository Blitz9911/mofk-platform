import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const STEPS = [
  "حدد منفذ OBD-II في سيارتك",
  "ركّب جهاز مفك",
  "شغّل السيارة واضغط بدء الاتصال",
];

export default function PairDeviceScreen() {
  const colors = useColors();
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
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={[styles.device, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.deviceTop, { backgroundColor: colors.primary }]} />
          <View style={styles.pinRow}>
            {[0, 1, 2, 3].map((pin) => (
              <View key={pin} style={[styles.pin, { backgroundColor: colors.border }]} />
            ))}
          </View>
          <Ionicons name={status === "success" ? "checkmark-circle" : "bluetooth-outline"} size={42} color={colors.primary} />
          <View style={styles.pinRow}>
            {[4, 5, 6, 7].map((pin) => (
              <View key={pin} style={[styles.pin, { backgroundColor: colors.border }]} />
            ))}
          </View>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>اربط جهاز مفك</Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          ركّب جهاز مفك في منفذ OBD-II ثم شغّل السيارة لبدء الاتصال.
        </Text>
      </View>

      <View style={styles.steps}>
        {STEPS.map((step, index) => (
          <View key={step} style={[styles.step, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
          </View>
        ))}
      </View>

      {status === "success" ? (
        <View style={[styles.successBox, { borderColor: "#22c55e40", backgroundColor: "#22c55e14" }]}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <Text style={[styles.successText, { color: colors.success }]}>تم ربط الجهاز بنجاح</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: status === "success" ? colors.success : colors.primary, opacity: pressed || status === "connecting" ? 0.8 : 1 },
          ]}
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
              {status === "success" ? "الانتقال إلى الرئيسية" : "بدء الاتصال"}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={goHome} style={styles.secondaryButton}>
          <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>سأربطه لاحقًا</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, gap: 28, justifyContent: "center", paddingHorizontal: 24 },
  header: { alignItems: "center", gap: 14 },
  device: {
    alignItems: "center",
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    height: 190,
    justifyContent: "center",
    overflow: "hidden",
    width: 164,
  },
  deviceTop: { height: 10, left: 34, position: "absolute", right: 34, top: 0 },
  pinRow: { flexDirection: "row", gap: 8 },
  pin: { borderRadius: 3, height: 16, width: 10 },
  title: { fontFamily: "Inter_700Bold", fontSize: 29, textAlign: "center" },
  description: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 25, textAlign: "center" },
  steps: { gap: 12 },
  step: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row-reverse",
    gap: 12,
    padding: 14,
  },
  stepNumber: {
    alignItems: "center",
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  stepNumberText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  stepText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 22, textAlign: "right" },
  successBox: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row-reverse",
    gap: 8,
    justifyContent: "center",
    padding: 14,
  },
  successText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  actions: { gap: 10 },
  primaryButton: {
    alignItems: "center",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  secondaryButton: { alignItems: "center", paddingVertical: 12 },
  secondaryText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
