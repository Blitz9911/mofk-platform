import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useListVehicles } from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import {
  MAINTENANCE_LOGS_QUERY_KEY,
  completedLogs,
  costOf,
  doneAtOf,
  doneKmOf,
  fetchMaintenanceLogs,
  formatDate,
  formatDateLong,
  formatKm,
  formatSar,
  logTitle,
  serviceIcon,
  vehicleName,
} from "@/lib/maintenance-catalog";
import {
  getMaintenanceInvoice,
  openMaintenanceInvoice,
  type MaintenanceInvoice,
} from "@/lib/maintenance-invoices";
import { smoothBack } from "@/lib/navigation";

async function fetchMaintenanceLog(id: string) {
  const response = await fetch(`/api/maintenance/logs/${encodeURIComponent(id)}`, {
    headers: { "Content-Type": "application/json" },
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || "تعذر تحميل تفاصيل الصيانة.");
  }
  return data;
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.detailRow, { borderColor: colors.border, flexDirection: rowDir }]}>
      <View style={[styles.detailIcon, { backgroundColor: colors.background }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.detailText}>
        <ArabicText style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</ArabicText>
        <ArabicText style={[styles.detailValue, { color: colors.foreground }]}>{value}</ArabicText>
      </View>
    </View>
  );
}

export default function MaintenanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [invoice, setInvoice] = useState<MaintenanceInvoice | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const { data: vehicles } = useListVehicles();
  const { data: logs } = useQuery({
    queryKey: MAINTENANCE_LOGS_QUERY_KEY,
    queryFn: fetchMaintenanceLogs,
  });
  const { data: log, isLoading } = useQuery({
    queryKey: ["maintenance-log", id],
    enabled: Boolean(id),
    queryFn: () => fetchMaintenanceLog(String(id)),
    retry: 0,
  });

  const item = log ?? completedLogs(logs).find((row: any) => String(row.id) === String(id));
  const related = useMemo(() => {
    if (!item) return [];
    return completedLogs(logs)
      .filter((row: any) => row.id !== item.id && row.vehicleId === item.vehicleId)
      .slice(0, 4);
  }, [item, logs]);

  useEffect(() => {
    if (!id) return;
    void getMaintenanceInvoice(String(id)).then(setInvoice);
  }, [id]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const goBack = () => smoothBack(router, "/maintenance");

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, flexDirection: rowDir }]}>
        <Pressable onPress={goBack} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <ArabicText style={[styles.headerTitle, { color: colors.foreground }]}>تفاصيل الصيانة</ArabicText>
          <ArabicText style={[styles.headerSub, { color: colors.mutedForeground }]}>كل بيانات العملية في مكان واحد</ArabicText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading && !item ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !item ? (
        <View style={styles.center}>
          <ArabicText style={[styles.emptyTitle, { color: colors.foreground }]}>ما لقينا هالصيانة</ArabicText>
          <Pressable onPress={goBack} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.primaryBtnText}>رجوع للسجل</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom, gap: 14 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.heroTop, { flexDirection: rowDir }]}>
              <View style={[styles.doneBadge, { backgroundColor: "#38BDF818", borderColor: "#38BDF842", flexDirection: rowDir }]}>
                <Ionicons name="checkmark-circle" size={14} color="#38BDF8" />
                <Text style={[styles.doneBadgeText, { color: "#38BDF8" }]}>منجزة</Text>
              </View>
              <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name={serviceIcon(item.serviceType)} size={26} color={colors.primary} />
              </View>
            </View>
            <ArabicText style={[styles.heroTitle, { color: colors.foreground }]}>{logTitle(item)}</ArabicText>
            <ArabicText style={[styles.heroVehicle, { color: colors.mutedForeground }]}>
              {vehicleName(item, vehicles)}
            </ArabicText>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ArabicText style={[styles.cardTitle, { color: colors.foreground }]}>بيانات التنفيذ</ArabicText>
            <DetailRow icon="calendar-outline" label="تاريخ الصيانة" value={formatDateLong(doneAtOf(item))} />
            <DetailRow icon="speedometer-outline" label="قراءة العداد وقتها" value={formatKm(doneKmOf(item))} />
            <DetailRow icon="cash-outline" label="التكلفة" value={formatSar(costOf(item))} />
            <DetailRow icon="car-sport-outline" label="المركبة" value={vehicleName(item, vehicles)} />
            <DetailRow
              icon="create-outline"
              label="طريقة التسجيل"
              value={item.source === "manual" ? "يدوي" : String(item.source || "يدوي")}
            />
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ArabicText style={[styles.cardTitle, { color: colors.foreground }]}>الملاحظات</ArabicText>
            <ArabicText style={[styles.notes, { color: item.notes ? colors.foreground : colors.mutedForeground }]}>
              {item.notes || "ما فيه ملاحظات مسجلة على هالصيانة."}
            </ArabicText>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ArabicText style={[styles.cardTitle, { color: colors.foreground }]}>الفاتورة</ArabicText>
            {invoice ? (
              <Pressable
                onPress={() => {
                  void openMaintenanceInvoice(invoice).then((mode) => {
                    if (mode === "image") setInvoiceOpen(true);
                  });
                }}
                style={[styles.invoiceBox, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: rowDir }]}
              >
                <Ionicons name="open-outline" size={18} color={colors.mutedForeground} />
                {invoice.kind === "image" ? (
                  <Image source={{ uri: invoice.uri }} style={styles.invoiceThumb} />
                ) : (
                  <View style={[styles.pdfBadge, { backgroundColor: colors.card }]}>
                    <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <ArabicText style={[styles.invoiceName, { color: colors.foreground }]}>{invoice.name}</ArabicText>
                  <ArabicText style={[styles.invoiceKind, { color: colors.mutedForeground }]}>
                    {invoice.kind === "pdf" ? "ملف PDF — اضغط للفتح" : "صورة — اضغط للفتح"}
                  </ArabicText>
                </View>
              </Pressable>
            ) : (
              <ArabicText style={[styles.notes, { color: colors.mutedForeground }]}>
                ما فيه فاتورة مرفقة مع هالعملية.
              </ArabicText>
            )}
          </View>

          {related.length > 0 ? (
            <View style={styles.relatedWrap}>
              <ArabicText style={[styles.cardTitle, { color: colors.foreground }]}>صيانات أخرى لنفس المركبة</ArabicText>
              {related.map((row: any) => (
                <Pressable
                  key={row.id}
                  onPress={() => router.replace({ pathname: "/maintenance-detail", params: { id: row.id } })}
                  style={({ pressed }) => [
                    styles.relatedRow,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.84 : 1, flexDirection: rowDir },
                  ]}
                >
                  <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
                  <View style={{ flex: 1 }}>
                    <ArabicText style={[styles.relatedTitle, { color: colors.foreground }]}>{logTitle(row)}</ArabicText>
                    <ArabicText style={[styles.relatedMeta, { color: colors.mutedForeground }]}>
                      {formatDate(doneAtOf(row))} · {formatSar(costOf(row))}
                    </ArabicText>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Pressable
            onPress={() => router.push("/recommendations")}
            style={[styles.recoCard, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}36`, flexDirection: rowDir }]}
          >
            <Ionicons name="chevron-back" size={16} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <ArabicText style={[styles.relatedTitle, { color: colors.foreground }]}>التوصيات المرتبطة</ArabicText>
              <ArabicText style={[styles.relatedMeta, { color: colors.mutedForeground }]}>
                هذا السجل يدخل في حساب الصيانة القادمة والمتأخرة.
              </ArabicText>
            </View>
          </Pressable>
        </ScrollView>
      )}

      <Modal visible={invoiceOpen} animationType="fade" onRequestClose={() => setInvoiceOpen(false)}>
        <View style={[styles.viewer, { backgroundColor: "#000", paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Pressable onPress={() => setInvoiceOpen(false)} style={[styles.viewerClose, { flexDirection: rowDir }]}>
            <Ionicons name="close" size={22} color="#fff" />
            <Text style={styles.viewerCloseText}>إغلاق</Text>
          </Pressable>
          {invoice?.uri ? (
            <Image
              source={{ uri: invoice.uri }}
              style={styles.viewerImage}
              resizeMode="contain"
              onError={() => {
                setInvoiceOpen(false);
                Alert.alert("تعذر فتح الفاتورة", "الصورة غير موجودة. أرفق الفاتورة من جديد من تفاصيل الصيانة.");
              }}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, direction: "ltr", alignItems: "stretch", gap: 3 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "right" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  headerSpacer: { width: 42 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  primaryBtn: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  hero: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8 },
  heroTop: { alignItems: "center", justifyContent: "space-between" },
  heroIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "right" },
  heroVehicle: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "right" },
  doneBadge: { alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  doneBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right", marginBottom: 4 },
  detailRow: { alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  detailIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  detailText: { flex: 1, gap: 2 },
  detailLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "right" },
  detailValue: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right" },
  notes: { fontSize: 14, lineHeight: 22, fontFamily: "Inter_400Regular", textAlign: "right" },
  invoiceBox: { minHeight: 72, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 10, alignItems: "center", gap: 10 },
  invoiceThumb: { width: 52, height: 52, borderRadius: 10 },
  pdfBadge: { width: 52, height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  invoiceName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  invoiceKind: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  relatedWrap: { gap: 8 },
  relatedRow: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
  },
  relatedTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  viewer: { flex: 1 },
  viewerClose: { minHeight: 48, paddingHorizontal: 16, alignItems: "center", gap: 8 },
  viewerCloseText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  viewerImage: { flex: 1, width: "100%" },
  relatedMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  recoCard: { borderRadius: 16, borderWidth: 1, padding: 14, alignItems: "center", gap: 10 },
});
