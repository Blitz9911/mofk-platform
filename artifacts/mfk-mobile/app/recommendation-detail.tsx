import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArabicText } from "@/components/ArabicText";
import { useColors } from "@/hooks/useColors";
import { rowDir } from "@/lib/layout";
import { smoothBack } from "@/lib/navigation";
import {
  getCachedRecommendation,
  getLifecycleOverlay,
  recStorageKey,
  recordRecommendationAction,
} from "@/lib/recommendation-lifecycle";

const STATUS_LABEL: Record<string, string> = {
  active: "نشطة",
  in_progress: "قيد المعالجة",
  resolved: "مغلقة",
  deferred: "مؤجلة",
  dismissed: "مستبعدة",
};

export default function RecommendationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [rec, setRec] = useState<any>(getCachedRecommendation(String(id || "")));
  const [events, setEvents] = useState<any[]>([]);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    const current = getCachedRecommendation(String(id || ""));
    setRec(current);
    void getLifecycleOverlay().then((overlay) => {
      const key = current ? recStorageKey(current) : String(id);
      const row = overlay[key] || overlay[String(id)] || {};
      setEvents(row.events ?? []);
      if (current) setRec({ ...current, ...row });
    });
  }, [id]);

  const defer = () => {
    if (!rec) return;
    const until = new Date();
    until.setDate(until.getDate() + 7);
    void recordRecommendationAction(rec, "defer", { deferredUntil: until.toISOString() }).then(() => {
      setRec({ ...rec, status: "deferred", deferredUntil: until.toISOString() });
      Alert.alert("تم التأجيل", "أُجّلت التوصية أسبوعًا. ستظهر مجددًا بعد انتهاء التأجيل.");
    });
  };

  const dismiss = () => {
    if (!rec) return;
    Alert.alert("استبعاد التوصية", "تختفي من القائمة النشطة دون تسجيل صيانة.", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "استبعاد",
        style: "destructive",
        onPress: () => {
          void recordRecommendationAction(rec, "dismiss").then(() => {
            setRec({ ...rec, status: "dismissed" });
            smoothBack(router);
          });
        },
      },
    ]);
  };

  const openMaintenance = () => {
    if (!rec) return;
    void recordRecommendationAction(rec, "in_progress");
    router.push({
      pathname: "/maintenance",
      params: {
        vehicleId: rec.vehicleId,
        serviceType: rec.serviceType || "",
        recommendationId: rec.id,
        openLog: "1",
      },
    });
  };

  if (!rec) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={[styles.header, { borderBottomColor: colors.border, flexDirection: rowDir }]}>
          <Pressable onPress={() => smoothBack(router)} style={styles.backBtn}>
            <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
          </Pressable>
          <ArabicText style={[styles.headerTitle, { color: colors.foreground }]}>التوصية</ArabicText>
        </View>
        <View style={styles.empty}>
          <ArabicText style={[styles.emptyTitle, { color: colors.foreground }]}>تعذر تحميل التوصية</ArabicText>
          <ArabicText style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            ارجع لقائمة التوصيات وافتحها مرة أخرى.
          </ArabicText>
        </View>
      </View>
    );
  }

  const category = rec.category === "diagnostic" ? "فحص تشخيصي" : "صيانة وقائية";
  const sourceLabel =
    rec.source === "dtc"
      ? "سجل الأعطال"
      : rec.source === "obd_live_data"
        ? "قراءة OBD محفوظة"
        : rec.source === "maintenance_schedule"
          ? "جدول الصيانة"
          : "بيانات المركبة";

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, flexDirection: rowDir }]}>
        <Pressable onPress={() => smoothBack(router)} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ArabicText style={[styles.headerTitle, { color: colors.foreground }]}>تفاصيل التوصية</ArabicText>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom, gap: 12 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ArabicText style={[styles.title, { color: colors.foreground }]}>{rec.titleAr}</ArabicText>
          <ArabicText style={[styles.body, { color: colors.mutedForeground }]}>{rec.descriptionAr}</ArabicText>
          <View style={styles.metaRow}>
            <View style={[styles.chip, { borderColor: colors.border }]}>
              <Text style={[styles.chipText, { color: colors.foreground }]}>{STATUS_LABEL[rec.status] || "نشطة"}</Text>
            </View>
            <View style={[styles.chip, { borderColor: colors.border }]}>
              <Text style={[styles.chipText, { color: colors.foreground }]}>{category}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ArabicText style={[styles.section, { color: colors.foreground }]}>المصدر والسبب</ArabicText>
          <ArabicText style={[styles.body, { color: colors.mutedForeground }]}>المصدر: {sourceLabel}</ArabicText>
          {rec.remainingKm != null ? (
            <ArabicText style={[styles.body, { color: colors.mutedForeground }]}>
              الكيلومترات المتبقية: {Number(rec.remainingKm).toLocaleString("ar-SA")} كم
            </ArabicText>
          ) : null}
          {rec.daysUntilDue != null ? (
            <ArabicText style={[styles.body, { color: colors.mutedForeground }]}>
              الأيام المتبقية: {Number(rec.daysUntilDue).toLocaleString("ar-SA")} يوم
            </ArabicText>
          ) : null}
          {rec.linkedMaintenanceLogId ? (
            <Pressable
              onPress={() =>
                router.push({ pathname: "/maintenance-detail", params: { id: rec.linkedMaintenanceLogId } })
              }
            >
              <ArabicText style={[styles.link, { color: colors.primary }]}>فتح سجل الصيانة المرتبط</ArabicText>
            </Pressable>
          ) : (
            <ArabicText style={[styles.body, { color: colors.mutedForeground }]}>لا يوجد سجل صيانة مرتبط بعد.</ArabicText>
          )}
        </View>

        <Pressable onPress={openMaintenance} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.primaryBtnText}>إنشاء أو ربط مهمة صيانة</Text>
        </Pressable>
        {rec.source === "dtc" ? (
          <Pressable
            onPress={() => router.push("/dtc")}
            style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <ArabicText style={[styles.secondaryText, { color: colors.foreground }]}>فتح فحص الأعطال</ArabicText>
          </Pressable>
        ) : null}
        <View style={[styles.actions, { flexDirection: rowDir }]}>
          <Pressable onPress={defer} style={[styles.secondaryBtn, { flex: 1, borderColor: colors.border, backgroundColor: colors.card }]}>
            <ArabicText style={[styles.secondaryText, { color: colors.foreground }]}>تأجيل أسبوع</ArabicText>
          </Pressable>
          <Pressable onPress={dismiss} style={[styles.secondaryBtn, { flex: 1, borderColor: colors.border, backgroundColor: colors.card }]}>
            <ArabicText style={[styles.secondaryText, { color: colors.foreground }]}>استبعاد</ArabicText>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ArabicText style={[styles.section, { color: colors.foreground }]}>سجل المعالجة</ArabicText>
          {events.length ? (
            events
              .slice()
              .reverse()
              .map((event, index) => (
                <ArabicText key={`${event.at}-${index}`} style={[styles.body, { color: colors.mutedForeground }]}>
                  {event.action} · {(event.at || "").slice(0, 16).replace("T", " ")}
                </ArabicText>
              ))
          ) : (
            <ArabicText style={[styles.body, { color: colors.mutedForeground }]}>لا يوجد سجل معالجة بعد.</ArabicText>
          )}
        </View>
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
  body: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 20 },
  section: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right" },
  metaRow: { flexDirection: "row", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  link: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
  primaryBtn: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  actions: { gap: 8 },
  secondaryBtn: { minHeight: 46, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
