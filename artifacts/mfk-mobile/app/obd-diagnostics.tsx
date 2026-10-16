import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useObdConnection } from "@/src/obd";

export default function ObdDiagnosticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const obd = useObdConnection();
  const [busy, setBusy] = useState(false);
  const ready = obd.state === "vehicle_connected";
  const scan = obd.dtcScan;

  const runScan = async () => {
    if (!ready) {
      Alert.alert("غير متصل", "اتصل بالقطعة أولاً من شاشة الاقتران. هذه الشاشة تستخدم نفس الجلسة.");
      return;
    }
    setBusy(true);
    try {
      await obd.runDiagnosticScan();
    } finally {
      setBusy(false);
    }
  };

  const confirmClear = () => {
    Alert.alert(
      "مسح أكواد الأعطال",
      "مسح الأكواد لا يعني إصلاح العطل. قد تُفقد بيانات Freeze Frame. أرسل Mode 04 فقط إذا كنت متأكداً.",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "متابعة",
          style: "destructive",
          onPress: () => {
            Alert.alert("تأكيد أخير", "هل تريد إرسال أمر المسح الآن؟", [
              { text: "إلغاء", style: "cancel" },
              {
                text: "مسح الأكواد",
                style: "destructive",
                onPress: () => {
                  void obd.clearTroubleCodesAfterConfirmation().catch(() => {
                    Alert.alert("تعذر المسح", "لم يتم إرسال الأمر.");
                  });
                },
              },
            ]);
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="chevron-forward" size={19} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={[styles.title, { color: colors.foreground }]}>فحص السيارة</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>كل الوحدات اللي ترد على منفذ التشخيص</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 14 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {scan?.milOn ? "MIL مضاء" : scan ? "MIL مطفأ أو غير مؤكد" : "لم يُجرَ فحص بعد"}
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            مخزن {scan?.storedCount ?? 0} · معلق {scan?.pendingCount ?? 0} · دائم {scan?.permanentCount ?? 0}
            {scan?.codes?.filter((code) => code.system && code.system !== "powertrain").length
              ? ` · هيكل ${scan.codes.filter((code) => code.system !== "powertrain").length}`
              : ""}
          </Text>
        </View>

        {scan?.modules?.length ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>وحدات السيارة</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              نقرأ كل وحدة ترد من القطعة. اللي ما ترد غالباً على شبكة ثانية أو مقفلة من البوابة.
            </Text>
            {scan.modules.map((item) => (
              <View key={item.header} style={[styles.row, { borderColor: colors.border }]}>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>
                  {item.status === "responded" ? (item.codes.length ? `${item.codes.length} كود` : "ردّت") : item.status === "error" ? "خطأ" : "لا بيانات"}
                </Text>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.nameAr}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {scan?.tireCheck ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: scan.tireCheck.availability === "ok" ? "#16a34a" : "#b45309" }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>فحص الإطارات</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{scan.tireCheck.summaryAr}</Text>
            <View style={styles.tireGrid}>
              {scan.tireCheck.wheels.map((wheel) => (
                <View key={wheel.id} style={[styles.tireCell, { borderColor: colors.border }]}>
                  <Text style={[styles.tireLabel, { color: colors.mutedForeground }]}>{wheel.labelAr}</Text>
                  <Text style={[styles.tireValue, { color: wheel.status === "low" ? "#ef4444" : colors.foreground }]}>
                    {wheel.psi != null ? `${wheel.psi} psi` : "—"}
                  </Text>
                  <Text style={[styles.body, { color: colors.mutedForeground }]}>
                    {wheel.status === "low" ? "منخفض" : wheel.status === "ok" ? "ضمن النطاق" : "غير متاح"}
                  </Text>
                </View>
              ))}
            </View>
            {scan.tireCheck.codes.map((code) => (
              <Text key={code.code} style={[styles.body, { color: colors.foreground }]}>
                {code.code} · {code.descriptionAr}
              </Text>
            ))}
          </View>
        ) : null}

        {scan?.lampNotes?.length ? (
          <View style={{ gap: 8 }}>
            {scan.lampNotes.map((note) => (
              <View key={note.id} style={[styles.card, { backgroundColor: colors.card, borderColor: note.id === "tpms" ? "#b45309" : colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{note.titleAr}</Text>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>{note.bodyAr}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable style={[styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]} onPress={() => void runScan()} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="search-outline" size={18} color="#fff" />}
          <Text style={styles.primaryText}>{busy ? "جارٍ فحص كل الأنظمة" : "فحص كل الأنظمة"}</Text>
        </Pressable>
        <Pressable style={[styles.secondary, { borderColor: colors.border }]} onPress={() => void obd.readFreezeFrame()} disabled={!ready}>
          <Text style={[styles.secondaryText, { color: colors.foreground }]}>قراءة Freeze Frame</Text>
        </Pressable>
        <Pressable style={[styles.danger, { borderColor: colors.destructive }]} onPress={confirmClear} disabled={!ready}>
          <Text style={[styles.dangerText, { color: colors.destructive }]}>مسح الأكواد (Mode 04)</Text>
        </Pressable>

        {(["stored", "pending", "permanent"] as const).map((status) => {
          const items = scan?.codes?.filter((code) => code.status === status) ?? [];
          if (!scan || (scan.status === "complete" && !items.length && status !== "stored")) return null;
          const title = status === "stored" ? "مخزنة" : status === "pending" ? "معلقة" : "دائمة";
          return (
            <View key={status} style={{ gap: 8 }}>
              <Text style={[styles.section, { color: colors.foreground }]}>{title}</Text>
              {items.length ? items.map((code) => (
                <View key={`${code.status}-${code.code}-${code.module ?? "pcm"}`} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.code, { color: colors.foreground }]}>{code.code}</Text>
                  <Text style={[styles.body, { color: colors.mutedForeground }]}>{code.descriptionAr}</Text>
                  {code.module ? (
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>الوحدة: {code.module}</Text>
                  ) : null}
                </View>
              )) : scan.status === "complete" ? (
                <Text style={[styles.body, { color: colors.mutedForeground }]}>
                  لا توجد أكواد محرك في هذا القسم. لمبة الكفرات قد تضيء من انخفاض الضغط بدون كود.
                </Text>
              ) : null}
            </View>
          );
        })}

        {scan?.readiness?.length ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.section, { color: colors.foreground }]}>جاهزية الأنظمة</Text>
            {scan.readiness.map((item) => (
              <View key={item.name} style={[styles.row, { borderColor: colors.border }]}>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>
                  {item.available === false ? "غير مدعوم" : item.ready ? "مكتمل" : item.ready === false ? "غير مكتمل" : "غير متاح"}
                </Text>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.name}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {scan?.freezeFrame ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.section, { color: colors.foreground }]}>Freeze Frame</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              {scan.freezeFrame.availability === "unsupported"
                ? "غير مدعوم"
                : scan.freezeFrame.dtc
                  ? `الكود المسبب: ${scan.freezeFrame.dtc}`
                  : "لا توجد بيانات"}
            </Text>
            {scan.freezeFrame.items.map((item) => (
              <Text key={item.pid} style={[styles.body, { color: colors.foreground }]}>
                {item.label}: {item.value ?? "غير متاح"} {item.unit ?? ""}
              </Text>
            ))}
          </View>
        ) : null}
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
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6, alignItems: "flex-end" },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
  body: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 20 },
  section: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
  code: { fontSize: 18, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  primary: { minHeight: 48, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  secondary: { minHeight: 48, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  danger: { minHeight: 48, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  dangerText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  tireGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%" },
  tireCell: { width: "48%", borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 10, alignItems: "flex-end", gap: 2 },
  tireLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  tireValue: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
});
