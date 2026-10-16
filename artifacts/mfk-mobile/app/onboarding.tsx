import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLogo } from "@/components/BrandLogo";
import { useColors } from "@/hooks/useColors";

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  badge: string;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    icon: "language-outline",
    color: "#FF6A00",
    badge: "فهم أوضح",
    title: "سيارتك أذكى مما تتخيل",
    description: "افهم سيارتك وتابع حالتها من مكان واحد.",
  },
  {
    icon: "car-sport-outline",
    color: "#3B82F6",
    badge: "لوحة واحدة",
    title: "تعطل سيارتك فجأة كابوس",
    description: "مفك يساعدك تفهم المشكلة قبل ما تصير مفاجأة.",
  },
  {
    icon: "sparkles-outline",
    color: "#10B981",
    badge: "قبل المشكلة",
    title: "تشخيص فوري",
    description: "اكتشف الأعطال وافهم معناها خلال لحظات.",
  },
  {
    icon: "hardware-chip-outline",
    color: "#8B5CF6",
    badge: "خطوة واحدة",
    title: "ابدأ في أقل من دقيقة",
    description: "اربط قطعة مفك بسيارتك وابدأ.",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const item = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const topPad = Platform.OS === "web" ? 28 : insets.top;
  const botPad = Platform.OS === "web" ? 24 : insets.bottom + 16;

  const goToIndex = (nextIndex: number) => {
    if (animating || nextIndex === index || nextIndex < 0 || nextIndex >= SLIDES.length) return;

    const goingNext = nextIndex > index;
    const outgoing = goingNext ? 48 : -48;
    const incoming = goingNext ? -48 : 48;
    setAnimating(true);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: outgoing,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIndex(nextIndex);
      slideAnim.setValue(incoming);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => setAnimating(false));
    });
  };

  const finish = () => router.replace("/");

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingBottom: botPad }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 6 }]}>
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={[styles.topLink, { color: colors.mutedForeground }]}>تخطي</Text>
        </Pressable>
        <BrandLogo style={styles.topLogo} />
        <Text style={[styles.stepCount, { color: colors.mutedForeground }]}>
          {`${index + 1} / ${SLIDES.length}`}
        </Text>
      </View>

      <Animated.View
        style={[
          styles.slidePage,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View style={styles.illustArea}>
          <View style={styles.illustWrap}>
            <View style={[styles.ringOuter, { borderColor: `${item.color}14` }]} />
            <View style={[styles.ringMid, { borderColor: `${item.color}22` }]} />
            <View style={[styles.ringInner, { backgroundColor: `${item.color}18`, borderColor: `${item.color}38` }]}>
              <Ionicons name={item.icon} size={88} color={item.color} />
            </View>
            <View style={[styles.floatBadge, { backgroundColor: item.color, shadowColor: item.color }]}>
              <Text style={styles.floatBadgeTxt}>{item.badge}</Text>
            </View>
          </View>
        </View>

        <View style={styles.slideText}>
          <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>{item.description}</Text>
        </View>
      </Animated.View>

      <View style={styles.dotsRow}>
        {SLIDES.map((slide, slideIndex) => (
          <Pressable key={slide.title} onPress={() => goToIndex(slideIndex)} hitSlop={8}>
            <View
              style={[
                styles.dot,
                {
                  width: slideIndex === index ? 28 : 7,
                  backgroundColor: slideIndex === index ? item.color : colors.border,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.navRow}>
        {index > 0 ? (
          <Pressable
            onPress={() => goToIndex(index - 1)}
            disabled={animating}
            style={[
              styles.prevBtn,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
                opacity: animating ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-forward" size={18} color={colors.foreground} />
            <Text style={[styles.prevTxt, { color: colors.foreground }]}>السابق</Text>
          </Pressable>
        ) : null}

        <Pressable
          disabled={animating}
          onPress={() => (isLast ? finish() : goToIndex(index + 1))}
          style={[
            styles.primaryBtn,
            {
              backgroundColor: item.color,
              shadowColor: item.color,
              opacity: animating ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.primaryTxt}>{isLast ? "ابدأ" : "التالي"}</Text>
          <Ionicons name={isLast ? "checkmark" : "arrow-back"} size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    direction: "rtl",
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  topLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    minWidth: 52,
    textAlign: "right",
    writingDirection: "rtl",
  },
  stepCount: {
    direction: "ltr",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    minWidth: 52,
    textAlign: "left",
  },
  topLogo: {
    height: 32,
    width: 88,
  },
  slidePage: {
    flex: 1,
    justifyContent: "center",
  },
  illustArea: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  illustWrap: {
    alignItems: "center",
    height: 280,
    justifyContent: "center",
    width: 280,
  },
  ringOuter: {
    borderRadius: 140,
    borderWidth: 1,
    height: 280,
    position: "absolute",
    width: 280,
  },
  ringMid: {
    borderRadius: 115,
    borderWidth: 1.5,
    height: 230,
    position: "absolute",
    width: 230,
  },
  ringInner: {
    alignItems: "center",
    borderRadius: 88,
    borderWidth: 2,
    height: 176,
    justifyContent: "center",
    width: 176,
  },
  floatBadge: {
    borderRadius: 20,
    elevation: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    position: "absolute",
    right: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    top: 28,
  },
  floatBadgeTxt: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
  slideText: {
    alignItems: "center",
    gap: 10,
    paddingBottom: 4,
    paddingHorizontal: 28,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    lineHeight: 42,
    textAlign: "center",
    writingDirection: "rtl",
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 28,
    maxWidth: 300,
    textAlign: "center",
    writingDirection: "rtl",
  },
  dotsRow: {
    alignItems: "center",
    direction: "ltr",
    flexDirection: "row-reverse",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 18,
  },
  dot: {
    borderRadius: 4,
    height: 7,
  },
  navRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
  },
  prevBtn: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 16,
  },
  prevTxt: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  primaryBtn: {
    alignItems: "center",
    borderRadius: 16,
    elevation: 6,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 54,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  primaryTxt: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
});
