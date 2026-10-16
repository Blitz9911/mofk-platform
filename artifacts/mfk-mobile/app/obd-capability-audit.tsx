import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArabicText } from "@/components/ArabicText";
import { useColors } from "@/hooks/useColors";
import { rowDir } from "@/lib/layout";
import { useObdConnection } from "@/src/obd";
import type { CapabilityAuditResult } from "@/src/obd/diagnostics/obd-diagnostic.types";

export default function ObdCapabilityAuditScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const obd = useObdConnection();
  const ready = obd.state === "vehicle_connected";
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<CapabilityAuditResult | null>(obd.getLastCapabilityAudit());

  const run = async () => {
    if (!ready) {
      Alert.alert("غير متصل", "اربط القطعة والسيارة أولاً. الفحص يستخدم نفس الجلسة الحالية.");
      return;
    }
    setBusy(true);
    try {
      const result = await obd.runCapabilityAudit();
      setReport(result);
    } catch (error) {
      Alert.alert("تعذر الفحص", error instanceof Error ? error.message : "فشل فحص القدرات.");
    } finally {
      setBusy(false);
    }
  };

  const shareReport = async () => {
    if (!report) return;
    await Share.share({
      message: `${report.text}\n\n${JSON.stringify(report.json, null, 2)}`,
    });
  };

  const json = report?.json;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, flexDirection: rowDir }]}>
        <View style={{ flex: 1 }}>
          <ArabicText style={[styles.title, { color: colors.foreground }]}>فحص القدرات</ArabicText>
          <ArabicText style={[styles.sub, { color: colors.mutedForeground }]}>قراءة فقط · لا مسح أعطال</ArabicText>
        </View>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="close" size={18} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom, gap: 14 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ArabicText style={[styles.body, { color: colors.mutedForeground }]}>
            أبقِ المحرك أو السويتش شغالاً ولا تغادر الشاشة. الفحص يوقف البيانات الحية مؤقتاً ثم يعيدها. لا يرسل 04 ولا يمسح الأكواد.
          </ArabicText>
          <ArabicText style={[styles.body, { color: colors.mutedForeground }]}>
            {ready ? obd.userMessage ?? "السيارة متصلة. اضغط بدء الفحص." : "السيارة غير متصلة."}
          </ArabicText>
        </View>

        <Pressable
          onPress={() => void run()}
          disabled={busy || !ready}
          style={[styles.primary, { backgroundColor: colors.primary, opacity: busy || !ready ? 0.6 : 1 }]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="analytics-outline" size={18} color="#fff" />}
          <Text style={styles.primaryText}>{busy ? "جاري الفحص..." : "بدء فحص القدرات"}</Text>
        </Pressable>

        {json ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ArabicText style={[styles.cardTitle, { color: colors.foreground }]}>النتيجة</ArabicText>
            <Text style={[styles.mono, { color: colors.foreground }]}>{report?.text}</Text>
            <Pressable onPress={() => void shareReport()} style={[styles.share, { borderColor: colors.border }]}>
              <Ionicons name="share-outline" size={16} color={colors.foreground} />
              <Text style={[styles.shareText, { color: colors.foreground }]}>مشاركة / نسخ التقرير</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  body: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 22 },
  primary: { minHeight: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  mono: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 20, textAlign: "left", writingDirection: "ltr" },
  share: { minHeight: 46, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  shareText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
