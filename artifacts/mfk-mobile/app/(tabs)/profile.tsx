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
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useThemeMode } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { ArabicText } from "@/components/ArabicText";
import { useToast } from "@/components/Toast";
import { rowDir } from "@/lib/layout";
import {
  disableAppNotifications,
  enableAppNotifications,
  getNotificationPermission,
  getNotificationsEnabled,
  osNotificationsAvailable,
} from "@/lib/app-notifications";
import { isDeviceBindingEnabled } from "@/src/obd/binding/feature-flags";

const PLAN_LABELS: Record<string, string> = {
  free: "باقة مجانية",
  plus: "باقة مفك",
  mofk: "باقة مفك",
  family: "باقة العائلة",
  pro: "باقة العائلة",
  premium: "باقة العائلة",
  fleet: "باقة الأسطول",
};

function isPlaceholderName(value?: string | null) {
  const name = (value ?? "").trim();
  return !name || /^user$/i.test(name) || /^user[-_]?\d+$/i.test(name) || /mofk\.local/i.test(name);
}

function displayName(name?: string | null) {
  const value = (name ?? "").trim();
  if (isPlaceholderName(value)) return "مستخدم مفك";
  return value;
}

function formatDisplayPhone(phone?: string | null) {
  if (!phone || /mofk\.local|@|^user-/i.test(phone)) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("966") && digits.length >= 9) {
    const local = digits.slice(-9);
    return `+966 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  return phone;
}

function formatDisplayEmail(email?: string | null) {
  const value = (email ?? "").trim();
  if (!value || /mofk\.local$/i.test(value)) return "";
  return value;
}

function initialsFor(name?: string | null) {
  const value = displayName(name);
  return value.slice(0, 1);
}

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
  tone?: string;
  danger?: boolean;
};

function MenuItem({
  icon,
  label,
  description,
  onPress,
  tone,
  danger,
}: MenuItemProps) {
  const colors = useColors();
  const accent = danger ? "#ef4444" : tone ?? colors.primary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: colors.card,
          borderColor: danger ? "#ef444430" : `${accent}32`,
          borderRightColor: accent,
          opacity: pressed ? 0.76 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: `${accent}18`,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={accent}
        />
      </View>
      <View style={styles.menuTextWrap}>
        <ArabicText
          style={[
            styles.menuLabel,
            { color: danger ? "#ef4444" : colors.foreground },
          ]}
        >
          {label}
        </ArabicText>
        {description ? (
          <ArabicText
            numberOfLines={1}
            style={[styles.menuDesc, { color: colors.mutedForeground }]}
          >
            {description}
          </ArabicText>
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

function NotificationsToggleRow() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const accent = "#EC4899";
  const { data: enabled = true } = useQuery({
    queryKey: ["notification-pref"],
    queryFn: getNotificationsEnabled,
  });
  const { data: permission } = useQuery({
    queryKey: ["notification-permission"],
    queryFn: getNotificationPermission,
  });
  const [saving, setSaving] = useState(false);
  const osReady = osNotificationsAvailable();
  const description = !enabled
    ? "التنبيهات موقوفة"
    : osReady && permission?.granted
      ? "تنبيهات النظام مفعلة"
      : osReady && permission?.status === "denied"
        ? "مرفوضة من إعدادات الجهاز — فعّلها من إعدادات الآيفون"
        : "التنبيهات داخل التطبيق مفعلة";

  const toggle = async (next: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      if (!next) {
        await disableAppNotifications();
        queryClient.setQueryData(["notification-pref"], false);
        return;
      }

      const result = await enableAppNotifications();
      queryClient.setQueryData(["notification-pref"], true);
      await queryClient.invalidateQueries({ queryKey: ["notification-permission"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });

      if (!osReady) {
        Alert.alert(
          "تم تفعيل التنبيهات",
          "التنبيهات داخل التطبيق شغّالة. تنبيهات شاشة القفل تحتاج بناء أصلي فيه صلاحية الإشعارات.",
        );
        return;
      }

      if (!result.granted) {
        Alert.alert(
          "صلاحية التنبيهات",
          "اسمح لتطبيق مفك بإرسال التنبيهات من إعدادات الجهاز حتى توصلك على شاشة القفل.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.themeToggle,
        {
          backgroundColor: colors.card,
          borderColor: `${accent}32`,
          borderRightColor: accent,
        },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={enabled ? "notifications" : "notifications-off"} size={19} color={accent} />
      </View>
      <View style={styles.menuTextWrap}>
        <ArabicText style={[styles.menuLabel, { color: colors.foreground }]}>
          التنبيهات
        </ArabicText>
        <ArabicText numberOfLines={2} style={[styles.menuDesc, { color: colors.mutedForeground }]}>
          {description}
        </ArabicText>
      </View>
      <Switch
        value={enabled}
        disabled={saving}
        onValueChange={(value) => {
          void toggle(value);
        }}
        trackColor={{ false: "#3A3A3A", true: "#FFD2B0" }}
        thumbColor={enabled ? colors.primary : "#F4F4F4"}
        ios_backgroundColor="#3A3A3A"
      />
    </View>
  );
}

function ThemeToggleRow() {
  const colors = useColors();
  const { isDark, toggleMode } = useThemeMode();
  const accent = isDark ? "#8B5CF6" : "#F59E0B";

  return (
    <View
      style={[
        styles.themeToggle,
        {
          backgroundColor: colors.card,
          borderColor: `${accent}32`,
          borderRightColor: accent,
        },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={isDark ? "moon" : "sunny"} size={19} color={accent} />
      </View>
      <View style={styles.menuTextWrap}>
        <ArabicText style={[styles.menuLabel, { color: colors.foreground }]}>
          المظهر
        </ArabicText>
        <ArabicText numberOfLines={1} style={[styles.menuDesc, { color: colors.mutedForeground }]}>
          {isDark ? "الوضع الداكن مفعل" : "الوضع الفاتح مفعل"}
        </ArabicText>
      </View>
      <Switch
        value={!isDark}
        onValueChange={() => {
          void toggleMode();
        }}
        trackColor={{ false: "#3A3A3A", true: "#FFD2B0" }}
        thumbColor={!isDark ? colors.primary : "#F4F4F4"}
        ios_backgroundColor="#3A3A3A"
      />
    </View>
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
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRightColor: `${colors.primary}70`,
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
            <ArabicText style={[styles.sheetTitle, { color: colors.foreground }]}>
              {title}
            </ArabicText>
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
      <ArabicText style={[styles.fieldLabel, { color: colors.foreground }]}>
        {label}
      </ArabicText>
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
  const { showToast } = useToast();
  const isDark = colors.mode === "dark";
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
  const [logoutVisible, setLogoutVisible] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const currentPlan = plans?.find((p) => p.tier === sub?.tier);
  const planLabel =
    PLAN_LABELS[sub?.tier ?? user?.subscriptionTier ?? "free"] ??
    currentPlan?.nameAr ??
    "باقة مجانية";
  const planFeatures = useMemo(() => {
    if (!currentPlan) return ["مركبة واحدة", "سجل الصيانة", "متابعة المركبات"];
    return currentPlan.featuresAr?.slice(0, 3) ?? currentPlan.features.slice(0, 3);
  }, [currentPlan]);

  const openEdit = () => {
    router.push("/profile-edit");
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
      showToast("تم حفظ التغييرات");
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

  const performLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await logout();
      setLogoutVisible(false);
      router.replace("/login");
    } catch {
      setLogoutVisible(false);
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    setLogoutVisible(true);
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
          paddingBottom: Platform.OS === "web" ? 160 : 148,
          gap: 16,
          alignItems: "stretch",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <ArabicText style={[styles.screenTitle, { color: colors.foreground }]}>
            حسابي
          </ArabicText>
          <ArabicText style={[styles.screenSub, { color: colors.mutedForeground }]}>
            الملف الشخصي والإعدادات والدعم
          </ArabicText>
        </View>

        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initialsFor(user?.name)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <ArabicText style={[styles.profileName, { color: colors.foreground }]}>
              {displayName(user?.name)}
            </ArabicText>
            {formatDisplayPhone(user?.phone) || formatDisplayEmail(user?.email) ? (
              <ArabicText
                style={[styles.profileMeta, { color: colors.mutedForeground }]}
              >
                {[formatDisplayPhone(user?.phone), formatDisplayEmail(user?.email)].filter(Boolean).join("\n")}
              </ArabicText>
            ) : null}
          </View>
        </View>

        <View
          style={[
            styles.planCard,
            {
              backgroundColor: isDark ? "#17120D" : "#FFF5ED",
              borderColor: `${colors.primary}55`,
            },
          ]}
        >
          <View style={styles.planTop}>
            <View style={styles.planText}>
              <ArabicText style={[styles.planEyebrow, { color: colors.primary }]}>
                اشتراكك الحالي
              </ArabicText>
              <ArabicText style={[styles.planTitle, { color: colors.foreground }]}>
                {planLabel}
              </ArabicText>
              <ArabicText
                style={[styles.planDesc, { color: colors.mutedForeground }]}
              >
                {currentPlan?.descriptionAr ?? "تابع مركبتك وخدمات مفك من مكان واحد."}
              </ArabicText>
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
                <Text style={[styles.featureText, { color: colors.foreground, textAlign: "right" }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.planActions}>
            <Pressable
              onPress={() => router.navigate("/(tabs)/subscription-tab" as never)}
              style={[styles.primarySmallBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primarySmallText}>إدارة الباقة</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/order-device")}
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

        <View style={styles.section}>
          <ArabicText style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            الإعدادات
          </ArabicText>
          <View style={styles.menuGroup}>
            <NotificationsToggleRow />
            <MenuItem
              icon="notifications-circle-outline"
              label="إعدادات الإشعارات"
              description="الصيانة والأعطال والوثائق وقطعة مفك والاشتراك"
              tone="#EC4899"
              onPress={() => router.push("/notification-settings")}
            />
            <ThemeToggleRow />
            <MenuItem
              icon="person-circle-outline"
              label="الملف الشخصي"
              description="تعديل الاسم ورقم الجوال والمدينة"
              tone="#FF6A00"
              onPress={openEdit}
            />
            <MenuItem
              icon="language-outline"
              label="تغيير اللغة"
              description="العربية"
              tone="#38BDF8"
              onPress={() => router.push("/language")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ArabicText style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            الخدمة والدعم
          </ArabicText>
          <View style={styles.menuGroup}>
            {false ? <MenuItem
              icon="water-outline"
              label="البنزين والصرفية"
              description="تسجيل التعبئة ومتابعة متوسط الصرفية"
              tone="#0EA5E9"
              onPress={() => router.push("/fuel")}
            /> : null}
            <MenuItem
              icon="receipt-outline"
              label="طلباتي"
              description="متابعة الدفع والشحن والتفعيل"
              tone="#FF6A00"
              onPress={() => router.push("/my-orders")}
            />
            <MenuItem
              icon="hardware-chip-outline"
              label="طلب قطعة مفك"
              description="جهاز OBD للتشخيص والمتابعة"
              tone="#A855F7"
              onPress={() => router.push("/order-device")}
            />
            {isDeviceBindingEnabled() ? (
            <MenuItem
              icon="link-outline"
              label="إدارة الأجهزة"
              description="ربط القطعة بالمركبة (تجريبي)"
              tone="#22C55E"
              onPress={() => router.push("/device-binding")}
            />
            ) : null}
            <MenuItem
              icon="share-social-outline"
              label="مشاركة التطبيق"
              description="أرسل رابط مفك لأصدقائك"
              tone="#F59E0B"
              onPress={shareApp}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ArabicText style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            معلومات قانونية
          </ArabicText>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="lock-closed-outline"
              label="الأمان والخصوصية"
              description="الجلسات، البيانات، وصلاحيات الحساب"
              tone="#22C55E"
              onPress={() => router.push("/security-privacy")}
            />
            <MenuItem
              icon="document-text-outline"
              label="الشروط والأحكام"
              description="شروط استخدام التطبيق والخدمات"
              tone="#94A3B8"
              onPress={() => router.push("/terms")}
            />
            <MenuItem
              icon="information-circle-outline"
              label="عن تطبيق مفك"
              description="إصدار مفك ومعلومات المنتج"
              tone="#14B8A6"
              onPress={() => router.push("/about")}
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
        visible={logoutVisible}
        title="تسجيل الخروج"
        onClose={() => {
          if (!loggingOut) setLogoutVisible(false);
        }}
      >
        <View style={styles.sheetContent}>
          <Text style={[styles.sheetParagraph, { color: colors.mutedForeground }]}>
            هل تريد تسجيل الخروج من حسابك؟
          </Text>
          <Pressable
            onPress={() => void performLogout()}
            disabled={loggingOut}
            style={[styles.sheetAction, { backgroundColor: "#ef4444", opacity: loggingOut ? 0.7 : 1 }]}
          >
            {loggingOut ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sheetActionText}>تسجيل الخروج</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => setLogoutVisible(false)}
            disabled={loggingOut}
            style={[styles.outlineAction, { borderColor: colors.border }]}
          >
            <Text style={[styles.outlineActionText, { color: colors.foreground }]}>إلغاء</Text>
          </Pressable>
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
      <ArabicText style={[styles.infoTitle, { color: colors.foreground }]}>
        {title}
      </ArabicText>
      <ArabicText style={[styles.infoBody, { color: colors.mutedForeground }]}>
        {body}
      </ArabicText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleRow: { alignItems: "flex-end", gap: 3, width: "100%" },
  screenTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "right", writingDirection: "rtl", width: "100%" },
  screenSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", writingDirection: "rtl", width: "100%" },
  profileCard: {
    flexDirection: rowDir,
    alignItems: "center",
    gap: 12,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderRightWidth: 4,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, alignItems: "stretch", gap: 6 },
  profileName: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "right", writingDirection: "rtl", width: "100%" },
  profileMeta: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", textAlign: "right", writingDirection: "rtl", width: "100%" },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  planCard: { padding: 16, borderRadius: 18, borderWidth: 1, gap: 14 },
  planTop: { flexDirection: rowDir, gap: 12, alignItems: "flex-start" },
  planText: { flex: 1, alignItems: "stretch", gap: 3 },
  planEyebrow: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "right", writingDirection: "rtl", width: "100%" },
  planTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "right", writingDirection: "rtl", width: "100%" },
  planDesc: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", textAlign: "right", writingDirection: "rtl", width: "100%" },
  featureChips: { flexDirection: rowDir, flexWrap: "wrap", gap: 8, justifyContent: "flex-start" },
  featureChip: {
    flexDirection: rowDir,
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  featureText: { fontSize: 12, fontFamily: "Inter_500Medium", writingDirection: "rtl" },
  planActions: { flexDirection: rowDir, gap: 10 },
  primarySmallBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primarySmallText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold", writingDirection: "rtl" },
  secondarySmallBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: rowDir,
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  secondarySmallText: { fontSize: 13, fontFamily: "Inter_600SemiBold", writingDirection: "rtl" },
  quickGrid: { flexDirection: rowDir, gap: 10 },
  quickCard: {
    flex: 1,
    minHeight: 104,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "stretch",
    justifyContent: "space-between",
  },
  quickTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right", writingDirection: "rtl" },
  quickSub: { fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", textAlign: "right", writingDirection: "rtl" },
  section: { gap: 8, width: "100%" },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "right", writingDirection: "rtl", width: "100%" },
  menuGroup: { gap: 7 },
  menuItem: {
    flexDirection: rowDir,
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRightWidth: 3,
  },
  themeToggle: {
    flexDirection: rowDir,
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRightWidth: 3,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextWrap: { flex: 1, alignItems: "stretch", gap: 2 },
  menuLabel: { fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "right", writingDirection: "rtl", width: "100%" },
  menuDesc: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", writingDirection: "rtl", width: "100%" },
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
    flexDirection: rowDir,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right", writingDirection: "rtl" },
  sheetContent: { gap: 12 },
  sheetParagraph: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "right", writingDirection: "rtl", width: "100%" },
  fieldWrap: { gap: 7 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right", writingDirection: "rtl", width: "100%" },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    writingDirection: "rtl",
  },
  sheetAction: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  sheetActionText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold", writingDirection: "rtl" },
  outlineAction: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineActionText: { fontSize: 14, fontFamily: "Inter_700Bold", writingDirection: "rtl" },
  infoLine: {
    alignItems: "stretch",
    gap: 5,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right", writingDirection: "rtl", width: "100%" },
  infoBody: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "right", writingDirection: "rtl", width: "100%" },
  languageCard: {
    flexDirection: rowDir,
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  languageText: { flex: 1, alignItems: "stretch", gap: 2 },
  languageTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right", writingDirection: "rtl", width: "100%" },
  languageSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", writingDirection: "rtl", width: "100%" },
});
