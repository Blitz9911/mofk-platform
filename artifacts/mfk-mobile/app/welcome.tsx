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

function MetricPill({ icon, label, value, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.metricPill}>
      <Ionicons name={icon} size={15} color={color} />
      <View style={styles.metricTextWrap}>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function CarVisual() {
  return (
    <View style={styles.visualCard}>
      <View style={styles.scanLine} />
      <View style={styles.carHalo} />
      <View style={styles.carCabin} />
      <View style={styles.carBody}>
        <View style={[styles.wheel, styles.wheelLeft]} />
        <View style={[styles.wheel, styles.wheelRight]} />
      </View>
      <View style={[styles.hotspot, styles.hotspotEngine]} />
      <View style={[styles.hotspot, styles.hotspotBattery]} />
      <View style={styles.obdChip}>
        <View style={styles.liveDot} />
        <Text style={styles.obdText}>OBD جاهز</Text>
      </View>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient
        colors={["#080808", "#050505", "#100904"]}
        locations={[0, 0.68, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <View style={styles.content}>
        <View style={styles.topbar}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>م</Text>
          </View>
          <View style={styles.langChip}>
            <Ionicons name="globe-outline" size={12} color="rgba(255,255,255,0.46)" />
            <Text style={styles.langText}>AR</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <CarVisual />

          <View style={styles.copy}>
            <Text style={styles.eyebrow}>مفك للعناية الذكية بالمركبة</Text>
            <Text style={styles.title}>افهم سيارتك قبل ما تفاجئك.</Text>
            <Text style={styles.description}>
              تابع الصيانة، الأعطال، المركبات، والتنبيهات من مكان واحد بتجربة عربية واضحة ومصممة للجوال.
            </Text>
          </View>

          <View style={styles.metrics}>
            <MetricPill icon="pulse-outline" label="حالة المركبة" value="87%" color="#00C48C" />
            <MetricPill icon="construct-outline" label="الصيانة" value="قريبة" color="#FFB800" />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.86 : 1 }]}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.primaryText}>إنشاء حساب جديد</Text>
            <Ionicons name="arrow-back" size={18} color="#050505" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.82 : 1 }]}
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
  root: { backgroundColor: "#080808", flex: 1 },
  topGlow: {
    backgroundColor: "#FF650018",
    borderRadius: 180,
    height: 220,
    left: -90,
    position: "absolute",
    top: 72,
    width: 220,
  },
  bottomGlow: {
    backgroundColor: "#FF650020",
    borderRadius: 260,
    bottom: -140,
    height: 320,
    position: "absolute",
    right: -140,
    width: 320,
  },
  content: { flex: 1, paddingHorizontal: 22, paddingBottom: 22, paddingTop: 10 },
  topbar: {
    alignItems: "center",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: "#FF6500",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    shadowColor: "#FF6500",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    width: 42,
  },
  brandMarkText: { color: "#050505", fontFamily: "Inter_700Bold", fontSize: 21 },
  langChip: {
    alignItems: "center",
    backgroundColor: "#111111",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row-reverse",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  langText: { color: "rgba(255,255,255,0.58)", fontFamily: "Inter_700Bold", fontSize: 12 },
  hero: { flex: 1, justifyContent: "center", gap: 22 },
  visualCard: {
    alignSelf: "center",
    backgroundColor: "#111111",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 24,
    borderWidth: 1,
    height: 230,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  scanLine: {
    backgroundColor: "#FF650018",
    height: 2,
    left: 0,
    position: "absolute",
    right: 0,
    top: 92,
  },
  carHalo: {
    alignSelf: "center",
    backgroundColor: "#FF650014",
    borderRadius: 90,
    height: 150,
    position: "absolute",
    width: 220,
  },
  carBody: {
    alignSelf: "center",
    borderColor: "#FF6500",
    borderRadius: 28,
    borderWidth: 3,
    height: 58,
    marginTop: 34,
    shadowColor: "#FF6500",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    width: 188,
  },
  carCabin: {
    alignSelf: "center",
    borderColor: "#FF6500",
    borderRadius: 8,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 3,
    height: 42,
    position: "absolute",
    top: 78,
    width: 82,
  },
  wheel: {
    backgroundColor: "#080808",
    borderColor: "#FF6500",
    borderRadius: 999,
    borderWidth: 3,
    bottom: -17,
    height: 34,
    position: "absolute",
    width: 34,
  },
  wheelLeft: { left: 26 },
  wheelRight: { right: 26 },
  hotspot: {
    borderRadius: 999,
    height: 10,
    position: "absolute",
    shadowOpacity: 0.8,
    shadowRadius: 12,
    width: 10,
  },
  hotspotEngine: { backgroundColor: "#00C48C", left: "43%", shadowColor: "#00C48C", top: 125 },
  hotspotBattery: { backgroundColor: "#FFB800", right: "38%", shadowColor: "#FFB800", top: 138 },
  obdChip: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#00C48C14",
    borderColor: "#00C48C35",
    borderRadius: 999,
    borderWidth: 1,
    bottom: 20,
    flexDirection: "row-reverse",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: "absolute",
  },
  liveDot: { backgroundColor: "#00C48C", borderRadius: 4, height: 8, width: 8 },
  obdText: { color: "#00C48C", fontFamily: "Inter_700Bold", fontSize: 12 },
  copy: { alignItems: "center", gap: 10 },
  eyebrow: { color: "#FF6500", fontFamily: "Inter_700Bold", fontSize: 12 },
  title: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    lineHeight: 40,
    maxWidth: 310,
    textAlign: "center",
  },
  description: {
    color: "rgba(255,255,255,0.58)",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 27,
    maxWidth: 320,
    textAlign: "center",
  },
  metrics: { flexDirection: "row-reverse", gap: 10 },
  metricPill: {
    alignItems: "center",
    backgroundColor: "#111111",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row-reverse",
    gap: 9,
    padding: 12,
  },
  metricTextWrap: { alignItems: "flex-end", flex: 1, gap: 2 },
  metricValue: { fontFamily: "Inter_700Bold", fontSize: 14 },
  metricLabel: { color: "rgba(255,255,255,0.46)", fontFamily: "Inter_400Regular", fontSize: 11 },
  actions: { gap: 10 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#FF6500",
    borderRadius: 14,
    flexDirection: "row-reverse",
    gap: 8,
    height: 56,
    justifyContent: "center",
  },
  primaryText: { color: "#050505", fontFamily: "Inter_700Bold", fontSize: 16 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#111111",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
  },
  secondaryText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 15 },
});
