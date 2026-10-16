import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

/* ── Slides — real marketing copy ───────────────────────── */
const SLIDES = [
  {
    icon: "car-sport-outline" as const,
    color: "#FF6A00",
    badge: "ابدأ مجاناً",
    title: "سيارتك، أذكى\nمما تتخيل",
    desc: "سيارتك تعطيك إشارات كثيرة… بس قليل يفهمها صح. مع مفك تعرف وش فيها قبل أي أحد.",
  },
  {
    icon: "alert-circle-outline" as const,
    color: "#EF4444",
    badge: "مشكلة حقيقية",
    title: "تعطل سيارتك\nفجأة كابوس",
    desc: "لمبة المحرك تضيء بدون سبب واضح. الميكانيكي يطلب 150–300 ريال للفحص فقط. أنت تقود وأنت تأمل ألا يحدث شيء.",
  },
  {
    icon: "flash-outline" as const,
    color: "#3B82F6",
    badge: "الحل",
    title: "تشخيص فوري\nبلغتك العربية",
    desc: "نترجم الأعطال المعقدة إلى لغة تفهمها، مع درجة الخطورة وتكلفة الإصلاح التقريبية.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    color: "#10B981",
    badge: "3 خطوات فقط",
    title: "ابدأ في\nأقل من دقيقة",
    desc: "ركّب جهاز مفك في منفذ OBD، شغّل التطبيق، واحصل على تشخيص كامل فوراً.",
  },
];

/* ── Pain points for slide 2 visual ─────────────────────── */
const PAIN_POINTS = [
  { icon: "cash-outline" as const, text: "تشخيص مكلف 150–300 ريال" },
  { icon: "warning-outline" as const, text: "مفاجآت الصيانة وأعطال الطريق" },
  { icon: "help-circle-outline" as const, text: "استغلال جهلك بالأعطال" },
];

/* ── Features ────────────────────────────────────────────── */
const FEATURES = [
  { icon: "speedometer-outline" as const, color: "#FF6A00", title: "تشخيص فوري", text: "مسح كامل واكتشاف أكثر من 15,000 كود عطل في ثوانٍ" },
  { icon: "language-outline" as const, color: "#3B82F6", title: "فهم بسيط", text: "نترجم الأعطال إلى لغة تفهمها مع درجة الخطورة" },
  { icon: "construct-outline" as const, color: "#10B981", title: "صيانة استباقية", text: "تذكيرات ذكية بناءً على ممشى سيارتك الفعلي" },
  { icon: "document-text-outline" as const, color: "#F59E0B", title: "تقارير ذكية", text: "تقارير شاملة بالعربية عن صحة سيارتك وتكاليفها" },
  { icon: "chatbubble-ellipses-outline" as const, color: "#8B5CF6", title: "مساعد ذكي", text: "استشر مساعد مفك في أي سؤال عن سيارتك" },
  { icon: "notifications-outline" as const, color: "#EC4899", title: "تنبيهات مبكرة", text: "تنبيهات التأمين والفحص الدوري قبل الانتهاء" },
];

/* ── Timeline ────────────────────────────────────────────── */
const TIMELINE = [
  { year: "2021", title: "بداية الفكرة", desc: "نشأت فكرة مفك بعد تجربة شخصية — لمبة اشتغلت وتشخيصات أعطت أرقاماً مختلفة." },
  { year: "2022", title: "أول نسخة", desc: "أطلقنا أول نسخة تجريبية مع 100 مستخدم أولي في الرياض. الاستجابة فاقت توقعاتنا." },
  { year: "2023", title: "التوسع في المملكة", desc: "وصلنا إلى 5,000 مستخدم نشط في 5 مدن وحصلنا على جائزة أفضل تطبيق تقني." },
  { year: "2024", title: "+20,000 سيارة متصلة", desc: "تجاوزنا 20,000 مستخدم وأطلقنا جهاز OBD الذكي الخاص بنا." },
];

/* ── Values ──────────────────────────────────────────────── */
const VALUES = [
  { icon: "bulb-outline" as const, color: "#FF6A00", title: "الابتكار أولاً", desc: "كل ميزة نبنيها تبدأ من مشكلة حقيقية يعاني منها سائق حقيقي." },
  { icon: "eye-outline" as const, color: "#3B82F6", title: "الشفافية الكاملة", desc: "تكاليف الصيانة، حالة سيارتك، معلوماتك — كلها تعود لك أنت." },
  { icon: "heart-outline" as const, color: "#EF4444", title: "نهتم فعلاً", desc: "نقيس نجاحنا بنجاح من يثق بنا. كل قرار يبدأ بسؤال: كيف يفيد مستخدمينا؟" },
  { icon: "people-outline" as const, color: "#10B981", title: "لك ولعائلتك", desc: "بنينا مفك عشان أي شخص — سواء يعرف بالسيارات أو لا — يفهم سيارته." },
];

/* ── Steps ───────────────────────────────────────────────── */
const STEPS = [
  { n: "01", icon: "hardware-chip-outline" as const, title: "اربط الجهاز", desc: "ركّب جهاز مفك الصغير في منفذ OBD أسفل مقود سيارتك — يأخذ ثوانٍ." },
  { n: "02", icon: "phone-portrait-outline" as const, title: "شغّل التطبيق", desc: "حمّل التطبيق وارتبط بالجهاز عبر البلوتوث بضغطة زر واحدة." },
  { n: "03", icon: "analytics-outline" as const, title: "احصل على تشخيصك", desc: "اقرأ بيانات سيارتك الحية، افحص الأعطال، وافهمها بلغتك فوراً." },
];

/* ── Main Component ──────────────────────────────────────── */
export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const slidesRef = React.useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showAbout, setShowAbout] = useState(false);

  const slide = SLIDES[activeIdx];
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 24 : insets.bottom + 16;

  const goToSlide = (index: number, animated = true) => {
    setActiveIdx(index);
    requestAnimationFrame(() => {
      slidesRef.current?.scrollTo({ x: width * index, animated });
    });
  };

  const goNext = () => {
    if (activeIdx < SLIDES.length - 1) {
      goToSlide(activeIdx + 1);
    } else {
      setShowAbout(true);
    }
  };

  const handleSlideMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIdx(Math.max(0, Math.min(SLIDES.length - 1, nextIndex)));
  };

  /* ── About / Story page ─────────────────────────────────── */
  if (showAbout) {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: botPad + 90, paddingTop: topPad + 8 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <View style={s.aboutBar}>
            <Pressable onPress={() => setShowAbout(false)} hitSlop={12}
              style={[s.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="arrow-forward" size={18} color={colors.foreground} />
            </Pressable>
            <Text style={[s.aboutBarTitle, { color: colors.foreground }]}>عن مفك</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Hero */}
          <View style={[s.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.chip, { backgroundColor: "#FF6A0018" }]}>
              <Text style={[s.chipTxt, { color: "#FF6A00" }]}>منصة سعودية أصيلة</Text>
            </View>
            <Image source={require("@/assets/images/mfk-logo.png")} style={s.heroLogo} contentFit="contain" />
            <Text style={[s.heroSlogan, { color: "#FF6A00" }]}>نُغيّر علاقتك بسيارتك</Text>
            <Text style={[s.heroBody, { color: colors.mutedForeground }]}>
              سوّينا مفك عشان ما تضيع بين التشخيصات المتضاربة — ومع مفك، سيارتك أذكى مما تتخيل.
            </Text>
          </View>

          {/* Big stats */}
          <View style={[s.statsGrid, { paddingHorizontal: 16, marginTop: 16 }]}>
            {[
              { val: "+20K", lbl: "سائق يثق بنا" },
              { val: "15+", lbl: "مدينة سعودية" },
              { val: "4.8", lbl: "تقييم المستخدمين" },
              { val: "2021", lbl: "سنة التأسيس" },
            ].map((st, i) => (
              <View key={i} style={[s.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[s.statVal, { color: "#FF6A00" }]}>{st.val}</Text>
                <Text style={[s.statLbl, { color: colors.mutedForeground }]}>{st.lbl}</Text>
              </View>
            ))}
          </View>

          {/* Why section */}
          <View style={[s.sec, { marginTop: 24 }]}>
            <View style={s.secHead}>
              <View style={[s.secBar, { backgroundColor: "#FF6A00" }]} />
              <Text style={[s.secTitle, { color: colors.foreground }]}>لماذا أسسنا مفك؟</Text>
            </View>
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.bodyTxt, { color: colors.mutedForeground }]}>
                لأن بكل بساطة — كلنا مررنا بهذا الموقف. لمبة تشتغل فجأة، صوت غريب نتجاهله، وتشخيصات تعطي كلام مختلف… وأنت في النص ضايع.
              </Text>
              <Text style={[s.bodyTxt, { color: colors.mutedForeground, marginTop: 10 }]}>
                مع إن سيارتك فيها كل المعلومات — لكن ما أحد يشرحها لك بطريقة تفهمها.{"\n"}
                <Text style={{ color: "#FF6A00", fontFamily: "Inter_600SemiBold" }}>هنا قلنا: لازم يتغير هذا الشي.</Text>
              </Text>
            </View>
          </View>

          {/* Pain points */}
          <View style={[s.sec, { marginTop: 20 }]}>
            <View style={s.secHead}>
              <View style={[s.secBar, { backgroundColor: "#EF4444" }]} />
              <Text style={[s.secTitle, { color: colors.foreground }]}>المشكلة التي نحلها</Text>
            </View>
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 4 }]}>
              {[
                { icon: "bulb-outline" as const, text: "لمبة تضيء بدون سبب واضح وأنت ما تعرف هل هي خطيرة أو لا" },
                { icon: "ear-outline" as const, text: "صوت غريب تسمعه وتتجاهله وأحياناً لا يعدي" },
                { icon: "help-buoy-outline" as const, text: "كل ميكانيكي يعطيك رقم مختلف وأنت ضايع بين الآراء" },
              ].map((p, i, arr) => (
                <View key={i} style={[s.featRow, { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0 }]}>
                  <View style={[s.featIcon, { backgroundColor: "#EF444418" }]}>
                    <Ionicons name={p.icon} size={17} color="#EF4444" />
                  </View>
                  <Text style={[s.featTxt, { color: colors.foreground }]}>{p.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Features */}
          <View style={[s.sec, { marginTop: 20 }]}>
            <View style={s.secHead}>
              <View style={[s.secBar, { backgroundColor: "#3B82F6" }]} />
              <Text style={[s.secTitle, { color: colors.foreground }]}>كل ما تحتاجه في مكان واحد</Text>
            </View>
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 4 }]}>
              {FEATURES.map((f, i) => (
                <View key={i} style={[s.featRow, { borderBottomColor: colors.border, borderBottomWidth: i < FEATURES.length - 1 ? StyleSheet.hairlineWidth : 0 }]}>
                  <View style={[s.featIcon, { backgroundColor: f.color + "18" }]}>
                    <Ionicons name={f.icon} size={17} color={f.color} />
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={[s.featTitle, { color: colors.foreground }]}>{f.title}</Text>
                    <Text style={[s.featSubTxt, { color: colors.mutedForeground }]}>{f.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Steps */}
          <View style={[s.sec, { marginTop: 20 }]}>
            <View style={s.secHead}>
              <View style={[s.secBar, { backgroundColor: "#10B981" }]} />
              <Text style={[s.secTitle, { color: colors.foreground }]}>3 خطوات بسيطة فقط</Text>
            </View>
            {STEPS.map((st, i) => (
              <View key={i} style={[s.stepRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[s.stepNum, { backgroundColor: "#FF6A00" }]}>
                  <Text style={s.stepNumTxt}>{st.n}</Text>
                </View>
                <View style={[s.stepIconWrap, { backgroundColor: "#FF6A0018" }]}>
                  <Ionicons name={st.icon} size={22} color="#FF6A00" />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[s.stepTitle, { color: colors.foreground }]}>{st.title}</Text>
                  <Text style={[s.stepDesc, { color: colors.mutedForeground }]}>{st.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* More stats */}
          <View style={[s.sec, { marginTop: 20 }]}>
            <View style={s.secHead}>
              <View style={[s.secBar, { backgroundColor: "#8B5CF6" }]} />
              <Text style={[s.secTitle, { color: colors.foreground }]}>بالأرقام</Text>
            </View>
            <View style={[s.statsGrid2, { gap: 10 }]}>
              {[
                { val: "3", lbl: "سنوات من التطوير" },
                { val: "+15K", lbl: "كود عطل مدعوم" },
                { val: "99%", lbl: "سيارات ما بعد 2001" },
                { val: "24/7", lbl: "دعم المستخدمين" },
              ].map((st, i) => (
                <View key={i} style={[s.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.statVal, { color: "#8B5CF6" }]}>{st.val}</Text>
                  <Text style={[s.statLbl, { color: colors.mutedForeground }]}>{st.lbl}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Timeline */}
          <View style={[s.sec, { marginTop: 20 }]}>
            <View style={s.secHead}>
              <View style={[s.secBar, { backgroundColor: "#F59E0B" }]} />
              <Text style={[s.secTitle, { color: colors.foreground }]}>رحلتنا</Text>
            </View>
            {TIMELINE.map((t, i) => (
              <View key={i} style={s.tlRow}>
                <View style={s.tlLeft}>
                  <View style={[s.tlDot, { backgroundColor: "#FF6A00", borderColor: colors.background }]} />
                  {i < TIMELINE.length - 1 && <View style={[s.tlLine, { backgroundColor: colors.border }]} />}
                </View>
                <View style={[s.tlCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={s.tlYearRow}>
                    <View style={[s.chip, { backgroundColor: "#FF6A0018" }]}>
                      <Text style={[s.chipTxt, { color: "#FF6A00" }]}>{t.year}</Text>
                    </View>
                    <Text style={[s.tlTitle, { color: colors.foreground }]}>{t.title}</Text>
                  </View>
                  <Text style={[s.tlDesc, { color: colors.mutedForeground }]}>{t.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Values */}
          <View style={[s.sec, { marginTop: 20 }]}>
            <View style={s.secHead}>
              <View style={[s.secBar, { backgroundColor: "#EC4899" }]} />
              <Text style={[s.secTitle, { color: colors.foreground }]}>قيمنا</Text>
            </View>
            <View style={s.valGrid}>
              {VALUES.map((v, i) => (
                <View key={i} style={[s.valCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[s.valIcon, { backgroundColor: v.color + "18" }]}>
                    <Ionicons name={v.icon} size={20} color={v.color} />
                  </View>
                  <Text style={[s.valTitle, { color: colors.foreground }]}>{v.title}</Text>
                  <Text style={[s.valDesc, { color: colors.mutedForeground }]}>{v.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Who are we */}
          <View style={[s.sec, { marginTop: 20 }]}>
            <View style={s.secHead}>
              <View style={[s.secBar, { backgroundColor: "#10B981" }]} />
              <Text style={[s.secTitle, { color: colors.foreground }]}>من نحن</Text>
            </View>
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.bodyTxt, { color: colors.mutedForeground }]}>
                نحن فريق يؤمن إن التقنية لازم تخدمك — لا أن تعقّدك. شفنا إن كثير ناس يواجهون نفس المشكلة: سيارتهم تعطيهم إشارات، بس ما يفهمونها.
              </Text>
              <Text style={[s.bodyTxt, { color: "#FF6A00", marginTop: 10, fontFamily: "Inter_600SemiBold" }]}>
                هدفنا إن كل شخص يصير فاهم سيارته، ولا يكون بموقف "مدري وش فيها" مرة ثانية.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* CTA */}
        <View style={[s.ctaBar, { paddingBottom: botPad, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Pressable onPress={() => router.push("/register")} style={[s.primaryBtn, { backgroundColor: "#FF6A00" }]}>
            <Text style={s.primaryTxt}>إنشاء حساب مجاني</Text>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </Pressable>
          <Pressable onPress={() => router.push("/login")} style={[s.ghostBtn, { borderColor: colors.border }]}>
            <Text style={[s.ghostTxt, { color: colors.foreground }]}>لدي حساب بالفعل</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /* ── Onboarding Slides ──────────────────────────────────── */
  const isPain = activeIdx === 1;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: topPad + 6 }]}>
        <Pressable onPress={() => router.push("/login")} hitSlop={12}>
          <Text style={[s.topLink, { color: colors.mutedForeground }]}>تخطي</Text>
        </Pressable>
        <Image source={require("@/assets/images/mfk-logo.png")} style={s.topLogo} contentFit="contain" />
        <Pressable onPress={() => setShowAbout(true)} hitSlop={12}>
          <Text style={[s.topLink, { color: colors.mutedForeground }]}>عن مفك</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={slidesRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="center"
        disableIntervalMomentum
        onMomentumScrollEnd={handleSlideMomentumEnd}
        contentContainerStyle={s.slidesTrack}
      >
        {SLIDES.map((item, index) => {
          const itemIsPain = index === 1;

          return (
            <View key={item.title} style={[s.slidePage, { width }]}>
              <View style={s.illustArea}>
                {itemIsPain ? (
                  <View style={{ gap: 10, width: "100%", paddingHorizontal: 28 }}>
                    {PAIN_POINTS.map((p, i) => (
                      <View key={i} style={[s.painCard, { backgroundColor: colors.card, borderColor: "#EF444430" }]}>
                        <Ionicons name={p.icon} size={18} color="#EF4444" />
                        <Text style={[s.painTxt, { color: colors.foreground }]}>{p.text}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <>
                    <View style={[s.ringOuter, { borderColor: item.color + "10" }]} />
                    <View style={[s.ringMid, { borderColor: item.color + "1E" }]} />
                    <View style={[s.ringInner, { backgroundColor: item.color + "18", borderColor: item.color + "35" }]}>
                      <Ionicons name={item.icon} size={96} color={item.color} />
                    </View>
                    <View style={[s.floatBadge, { backgroundColor: item.color, shadowColor: item.color }]}>
                      <Text style={s.floatBadgeTxt}>{item.badge}</Text>
                    </View>
                  </>
                )}
              </View>

              <View style={s.slideText}>
                <Text style={[s.slideTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[s.slideDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Dots */}
      <View style={s.dotsRow}>
        {SLIDES.map((sl, i) => (
          <Pressable key={i} onPress={() => goToSlide(i)} hitSlop={8}>
            <View style={[s.dot, { width: i === activeIdx ? 28 : 7, backgroundColor: i === activeIdx ? slide.color : colors.border }]} />
          </Pressable>
        ))}
      </View>

      {/* CTA */}
      <View style={[s.ctaBar, { paddingBottom: botPad, borderTopWidth: 0, backgroundColor: "transparent" }]}>
        <Pressable onPress={goNext} style={[s.primaryBtn, { backgroundColor: slide.color, shadowColor: slide.color }]}>
          <Text style={s.primaryTxt}>{activeIdx < SLIDES.length - 1 ? "التالي" : "ابدأ الآن"}</Text>
          <Ionicons name={activeIdx < SLIDES.length - 1 ? "arrow-forward" : "checkmark"} size={18} color="#fff" />
        </Pressable>
        <Pressable onPress={() => router.push("/login")} style={[s.ghostBtn, { borderColor: colors.border }]}>
          <Text style={[s.ghostTxt, { color: colors.mutedForeground }]}>لدي حساب بالفعل</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1 },
  slidesTrack: { alignItems: "stretch" },

  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 8 },
  topLink: { fontSize: 13, fontFamily: "Inter_500Medium" },
  topLogo: { width: 88, height: 32 },

  slidePage: { flex: 1, justifyContent: "center" },
  illustArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  ringOuter: { position: "absolute", width: 310, height: 310, borderRadius: 155, borderWidth: 1 },
  ringMid: { position: "absolute", width: 250, height: 250, borderRadius: 125, borderWidth: 1.5 },
  ringInner: { width: 190, height: 190, borderRadius: 95, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  floatBadge: { position: "absolute", top: "18%", right: "14%", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  floatBadgeTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },

  painCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  painTxt: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "right" },

  slideText: { alignItems: "center", paddingHorizontal: 28, paddingBottom: 4, gap: 10 },
  slideTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 36 },
  slideDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 23 },

  dotsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 18 },
  dot: { height: 7, borderRadius: 4 },

  ctaBar: { paddingHorizontal: 20, paddingTop: 0, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  primaryTxt: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  ghostBtn: { paddingVertical: 14, borderRadius: 16, alignItems: "center", borderWidth: StyleSheet.hairlineWidth },
  ghostTxt: { fontSize: 14, fontFamily: "Inter_500Medium" },

  /* About */
  aboutBar: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  aboutBarTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },

  heroCard: { marginHorizontal: 16, padding: 24, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", gap: 8 },
  heroLogo: { width: 180, height: 64 },
  heroSlogan: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },

  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chipTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  statsGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  statsGrid2: { flexDirection: "row-reverse", flexWrap: "wrap" },
  statBox: { width: "47%", padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", gap: 4 },
  statVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },

  sec: { paddingHorizontal: 16, gap: 10 },
  secHead: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  secBar: { width: 4, height: 18, borderRadius: 2 },
  secTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },

  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  bodyTxt: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 23 },

  featRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 14, paddingVertical: 13 },
  featIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 2 },
  featTitle: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
  featTxt: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "right" },
  featSubTxt: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },

  stepRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepNumTxt: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  stepIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "right" },
  stepDesc: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 19 },

  tlRow: { flexDirection: "row-reverse", gap: 12, marginBottom: 4 },
  tlLeft: { alignItems: "center", paddingTop: 4, width: 20 },
  tlDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  tlLine: { flex: 1, width: 2, marginTop: 4 },
  tlCard: { flex: 1, padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10, gap: 6 },
  tlYearRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  tlTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  tlDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 20 },

  valGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  valCard: { width: "47%", padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  valIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  valTitle: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
  valDesc: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 18 },
});
