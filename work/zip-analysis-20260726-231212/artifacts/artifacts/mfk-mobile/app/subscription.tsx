import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useGetMySubscription,
  useListSubscriptionPlans,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const TIER_NAMES: Record<string, string> = {
  free: "الباقة المجانية",
  basic: "الباقة الأساسية",
  premium: "الباقة الاحترافية",
  fleet: "باقة الأسطول",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "#22c55e" },
  expired: { label: "منتهي", color: "#ef4444" },
  cancelled: { label: "ملغى", color: "#6b7280" },
};

export default function SubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  const { data: subscription, isLoading: subLoading } = useGetMySubscription();
  const { data: plans, isLoading: plansLoading } = useListSubscriptionPlans();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const statusInfo = subscription?.status ? STATUS_LABEL[subscription.status] : null;

  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }) : "—";

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>الاشتراك والباقات</Text>
        <View style={{ width: 34 }} />
      </View>

      {subLoading || plansLoading ? (
        <View style={styles.loadCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Subscription */}
          {subscription && (
            <View style={[styles.currentCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "40" }]}>
              <View style={styles.currentTop}>
                {statusInfo && (
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + "20" }]}>
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                )}
                <View style={styles.currentTitleRow}>
                  <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
                  <Text style={[styles.currentTitle, { color: colors.primary }]}>
                    {TIER_NAMES[subscription.tier] ?? subscription.tier}
                  </Text>
                </View>
              </View>

              <View style={styles.currentDates}>
                <View style={styles.dateItem}>
                  <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>تاريخ البدء</Text>
                  <Text style={[styles.dateVal, { color: colors.foreground }]}>{formatDate(subscription.startedAt)}</Text>
                </View>
                <View style={[styles.dateDivider, { backgroundColor: colors.border }]} />
                <View style={styles.dateItem}>
                  <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>تاريخ الانتهاء</Text>
                  <Text style={[styles.dateVal, { color: colors.foreground }]}>{formatDate(subscription.endsAt)}</Text>
                </View>
              </View>

              <View style={[styles.autoRenewRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Switch value={subscription.autoRenew ?? false} thumbColor={colors.primary} trackColor={{ true: colors.primary + "60", false: colors.border }} />
                <View style={styles.autoRenewInfo}>
                  <Text style={[styles.autoRenewTitle, { color: colors.foreground }]}>التجديد التلقائي</Text>
                  <Text style={[styles.autoRenewSub, { color: colors.mutedForeground }]}>تجديد تلقائي لتجنب انقطاع الخدمة</Text>
                </View>
              </View>

              <View style={styles.currentActions}>
                <Pressable style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="card-outline" size={16} color={colors.foreground} />
                  <Text style={[styles.actionBtnText, { color: colors.foreground }]}>إدارة طريقة الدفع</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="receipt-outline" size={16} color={colors.foreground} />
                  <Text style={[styles.actionBtnText, { color: colors.foreground }]}>عرض الفواتير</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Billing Cycle Toggle */}
          <View style={styles.centerBlock}>
            <Text style={[styles.upgradeTitle, { color: colors.foreground }]}>ارتقِ بتجربتك</Text>
            <Text style={[styles.upgradeSub, { color: colors.mutedForeground }]}>وفر حتى 20% عند الاشتراك السنوي</Text>
            <View style={[styles.cycleToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable
                style={[styles.cyclePill, billingCycle === "monthly" && { backgroundColor: colors.background }]}
                onPress={() => setBillingCycle("monthly")}
              >
                <Text style={[styles.cyclePillText, { color: billingCycle === "monthly" ? colors.foreground : colors.mutedForeground }]}>
                  شهري
                </Text>
              </Pressable>
              <Pressable
                style={[styles.cyclePill, billingCycle === "yearly" && { backgroundColor: colors.primary }]}
                onPress={() => setBillingCycle("yearly")}
              >
                <Text style={[styles.cyclePillText, { color: billingCycle === "yearly" ? "#fff" : colors.mutedForeground }]}>
                  سنوي  <Text style={{ fontSize: 10 }}>-20%</Text>
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Plans */}
          {plans?.map((plan) => {
            const isCurrent = subscription?.tier === plan.tier;
            const price =
              billingCycle === "monthly"
                ? plan.priceMonthlySar
                : plan.priceYearlySar
                ? Math.round(plan.priceYearlySar / 12)
                : plan.priceMonthlySar;

            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: plan.isPopular ? colors.primary : isCurrent ? colors.primary + "60" : colors.border,
                    borderWidth: plan.isPopular ? 2 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                {plan.isPopular && (
                  <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="flash" size={12} color="#fff" />
                    <Text style={styles.popularText}>الأكثر طلباً</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <View>
                    <Text style={[styles.planPrice, { color: colors.foreground }]}>
                      {price}
                      <Text style={[styles.planPriceUnit, { color: colors.mutedForeground }]}> ر.س/شهر</Text>
                    </Text>
                    {billingCycle === "yearly" && price > 0 && plan.priceYearlySar && (
                      <Text style={[styles.planYearly, { color: colors.mutedForeground }]}>
                        يُدفع {plan.priceYearlySar} ر.س سنوياً
                      </Text>
                    )}
                  </View>
                  <View>
                    <Text style={[styles.planName, { color: colors.foreground }]}>{plan.nameAr}</Text>
                    <Text style={[styles.planDesc, { color: colors.mutedForeground }]}>{plan.descriptionAr}</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.features}>
                  {(plan.featuresAr || plan.features || []).map((f: string, i: number) => (
                    <View key={i} style={styles.featureRow}>
                      <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    </View>
                  ))}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.planBtn,
                    {
                      backgroundColor: isCurrent ? colors.card : plan.isPopular ? colors.primary : colors.accent,
                      borderColor: isCurrent ? colors.border : plan.isPopular ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  disabled={isCurrent}
                >
                  <Text style={[styles.planBtnText, { color: isCurrent ? colors.mutedForeground : plan.isPopular ? "#fff" : colors.foreground }]}>
                    {isCurrent ? "باقتك الحالية" : price === 0 ? "ابدأ مجاناً" : "ترقية الباقة"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
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
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  loadCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  currentCard: { padding: 18, borderRadius: 18, borderWidth: 1, gap: 14 },
  currentTop: { gap: 8 },
  currentTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  currentTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statusBadge: { alignSelf: "flex-end", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  currentDates: { flexDirection: "row-reverse", gap: 12 },
  dateItem: { flex: 1, alignItems: "flex-end", gap: 2 },
  dateLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  dateVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dateDivider: { width: 1 },
  autoRenewRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  autoRenewInfo: { flex: 1, alignItems: "flex-end" },
  autoRenewTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  autoRenewSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  currentActions: { flexDirection: "row-reverse", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  centerBlock: { alignItems: "center", gap: 8 },
  upgradeTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  upgradeSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  cycleToggle: {
    flexDirection: "row",
    borderRadius: 50,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  cyclePill: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 50 },
  cyclePillText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  planCard: { borderRadius: 16, overflow: "visible", paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  popularBadge: {
    position: "absolute",
    top: -14,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  popularText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  planHeader: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between" },
  planName: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
  planDesc: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  planPrice: { fontSize: 28, fontFamily: "Inter_700Bold" },
  planPriceUnit: { fontSize: 13 },
  planYearly: { fontSize: 11, fontFamily: "Inter_400Regular" },
  divider: { height: StyleSheet.hairlineWidth },
  features: { gap: 10 },
  featureRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 10 },
  featureText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  planBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  planBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
