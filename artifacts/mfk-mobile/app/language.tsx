import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { AccountInfoScreen } from "@/components/AccountInfoScreen";
import { ArabicText } from "@/components/ArabicText";
import { useColors } from "@/hooks/useColors";
import { rowDir } from "@/lib/layout";

function LanguageFooter() {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
        <View style={[styles.iconBox, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        </View>
        <ArabicText style={[styles.title, { color: colors.foreground }]}>العربية</ArabicText>
      </View>
    </View>
  );
}

export default function LanguageScreen() {
  return (
    <AccountInfoScreen
      title="اللغة"
      subtitle="واجهة مفك بالعربية"
      sections={[]}
      footer={<LanguageFooter />}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  card: {
    flexDirection: rowDir,
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
