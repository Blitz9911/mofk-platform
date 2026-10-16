import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { smoothBack } from "@/lib/navigation";

type BillingCycle = "monthly" | "yearly";
type PlanKey = "mofk" | "family" | "fleet";
type DeliveryMethod = "delivery" | "pickup";

const DEFAULT_DEVICE_PRICE = 149;
const PLANS: Record<PlanKey, {
  title: string;
  subtitle: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  devicePrice: number;
  included: string[];
  badge?: string;
}> = {
  mofk: {
    title: "باقة مفك",
    subtitle: "اشتراك مدفوع لمركبة واحدة مع جهاز مفك OBD",
    description: "جهاز OBD برسوم مرة واحدة مع اشتراك شهري أو سنوي لمركبة واحدة.",
    monthlyPrice: 29,
    yearlyPrice: 290,
    devicePrice: 149,
    included: [
      "مركبة واحدة",
      "جهاز مفك OBD برسوم مرة واحدة",
      "تشخيص مباشر وتنبيهات الأعطال",
      "رسائل المساعد الذكي غير محدودة",
      "تصدير PDF",
    ],
    badge: "الأكثر اختيارًا",
  },
  family: {
    title: "باقة العائلة",
    subtitle: "لعدة مركبات مع تقارير أعمق وتصدير Excel",
    description: "كل مزايا مفك مع مساحة أكبر للعائلة وتصدير بيانات Excel.",
    monthlyPrice: 59,
    yearlyPrice: 590,
    devicePrice: 149,
    included: [
      "حتى 3 مركبات",
      "جهاز مفك OBD برسوم مرة واحدة",
      "تقارير صحة متقدمة",
      "رسائل المساعد الذكي غير محدودة",
      "تصدير البيانات Excel",
    ],
  },
  fleet: {
    title: "باقة الاسطول",
    subtitle: "للشركات: تسعير مخصص ومتابعة من المبيعات",
    description: "حل للشركات يبدأ من 5 مركبات فأكثر، بدون Checkout ذاتي وبدون سعر معلن.",
    monthlyPrice: null,
    yearlyPrice: null,
    devicePrice: 0,
    included: [
      "5 مركبات فأكثر",
      "لوحة تحكم الأسطول",
      "إدارة المستخدمين والصلاحيات",
      "تصدير البيانات Excel",
      "دعم خاص",
    ],
  },
};

function sar(value: number) {
  return `${Math.round(value).toLocaleString("ar-SA")} ر.س`;
}

function planPrice(plan: PlanKey, cycle: BillingCycle) {
  const item = PLANS[plan];
  return cycle === "monthly" ? item.monthlyPrice : item.yearlyPrice;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const colors = useColors();

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        textAlign="right"
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          multiline && styles.textArea,
          { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
        ]}
      />
    </View>
  );
}

export default function OrderDeviceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("mofk");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("delivery");
  const [address, setAddress] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [success, setSuccess] = useState<{ orderId: string; planTitle: string } | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const selectedPlanData = PLANS[selectedPlan];
  const devicePrice = selectedPlanData.devicePrice ?? DEFAULT_DEVICE_PRICE;
  const subscriptionPrice = planPrice(selectedPlan, billingCycle);
  const subscriptionLine = useMemo(() => {
    if (subscriptionPrice === null) {
      return "حسب العقد";
    }

    if (billingCycle === "monthly") {
      return `${sar(subscriptionPrice)}/شهر بعد التفعيل`;
    }

    const equivalent = Math.round(subscriptionPrice / 12);
    return `${sar(subscriptionPrice)}/سنة بعد التفعيل، يعادل ${sar(equivalent)}/شهر`;
  }, [billingCycle, subscriptionPrice]);

  const skipToPairing = () => router.replace("/pair-device");

  const submit = async () => {
    if (deliveryMethod === "delivery" && !address.trim()) {
      Alert.alert("العنوان مطلوب", "اكتب العنوان بالتفصيل لإتمام طلب التوصيل.");
      return;
    }

    setOrdering(true);
    try {
      const response = await fetch("/api/device-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: user?.name ?? "مستخدم مفك",
          phone: user?.phone ?? "",
          city: deliveryMethod === "delivery" ? address.split("،")[0]?.trim() : "استلام من نقطة توزيع",
          shortAddress: deliveryMethod === "delivery" ? address.trim() : "pickup",
          planTier: selectedPlan,
          notes: [
            `طريقة الاستلام: ${deliveryMethod === "delivery" ? "توصيل لعنواني" : "استلام من نقطة توزيع"}`,
            `الباقة: ${selectedPlanData.title}`,
            `الدفع: ${billingCycle === "yearly" ? "سنوي" : "شهري"}`,
          ].join(" | "),
        }),
      });

      if (!response.ok) {
        throw new Error("تعذر تأكيد الطلب. حاول مرة أخرى.");
      }

      const order = await response.json();
      setSuccess({
        orderId: order?.id ? String(order.id).slice(0, 8).toUpperCase() : "MFK-0001",
        planTitle: selectedPlanData.title,
      });
    } catch (error) {
      Alert.alert("تعذر الطلب", error instanceof Error ? error.message : "حاول مرة أخرى.");
    } finally {
      setOrdering(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ScrollView contentContainerStyle={[styles.successScroll, { paddingBottom: insets.bottom + 26 }]}>
          <View style={[styles.successIcon, { backgroundColor: "#22c55e18", borderColor: "#22c55e45" }]}>
            <Ionicons name="checkmark" size={42} color="#22c55e" />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>تم تأكيد طلبك</Text>
          <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
            راح يوصلك جهاز مفك خلال ٢-٤ أيام عمل. بمجرد ما يوصلك، ارجع للتطبيق وابدأ ربطه بسيارتك.
          </Text>

          <View style={[styles.orderSummaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryLine}>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>#{success.orderId}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>رقم الطلب</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryLine}>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{success.planTitle}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>الباقة</Text>
            </View>
          </View>

          <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.replace("/pair-device")}>
            <Text style={styles.primaryText}>متابعة</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => smoothBack(router)} style={styles.backButton}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]}>اطلب جهاز مفك</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>جهاز OBD-II ذكي + اشتراك مفك</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.deviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.deviceIcon, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="hardware-chip-outline" size={34} color={colors.primary} />
          </View>
          <View style={styles.deviceText}>
            <Text style={[styles.deviceTitle, { color: colors.foreground }]}>جهاز مفك OBD-II</Text>
            <Text style={[styles.deviceDesc, { color: colors.mutedForeground }]}>
              يتركب بسهولة في منفذ OBD-II أسفل عجلة القيادة ويرسل بيانات سيارتك لحظة بلحظة.
            </Text>
            <Text style={[styles.devicePrice, { color: colors.primary }]}>
              {selectedPlanData.devicePrice ? `${sar(selectedPlanData.devicePrice)} (رسوم مرة واحدة)` : "حسب العقد"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>اختيار باقة الاشتراك</Text>
          <View style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(["yearly", "monthly"] as BillingCycle[]).map((cycle) => {
              const active = billingCycle === cycle;
              return (
                <Pressable
                  key={cycle}
                  onPress={() => setBillingCycle(cycle)}
                  style={[styles.segmentItem, active && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.segmentText, { color: active ? "#fff" : colors.mutedForeground }]}>
                    {cycle === "yearly" ? "سنوي - وفر ٢٠٪" : "شهري"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {(["mofk", "family", "fleet"] as PlanKey[]).map((plan) => {
            const item = PLANS[plan];
            const active = selectedPlan === plan;
            const displayedPrice =
              item.monthlyPrice === null ? "حسب العرض" : `${sar(item.monthlyPrice)}/شهر`;
            return (
              <Pressable
                key={plan}
                onPress={() => setSelectedPlan(plan)}
                style={[
                  styles.planOption,
                  {
                    backgroundColor: active ? `${colors.primary}12` : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={[styles.radio, { borderColor: active ? colors.primary : colors.border }]}>
                  {active ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
                </View>
                <View style={styles.planOptionText}>
                  <View style={styles.planTitleRow}>
                    {item.badge ? (
                      <View style={[styles.badge, { backgroundColor: `${colors.primary}18` }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>{item.badge}</Text>
                      </View>
                    ) : null}
                  <Text style={[styles.planName, { color: colors.foreground }]}>{item.title}</Text>
                  </View>
                  <Text style={[styles.planDesc, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
                  <Text style={[styles.planSummary, { color: colors.mutedForeground }]}>{item.description}</Text>
                  <Text style={[styles.planPrice, { color: colors.primary }]}>{displayedPrice}</Text>
                  <View style={styles.featureList}>
                    {item.included.map((feature) => (
                      <View key={feature} style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                        <Text style={[styles.featureText, { color: colors.foreground }]}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>طريقة الاستلام</Text>
          <View style={[styles.receiveSegment, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {([
              { value: "delivery", label: "توصيل لعنواني", icon: "home-outline" },
              { value: "pickup", label: "استلام من نقطة توزيع", icon: "storefront-outline" },
            ] as const).map((method) => {
              const active = deliveryMethod === method.value;
              return (
                <Pressable
                  key={method.value}
                  onPress={() => setDeliveryMethod(method.value)}
                  style={[
                    styles.receiveItem,
                    active && { backgroundColor: `${colors.primary}16`, borderColor: colors.primary },
                  ]}
                >
                  <Ionicons name={method.icon} size={18} color={active ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.receiveText, { color: active ? colors.foreground : colors.mutedForeground }]}>{method.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {deliveryMethod === "delivery" ? (
            <Field
              label="العنوان بالتفصيل (المدينة، الحي، الشارع)"
              value={address}
              onChangeText={setAddress}
              placeholder="مثال: الرياض، حي النرجس، شارع عثمان بن عفان"
              multiline
            />
          ) : (
            <View style={[styles.pickupNote, { backgroundColor: "#f59e0b12", borderColor: "#f59e0b42" }]}>
              <Ionicons name="information-circle-outline" size={18} color="#f59e0b" />
              <Text style={styles.pickupText}>سيتم عرض أقرب نقطة توزيع بعد تأكيد الطلب.</Text>
            </View>
          )}
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>ملخص الطلب</Text>
          <View style={styles.summaryLine}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {selectedPlanData.devicePrice ? sar(devicePrice) : "حسب العقد"}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>سعر الجهاز</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{subscriptionLine}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>الاشتراك</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryLine}>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {selectedPlanData.devicePrice ? sar(devicePrice) : "حسب العرض"}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.foreground }]}>الإجمالي المستحق الآن</Text>
          </View>
        </View>

        <Pressable
          onPress={submit}
          disabled={ordering}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: pressed ? "#E65C00" : colors.primary, opacity: ordering ? 0.72 : 1 },
          ]}
        >
          {ordering ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              {selectedPlan === "fleet" ? "تأكيد طلب التواصل" : "تأكيد الطلب والدفع"}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={skipToPairing} style={styles.skipLink}>
          <Text style={[styles.skipText, { color: colors.primary }]}>تخطي — عندي جهاز مفك بالفعل</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: { alignItems: "center", height: 38, justifyContent: "center", width: 38 },
  headerText: { alignItems: "center", flex: 1, gap: 2 },
  title: { fontFamily: "Inter_700Bold", fontSize: 18 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 11 },
  section: { gap: 10 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "right" },
  deviceCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row-reverse",
    gap: 14,
    padding: 16,
  },
  deviceIcon: { alignItems: "center", borderRadius: 999, height: 62, justifyContent: "center", width: 62 },
  deviceText: { alignItems: "flex-end", flex: 1, gap: 5 },
  deviceTitle: { fontFamily: "Inter_700Bold", fontSize: 19, textAlign: "right" },
  deviceDesc: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 19, textAlign: "right" },
  devicePrice: { fontFamily: "Inter_700Bold", fontSize: 21, textAlign: "right" },
  segment: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row-reverse", padding: 4 },
  segmentItem: { alignItems: "center", borderRadius: 12, flex: 1, minHeight: 40, justifyContent: "center" },
  segmentText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  planOption: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.25,
    flexDirection: "row-reverse",
    gap: 12,
    padding: 14,
  },
  radio: { alignItems: "center", borderRadius: 999, borderWidth: 2, height: 22, justifyContent: "center", width: 22 },
  radioDot: { borderRadius: 999, height: 10, width: 10 },
  planOptionText: { alignItems: "flex-end", flex: 1, gap: 4 },
  planTitleRow: { alignItems: "center", flexDirection: "row-reverse", gap: 8 },
  planName: { fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "right" },
  planDesc: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "right" },
  planSummary: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17, textAlign: "right" },
  planPrice: { fontFamily: "Inter_700Bold", fontSize: 13, textAlign: "right" },
  featureList: { gap: 6, marginTop: 4 },
  featureRow: { alignItems: "center", flexDirection: "row-reverse", gap: 6 },
  featureText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 17, textAlign: "right" },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: "Inter_700Bold", fontSize: 10 },
  receiveSegment: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row-reverse", gap: 8, padding: 6 },
  receiveItem: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 13,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row-reverse",
    gap: 7,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 8,
  },
  receiveText: { flexShrink: 1, fontFamily: "Inter_700Bold", fontSize: 11, textAlign: "right" },
  fieldWrap: { gap: 7 },
  fieldLabel: { fontFamily: "Inter_700Bold", fontSize: 13, textAlign: "right" },
  input: { borderRadius: 14, borderWidth: 1, fontFamily: "Inter_400Regular", fontSize: 14, minHeight: 50, paddingHorizontal: 13 },
  textArea: { minHeight: 90, paddingTop: 12 },
  pickupNote: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row-reverse", gap: 8, padding: 12 },
  pickupText: { color: "#f59e0b", flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 18, textAlign: "right" },
  summaryCard: { borderRadius: 18, borderWidth: 1, gap: 11, padding: 15 },
  orderSummaryCard: { borderRadius: 18, borderWidth: 1, gap: 12, padding: 16, width: "100%" },
  summaryTitle: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "right" },
  summaryLine: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  summaryLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, textAlign: "right" },
  summaryValue: { flex: 1.2, fontFamily: "Inter_700Bold", fontSize: 13, textAlign: "left" },
  totalValue: { flex: 1.2, fontFamily: "Inter_700Bold", fontSize: 20, textAlign: "left" },
  divider: { height: StyleSheet.hairlineWidth, width: "100%" },
  primaryButton: { alignItems: "center", borderRadius: 16, minHeight: 56, justifyContent: "center" },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  skipLink: { alignItems: "center", paddingVertical: 6 },
  skipText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  successScroll: { alignItems: "center", flexGrow: 1, justifyContent: "center", gap: 18, padding: 22 },
  successIcon: { alignItems: "center", borderRadius: 999, borderWidth: 1, height: 88, justifyContent: "center", width: 88 },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 24, textAlign: "center" },
  successBody: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 24, textAlign: "center" },
});
