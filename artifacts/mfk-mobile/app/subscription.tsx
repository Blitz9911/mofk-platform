import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMySubscription, useListSubscriptionPlans, type SubscriptionPlan, type UserSubscription } from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArabicText } from "@/components/ArabicText";
import { useColors } from "@/hooks/useColors";
import { rowDir } from "@/lib/layout";
import { useAuth } from "@/context/AuthContext";
import {
  activateAccountSubscription,
  cyclePriceSar,
  type SubscriptionBillingCycle,
} from "@/lib/subscription-trial";

type Step = "select" | "result";

const TRIAL_NOTICE =
  "تفعيل الباقة يحدّث حسابك داخل مفك فورًا. الدفع عبر المتجر غير مربوط بعد، ولن يُخصم مبلغ من البطاقة.";

function formatSar(value: number) {
  return `${new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(value)} ر.س`;
}

function formatDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "short", day: "numeric" }).format(date);
  } catch {
    return null;
  }
}

function statusLabel(status?: UserSubscription["status"]) {
  if (status === "expired") return "منتهٍ";
  if (status === "cancelled") return "ملغى";
  if (status === "active") return "نشط";
  return "غير معروف";
}

function planDisplayName(plan: SubscriptionPlan) {
  return plan.nameAr || plan.name;
}

function planMatchesTier(plan: SubscriptionPlan, tier?: string | null) {
  if (!tier) return false;
  const normalized =
    tier === "plus" || tier === "individual-basic" ? "mofk" : tier;
  return plan.tier === tier || plan.tier === normalized || plan.id === tier || plan.id === normalized;
}

function priceLabel(price: number | null, cycle: SubscriptionBillingCycle) {
  if (price === null) return "السعر غير متوفر";
  if (price === 0) return "مجاناً";
  return `${formatSar(price)} / ${cycle === "yearly" ? "سنة" : "شهر"}`;
}

export default function SubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const inTabs = useSegments().includes("(tabs)");
  const tabClearance = inTabs ? 124 : 12;
  const isDark = colors.mode === "dark";
  const pageGradient: readonly [string, string, string, string] = isDark
    ? ["#050607", "#0B0B0B", "#11100E", "#090909"]
    : ["#F6F7F9", "#FFFFFF", "#F1F5F9", "#F6F7F9"];
  const border = isDark ? "rgba(255,255,255,0.10)" : "#E3E8EF";
  const panel = isDark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.96)";
  const selectedPanel = isDark ? "rgba(255,106,0,0.10)" : "#FFF4EA";

  const {
    data: subscription,
    isLoading: subscriptionLoading,
    isError: subscriptionError,
    refetch: refetchSubscription,
  } = useGetMySubscription();
  const {
    data: plans,
    isLoading: plansLoading,
    isError: plansError,
    refetch: refetchPlans,
  } = useListSubscriptionPlans();

  const [step, setStep] = useState<Step>("select");
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [trialResult, setTrialResult] = useState<{
    planNameAr: string;
    billingCycle: SubscriptionBillingCycle;
    priceSar: number;
    tier: string;
  } | null>(null);

  const isLoading = plansLoading || subscriptionLoading;
  const selectedPlan = useMemo(
    () => plans?.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );
  const selectedPrice = selectedPlan ? cyclePriceSar(selectedPlan, billingCycle) : null;
  const canContinue = Boolean(selectedPlan && selectedPrice !== null);

  const currentPlan = useMemo(
    () => plans?.find((plan) => planMatchesTier(plan, subscription?.tier)) ?? null,
    [plans, subscription?.tier],
  );

  useEffect(() => {
    if (selectedPlanId || !plans?.length) return;
    const current = plans.find((plan) => planMatchesTier(plan, subscription?.tier) && cyclePriceSar(plan, billingCycle) !== null);
    const first = plans.find((plan) => cyclePriceSar(plan, billingCycle) !== null);
    const next = current ?? first;
    if (next) setSelectedPlanId(next.id);
  }, [billingCycle, plans, selectedPlanId, subscription?.tier]);

  const goBack = () => {
    if (step === "result") {
      setStep("select");
      setTrialResult(null);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  };

  const selectCycle = (cycle: SubscriptionBillingCycle) => {
    setBillingCycle(cycle);
    if (selectedPlan && cyclePriceSar(selectedPlan, cycle) === null) {
      setSelectedPlanId(null);
    }
  };

  const confirmTrial = () => {
    if (!selectedPlan || selectedPrice === null || confirming) return;
    setConfirming(true);
    void activateAccountSubscription({
      planId: selectedPlan.tier || selectedPlan.id,
      planNameAr: planDisplayName(selectedPlan),
      billingCycle,
      priceSar: selectedPrice,
    })
      .then(async (activated) => {
        setTrialResult({
          planNameAr: planDisplayName(selectedPlan),
          billingCycle,
          priceSar: selectedPrice,
          tier: activated.tier,
        });
        setStep("result");
        await queryClient.invalidateQueries();
        await refreshUser();
        await refetchSubscription();
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "تعذر تفعيل الباقة على الحساب.";
        setTrialResult(null);
        Alert.alert("لم تُحفظ الباقة", message);
      })
      .finally(() => {
        setConfirming(false);
      });
  };

  const retry = () => {
    void refetchPlans();
    void refetchSubscription();
  };

  return (
    <LinearGradient colors={pageGradient} style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: (Platform.OS === "web" ? 50 : insets.top) + 8,
            borderBottomColor: border,
            flexDirection: rowDir,
          },
        ]}
      >
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={step === "select" ? "رجوع" : "العودة للخطوة السابقة"}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <ArabicText style={[styles.headerTitle, { color: colors.foreground }]}>الاشتراك</ArabicText>
          <ArabicText style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {step === "select" ? "اختر باقة ثم فعّلها على حسابك" : "تم تحديث الباقة"}
          </ArabicText>
        </View>
        <View style={{ width: 42 }} />
      </View>

      <View style={[styles.notice, { backgroundColor: selectedPanel, borderColor: `${colors.primary}55`, flexDirection: rowDir }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <ArabicText fill style={[styles.noticeText, { color: colors.foreground }]}>
          {TRIAL_NOTICE}
        </ArabicText>
      </View>

      {isLoading ? (
        <View style={styles.loadCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ArabicText style={[styles.emptyText, { color: colors.mutedForeground }]}>جاري تحميل الباقات والاشتراك</ArabicText>
        </View>
      ) : plansError ? (
        <View style={styles.loadCenter}>
          <ArabicText style={[styles.emptyTitle, { color: colors.foreground }]}>تعذر جلب الباقات</ArabicText>
          <ArabicText style={[styles.emptyText, { color: colors.mutedForeground }]}>لم نتمكن من قراءة قائمة الباقات الحالية.</ArabicText>
          <Pressable
            onPress={retry}
            accessibilityRole="button"
            accessibilityLabel="إعادة المحاولة"
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.primaryBtnText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : !plans?.length ? (
        <View style={styles.loadCenter}>
          <ArabicText style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد باقات متاحة</ArabicText>
          <ArabicText style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يمكن بدء تجربة الاشتراك بدون باقات.</ArabicText>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: tabClearance + 120, gap: 14 }}
        >
          {step === "select" ? (
            <>
              <View style={[styles.card, { backgroundColor: panel, borderColor: border }]}>
                <ArabicText style={[styles.eyebrow, { color: colors.primary }]}>اشتراكك الحالي — للعرض فقط</ArabicText>
                {subscriptionError ? (
                  <ArabicText style={[styles.body, { color: colors.mutedForeground }]}>تعذر قراءة الاشتراك الحالي. الباقات ما زالت قابلة للتجربة.</ArabicText>
                ) : (
                  <>
                    <ArabicText style={[styles.currentTitle, { color: colors.foreground }]}>
                      {currentPlan ? planDisplayName(currentPlan) : subscription?.tier ?? "غير محدد"}
                    </ArabicText>
                    <ArabicText style={[styles.body, { color: colors.mutedForeground }]}>
                      الحالة: {statusLabel(subscription?.status)}
                      {formatDate(subscription?.startedAt) ? ` · البداية ${formatDate(subscription?.startedAt)}` : ""}
                      {formatDate(subscription?.endsAt) ? ` · النهاية ${formatDate(subscription?.endsAt)}` : ""}
                    </ArabicText>
                  </>
                )}
              </View>

              <View style={[styles.segment, { borderColor: border, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#EEF2F7", flexDirection: rowDir }]}>
                {(["monthly", "yearly"] as const).map((cycle) => {
                  const active = billingCycle === cycle;
                  return (
                    <Pressable
                      key={cycle}
                      onPress={() => selectCycle(cycle)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={cycle === "yearly" ? "الأسعار السنوية" : "الأسعار الشهرية"}
                      style={[styles.segmentItem, active && { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.segmentText, { color: active ? "#fff" : colors.mutedForeground }]}>
                        {cycle === "yearly" ? "سنوي" : "شهري"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {plans.map((plan) => {
                const selected = selectedPlanId === plan.id;
                const price = cyclePriceSar(plan, billingCycle);
                const current = planMatchesTier(plan, subscription?.tier);
                const unavailable = price === null;
                return (
                  <Pressable
                    key={plan.id}
                    onPress={() => !unavailable && setSelectedPlanId(plan.id)}
                    disabled={unavailable}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: unavailable }}
                    accessibilityLabel={`${planDisplayName(plan)}، ${priceLabel(price, billingCycle)}`}
                    style={[
                      styles.card,
                      {
                        backgroundColor: selected ? selectedPanel : panel,
                        borderColor: selected ? colors.primary : border,
                        borderWidth: selected ? 1.4 : StyleSheet.hairlineWidth,
                        opacity: unavailable ? 0.62 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.planTop, { flexDirection: rowDir }]}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <ArabicText style={[styles.planName, { color: colors.foreground }]}>{planDisplayName(plan)}</ArabicText>
                        {plan.descriptionAr ? (
                          <ArabicText style={[styles.body, { color: colors.mutedForeground }]}>{plan.descriptionAr}</ArabicText>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.radio,
                          { borderColor: selected ? colors.primary : border, backgroundColor: selected ? colors.primary : "transparent" },
                        ]}
                      >
                        {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                      </View>
                    </View>
                    <ArabicText style={[styles.price, { color: unavailable ? colors.mutedForeground : colors.foreground }]}>
                      {priceLabel(price, billingCycle)}
                    </ArabicText>
                    {plan.maxVehicles != null ? (
                      <ArabicText style={[styles.meta, { color: colors.mutedForeground }]}>
                        {plan.maxVehicles === 1 ? "مركبة واحدة" : `حتى ${plan.maxVehicles} مركبات`}
                      </ArabicText>
                    ) : null}
                    {(plan.featuresAr ?? plan.features).slice(0, 5).map((feature) => (
                      <View key={feature} style={[styles.featureRow, { flexDirection: rowDir }]}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                        <ArabicText fill style={[styles.featureText, { color: colors.foreground }]}>{feature}</ArabicText>
                      </View>
                    ))}
                    {current ? (
                      <View style={[styles.currentBadge, { backgroundColor: `${colors.success}18` }]}>
                        <ArabicText style={[styles.currentBadgeText, { color: colors.success }]}>باقتك الحالية</ArabicText>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}

              <Pressable
                onPress={confirmTrial}
                disabled={confirming || !canContinue}
                accessibilityRole="button"
                accessibilityLabel="تفعيل الباقة على الحساب"
                style={[styles.checkoutBtn, { backgroundColor: colors.primary, opacity: confirming || !canContinue ? 0.55 : 1, marginTop: 4 }]}
              >
                {confirming ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>تفعيل الباقة</Text>}
              </Pressable>
            </>
          ) : null}

          {step === "result" && trialResult ? (
            <View style={[styles.card, { backgroundColor: panel, borderColor: border, alignItems: "stretch", gap: 12 }]}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={28} color="#fff" />
              </View>
              <ArabicText style={[styles.planName, { color: colors.foreground }]}>تم تفعيل الباقة على حسابك</ArabicText>
              <ArabicText style={[styles.body, { color: colors.mutedForeground }]}>
                باقة {trialResult.planNameAr} ({trialResult.billingCycle === "yearly" ? "سنوي" : "شهري"}) صارت باقتك الحالية في الملف الشخصي والرئيسية والمساعد.
              </ArabicText>
              <ArabicText style={[styles.body, { color: colors.mutedForeground }]}>
                لم يُخصم مبلغ من البطاقة لأن الدفع عبر المتجر غير مربوط بعد.
              </ArabicText>
              <Pressable
                onPress={() => {
                  setStep("select");
                  setTrialResult(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="تجربة باقة أخرى"
                style={[styles.secondaryBtn, { borderColor: border }]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>تجربة باقة أخرى</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      )}

      {!isLoading && !plansError && plans?.length && step !== "result" ? (
        <View
          style={[
            styles.bottomBar,
            {
              bottom: tabClearance,
              paddingBottom: inTabs ? 14 : Math.max(insets.bottom, 12),
              backgroundColor: isDark ? "rgba(18,18,18,0.96)" : "rgba(255,255,255,0.98)",
              borderColor: colors.primary,
            },
          ]}
        >
          <ArabicText style={[styles.bottomLabel, { color: colors.mutedForeground }]}>
            {selectedPlan ? `${planDisplayName(selectedPlan)} · ${priceLabel(selectedPrice, billingCycle)}` : "اختر باقة للمتابعة"}
          </ArabicText>
          <Pressable
            onPress={confirmTrial}
            disabled={confirming || !canContinue}
            accessibilityRole="button"
            accessibilityState={{ disabled: confirming || !canContinue, busy: confirming }}
            accessibilityLabel="تفعيل الباقة على الحساب"
            style={[styles.checkoutBtn, { backgroundColor: colors.primary, opacity: confirming || !canContinue ? 0.55 : 1 }]}
          >
            {confirming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>تفعيل الباقة</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, gap: 4 },
  headerTitle: { fontSize: 19, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  notice: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeText: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
  loadCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  retryBtn: { minHeight: 48, minWidth: 160, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },
  eyebrow: { fontSize: 12, fontFamily: "Inter_700Bold" },
  currentTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  body: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  segment: { alignSelf: "center", padding: 4, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  segmentItem: { minWidth: 108, minHeight: 40, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderRadius: 999 },
  segmentText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  planTop: { alignItems: "flex-start", gap: 10 },
  planName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.4, alignItems: "center", justifyContent: "center", marginTop: 2 },
  price: { fontSize: 18, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 12, fontFamily: "Inter_500Medium" },
  featureRow: { alignItems: "center", gap: 8 },
  featureText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  currentBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  currentBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  secondaryBtn: { minHeight: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
    alignSelf: "center",
  },
  bottomBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 10,
    gap: 10,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1.4,
  },
  bottomLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  checkoutBtn: { minHeight: 54, width: "100%", borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
