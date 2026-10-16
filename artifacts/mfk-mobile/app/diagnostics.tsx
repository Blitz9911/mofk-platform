import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useObdConnection } from "@/src/obd";
import type { ObdConnectionState } from "@/src/obd";

const STATE_TEXT: Record<ObdConnectionState, string> = {
  idle: "غير متصل",
  permission_required: "صلاحية البلوتوث مطلوبة",
  bluetooth_disabled: "البلوتوث غير مفعل",
  scanning: "جارٍ البحث",
  device_found: "تم العثور على الجهاز",
  connecting: "جارٍ الاتصال",
  discovering_services: "جارٍ اكتشاف الخدمات",
  initializing_elm327: "جارٍ تهيئة القطعة",
  vehicle_searching: "جارٍ الاتصال بـ ECU",
  connected: "تم الاتصال",
  vehicle_not_ready: "ECU غير متاح",
  vehicle_connected: "Ready",
  recovering: "إعادة المحاولة",
  disconnecting: "جارٍ فصل الاتصال",
  disconnected: "غير متصل",
  error: "خطأ في القطعة",
};

const CARDS = [
  {
    href: "/obd-diagnostics" as const,
    title: "فحص الأعطال",
    english: "Stored · Pending · Permanent",
    body: "فحص الأكواد المخزنة والمعلقة والدائمة مع جاهزية الأنظمة وFreeze Frame.",
    action: "بدء الفحص",
    icon: "search-circle-outline" as const,
  },
  {
    href: "/obd-live" as const,
    title: "البيانات الحية",
    english: "Live Data",
    body: "القراءات القياسية التي تعلن السيارة دعمها، مباشرة من جلسة البلوتوث.",
    action: "عرض القراءات",
    icon: "pulse-outline" as const,
  },
  {
    href: "/obd-vehicle-info" as const,
    title: "معلومات المركبة",
    english: "VIN · CALID · CVN",
    body: "رقم الهيكل والمعايرة واسم وحدة التحكم من Mode 09، دون خلطها مع البيانات الحية.",
    action: "عرض المعلومات",
    icon: "car-outline" as const,
  },
  {
    href: "/obd-capability-audit" as const,
    title: "فحص القدرات",
    english: "Read-only PID audit",
    body: "يكتشف ما تدعمه السيارة والقطعة، وما يفكّه مفك، وما ينقص في التطبيق. قراءة فقط بدون مسح أعطال.",
    action: "بدء الفحص",
    icon: "analytics-outline" as const,
  },
];

export default function DiagnosticsHubScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const obd = useObdConnection();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const ready = obd.state === "vehicle_connected";

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="chevron-forward" size={19} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerRight}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>تشخيص المركبة</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>جلسة OBD مباشرة من القطعة</Text>
        </View>
        <Pressable onPress={() => router.push("/obd-connect")} style={[styles.pairBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="bluetooth-outline" size={16} color="#fff" />
          <Text style={styles.pairText}>{ready ? "الاتصال" : "اقتران"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statusDot, { backgroundColor: ready ? "#22c55e" : colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: colors.foreground }]}>{STATE_TEXT[obd.state]}</Text>
            <Text style={[styles.statusSub, { color: colors.mutedForeground, writingDirection: obd.vehicleInfo?.vin ? "ltr" : "rtl", textAlign: obd.vehicleInfo?.vin ? "left" : "right" }]}>
              {ready
                ? obd.vehicleInfo?.vin
                  ? obd.vehicleInfo.vin
                  : `${obd.initResult?.detectedProtocol ?? "بروتوكول غير محدد"} · ${obd.initResult?.supportedPids.length ?? 0} PID`
                : obd.userMessage ?? "اربط القطعة ثم افتح البيانات الحية أو فحص الأعطال."}
            </Text>
            {ready && obd.vehicleInfo?.vin ? (
              <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
                {obd.initResult?.detectedProtocol ?? "بروتوكول"} · {obd.initResult?.supportedPids.length ?? 0} PID
              </Text>
            ) : null}
          </View>
        </View>

        {CARDS.map((card) => (
          <Pressable key={card.href} onPress={() => router.push(card.href as never)}>
            <LinearGradient
              colors={colors.mode === "dark" ? ["#1A140F", "#121212"] : ["#FFFFFF", "#F8FAFC"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.card, { borderColor: colors.border }]}
            >
              <View style={[styles.iconBox, { backgroundColor: "#FF6A0022" }]}>
                <Ionicons name={card.icon} size={26} color="#FF6A00" />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{card.title}</Text>
              <Text style={styles.cardEn}>{card.english}</Text>
              <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>{card.body}</Text>
              <View style={styles.cardBtn}>
                <Text style={styles.cardBtnText}>{card.action}</Text>
                <Ionicons name="chevron-back" size={16} color="#fff" />
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const rtl = { textAlign: "right" as const, writingDirection: "rtl" as const };

const styles = StyleSheet.create({
  container: { flex: 1, direction: "rtl" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerRight: { alignItems: "flex-end", gap: 2, flex: 1 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", ...rtl },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", ...rtl },
  pairBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20 },
  pairText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statusCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: "center" },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusTitle: { fontSize: 15, fontFamily: "Inter_700Bold", ...rtl },
  statusSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 20, ...rtl },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8, alignItems: "flex-end", overflow: "hidden" },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold", ...rtl },
  cardEn: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#FF8A24", ...rtl },
  cardBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 22, ...rtl },
  cardBtn: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: "#FF6A00" },
  cardBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
});
