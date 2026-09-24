import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AccountInfoScreen } from "@/components/AccountInfoScreen";
import { useLocale } from "@/context/LocaleContext";
import { useColors } from "@/hooks/useColors";

function LanguageFooter() {
  const colors = useColors();
  const { englishEnabled, t } = useLocale();

  const showEnglishNotice = () => {
    if (englishEnabled) return;
    Alert.alert(t.language.englishLocked, t.language.englishPending);
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.foreground }]}>العربية</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>{t.language.arabicActive}</Text>
        </View>
      </View>
      <Pressable
        onPress={showEnglishNotice}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: englishEnabled ? 1 : 0.68,
          },
        ]}
      >
        <Ionicons name={englishEnabled ? "ellipse-outline" : "lock-closed-outline"} size={22} color={colors.mutedForeground} />
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.foreground }]}>English</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {englishEnabled ? t.common.comingSoon : t.common.readyNotActive}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

export default function LanguageScreen() {
  const { t } = useLocale();

  return (
    <AccountInfoScreen
      title={t.language.title}
      subtitle={t.language.subtitle}
      sections={[
        {
          title: t.language.currentSection,
          body: t.language.currentBody,
          icon: "language-outline",
        },
        {
          title: "English preparation",
          body: t.language.englishPending,
          icon: "construct-outline",
        },
      ]}
      footer={<LanguageFooter />}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  text: { flex: 1, alignItems: "flex-end", gap: 2 },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
