import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArabicText } from "@/components/ArabicText";
import { useColors } from "@/hooks/useColors";
import {
  disableAppNotifications,
  enableAppNotifications,
  getNotificationPermission,
  getNotificationsEnabled,
  getUatExpoPushTokenForSharing,
  osNotificationsAvailable,
  registerExpoPushToken,
} from "@/lib/app-notifications";

type Prefs = {
  pushEnabled?: boolean;
  maintenanceEnabled?: boolean;
  diagnosticsEnabled?: boolean;
  documentsEnabled?: boolean;
  deviceEnabled?: boolean;
  subscriptionsEnabled?: boolean;
  recommendationsEnabled?: boolean;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
};

async function loadPrefs(): Promise<Prefs> {
  try {
    const response = await fetch("/api/notifications/preferences");
    const data = await response.json();
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

async function savePrefs(patch: Prefs) {
  await fetch("/api/notifications/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

function Row({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <ArabicText style={[styles.label, { color: colors.foreground }]}>{label}</ArabicText>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const enabledQuery = useQuery({ queryKey: ["notification-pref"], queryFn: getNotificationsEnabled });
  const permissionQuery = useQuery({ queryKey: ["notification-permission"], queryFn: getNotificationPermission });
  const prefsQuery = useQuery({ queryKey: ["notification-server-prefs"], queryFn: loadPrefs });

  const prefs = prefsQuery.data ?? {};
  const osReady = osNotificationsAvailable();
  const granted = permissionQuery.data?.granted === true;
  const isUat = process.env.EXPO_PUBLIC_MFK_ENV === "uat";

  const patch = async (next: Prefs) => {
    if (saving) return;
    setSaving(true);
    try {
      await savePrefs(next);
      await prefsQuery.refetch();
    } finally {
      setSaving(false);
    }
  };

  const togglePush = async (next: boolean) => {
    if (next) {
      const result = await enableAppNotifications();
      queryClient.setQueryData(["notification-pref"], true);
      await queryClient.invalidateQueries({ queryKey: ["notification-permission"] });
      if (osReady && !result.granted) {
        Alert.alert("صلاحية النظام", "الإشعارات داخل التطبيق شغّالة. لتظهر على شاشة القفل اسمح بها من إعدادات الآيفون.");
      }
      return;
    }
    await disableAppNotifications();
    queryClient.setQueryData(["notification-pref"], false);
  };

  const shareUatToken = async () => {
    await registerExpoPushToken();
    const token = await getUatExpoPushTokenForSharing();
    if (!token) {
      Alert.alert("رمز الاختبار غير متاح", "أعد فتح التطبيق ثم جرّب مرة أخرى.");
      return;
    }
    await Share.share({ message: token, title: "Expo Push Token — MOFK UAT" });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { borderColor: colors.border }]}>
          <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
        </Pressable>
        <ArabicText style={[styles.title, { color: colors.foreground }]}>إعدادات الإشعارات</ArabicText>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          التطبيق لا يتجاوز صلاحيات نظام التشغيل. إذا رفضت الإذن يبقى مركز التنبيهات داخل مفك متاحاً.
        </Text>
        <Row
          label="إشعارات الدفع"
          description={
            !enabledQuery.data
              ? "موقوفة من التطبيق"
              : osReady && granted
                ? "مفعلة وصلاحية النظام ممنوحة"
                : osReady
                  ? "مفعلة داخل التطبيق — صلاحية النظام غير ممنوحة"
                  : "تحتاج بناء أصلي لدعم شاشة القفل"
          }
          value={enabledQuery.data !== false}
          onValueChange={togglePush}
        />
        <Row
          label="تنبيهات الصيانة"
          description="مواعيد الزيت والصيانة المجدولة والعداد"
          value={prefs.maintenanceEnabled !== false}
          onValueChange={(value) => patch({ maintenanceEnabled: value })}
        />
        <Row
          label="تنبيهات الأعطال"
          description="رموز الأعطال المسجّلة من فحص فعلي"
          value={prefs.diagnosticsEnabled !== false}
          onValueChange={(value) => patch({ diagnosticsEnabled: value })}
        />
        <Row
          label="تنبيهات الوثائق"
          description="التأمين والاستمارة والفحص إذا سُجّل تاريخ انتهاء"
          value={prefs.documentsEnabled !== false}
          onValueChange={(value) => patch({ documentsEnabled: value })}
        />
        <Row
          label="تنبيهات قطعة مفك"
          description="أخطاء الربط والصلاحيات، بدون إزعاج عند انقطاع البلوتوث العادي"
          value={prefs.deviceEnabled !== false}
          onValueChange={(value) => patch({ deviceEnabled: value })}
        />
        <Row
          label="تنبيهات الاشتراكات"
          description="تفعيل وتجديد وانتهاء بعد حالة دفع مؤكدة"
          value={prefs.subscriptionsEnabled !== false}
          onValueChange={(value) => patch({ subscriptionsEnabled: value })}
        />
        <Row
          label="ساعات الهدوء 22–7"
          description="يوقف الإشعارات الاختيارية على الجهاز ويُبقي الصندوق"
          value={prefs.quietHoursStart === 22 && prefs.quietHoursEnd === 7}
          onValueChange={(value) => patch({ quietHoursStart: value ? 22 : null, quietHoursEnd: value ? 7 : null })}
        />
        {isUat ? (
          <Pressable
            onPress={shareUatToken}
            style={[styles.uatButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
          >
            <Ionicons name="share-outline" size={20} color={colors.primary} />
            <ArabicText style={{ color: colors.primary, fontWeight: "700" }}>
              مشاركة رمز اختبار إشعارات UAT
            </ArabicText>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800" },
  row: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72 },
  label: { fontWeight: "700", textAlign: "right" },
  desc: { textAlign: "right", marginTop: 4, fontSize: 13, lineHeight: 20 },
  uatButton: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
