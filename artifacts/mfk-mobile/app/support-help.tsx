import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AccountInfoScreen } from "@/components/AccountInfoScreen";
import { useColors } from "@/hooks/useColors";

function SupportFooter() {
  const colors = useColors();

  return (
    <View style={[styles.supportCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.supportText}>
        <Text style={[styles.supportTitle, { color: colors.foreground }]}>تحتاج مساعدة مباشرة؟</Text>
        <Text style={[styles.supportSub, { color: colors.mutedForeground }]}>فريق الدعم يساعدك في الحساب، الباقات، وطلب القطعة.</Text>
      </View>
      <Pressable
        onPress={() => Alert.alert("الدعم", "راسلنا على support@mofk.com")}
        style={[styles.supportButton, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="mail-outline" size={17} color="#fff" />
        <Text style={styles.supportButtonText}>تواصل معنا</Text>
      </Pressable>
    </View>
  );
}

export default function SupportHelpScreen() {
  return (
    <AccountInfoScreen
      title="الدعم والمساعدة"
      subtitle="أسئلة شائعة ومعلومات واضحة"
      sections={[
        {
          title: "كيف أضيف مركبة؟",
          body: "افتح مركباتي، اضغط إضافة مركبة، ثم أدخل الشركة والموديل والسنة ورقم اللوحة.",
          icon: "car-outline",
        },
        {
          title: "متى أحتاج ترقية؟",
          body: "تظهر رسالة الترقية عند الوصول لحد المركبات في الباقة أو عند استخدام مزايا غير متاحة في المجانية.",
          icon: "arrow-up-circle-outline",
        },
        {
          title: "كيف أطلب قطعة مفك؟",
          body: "من حسابي اختر طلب قطعة مفك، ثم أدخل رقم العنوان المختصر وبيانات التواصل.",
          icon: "hardware-chip-outline",
        },
        {
          title: "كيف تعمل التوصيات؟",
          body: "تعتمد التوصيات على المركبات وسجل الصيانة والبيانات المسجلة، وتتحسن كلما أضفت بيانات أكثر.",
          icon: "bulb-outline",
        },
      ]}
      footer={<SupportFooter />}
    />
  );
}

const styles = StyleSheet.create({
  supportCard: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  supportText: { alignItems: "flex-end", gap: 4 },
  supportTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
  supportSub: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "right" },
  supportButton: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  supportButtonText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
