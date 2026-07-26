import { Ionicons } from "@expo/vector-icons";
import {
  useGetMySubscription,
  useListSubscriptionPlans,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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

import { useColors } from "@/hooks/useColors";

const PLAN_LABELS: Record<string, string> = {
  free: "باقة مجانية",
  plus: "باقة مفك",
  mofk: "باقة مفك",
  family: "باقة العائلة",
  premium: "باقة العائلة",
  pro: "باقة العائلة",
  fleet: "باقة الأسطول",
};

const PLAN_SUBTITLES: Record<string, string> = {
  free: "للبداية ومتابعة مركبة واحدة",
  mofk: "اشتراك مفك لمركبة واحدة مع جهاز OBD",
  plus: "اشتراك مفك لمركبة واحدة مع جهاز OBD",
  family: "لعدة مركبات مع دعم أولوية",
  premium: "لعدة مركبات مع دعم أولوية",
  fleet: "للشركات والأساطيل بدعم خاص",
};

function normalizeTier(tier?: string) {
  if (tier === "plus") return "mofk";
  if (tier === "premium" || tier === "pro") return "family";
  return tier ?? "free";
}

export default function SubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const { data: subscription, isLoading: subLoading } = useGetMySubscription();
  const { data: plans, isLoading: plansLoading } = useListSubscriptionPlans();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const currentTier = normalizeTier(subscription?.tier);

  const orderedPlans = useMemo(() => {
    const rank: Record<string, number> = {
      free: 1,
      mofk: 2,
      plus: 2,
      family: 3,
      premium: 3,
      pro: 3,
      fleet: 4,
    };

    return [...(plans ?? [])].sort(
      (a, b) => (rank[a.tier ?? a.id] ?? 99) - (rank[b.tier ?? b.id] ?? 99),
    );
  }, [plans]);

  const activePlan = orderedPlans.find((plan) => normalizeTier(plan.tier) === currentTier);
  const selectedPlan =
    orderedPlans.find((plan) => normalizeTier(plan.tier) === selectedTier) ??
    orderedPlans.find((plan) => normalizeTier(plan.tier) !== currentTier) ??
    orderedPlans[0];

  const checkout = async () => {
    if (!selectedPlan) return;

    if (normalizeTier(selectedPlan.tier) === currentTier) {
      Alert.alert("الباقة الحالية", "هذه باقتك الحالية بالفعل.");
      return;
    }

    setCheckingOut(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      Alert.alert(
        "بوابة الدفع التجريبية",
        `تم تجهيز محاكاة الدفع لـ ${PLAN_LABELS[normalizeTier(selectedPlan.tier)] ?? selectedPlan.nameAr}.`,
      );
    } finally {
      setCheckingOut(false);
    }
  };

  const formatPrice = (plan: NonNullable<typeof plans>[number]) => {
    const monthly =
      billingCycle === "yearly" && plan.priceYearlySar
        ? Math.round(plan.priceYearlySar / 12)
        : plan.priceMonthlySar;

    if (monthly === 0 && normalizeTier(plan.tier) === "fleet") {
      return "تواصل معنا";
    }

    return monthly === 0 ? "مجاناً" : `${monthly} ر.س`;
  };

  const maxVehiclesFor = (plan: NonNullable<typeof plans>[number]) => {
    const value = (plan as { maxVehicles?: number | null }).maxVehicles;

    if (value === null) return "مركبات أكثر";
    return `${value ?? 1} مركبة`;
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topPad },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            الاشتراك والباقات
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            اختر الباقة المناسبة، والقطعة تطلب بشكل مستقل
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {subLoading || plansLoading ? (
        <View style={styles.loadCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 86, gap: 16 }}
        >
          <View
            style={[
              styles.currentCard,
              { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}45` },
            ]}
          >
            <View style={styles.currentTop}>
              <View style={styles.currentText}>
                <Text style={[styles.eyebrow, { color: colors.primary }]}>
                  باقتك الحالية
                </Text>
                <Text style={[styles.currentTitle, { color: colors.foreground }]}>
                  {PLAN_LABELS[currentTier] ?? activePlan?.nameAr ?? "باقة مجانية"}
                </Text>
                <Text style={[styles.currentSub, { color: colors.mutedForeground }]}>
                  {activePlan?.descriptionAr ?? "يمكنك الترقية في أي وقت عند الحاجة."}
                </Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: colors.card }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.statusText, { color: colors.success }]}>
                  نشطة
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.billingWrap}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              سوي ووفر أكثر
            </Text>
            <View style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable
                onPress={() => setBillingCycle("monthly")}
                style={[
                  styles.segmentItem,
                  billingCycle === "monthly" && { backgroundColor: colors.background },
                ]}
              >
                <Text style={[styles.segmentText, { color: billingCycle === "monthly" ? colors.foreground : colors.mutedForeground }]}>
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
                <Text style={[styles.segmentText, { color: billingCycle === "yearly" ? "#fff" : colors.mutedForeground }]}>
                  سنوي -20%
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.plansList}>
            {orderedPlans.map((plan) => {
              const tier = normalizeTier(plan.tier);
              const isCurrent = tier === currentTier;
              const isSelected =
                selectedTier === tier || (!selectedTier && selectedPlan?.id === plan.id);

              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelectedTier(tier)}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isSelected || plan.isPopular ? colors.primary : colors.border,
                      borderWidth: isSelected || plan.isPopular ? 1.4 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.planMeta}>
                      <Text style={[styles.planName, { color: colors.foreground }]}>
                        {PLAN_LABELS[tier] ?? plan.nameAr}
                      </Text>
                      <Text style={[styles.planDescription, { color: colors.mutedForeground }]}>
                        {PLAN_SUBTITLES[tier] ?? plan.descriptionAr}
                      </Text>
                    </View>
                    <View style={styles.priceBox}>
                      {plan.isPopular ? (
                        <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.popularText}>الأكثر طلباً</Text>
                        </View>
                      ) : null}
                      <Text style={[styles.price, { color: colors.foreground }]}>
                        {formatPrice(plan)}
                      </Text>
                      {formatPrice(plan) !== "مجاناً" && formatPrice(plan) !== "تواصل معنا" ? (
                        <Text style={[styles.priceUnit, { color: colors.mutedForeground }]}>
                          / شهر
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.planFacts}>
                    <View style={[styles.fact, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Ionicons name="car-outline" size={15} color={colors.primary} />
                      <Text style={[styles.factText, { color: colors.foreground }]}>
                        {maxVehiclesFor(plan)}
                      </Text>
                    </View>
                    <View style={[styles.fact, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Ionicons name="hardware-chip-outline" size={15} color={colors.primary} />
                      <Text style={[styles.factText, { color: colors.foreground }]}>
                        {tier === "free" ? "بدون قطعة" : "القطعة لحال"}
                      </Text>
                    </View>
                    <View style={[styles.fact, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primary} />
                      <Text style={[styles.factText, { color: colors.foreground }]}>
                        {tier === "free" ? "بدون AI" : "AI غير محدود"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureList}>
                    {(plan.featuresAr ?? plan.features).slice(0, 4).map((feature) => (
                      <View key={feature} style={styles.featureRow}>
                        <Text style={[styles.featureText, { color: colors.foreground }]}>
                          {feature}
                        </Text>
                        <Ionicons name="checkmark-circle" size={17} color={colors.success} />
                      </View>
                    ))}
                  </View>

                  {isCurrent ? (
                    <View style={[styles.currentBadge, { backgroundColor: `${colors.success}18` }]}>
                      <Text style={[styles.currentBadgeText, { color: colors.success }]}>
                        باقتك الحالية
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.checkoutCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.checkoutHeader}>
              <View style={styles.checkoutText}>
                <Text style={[styles.checkoutTitle, { color: colors.foreground }]}>
                  ملخص الترقية
                </Text>
                <Text style={[styles.checkoutSub, { color: colors.mutedForeground }]}>
                  الاشتراك منفصل عن طلب قطعة مفك، ويمكنك طلب القطعة من حسابي.
                </Text>
              </View>
              <Ionicons name="card-outline" size={24} color={colors.primary} />
            </View>
            <Pressable
              onPress={checkout}
              disabled={checkingOut || !selectedPlan}
              style={[
                styles.checkoutBtn,
                { backgroundColor: colors.primary, opacity: checkingOut ? 0.7 : 1 },
              ]}
            >
              {checkingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.checkoutTextBtn}>متابعة الدفع</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      )}
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
  iconButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, alignItems: "center", gap: 2 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  loadCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  currentCard: { padding: 16, borderRadius: 18, borderWidth: 1 },
  currentTop: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 12 },
  currentText: { flex: 1, alignItems: "flex-end", gap: 4 },
  eyebrow: { fontSize: 12, fontFamily: "Inter_700Bold" },
  currentTitle: { fontSize: 21, fontFamily: "Inter_700Bold", textAlign: "right" },
  currentSub: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", textAlign: "right" },
  statusPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  billingWrap: { alignItems: "center", gap: 10 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  segment: { flexDirection: "row", padding: 4, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  segmentItem: { minWidth: 114, alignItems: "center", paddingVertical: 9, borderRadius: 999 },
  segmentText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  plansList: { gap: 12 },
  planCard: { padding: 15, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, gap: 13 },
  planHeader: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 12 },
  planMeta: { flex: 1, alignItems: "flex-end", gap: 4 },
  planName: { fontSize: 19, fontFamily: "Inter_700Bold", textAlign: "right" },
  planDescription: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 18 },
  priceBox: { alignItems: "flex-start", gap: 3, minWidth: 94 },
  popularBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  popularText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  price: { fontSize: 22, fontFamily: "Inter_700Bold" },
  priceUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },
  planFacts: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  fact: { flexDirection: "row-reverse", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  factText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  featureList: { gap: 8 },
  featureRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  featureText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  currentBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  currentBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  checkoutCard: { padding: 15, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, gap: 14 },
  checkoutHeader: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 10 },
  checkoutText: { flex: 1, alignItems: "flex-end", gap: 4 },
  checkoutTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  checkoutSub: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", textAlign: "right" },
  checkoutBtn: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  checkoutTextBtn: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
