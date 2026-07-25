import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    icon: "document-text-outline",
    title: "افهم سيارتك بلغة بسيطة",
    description: "بدل رموز الأعطال المعقدة، مفك يشرح لك كل شيء بعربي واضح مع خطوة عملية توصي بها.",
  },
  {
    icon: "car-sport-outline",
    title: "تحكم كامل بسيارتك",
    description: "الأعطال، الوقود، الصيانة، والموقع في تجربة واحدة مرتبطة بحالة مركبتك.",
  },
  {
    icon: "sparkles-outline",
    title: "مساعد ذكي قبل المشكلة",
    description: "مفك يلاحظ المؤشرات المهمة ويقترح عليك التصرف المناسب في الوقت المناسب.",
  },
];

function StatusBarMock() {
  return (
    <View style={styles.status}>
      <Text style={styles.statusText}>٩:٤١</Text>
      <Text style={styles.statusText}>◉ WiFi ▰</Text>
    </View>
  );
}

export default function OnboardingScreen() {
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
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 18 }]}>
      <LinearGradient colors={["#090A0B", "#070707"]} style={StyleSheet.absoluteFill} />
      <StatusBarMock />

      <Pressable onPress={() => router.replace("/pair-device")} style={styles.skipButton}>
        <Text style={styles.skipText}>تخطي</Text>
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
            <View style={styles.iconFrame}>
              <View style={styles.iconLines}>
                <View style={styles.iconLine} />
                <View style={styles.iconLine} />
                <View style={[styles.iconLine, styles.shortLine]} />
              </View>
              <View style={styles.checkBubble}>
                <Ionicons name={item.icon === "document-text-outline" ? "checkmark" : item.icon} size={22} color="#FF6A00" />
              </View>
            </View>

            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.indicators}>
              {SLIDES.map((slide, slideIndex) => (
                <View key={slide.title} style={[styles.dot, slideIndex === index ? styles.activeDot : null]} />
              ))}
            </View>
          </View>
        )}
      />

      <Pressable style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.86 : 1 }]} onPress={goNext}>
        <Text style={styles.primaryText}>{isLast ? "ابدأ" : "التالي"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#050505", flex: 1, paddingHorizontal: 22 },
  status: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  statusText: { color: "#F5F5F5", fontFamily: "Inter_700Bold", fontSize: 12 },
  skipButton: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 8 },
  skipText: { color: "#FF6A00", fontFamily: "Inter_700Bold", fontSize: 13 },
  slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: 34 },
  iconFrame: {
    borderColor: "#858A92",
    borderRadius: 14,
    borderWidth: 3,
    height: 74,
    marginBottom: 48,
    position: "relative",
    width: 104,
  },
  iconLines: { gap: 8, paddingHorizontal: 14, paddingTop: 16 },
  iconLine: { backgroundColor: "#34373D", borderRadius: 999, height: 3, width: "100%" },
  shortLine: { width: "64%" },
  checkBubble: {
    alignItems: "center",
    backgroundColor: "#17181B",
    borderColor: "#FF6A00",
    borderRadius: 999,
    borderWidth: 3,
    bottom: -16,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    right: -14,
    width: 42,
  },
  title: {
    color: "#F5F5F5",
    fontFamily: "Inter_700Bold",
    fontSize: 23,
    lineHeight: 32,
    marginBottom: 14,
    textAlign: "center",
  },
  description: {
    color: "#8E949D",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 27,
    maxWidth: 285,
    textAlign: "center",
  },
  indicators: { flexDirection: "row-reverse", gap: 8, marginTop: 24 },
  dot: { backgroundColor: "#303238", borderRadius: 999, height: 7, width: 7 },
  activeDot: { backgroundColor: "#FF6A00", width: 22 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#FF6A00",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});
