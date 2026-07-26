import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useGetMySubscription,
  useListSubscriptionPlans,
} from "@workspace/api-client-react";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const PLAN_LABELS: Record<string, string> = {
  free: "باقة مجانية",
  plus: "باقة مفك",
  mofk: "باقة مفك",
  family: "باقة العائلة",
  pro: "باقة العائلة",
  premium: "باقة العائلة",
  fleet: "باقة الأسطول",
};

type InfoSheet =
  | null
  | "security"
  | "about"
  | "support"
  | "terms"
  | "language";

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
  danger?: boolean;
};

function MenuItem({
  icon,
  label,
  description,
  onPress,
  danger,
}: MenuItemProps) {
  const colors = useColors();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.76 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: danger
              ? "#ef444420"
              : `${colors.primary}18`,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={danger ? "#ef4444" : colors.primary}
        />
      </View>
      <View style={styles.menuTextWrap}>
        <Text
          style={[
            styles.menuLabel,
            { color: danger ? "#ef4444" : colors.foreground },
          ]}
        >
          {label}
        </Text>
        {description ? (
          <Text
            numberOfLines={1}
            style={[styles.menuDesc, { color: colors.mutedForeground }]}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name="chevron-back"
        size={16}
        color={colors.mutedForeground}
      />
    </Pressable>
  );
}

function Sheet({
  visible,
  title,
  children,
  onClose,
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              {title}
            </Text>
            <View style={{ width: 22 }} />
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad";
}) {
  const colors = useColors();

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        textAlign="right"
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.foreground,
          },
        ]}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const { data: sub } = useGetMySubscription();
  const { data: plans } = useListSubscriptionPlans();

  const [sheet, setSheet] = useState<InfoSheet>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [deviceVisible, setDeviceVisible] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [city, setCity] = useState("");
  const [shortAddress, setShortAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const currentPlan = plans?.find((p) => p.tier === sub?.tier);
  const planLabel =
    PLAN_LABELS[sub?.tier ?? user?.subscriptionTier ?? "free"] ??
    currentPlan?.nameAr ??
    "باقة مجانية";
  const firstLetter = (user?.name || "مفك").charAt(0);

  const planFeatures = useMemo(() => {
    if (!currentPlan) return ["مركبة واحدة", "سجل الصيانة", "متابعة المركبات"];
    return currentPlan.featuresAr?.slice(0, 3) ?? currentPlan.features.slice(0, 3);
  }, [currentPlan]);

  const openEdit = () => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setEditVisible(true);
  };

  const saveProfile = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("تنبيه", "الاسم ورقم الجوال مطلوبة.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({ name, phone, city });
      setEditVisible(false);
      Alert.alert("تم الحفظ", "تم تحديث بيانات ملفك الشخصي.");
    } catch (error) {
      Alert.alert(
        "تعذر الحفظ",
        error instanceof Error ? error.message : "حاول مرة أخرى.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const submitDeviceOrder = async () => {
    if (!name.trim() || !phone.trim() || !shortAddress.trim()) {
      Alert.alert("تنبيه", "اكتب الاسم ورقم الجوال ورقم العنوان المختصر.");
      return;
    }

    setOrdering(true);
    try {
      const response = await fetch("/api/device-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          phone,
          city,
          shortAddress,
          notes,
          planTier: sub?.tier ?? user?.subscriptionTier ?? "free",
        }),
      });

      if (!response.ok) {
        throw new Error("تعذر إرسال طلب القطعة.");
      }

      setDeviceVisible(false);
      setShortAddress("");
      setNotes("");
      Alert.alert(
        "تم استلام الطلب",
        "وصلنا طلب قطعة مفك، وسيتم التواصل معك لتأكيد التوصيل.",
      );
    } catch (error) {
      Alert.alert(
        "تعذر الطلب",
        error instanceof Error ? error.message : "حاول مرة أخرى.",
      );
    } finally {
      setOrdering(false);
    }
  };

  const shareApp = async () => {
    await Share.share({
      message:
        "جرّب تطبيق مفك لمتابعة سيارتك والصيانة والباقات الذكية: https://mofk.app",
    });
  };

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج من حسابك؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تسجيل الخروج",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
            router.replace("/login");
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topPad },
      ]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: Platform.OS === "web" ? 100 : 126,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>
            حسابي
          </Text>
          <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
            الملف الشخصي والإعدادات والدعم
          </Text>
        </View>

        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{firstLetter}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              {user?.name ?? "مستخدم مفك"}
            </Text>
            <Text
              style={[styles.profileMeta, { color: colors.mutedForeground }]}
            >
              {user?.phone || "لا يوجد رقم"}{user?.email ? `  •  ${user.email}` : ""}
            </Text>
          </View>
          <Pressable
            onPress={openEdit}
            style={[styles.editBtn, { backgroundColor: `${colors.primary}18` }]}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>

        <View
          style={[
            styles.planCard,
            { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}45` },
          ]}
        >
          <View style={styles.planTop}>
            <View style={styles.planText}>
              <Text style={[styles.planEyebrow, { color: colors.primary }]}>
                اشتراكك الحالي
              </Text>
              <Text style={[styles.planTitle, { color: colors.foreground }]}>
                {planLabel}
              </Text>
              <Text
                style={[styles.planDesc, { color: colors.mutedForeground }]}
              >
                {currentPlan?.descriptionAr ?? "تابع مركبتك وخدمات مفك من مكان واحد."}
              </Text>
            </View>
            <Ionicons name="shield-checkmark" size={30} color={colors.primary} />
          </View>
          <View style={styles.featureChips}>
            {planFeatures.map((feature) => (
              <View
                key={feature}
                style={[
                  styles.featureChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.foreground }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.planActions}>
            <Pressable
              onPress={() => router.push("/subscription")}
              style={[styles.primarySmallBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primarySmallText}>إدارة الباقة</Text>
            </Pressable>
            <Pressable
              onPress={() => setDeviceVisible(true)}
              style={[
                styles.secondarySmallBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="hardware-chip-outline" size={16} color={colors.foreground} />
              <Text style={[styles.secondarySmallText, { color: colors.foreground }]}>
                طلب قطعة مفك
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <Pressable
            onPress={() => router.push("/assistant")}
            style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="sparkles" size={22} color={colors.primary} />
            <Text style={[styles.quickTitle, { color: colors.foreground }]}>المساعد</Text>
            <Text style={[styles.quickSub, { color: colors.mutedForeground }]}>اسأل عن الأعطال والصيانة</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/recommendations")}
            style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="bulb-outline" size={22} color={colors.primary} />
            <Text style={[styles.quickTitle, { color: colors.foreground }]}>التوصيات</Text>
            <Text style={[styles.quickSub, { color: colors.mutedForeground }]}>متابعة مبنية على بياناتك</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            الإعدادات
          </Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="person-circle-outline"
              label="الملف الشخصي"
              description="تعديل الاسم ورقم الجوال والمدينة"
              onPress={openEdit}
            />
            <MenuItem
              icon="language-outline"
              label="تغيير اللغة"
              description="العربية حاليا، الإنجليزية لاحقا"
              onPress={() => setSheet("language")}
            />
            <MenuItem
              icon="lock-closed-outline"
              label="الأمان والخصوصية"
              description="الجلسات، البيانات، وصلاحيات الحساب"
              onPress={() => setSheet("security")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            الخدمة والدعم
          </Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="help-buoy-outline"
              label="الدعم والمساعدة"
              description="الأسئلة الشائعة وطرق التواصل"
              onPress={() => setSheet("support")}
            />
            <MenuItem
              icon="hardware-chip-outline"
              label="طلب قطعة مفك"
              description="جهاز OBD للتشخيص والمتابعة"
              onPress={() => setDeviceVisible(true)}
            />
            <MenuItem
              icon="share-social-outline"
              label="مشاركة التطبيق"
              description="أرسل رابط مفك لأصدقائك"
              onPress={shareApp}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            معلومات قانونية
          </Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="document-text-outline"
              label="الشروط والأحكام"
              description="شروط استخدام التطبيق والخدمات"
              onPress={() => setSheet("terms")}
            />
            <MenuItem
              icon="information-circle-outline"
              label="عن التطبيق"
              description="إصدار مفك ومعلومات المنتج"
              onPress={() => setSheet("about")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="log-out-outline"
              label={loggingOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
              onPress={handleLogout}
              danger
            />
          </View>
        </View>
      </ScrollView>

      <Sheet
        visible={editVisible}
        title="تعديل الملف الشخصي"
        onClose={() => setEditVisible(false)}
      >
        <View style={styles.sheetContent}>
          <Field label="الاسم" value={name} onChangeText={setName} />
          <Field
            label="رقم الجوال"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Field
            label="المدينة"
            value={city}
            onChangeText={setCity}
            placeholder="الرياض"
          />
          <Pressable
            onPress={saveProfile}
            disabled={savingProfile}
            style={[styles.sheetAction, { backgroundColor: colors.primary }]}
          >
            {savingProfile ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sheetActionText}>حفظ التغييرات</Text>
            )}
          </Pressable>
        </View>
      </Sheet>

      <Sheet
        visible={deviceVisible}
        title="طلب قطعة مفك"
        onClose={() => setDeviceVisible(false)}
      >
        <View style={styles.sheetContent}>
          <Text style={[styles.sheetParagraph, { color: colors.mutedForeground }]}>
            اكتب رقم العنوان المختصر وملاحظات التوصيل، وسيتم تسجيل الطلب في النظام.
          </Text>
          <Field label="الاسم" value={name} onChangeText={setName} />
          <Field
            label="رقم الجوال"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Field
            label="المدينة"
            value={city}
            onChangeText={setCity}
            placeholder="الرياض"
          />
          <Field
            label="رقم العنوان المختصر"
            value={shortAddress}
            onChangeText={setShortAddress}
            placeholder="مثال: RRRD1234"
          />
          <Field
            label="ملاحظات التوصيل"
            value={notes}
            onChangeText={setNotes}
            placeholder="الحي، وقت مناسب للتواصل..."
          />
          <Pressable
            onPress={submitDeviceOrder}
            disabled={ordering}
            style={[styles.sheetAction, { backgroundColor: colors.primary }]}
          >
            {ordering ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sheetActionText}>إرسال الطلب</Text>
            )}
          </Pressable>
        </View>
      </Sheet>

      <Sheet
        visible={sheet === "security"}
        title="الأمان والخصوصية"
        onClose={() => setSheet(null)}
      >
        <View style={styles.sheetContent}>
          <InfoLine title="حماية الحساب" body="تسجيل الدخول محفوظ بجلسة آمنة على جهازك، ويمكنك إنهاؤها من زر تسجيل الخروج." />
          <InfoLine title="بياناتك" body="نستخدم بيانات المركبات والصيانة لعرض التوصيات والتنبيهات داخل حسابك فقط." />
          <InfoLine title="صلاحيات الموقع والبلوتوث" body="لا يتم استخدامها إلا عند الحاجة للتوصيل أو قطعة OBD." />
        </View>
      </Sheet>

      <Sheet
        visible={sheet === "support"}
        title="الدعم والمساعدة"
        onClose={() => setSheet(null)}
      >
        <View style={styles.sheetContent}>
          <InfoLine title="كيف أضيف مركبة؟" body="من تبويب مركباتي اضغط إضافة مركبة، وأدخل بيانات المركبة واللوحة." />
          <InfoLine title="متى أحتاج الترقية؟" body="إذا وصلت حد المركبات أو رغبت باستخدام المساعد الذكي والقطعة." />
          <InfoLine title="كيف أطلب قطعة مفك؟" body="من هذه الصفحة اضغط طلب قطعة مفك وأرسل بيانات التوصيل." />
          <Pressable
            onPress={() => Alert.alert("الدعم", "راسلنا على support@mofk.com")}
            style={[styles.outlineAction, { borderColor: colors.border }]}
          >
            <Text style={[styles.outlineActionText, { color: colors.foreground }]}>
              تواصل مع الدعم
            </Text>
          </Pressable>
        </View>
      </Sheet>

      <Sheet
        visible={sheet === "terms"}
        title="الشروط والأحكام"
        onClose={() => setSheet(null)}
      >
        <View style={styles.sheetContent}>
          <InfoLine title="الاستخدام" body="مفك يساعدك في متابعة المركبات والصيانة، ولا يغني عن فحص فني مختص عند وجود عطل." />
          <InfoLine title="الاشتراكات" body="الباقات تحدد عدد المركبات والميزات المتاحة داخل التطبيق." />
          <InfoLine title="القطعة" body="قطعة OBD تعمل عند توفر الجهاز المتوافق والتصاريح المطلوبة على الجوال." />
        </View>
      </Sheet>

      <Sheet
        visible={sheet === "about"}
        title="عن التطبيق"
        onClose={() => setSheet(null)}
      >
        <View style={styles.sheetContent}>
          <InfoLine title="مفك" body="تطبيق سعودي لمتابعة المركبات والصيانة وبيانات OBD وتجربة اشتراك مرنة." />
          <InfoLine title="الإصدار" body="MFK Mobile 1.0.0" />
          <InfoLine title="الباقات" body="مجانية، مفك، العائلة، والأسطول." />
        </View>
      </Sheet>

      <Sheet
        visible={sheet === "language"}
        title="تغيير اللغة"
        onClose={() => setSheet(null)}
      >
        <View style={styles.sheetContent}>
          <View style={[styles.languageCard, { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}>
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            <View style={styles.languageText}>
              <Text style={[styles.languageTitle, { color: colors.foreground }]}>العربية</Text>
              <Text style={[styles.languageSub, { color: colors.mutedForeground }]}>اللغة الحالية للتطبيق</Text>
            </View>
          </View>
          <View style={[styles.languageCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="ellipse-outline" size={22} color={colors.mutedForeground} />
            <View style={styles.languageText}>
              <Text style={[styles.languageTitle, { color: colors.foreground }]}>English</Text>
              <Text style={[styles.languageSub, { color: colors.mutedForeground }]}>قريبا</Text>
            </View>
          </View>
        </View>
      </Sheet>
    </View>
  );
}

function InfoLine({ title, body }: { title: string; body: string }) {
  const colors = useColors();

  return (
    <View style={[styles.infoLine, { borderColor: colors.border }]}>
      <Text style={[styles.infoTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      <Text style={[styles.infoBody, { color: colors.mutedForeground }]}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleRow: { alignItems: "flex-end", gap: 3 },
  screenTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  screenSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  profileCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, alignItems: "flex-end", gap: 3 },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
  profileMeta: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  planCard: { padding: 16, borderRadius: 18, borderWidth: 1, gap: 14 },
  planTop: { flexDirection: "row-reverse", gap: 12, alignItems: "flex-start" },
  planText: { flex: 1, alignItems: "flex-end", gap: 3 },
  planEyebrow: { fontSize: 12, fontFamily: "Inter_700Bold" },
  planTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "right" },
  planDesc: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", textAlign: "right" },
  featureChips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  featureChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  featureText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  planActions: { flexDirection: "row-reverse", gap: 10 },
  primarySmallBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primarySmallText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  secondarySmallBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row-reverse",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  secondarySmallText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  quickGrid: { flexDirection: "row-reverse", gap: 10 },
  quickCard: {
    flex: 1,
    minHeight: 104,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  quickTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right" },
  quickSub: { fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", textAlign: "right" },
  section: { gap: 8 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "right" },
  menuGroup: { gap: 7 },
  menuItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextWrap: { flex: 1, alignItems: "flex-end", gap: 2 },
  menuLabel: { fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "right" },
  menuDesc: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.64)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
    maxHeight: "88%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#666",
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetContent: { gap: 12 },
  sheetParagraph: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "right" },
  fieldWrap: { gap: 7 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  sheetAction: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  sheetActionText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  outlineAction: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineActionText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  infoLine: {
    alignItems: "flex-end",
    gap: 5,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right" },
  infoBody: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "right" },
  languageCard: {
    flexDirection: "row-reverse",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  languageText: { flex: 1, alignItems: "flex-end", gap: 2 },
  languageTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  languageSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
