import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

function StatusBarMock() {
  return (
    <View style={styles.status}>
      <Text style={styles.statusText}>٩:٤١</Text>
      <Text style={styles.statusText}>◉ WiFi ▰</Text>
    </View>
  );
}

function CarOutline() {
  return (
    <View style={styles.carVisual}>
      <View style={styles.carCabin} />
      <View style={styles.carBody}>
        <View style={[styles.wheel, styles.wheelLeft]} />
        <View style={[styles.wheel, styles.wheelRight]} />
      </View>
      <View style={[styles.hotspot, styles.hotspotEngine]} />
      <View style={[styles.hotspot, styles.hotspotBattery]} />
    </View>
  );
}

export default function WelcomeScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient
        colors={["#090A0B", "#070707", "#130B05"]}
        locations={[0, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.orangeGlow} />
      <View style={styles.content}>
        <StatusBarMock />

        <View style={styles.topbar}>
          <View />
          <View style={styles.langChip}>
            <Ionicons name="globe-outline" size={12} color="#8E949D" />
            <Text style={styles.langText}>EN</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <CarOutline />
          <Text style={styles.title}>تحكم كامل بسيارتك بلمسة واحدة</Text>
          <Text style={styles.description}>
            مفك يربطك بسيارتك لحظة بلحظة: الأعطال، الوقود، الصيانة، والموقع - كل شيء بلغة تفهمها.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.primaryText}>إنشاء حساب جديد</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.secondaryText}>لدي حساب بالفعل</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#050505", flex: 1 },
  orangeGlow: {
    backgroundColor: "#FF6A0022",
    borderRadius: 240,
    bottom: -120,
    height: 300,
    position: "absolute",
    right: -120,
    width: 300,
  },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 22, paddingTop: 8 },
  status: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  statusText: { color: "#F5F5F5", fontFamily: "Inter_700Bold", fontSize: 12 },
  topbar: {
    alignItems: "center",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  langChip: {
    alignItems: "center",
    backgroundColor: "#17181B",
    borderColor: "#24262B",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row-reverse",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  langText: { color: "#A8ADB5", fontFamily: "Inter_700Bold", fontSize: 12 },
  hero: { alignItems: "center", flex: 1, justifyContent: "center", paddingBottom: 42 },
  carVisual: {
    height: 150,
    justifyContent: "center",
    marginBottom: 30,
    position: "relative",
    width: 260,
  },
  carBody: {
    alignSelf: "center",
    borderColor: "#FF6A00",
    borderRadius: 28,
    borderWidth: 3,
    height: 56,
    marginTop: 38,
    shadowColor: "#FF6A00",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    width: 174,
  },
  carCabin: {
    borderColor: "#FF6A00",
    borderRadius: 7,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 3,
    height: 40,
    left: 91,
    position: "absolute",
    top: 36,
    width: 78,
  },
  wheel: {
    backgroundColor: "#08090A",
    borderColor: "#FF6A00",
    borderRadius: 999,
    borderWidth: 3,
    bottom: -17,
    height: 32,
    position: "absolute",
    width: 32,
  },
  wheelLeft: { left: 24 },
  wheelRight: { right: 24 },
  hotspot: {
    borderRadius: 999,
    height: 10,
    position: "absolute",
    shadowOpacity: 0.8,
    shadowRadius: 12,
    width: 10,
  },
  hotspotEngine: {
    backgroundColor: "#22C55E",
    left: 105,
    shadowColor: "#22C55E",
    top: 87,
  },
  hotspotBattery: {
    backgroundColor: "#EAB308",
    right: 103,
    shadowColor: "#EAB308",
    top: 96,
  },
  title: {
    color: "#F5F5F5",
    fontFamily: "Inter_700Bold",
    fontSize: 29,
    lineHeight: 39,
    marginBottom: 16,
    maxWidth: 280,
    textAlign: "center",
  },
  description: {
    color: "#8E949D",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 28,
    maxWidth: 300,
    textAlign: "center",
  },
  actions: { gap: 10 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#FF6A00",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#111214",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    height: 52,
    justifyContent: "center",
  },
  secondaryText: { color: "#F5F5F5", fontFamily: "Inter_700Bold", fontSize: 15 },
});
