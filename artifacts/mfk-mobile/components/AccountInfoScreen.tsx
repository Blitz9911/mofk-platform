import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

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
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
        <View style={{ width: 38 }} />
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
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{section.title}</Text>
              <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>{section.body}</Text>
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
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, alignItems: "center", gap: 2 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: {
    flexDirection: "row-reverse",
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
  cardText: { flex: 1, alignItems: "flex-end", gap: 5 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right" },
  cardBody: { fontSize: 13, lineHeight: 21, fontFamily: "Inter_400Regular", textAlign: "right" },
});
