import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useGetUpcomingMaintenance,
  useLogMaintenance,
  useListVehicles,
  getGetUpcomingMaintenanceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const STATUS_LABEL: Record<string, string> = {
  overdue: "متأخرة",
  upcoming: "قريباً",
  scheduled: "مجدولة",
};

const STATUS_COLOR = (colors: any) => ({
  overdue: "#ef4444",
  upcoming: "#f59e0b",
  scheduled: "#3b82f6",
});

function LogModal({
  visible,
  item,
  onClose,
  colors,
}: {
  visible: boolean;
  item: any;
  onClose: () => void;
  colors: any;
}) {
  const queryClient = useQueryClient();
  const logMaintenance = useLogMaintenance();
  const today = new Date().toISOString().split("T")[0];
  const [doneAt, setDoneAt] = useState(today);
  const [doneAtKm, setDoneAtKm] = useState(String(item?.nextDueKm ?? ""));
  const [cost, setCost] = useState(String(item?.estimatedCost ?? ""));
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!item) return;
    logMaintenance.mutate(
      {
        vehicleId: item.vehicleId,
        data: {
          serviceType: item.serviceType,
          doneAt,
          doneAtKm: Number(doneAtKm) || 0,
          cost: cost ? Number(cost) : undefined,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUpcomingMaintenanceQueryKey() });
          Alert.alert("تم", "تم تسجيل الصيانة بنجاح");
          onClose();
        },
        onError: () => Alert.alert("خطأ", "فشل تسجيل الصيانة، حاول مجدداً"),
      }
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[modalStyles.root, { backgroundColor: colors.background }]}>
        <View style={[modalStyles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[modalStyles.title, { color: colors.foreground }]}>تسجيل صيانة منجزة</Text>
          <View style={{ width: 34 }} />
        </View>
        <ScrollView contentContainerStyle={modalStyles.body} keyboardShouldPersistTaps="handled">
          {item && (
            <View style={[modalStyles.itemInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[modalStyles.itemName, { color: colors.foreground }]}>
                {item.serviceTypeAr || item.serviceType}
              </Text>
              <Text style={[modalStyles.itemVehicle, { color: colors.mutedForeground }]}>
                {item.vehicleNickname || item.vehicleMake}
              </Text>
            </View>
          )}

          <View style={modalStyles.fields}>
            <View style={modalStyles.field}>
              <Text style={[modalStyles.label, { color: colors.foreground }]}>التاريخ</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={doneAt}
                onChangeText={setDoneAt}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
                textAlign="left"
              />
            </View>
            <View style={modalStyles.field}>
              <Text style={[modalStyles.label, { color: colors.foreground }]}>قراءة العداد (كم)</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={doneAtKm}
                onChangeText={setDoneAtKm}
                keyboardType="numeric"
                textAlign="left"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={modalStyles.field}>
              <Text style={[modalStyles.label, { color: colors.foreground }]}>التكلفة الفعلية (ر.س)</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
                placeholder="اختياري"
                textAlign="left"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={modalStyles.field}>
              <Text style={[modalStyles.label, { color: colors.foreground }]}>ملاحظات</Text>
              <TextInput
                style={[modalStyles.input, modalStyles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="أي تفاصيل إضافية..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                textAlign="right"
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [modalStyles.btn, { backgroundColor: colors.primary, opacity: pressed || logMaintenance.isPending ? 0.8 : 1 }]}
            onPress={handleSubmit}
            disabled={logMaintenance.isPending}
          >
            {logMaintenance.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={modalStyles.btnText}>تأكيد التسجيل</Text>
            }
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function MaintenanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [logItem, setLogItem] = useState<any | null>(null);

  const { data: maintenance, isLoading, refetch } = useGetUpcomingMaintenance();

  const statusColors = STATUS_COLOR(colors);

  const overdue = maintenance?.filter((m) => m.status === "overdue") ?? [];
  const upcoming = maintenance?.filter((m) => m.status === "upcoming") ?? [];
  const scheduled = maintenance?.filter((m) => m.status === "scheduled") ?? [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const Section = ({ title, items, color }: { title: string; items: any[]; color: string }) => {
    if (!items.length) return null;
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color }]}>{title} ({items.length})</Text>
        {items.map((item) => (
          <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRightColor: color }]}>
            <View style={styles.cardTop}>
              <View style={[styles.badge, { backgroundColor: color + "20" }]}>
                <Text style={[styles.badgeText, { color }]}>{STATUS_LABEL[item.status]}</Text>
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.serviceTypeAr || item.serviceType}</Text>
            </View>
            <Text style={[styles.cardVehicle, { color: colors.mutedForeground }]}>
              {item.vehicleNickname || item.vehicleMake}
            </Text>
            <View style={styles.cardStats}>
              {item.nextDueKm && (
                <View style={[styles.statBox, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>الاستحقاق</Text>
                  <Text style={[styles.statVal, { color: colors.foreground }]}>{item.nextDueKm.toLocaleString("ar-SA")} كم</Text>
                </View>
              )}
              {item.daysUntilDue !== null && item.daysUntilDue !== undefined && (
                <View style={[styles.statBox, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>المتبقي</Text>
                  <Text style={[styles.statVal, { color: colors.foreground }]}>
                    {item.daysUntilDue < 0
                      ? `متأخر ${Math.abs(item.daysUntilDue)} يوم`
                      : `${item.daysUntilDue} يوم`}
                  </Text>
                </View>
              )}
              {item.estimatedCost && (
                <View style={[styles.statBox, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>تكلفة تقديرية</Text>
                  <Text style={[styles.statVal, { color: colors.foreground }]}>{item.estimatedCost} ر.س</Text>
                </View>
              )}
            </View>
            <Pressable
              style={({ pressed }) => [styles.logBtn, { backgroundColor: color, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => setLogItem(item)}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.logBtnText}>تسجيل كمنجزة</Text>
            </Pressable>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>الصيانة الدورية</Text>
        <View style={{ width: 34 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {!maintenance || maintenance.length === 0 ? (
            <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="checkmark-circle" size={52} color="#22c55e" />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>كل مركباتك بصحة جيدة</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>لا توجد صيانة مجدولة حالياً</Text>
            </View>
          ) : (
            <>
              <Section title="صيانة متأخرة" items={overdue} color={statusColors.overdue} />
              <Section title="صيانة قريبة" items={upcoming} color={statusColors.upcoming} />
              <Section title="صيانة مجدولة" items={scheduled} color={statusColors.scheduled} />
            </>
          )}
        </ScrollView>
      )}

      <LogModal
        visible={!!logItem}
        item={logItem}
        onClose={() => setLogItem(null)}
        colors={colors}
      />
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
  section: { gap: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right", marginBottom: 4 },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRightWidth: 4,
    gap: 10,
  },
  cardTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cardVehicle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cardStats: { flexDirection: "row-reverse", gap: 8, flexWrap: "wrap" },
  statBox: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: "flex-end" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  statVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  logBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 10,
    marginTop: 4,
  },
  logBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyWrap: {
    padding: 40,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});

const modalStyles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  body: { padding: 20, gap: 16 },
  itemInfo: {
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  itemName: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  itemVehicle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  fields: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "right" },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textarea: { height: 90, paddingTop: 12, textAlignVertical: "top" },
  btn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
