import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArabicText } from "@/components/ArabicText";
import { useColors } from "@/hooks/useColors";
import { rowDir } from "@/lib/layout";

export type AccountInfoSection = {
  title: string;
  body: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function AccountInfoScreen({
  title,
  subtitle,
  sections,
  footer,
}: {
  title: string;
  subtitle: string;
  sections: AccountInfoSection[];
  footer?: React.ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <ArabicText style={[styles.title, { color: colors.foreground }]}>{title}</ArabicText>
          <ArabicText style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</ArabicText>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 52, gap: 12 }}
      >
        {sections.map((section) => (
          <View
            key={section.title}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.iconBox, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name={section.icon ?? "information-circle-outline"} size={20} color={colors.primary} />
            </View>
            <View style={styles.cardText}>
              <ArabicText style={[styles.cardTitle, { color: colors.foreground }]}>{section.title}</ArabicText>
              <ArabicText style={[styles.cardBody, { color: colors.mutedForeground }]}>{section.body}</ArabicText>
            </View>
          </View>
        ))}
        {footer}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: rowDir,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, alignItems: "stretch", gap: 2 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  card: {
    flexDirection: rowDir,
    alignItems: "flex-start",
    gap: 12,
    padding: 15,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1, alignItems: "stretch", gap: 5 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardBody: { fontSize: 15, lineHeight: 26, fontFamily: "Inter_400Regular" },
});
