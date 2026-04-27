import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  useGetWorkshop,
  useListVehicles,
  useCreateBooking,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function WorkshopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: workshop, isLoading } = useGetWorkshop(id);
  const { data: vehicles } = useListVehicles();
  const { mutateAsync: createBooking, isPending } = useCreateBooking();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);

  const handleBook = async () => {
    const vehicleId = selectedVehicleId ?? vehicles?.[0]?.id;
    if (!vehicleId) {
      Alert.alert("خطأ", "يرجى اختيار مركبة");
      return;
    }
    try {
      setBooking(true);
      await createBooking({
        data: {
          workshopId: id,
          vehicleId,
          scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          notes,
          serviceType: workshop?.services?.[0] ?? "inspection",
        }
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("تم الحجز", "تم إرسال طلب الحجز بنجاح", [
        { text: "حسناً", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("خطأ", "فشل إرسال الحجز، حاول مجدداً");
    } finally {
      setBooking(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>تفاصيل الورشة</Text>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-forward" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : workshop ? (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}>
            <View style={[styles.workshopHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.workshopNameRow}>
                {workshop.isVerified && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                <Text style={[styles.workshopName, { color: colors.foreground }]}>{workshop.nameAr}</Text>
              </View>
              <View style={styles.workshopMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{workshop.addressAr ?? `${workshop.city} - ${workshop.neighborhood}`}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={[styles.metaText, { color: colors.foreground }]}>{workshop.rating?.toFixed(1) ?? "—"}</Text>
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>({workshop.reviewCount ?? 0} تقييم)</Text>
                </View>
                {workshop.openHours && (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{workshop.openHours}</Text>
                  </View>
                )}
              </View>
              {workshop.phone && (
                <Pressable style={[styles.callBtn, { borderColor: colors.primary }]}>
                  <Ionicons name="call-outline" size={16} color={colors.primary} />
                  <Text style={[styles.callBtnText, { color: colors.primary }]}>{workshop.phone}</Text>
                </Pressable>
              )}
            </View>

            {workshop.servicesAr && workshop.servicesAr.length > 0 && (
              <View style={styles.servicesSection}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الخدمات المتاحة</Text>
                <View style={styles.servicesGrid}>
                  {workshop.servicesAr.map((s, i) => (
                    <View key={i} style={[styles.serviceBadge, { backgroundColor: colors.accent, borderColor: colors.border }]}>
                      <Ionicons name="checkmark" size={12} color={colors.primary} />
                      <Text style={[styles.serviceText, { color: colors.foreground }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.bookingSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>احجز موعداً</Text>

              {vehicles && vehicles.length > 0 && (
                <View style={styles.vehicleSelector}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>اختر المركبة</Text>
                  {vehicles.map((v) => (
                    <Pressable
                      key={v.id}
                      style={[
                        styles.vehicleOption,
                        { backgroundColor: (selectedVehicleId ?? vehicles[0]?.id) === v.id ? colors.primary + "22" : colors.card, borderColor: (selectedVehicleId ?? vehicles[0]?.id) === v.id ? colors.primary : colors.border },
                      ]}
                      onPress={() => setSelectedVehicleId(v.id)}
                    >
                      <Ionicons name="car-outline" size={16} color={(selectedVehicleId ?? vehicles[0]?.id) === v.id ? colors.primary : colors.mutedForeground} />
                      <Text style={[styles.vehicleOptionText, { color: colors.foreground }]}>
                        {v.nickname || `${v.make} ${v.model}`}
                      </Text>
                      {(selectedVehicleId ?? vehicles[0]?.id) === v.id && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: "auto" }} />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ملاحظات (اختياري)</Text>
              <TextInput
                style={[styles.notesInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="صف المشكلة أو الخدمة المطلوبة..."
                placeholderTextColor={colors.mutedForeground}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlign="right"
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 16 }]}>
            <Pressable
              style={[styles.bookBtn, { backgroundColor: colors.primary, opacity: isPending || booking ? 0.7 : 1 }]}
              onPress={handleBook}
              disabled={isPending || booking}
            >
              {booking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.bookBtnText}>تأكيد الحجز</Text>
                  <Ionicons name="calendar" size={18} color="#fff" />
                </>
              )}
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.center}>
          <Text style={[{ color: colors.mutedForeground }]}>الورشة غير موجودة</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  workshopHeader: { padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  workshopNameRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  workshopName: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right", flex: 1 },
  workshopMeta: { gap: 6 },
  metaItem: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  callBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, alignSelf: "flex-end" },
  callBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  servicesSection: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  servicesGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  serviceBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  serviceText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  bookingSection: { gap: 12 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "right" },
  vehicleSelector: { gap: 8 },
  vehicleOption: { flexDirection: "row-reverse", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  vehicleOptionText: { fontSize: 15, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },
  notesInput: { height: 100, borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", textAlignVertical: "top" },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  bookBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16 },
  bookBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
