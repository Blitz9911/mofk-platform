import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  formatOrderSar,
  listMobileOrders,
  MobileOrder,
  orderStatusMeta,
} from "@/lib/mobile-orders";
import { smoothBack } from "@/lib/navigation";

const timeline = [
  "pending_payment",
  "paid",
  "processing",
  "device_assigned",
  "ready_to_ship",
  "shipped",
  "delivered",
  "waiting_activation",
  "completed",
] as const;

function paymentLabel(status: MobileOrder["paymentStatus"]) {
  if (status === "paid") return "مدفوع";
  if (status === "failed") return "فشل";
  if (status === "refunded") return "مسترد";
  return "بانتظار الدفع";
}

function cycleLabel(cycle: MobileOrder["billingCycle"]) {
  return cycle === "yearly" ? "سنوي" : "شهري";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function MyOrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [orders, setOrders] = useState<MobileOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadOrders() {
        setLoading(true);
        const nextOrders = await listMobileOrders();
        if (!mounted) return;
        setOrders(nextOrders);
        setOpenId(nextOrders[0]?.id ?? null);
        setLoading(false);
      }

      void loadOrders();
      return () => {
        mounted = false;
      };
    }, []),
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: (Platform.OS === "web" ? 48 : insets.top) + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => smoothBack(router, "/")} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]}>طلباتي</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>تابع الدفع والشحن والتفعيل من مكان واحد</Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="receipt-outline" size={34} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>ما عندك طلبات حتى الآن</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>بعد إتمام الدفع تظهر طلبات جهاز مفك والاشتراك هنا.</Text>
          <Pressable onPress={() => router.navigate("/(tabs)/subscription-tab" as never)} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.primaryText}>اختيار باقة</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 110,
            gap: 14,
          }}
        >
          {orders.map((order) => {
            const open = openId === order.id;
            const status = orderStatusMeta[order.orderStatus];

            return (
              <View key={order.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Pressable onPress={() => setOpenId(open ? null : order.id)} style={styles.cardHead}>
                  <View style={styles.headText}>
                    <Text style={[styles.orderNo, { color: colors.foreground }]}>{order.orderNumber}</Text>
                    <Text style={[styles.orderMeta, { color: colors.mutedForeground }]}>{order.planName} · {formatDate(order.createdAt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}18` }]}>
                    <Text style={[styles.statusText, { color: colors.primary }]}>{status.label}</Text>
                  </View>
                </Pressable>

                <View style={styles.summaryGrid}>
                  <InfoTile label="الدفع" value={paymentLabel(order.paymentStatus)} />
                  <InfoTile label="الإجمالي" value={`${formatOrderSar(order.totalSar)} ر.س`} />
                  <InfoTile label="الفوترة" value={cycleLabel(order.billingCycle)} />
                  <InfoTile label="الأجهزة" value={`${order.deviceQuantity} جهاز`} />
                </View>

                {open ? (
                  <View style={styles.details}>
                    <SectionTitle title="ملخص الطلب" />
                    <DetailRow label="الباقة" value={order.planName} />
                    <DetailRow label="الاشتراك" value={`${formatOrderSar(order.subscriptionSar)} ر.س`} />
                    <DetailRow label="القطعة" value={order.deviceSar ? `${formatOrderSar(order.deviceSar)} ر.س مرة واحدة` : "غير مطلوبة"} />
                    <DetailRow label="الشحن" value={`${formatOrderSar(order.shippingSar)} ر.س`} />
                    <DetailRow label="ضريبة القيمة المضافة" value={`${formatOrderSar(order.vatSar)} ر.س`} />
                    <DetailRow label="التتبع" value={order.trackingNumber ?? "سيظهر بعد الشحن"} />

                    <SectionTitle title="عنوان الشحن" />
                    <Text style={[styles.addressText, { color: colors.mutedForeground }]}>
                      {order.shippingAddress.city}، {order.shippingAddress.district}، {order.shippingAddress.street}، مبنى {order.shippingAddress.buildingNumber}
                    </Text>

                    <SectionTitle title="الخط الزمني" />
                    <View style={styles.timeline}>
                      {timeline.map((item, index) => {
                        const meta = orderStatusMeta[item];
                        const currentIndex = timeline.indexOf(order.orderStatus as (typeof timeline)[number]);
                        const done = currentIndex >= index;

                        return (
                          <View key={item} style={styles.timelineRow}>
                            <View style={[styles.timelineDot, { backgroundColor: done ? colors.primary : colors.border }]}>
                              <Ionicons name={done ? "checkmark" : "ellipse"} size={done ? 13 : 7} color={done ? "#fff" : colors.mutedForeground} />
                            </View>
                            <View style={styles.timelineText}>
                              <Text style={[styles.timelineTitle, { color: colors.foreground }]}>{meta.label}</Text>
                              <Text style={[styles.timelineDesc, { color: colors.mutedForeground }]}>{meta.description}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    <View style={[styles.nextCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <Text style={[styles.nextTitle, { color: colors.foreground }]}>الخطوة التالية</Text>
                      <Text style={[styles.nextText, { color: colors.mutedForeground }]}>
                        بعد وصول الجهاز، فعله واربطه بالمركبة حتى يصبح الاشتراك نشطًا.
                      </Text>
                      <Pressable onPress={() => router.push("/pair-device")} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
                        <Text style={[styles.secondaryText, { color: colors.foreground }]}>تفعيل الجهاز</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.infoTile, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  const colors = useColors();
  return <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 42, height: 42, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, alignItems: "center", gap: 4 },
  title: { fontSize: 21, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyText: { fontSize: 13, lineHeight: 21, fontFamily: "Inter_400Regular", textAlign: "center" },
  primaryBtn: { minHeight: 48, borderRadius: 15, paddingHorizontal: 22, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  card: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 13 },
  cardHead: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  headText: { flex: 1, alignItems: "flex-end", gap: 4 },
  orderNo: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
  orderMeta: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  summaryGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  infoTile: { width: "48.5%", padding: 10, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: "flex-end", gap: 3 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
  details: { gap: 10 },
  sectionTitle: { marginTop: 2, fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
  detailRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12 },
  detailLabel: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  detailValue: { flex: 1, fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "left" },
  addressText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "right" },
  timeline: { gap: 10 },
  timelineRow: { flexDirection: "row-reverse", gap: 10 },
  timelineDot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  timelineText: { flex: 1, alignItems: "flex-end", gap: 2 },
  timelineTitle: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
  timelineDesc: { fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", textAlign: "right" },
  nextCard: { padding: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  nextTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right" },
  nextText: { fontSize: 12, lineHeight: 19, fontFamily: "Inter_400Regular", textAlign: "right" },
  secondaryBtn: { minHeight: 42, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
