import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    icon: "speedometer-outline",
    title: "كل معلومات سيارتك في مكان واحد",
    description: "تابع حالة المركبة، العداد، البنزين والصيانة بسهولة.",
  },
  {
    icon: "scan-circle-outline",
    title: "اعرف المشكلة قبل الورشة",
    description: "افهم أكواد الأعطال والتنبيهات بلغة واضحة.",
  },
  {
    icon: "sparkles-outline",
    title: "قرارات أذكى مع مفك",
    description: "احصل على توصيات ذكية مبنية على حالة سيارتك وسجلها.",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(Math.min(Math.max(nextIndex, 0), SLIDES.length - 1));
  };

  const goNext = () => {
    if (isLast) {
      router.replace("/pair-device");
      return;
    }

    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    setIndex((value) => Math.min(value + 1, SLIDES.length - 1));
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <Pressable onPress={() => router.replace("/pair-device")} style={styles.skip}>
        <Text style={[styles.skipText, { color: colors.mutedForeground }]}>تخطي</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(slide) => slide.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.visual, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.visualInner, { backgroundColor: colors.muted }]}>
                <Ionicons name={item.icon} size={58} color={colors.primary} />
              </View>
              <View style={styles.visualLine} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.indicators}>
          {SLIDES.map((slide, slideIndex) => (
            <View
              key={slide.title}
              style={[
                styles.indicator,
                { backgroundColor: slideIndex === index ? colors.primary : colors.border },
                slideIndex === index ? styles.indicatorActive : null,
              ]}
            />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={goNext}
        >
          <Text style={styles.primaryText}>{isLast ? "ابدأ" : "التالي"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  skip: { alignSelf: "flex-start", paddingHorizontal: 24, paddingVertical: 8 },
  skipText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  visual: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    height: 220,
    justifyContent: "center",
    marginBottom: 34,
    width: "100%",
  },
  visualInner: {
    alignItems: "center",
    borderRadius: 999,
    height: 118,
    justifyContent: "center",
    width: 118,
  },
  visualLine: { backgroundColor: "#FF6A0030", borderRadius: 999, height: 6, marginTop: 24, width: 140 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 27,
    lineHeight: 37,
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 27,
    textAlign: "center",
  },
  footer: { gap: 24, paddingHorizontal: 24 },
  indicators: { flexDirection: "row-reverse", gap: 8, justifyContent: "center" },
  indicator: { borderRadius: 999, height: 8, width: 8 },
  indicatorActive: { width: 28 },
  primaryButton: {
    alignItems: "center",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 },
});
