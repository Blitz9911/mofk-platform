import { Ionicons } from "@expo/vector-icons";
import { useGetMySubscription } from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { saveMobileOrder } from "@/lib/mobile-orders";
import { useAuth } from "@/context/AuthContext";

type BillingCycle = "monthly" | "yearly";
type PlanId = "free" | "mofk" | "family" | "fleet";

type MobilePlan = {
  id: PlanId;
  name: string;
  subtitle: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  devicePrice: number;
  maxVehicles: number | "sales";
  saleType: "self-serve" | "sales-led";
  badge?: string;
  summary: string;
  included: string[];
};

const WEB_PLANS: MobilePlan[] = [
  {
    id: "free",
    name: "باقة مجانية",
    subtitle: "إدارة مركبة واحدة بدون جهاز وبدون دفع",
    monthlyPrice: 0,
    yearlyPrice: 0,
    devicePrice: 0,
    maxVehicles: 1,
    saleType: "self-serve",
    summary: "لمن يريد تسجيل بيانات السيارة والصيانة والوقود فقط، بدون OBD وبدون دفع.",
    included: [
      "مركبة واحدة",
      "تسجيل بيانات المركبة",
      "سجل الصيانة والتكاليف",
      "متابعة مواعيد الصيانة",
      "بدون مساعد ذكي",
    ],
  },
  {
    id: "mofk",
    name: "باقة مفك",
    subtitle: "اشتراك مدفوع لمركبة واحدة مع جهاز مفك OBD",
    monthlyPrice: 29,
    yearlyPrice: 290,
    devicePrice: 149,
    maxVehicles: 1,
    saleType: "self-serve",
    badge: "الأكثر اختيارًا",
    summary: "جهاز OBD برسوم مرة واحدة مع اشتراك شهري أو سنوي لمركبة واحدة.",
    included: [
      "مركبة واحدة",
      "جهاز مفك OBD برسوم مرة واحدة",
      "تشخيص مباشر وتنبيهات الأعطال",
      "رسائل المساعد الذكي غير محدودة",
      "تصدير PDF",
    ],
  },
  {
    id: "family",
    name: "باقة العائلة",
    subtitle: "لعدة مركبات مع تقارير أعمق وتصدير Excel",
    monthlyPrice: 59,
    yearlyPrice: 590,
    devicePrice: 149,
    maxVehicles: 3,
    saleType: "self-serve",
    summary: "كل مزايا مفك مع مساحة أكبر للعائلة وتصدير بيانات Excel.",
    included: [
      "حتى 3 مركبات",
      "جهاز مفك OBD برسوم مرة واحدة",
      "تقارير صحة متقدمة",
      "رسائل المساعد الذكي غير محدودة",
      "تصدير PDF",
    ],
  },
  {
    id: "fleet",
    name: "باقة الاسطول",
    subtitle: "للشركات: تسعير مخصص ومتابعة من المبيعات",
    monthlyPrice: null,
    yearlyPrice: null,
    devicePrice: 0,
    maxVehicles: "sales",
    saleType: "sales-led",
    summary: "حل للشركات بإدارة متقدمة وتسعير مخصص عبر فريق مفك.",
    included: [
      "لوحة تحكم الاسطول",
      "إدارة المستخدمين والصلاحيات",
      "تصدير البيانات Excel",
      "دعم خاص",
    ],
  },
];

function normalizePlanId(id?: string | null): PlanId {
  if (id === "plus" || id === "mofk" || id === "individual-basic") return "mofk";
  if (id === "pro" || id === "premium" || id === "family" || id === "individual-advanced") return "family";
  if (id === "fleet") return "fleet";
  return "free";
}

function formatSar(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatVehicles(value: number | "sales") {
  if (value === "sales") return "5 مركبات فأكثر";
  if (value === 1) return "مركبة واحدة";

  return `حتى ${new Intl.NumberFormat("ar-SA").format(value)} مركبات`;
}

function getPrice(plan: MobilePlan, cycle: BillingCycle) {
  if (plan.saleType === "sales-led") return null;
  return cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}

function getMonthlyEquivalent(plan: MobilePlan) {
  if (plan.yearlyPrice === null) return null;
  return Math.round(plan.yearlyPrice / 12);
}

function getYearlySavings(plan: MobilePlan) {
  if (!plan.monthlyPrice || !plan.yearlyPrice) return 0;
  return Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100);
}

function getWebPricingUrl() {
  const explicitWebUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL?.replace(/\/+$/, "");
  const domainUrl = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN.replace(/\/+$/, "")}` : null;
  const baseUrl = explicitWebUrl || domainUrl || "https://mofk.app";

  return `${baseUrl}/pricing?plan=fleet`;
}

export default function SubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const isDark = colors.mode === "dark";
  const pageGradient: readonly [string, string, string, string] = isDark
    ? ["#050607", "#0B0B0B", "#11100E", "#090909"]
    : ["#F6F7F9", "#FFFFFF", "#F1F5F9", "#F6F7F9"];
  const subtleBorder = isDark ? "rgba(255,255,255,0.10)" : "#E3E8EF";
  const subtlePanel = isDark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.96)";
  const selectedPanel = isDark ? "rgba(255,106,0,0.10)" : "#FFF4EA";
  const mutedPanel = isDark ? "rgba(255,255,255,0.06)" : "#EEF2F7";
  const raisedPanel = isDark ? "rgba(18,18,18,0.94)" : "rgba(255,255,255,0.96)";
  const darkOverlay = isDark ? "rgba(0,0,0,0.68)" : "rgba(18,18,18,0.34)";
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("mofk");
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("مدى");
  const [orderNumber, setOrderNumber] = useState("");

  const { data: subscription, isLoading } = useGetMySubscription();

  const currentPlanId = normalizePlanId(subscription?.tier);
  const currentPlan = WEB_PLANS.find((plan) => plan.id === currentPlanId) ?? WEB_PLANS[0];
  const selectedPlan = useMemo(
    () => WEB_PLANS.find((plan) => plan.id === selectedPlanId) ?? WEB_PLANS[1],
    [selectedPlanId],
  );

  const selectedPrice = getPrice(selectedPlan, billingCycle);
  const selectedMonthlyEquivalent = getMonthlyEquivalent(selectedPlan);
  const subscriptionAmount = selectedPrice ?? 0;
  const deviceAmount = selectedPlan.devicePrice;
  const subtotal = subscriptionAmount + deviceAmount;
  const vat = Math.round(subtotal * 0.15);
  const totalDue = subtotal + vat;

  const checkout = async (plan = selectedPlan) => {
    if (plan.id === currentPlanId) {
      Alert.alert("الباقة الحالية", "هذه باقتك الحالية بالفعل.");
      return;
    }

    if (plan.saleType === "sales-led") {
      await Linking.openURL(getWebPricingUrl());
      return;
    }

    if (plan.id === "free") {
      Alert.alert("تم اختيار الباقة المجانية", "الباقة المجانية لا تحتاج دفع ولا جهاز مفك.");
      return;
    }

    setSelectedPlanId(plan.id);
    setOrderNumber(`MFK-${Date.now().toString().slice(-6)}`);
    setPaymentDone(false);
    setCheckingOut(false);
    setPaymentOpen(true);
    return;

    setCheckingOut(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      Alert.alert(
        "بوابة الدفع التجريبية",
        `تم تجهيز محاكاة الدفع لـ ${selectedPlan.name}. الاشتراك والجهاز يظهران كبنود منفصلة.`,
      );
    } finally {
      setCheckingOut(false);
    }
  };

  const confirmPayment = async () => {
    setCheckingOut(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      await saveMobileOrder({
        orderNumber,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        billingCycle,
        customerName: user?.name ?? "مستخدم مفك",
        customerPhone: user?.phone ?? "",
        paymentMethod: selectedPaymentMethod,
        paymentStatus: "paid",
        orderStatus: "processing",
        subscriptionSar: subscriptionAmount,
        deviceSar: deviceAmount,
        shippingSar: 0,
        vatSar: vat,
        totalSar: totalDue,
        deviceQuantity: selectedPlan.devicePrice ? 1 : 0,
        trackingNumber: null,
        shippingAddress: {
          city: "غير محدد",
          district: "غير محدد",
          street: "غير محدد",
          buildingNumber: "غير محدد",
          shortAddress: "غير محدد",
          mapUrl: "",
          notes: "طلب تم إنشاؤه من صفحة الاشتراك داخل التطبيق.",
        },
        internalNotes: ["تم اعتماد الدفع بمحاكاة داخلية للتجربة فقط."],
      });
      setPaymentDone(true);
    } finally {
      setCheckingOut(false);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  return (
    <LinearGradient
      colors={pageGradient}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: (Platform.OS === "web" ? 50 : insets.top) + 8,
            borderBottomColor: subtleBorder,
          },
        ]}
      >
        <Pressable onPress={goBack} style={styles.iconButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>الاشتراك والباقات</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            نفس باقات مفك في الويب، مع فصل الاشتراك عن جهاز مفك.
          </Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 128 + insets.bottom,
            gap: 16,
          }}
        >
          <View style={[styles.currentCard, !isDark && styles.lightCardShadow, { borderColor: isDark ? `${colors.primary}55` : "#FED7AA", backgroundColor: isDark ? "rgba(255,106,0,0.08)" : "#FFF7ED" }]}>
            <View style={styles.currentTop}>
              <View style={styles.currentText}>
                <Text style={[styles.eyebrow, { color: colors.primary }]}>باقتك الحالية</Text>
                <Text style={[styles.currentTitle, { color: colors.foreground }]}>{currentPlan.name}</Text>
                <Text style={[styles.currentSub, { color: colors.mutedForeground }]}>{currentPlan.summary}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF" }]}>
                <Ionicons name="checkmark-circle" size={17} color={colors.success} />
                <Text style={[styles.statusText, { color: colors.success }]}>نشطة</Text>
              </View>
            </View>
          </View>

          <View style={styles.billingWrap}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>سوي ووفر أكثر</Text>
            <View style={[styles.segment, { borderColor: subtleBorder, backgroundColor: mutedPanel }]}>
              <Pressable
                onPress={() => setBillingCycle("monthly")}
                style={[
                  styles.segmentItem,
                  billingCycle === "monthly" && { backgroundColor: isDark ? "rgba(255,255,255,0.10)" : colors.card },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: billingCycle === "monthly" ? colors.foreground : colors.mutedForeground },
                  ]}
                >
                  شهري
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setBillingCycle("yearly")}
                style={[
                  styles.segmentItem,
                  billingCycle === "yearly" && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: billingCycle === "yearly" ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  سنوي -20%
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.plansList}>
            {WEB_PLANS.map((plan) => {
              const selected = selectedPlanId === plan.id;
              const current = currentPlanId === plan.id;
              const price = getPrice(plan, billingCycle);
              const monthlyEquivalent = getMonthlyEquivalent(plan);
              const yearlySavings = getYearlySavings(plan);

              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelectedPlanId(plan.id)}
                  style={[
                    styles.planCard,
                    !isDark && styles.lightCardShadow,
                    {
                      backgroundColor: selected ? selectedPanel : subtlePanel,
                      borderColor: selected ? colors.primary : subtleBorder,
                      borderWidth: selected ? 1.3 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.planMeta}>
                      <View style={styles.planNameRow}>
                        {plan.badge ? (
                          <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.popularText}>{plan.badge}</Text>
                          </View>
                        ) : null}
                        <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
                      </View>
                      <Text style={[styles.planDescription, { color: colors.mutedForeground }]}>{plan.subtitle}</Text>
                    </View>

                    <View style={styles.priceBox}>
                      <Text style={[styles.price, { color: colors.foreground }]}>
                        {price === null ? "تواصل معنا" : price === 0 ? "مجانا" : `${formatSar(price)} ر.س`}
                      </Text>
                      {price !== null && price > 0 ? (
                        <Text style={[styles.priceUnit, { color: colors.mutedForeground }]}>
                          {billingCycle === "yearly" ? "/ سنة" : "/ شهر"}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {billingCycle === "yearly" && monthlyEquivalent !== null && plan.monthlyPrice ? (
                    <Text style={[styles.yearlyHint, { color: colors.primary }]}>
                      يعادل {formatSar(monthlyEquivalent)} ر.س شهريًا، توفير {yearlySavings}%
                    </Text>
                  ) : null}

                  <Text style={[styles.planSummary, { color: colors.mutedForeground }]}>{plan.summary}</Text>

                  {plan.id !== "fleet" ? (
                    <>
                      <View style={styles.planFacts}>
                        <View style={[styles.fact, { backgroundColor: isDark ? "rgba(0,0,0,0.22)" : "#F8FAFC", borderColor: subtleBorder }]}>
                          <Ionicons name="car-outline" size={15} color={colors.primary} />
                          <Text style={[styles.factText, { color: colors.foreground }]}>{formatVehicles(plan.maxVehicles)}</Text>
                        </View>
                        {plan.devicePrice ? (
                          <View style={[styles.fact, { backgroundColor: isDark ? "rgba(0,0,0,0.22)" : "#F8FAFC", borderColor: subtleBorder }]}>
                            <Ionicons name="hardware-chip-outline" size={15} color={colors.primary} />
                            <Text style={[styles.factText, { color: colors.foreground }]}>الجهاز {formatSar(plan.devicePrice)} ر.س</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.featureList}>
                        {plan.included.map((feature) => (
                          <View key={feature} style={styles.featureRow}>
                            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                            <Text style={[styles.featureText, { color: colors.foreground }]}>{feature}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : null}

                  {current ? (
                    <View style={[styles.currentBadge, { backgroundColor: `${colors.success}18` }]}>
                      <Text style={[styles.currentBadgeText, { color: colors.success }]}>باقتك الحالية</Text>
                    </View>
                  ) : null}

                  {!current ? (
                    <Pressable
                      onPress={() => checkout(plan)}
                      style={[
                        styles.planPayButton,
                        { backgroundColor: plan.saleType === "sales-led" ? (isDark ? "rgba(255,255,255,0.10)" : "#121212") : colors.primary },
                      ]}
                    >
                      <Text style={styles.planPayText}>
                        {plan.saleType === "sales-led" ? "عرض التفاصيل في الويب" : plan.id === "free" ? "تفعيل الباقة" : "متابعة الدفع"}
                      </Text>
                      <Ionicons name={plan.saleType === "sales-led" ? "call-outline" : "card-outline"} size={17} color="#fff" />
                    </Pressable>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

        </ScrollView>
      )}

      {!isLoading ? (
        <>
        <Modal
          visible={paymentOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setPaymentOpen(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: darkOverlay }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => !checkingOut && setPaymentOpen(false)} />
            <View style={[styles.paymentSheet, !isDark && styles.lightSheetShadow, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.card, borderColor: subtleBorder }]}>
              {paymentDone ? (
                <View style={styles.successWrap}>
                  <View style={styles.successIcon}>
                    <Ionicons name="checkmark" size={34} color="#fff" />
                  </View>
                  <Text style={[styles.paymentTitle, { color: colors.foreground }]}>تم الدفع بنجاح</Text>
                  <Text style={[styles.paymentSub, { color: colors.mutedForeground }]}>
                    تم اعتماد الدفع في المحاكاة. عند الربط الحقيقي يتم التفعيل بعد تأكيد webhook من الخادم.
                  </Text>
                  <View style={[styles.successCard, { backgroundColor: colors.background, borderColor: subtleBorder }]}>
                    <SummaryLine label="رقم الطلب" value={orderNumber} />
                    <SummaryLine label="الباقة" value={selectedPlan.name} />
                    <SummaryLine label="الدفع" value={selectedPaymentMethod} />
                    <SummaryLine label="الإجمالي" value={`${formatSar(totalDue)} ر.س`} strong />
                  </View>
                  <Pressable
                    onPress={() => {
                      setPaymentOpen(false);
                      router.push("/my-orders");
                    }}
                    style={[styles.payButton, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.payButtonText}>عرض طلباتي</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={[styles.sheetHandle, { backgroundColor: isDark ? "rgba(255,255,255,0.18)" : colors.border }]} />
                  <View style={styles.paymentHeader}>
                    <Pressable onPress={() => setPaymentOpen(false)} disabled={checkingOut} style={[styles.closeButton, { backgroundColor: colors.secondary }]}>
                      <Ionicons name="close" size={20} color={colors.foreground} />
                    </Pressable>
                    <View style={styles.paymentHeaderText}>
                      <Text style={[styles.paymentTitle, { color: colors.foreground }]}>بوابة الدفع التجريبية</Text>
                      <Text style={[styles.paymentSub, { color: colors.mutedForeground }]}>محاكاة للتجربة فقط. لا يتم جمع بيانات بطاقة داخل مفك.</Text>
                    </View>
                  </View>

                  <View style={[styles.paymentNotice, { backgroundColor: isDark ? "rgba(255,106,0,0.08)" : "#FFF3EA", borderColor: `${colors.primary}33` }]}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                    <Text style={[styles.paymentNoticeText, { color: colors.foreground }]}>الاشتراك والجهاز يظهران كبنود منفصلة، والشحن مجاني حاليًا.</Text>
                  </View>

                  <View style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: subtleBorder }]}>
                    <SummaryLine label="رقم الطلب" value={orderNumber} />
                    <SummaryLine label="الباقة" value={selectedPlan.name} />
                    <SummaryLine label="دورة الفوترة" value={billingCycle === "yearly" ? "سنوي" : "شهري"} />
                    <SummaryLine
                      label="الاشتراك"
                      value={`${formatSar(subscriptionAmount)} ر.س ${billingCycle === "yearly" ? "/ سنة" : "/ شهر"}`}
                    />
                    <SummaryLine label="القطعة" value={deviceAmount ? `${formatSar(deviceAmount)} ر.س مرة واحدة` : "غير مطلوبة"} />
                    <SummaryLine label="الشحن" value="0 ر.س" />
                    <SummaryLine label="ضريبة القيمة المضافة" value={`${formatSar(vat)} ر.س`} />
                    <View style={styles.summaryDivider} />
                    <SummaryLine label="الإجمالي" value={`${formatSar(totalDue)} ر.س`} strong />
                  </View>

                  <View style={styles.methodsGrid}>
                    {["مدى", "Visa / Mastercard", "Apple Pay"].map((method) => {
                      const selected = selectedPaymentMethod === method;

                      return (
                        <Pressable
                          key={method}
                          onPress={() => setSelectedPaymentMethod(method)}
                          style={[
                            styles.methodCard,
                            { borderColor: selected ? colors.primary : subtleBorder, backgroundColor: selected ? `${colors.primary}18` : colors.background },
                          ]}
                        >
                          <Ionicons
                            name={method === "Apple Pay" ? "logo-apple" : "card-outline"}
                            size={19}
                            color={selected ? colors.primary : colors.mutedForeground}
                          />
                          <Text style={[styles.methodText, { color: selected ? colors.primary : colors.mutedForeground }]}>{method}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable
                    onPress={confirmPayment}
                    disabled={checkingOut}
                    style={[styles.payButton, { backgroundColor: colors.primary, opacity: checkingOut ? 0.72 : 1 }]}
                  >
                    {checkingOut ? <ActivityIndicator color="#fff" /> : <Text style={styles.payButtonText}>اعتماد الدفع التجريبي</Text>}
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Modal>

        <View style={[styles.bottomBar, !isDark && styles.lightBarShadow, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: raisedPanel, borderColor: subtleBorder }]}>
          <View style={styles.bottomSummary}>
            <Text style={[styles.bottomLabel, { color: colors.mutedForeground }]}>
              {selectedPlan.saleType === "sales-led" ? "باقة عبر المبيعات" : "الباقة المحددة"}
            </Text>
            <Text style={[styles.bottomPlan, { color: colors.foreground }]}>{selectedPlan.name}</Text>
          </View>
          <Pressable
            onPress={() => checkout()}
            disabled={checkingOut}
            style={[styles.checkoutBtn, { backgroundColor: colors.primary, opacity: checkingOut ? 0.7 : 1 }]}
          >
            {checkingOut ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkoutTextBtn}>
                {selectedPlan.saleType === "sales-led" ? "عرض التفاصيل في الويب" : selectedPlan.id === "free" ? "تفعيل الباقة" : "متابعة الدفع"}
              </Text>
            )}
          </Pressable>
        </View>
        </>
      ) : null}
    </LinearGradient>
  );
}

function SummaryLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  const colors = useColors();

  return (
    <View style={styles.summaryLine}>
      <Text style={[styles.summaryLabel, { color: strong ? colors.foreground : colors.mutedForeground }, strong && styles.summaryStrongLabel]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: strong ? colors.primary : colors.foreground }, strong && styles.summaryStrongValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0B0B" },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, alignItems: "center", gap: 4 },
  headerTitle: { color: "#F7F7F7", fontSize: 19, fontFamily: "Inter_700Bold", textAlign: "center" },
  headerSub: { color: "rgba(255,255,255,0.56)", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 17 },
  loadCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  currentCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(255,106,0,0.08)",
  },
  currentTop: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 12 },
  currentText: { flex: 1, alignItems: "flex-end", gap: 4 },
  eyebrow: { fontSize: 12, fontFamily: "Inter_700Bold" },
  currentTitle: { color: "#F7F7F7", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "right" },
  currentSub: { color: "rgba(255,255,255,0.62)", fontSize: 12, lineHeight: 19, fontFamily: "Inter_400Regular", textAlign: "right" },
  statusPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  statusText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  billingWrap: { alignItems: "center", gap: 10 },
  sectionTitle: { color: "#F7F7F7", fontSize: 19, fontFamily: "Inter_700Bold" },
  segment: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  segmentItem: { minWidth: 116, alignItems: "center", paddingVertical: 9, borderRadius: 999 },
  segmentItemActiveDark: { backgroundColor: "rgba(255,255,255,0.10)" },
  segmentText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  plansList: { gap: 12 },
  planCard: {
    padding: 15,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 13,
    backgroundColor: "rgba(255,255,255,0.055)",
  },
  lightCardShadow: {
    shadowColor: "#1F2937",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  lightBarShadow: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  lightSheetShadow: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 8,
  },
  planHeader: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 12 },
  planMeta: { flex: 1, alignItems: "flex-end", gap: 5 },
  planNameRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, flexWrap: "wrap" },
  planName: { color: "#F7F7F7", fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "right" },
  planDescription: { color: "rgba(255,255,255,0.60)", fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 18 },
  priceBox: { alignItems: "flex-start", gap: 3, minWidth: 92 },
  popularBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  popularText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  price: { color: "#F7F7F7", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "left" },
  priceUnit: { color: "rgba(255,255,255,0.54)", fontSize: 11, fontFamily: "Inter_400Regular" },
  yearlyHint: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "right" },
  planSummary: { color: "rgba(255,255,255,0.62)", fontSize: 12, lineHeight: 19, fontFamily: "Inter_400Regular", textAlign: "right" },
  planFacts: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  fact: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  factText: { color: "#F7F7F7", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  featureList: { gap: 8 },
  featureRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  featureText: {
    flex: 1,
    color: "#F7F7F7",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
    writingDirection: "rtl",
  },
  currentBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  currentBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  planPayButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    gap: 7,
  },
  planPayText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  bottomBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(18,18,18,0.94)",
  },
  bottomSummary: { flex: 1, alignItems: "flex-end" },
  bottomLabel: { color: "rgba(255,255,255,0.52)", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  bottomPlan: { color: "#F7F7F7", marginTop: 2, fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right" },
  checkoutBtn: { minHeight: 48, minWidth: 140, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  checkoutTextBtn: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.68)",
  },
  paymentSheet: {
    maxHeight: "88%",
    padding: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#121212",
    gap: 14,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  paymentHeader: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 12 },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  paymentHeaderText: { flex: 1, alignItems: "flex-end", gap: 4 },
  paymentTitle: { color: "#F7F7F7", fontSize: 21, fontFamily: "Inter_700Bold", textAlign: "right" },
  paymentSub: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
  },
  paymentNotice: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,106,0,0.25)",
    backgroundColor: "rgba(255,106,0,0.10)",
  },
  paymentNoticeText: { flex: 1, color: "#F7F7F7", fontSize: 12, lineHeight: 18, fontFamily: "Inter_500Medium", textAlign: "right" },
  summaryCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.055)",
    gap: 10,
  },
  summaryLine: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12 },
  summaryLabel: { color: "rgba(255,255,255,0.58)", fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  summaryValue: { flex: 1, color: "#F7F7F7", fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "left" },
  summaryStrongLabel: { color: "#F7F7F7", fontFamily: "Inter_700Bold", fontSize: 14 },
  summaryStrongValue: { color: "#FF6A00", fontSize: 18 },
  summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.12)" },
  methodsGrid: { flexDirection: "row-reverse", gap: 9 },
  methodCard: {
    flex: 1,
    minHeight: 68,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  methodText: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontFamily: "Inter_700Bold", textAlign: "center" },
  payButton: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  payButtonText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  successWrap: { alignItems: "center", gap: 14 },
  successIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
  },
  successCard: {
    alignSelf: "stretch",
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(34,197,94,0.24)",
    backgroundColor: "rgba(34,197,94,0.08)",
    gap: 10,
  },
});
