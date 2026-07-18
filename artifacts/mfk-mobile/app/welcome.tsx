import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

export default function WelcomeScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.brandWrap}>
          <View style={[styles.logoMark, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Image source={require("@/assets/images/logo.png")} style={styles.logo} contentFit="contain" />
          </View>
          <Text style={[styles.brand, { color: colors.primary }]}>مفك</Text>
        </View>

        <View style={styles.hero}>
          <View style={[styles.glowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="car-sport-outline" size={42} color={colors.primary} />
            <View style={styles.signalRow}>
              <View style={[styles.signal, { backgroundColor: colors.primary }]} />
              <View style={[styles.signal, styles.signalDim]} />
              <View style={[styles.signal, styles.signalDim]} />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            افهم سيارتك قبل ما تخبرك
          </Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            مفك يجمع معلومات سيارتك، الصيانة، البنزين، التنبيهات والتشخيص في مكان واحد.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.primaryText}>إنشاء حساب</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => router.push("/login")}
          >
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>تسجيل الدخول</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, justifyContent: "space-between", padding: 24 },
  brandWrap: { alignItems: "center", gap: 12, paddingTop: 18 },
  logoMark: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    height: 82,
    justifyContent: "center",
    width: 82,
  },
  logo: { height: 34, width: 54 },
  brand: { fontFamily: "Inter_700Bold", fontSize: 24 },
  hero: { alignItems: "flex-end", gap: 18 },
  glowCard: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
    height: 168,
    justifyContent: "center",
    width: 168,
  },
  signalRow: { flexDirection: "row-reverse", gap: 6 },
  signal: { borderRadius: 999, height: 8, width: 34 },
  signalDim: { backgroundColor: "#3A3A3A" },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 34,
    lineHeight: 44,
    textAlign: "right",
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 27,
    textAlign: "right",
  },
  actions: { gap: 12, paddingBottom: 10 },
  primaryButton: {
    alignItems: "center",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    height: 56,
    justifyContent: "center",
  },
  secondaryText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
});
