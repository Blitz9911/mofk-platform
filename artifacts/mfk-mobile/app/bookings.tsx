import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useListBookings } from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const STATUS_LABELS: Record<string, string> = {
  pending: "انتظار",
  confirmed: "مؤكد",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#22c55e",
  completed: "#6366f1",
  cancelled: "#ef4444",
};

export default function BookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: bookings, isLoading } = useListBookings();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>حجوزاتي</Text>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-forward" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد حجوزات</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] ?? colors.muted) + "22" }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] ?? colors.mutedForeground }]}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Text>
                </View>
                <Text style={[styles.workshopName, { color: colors.foreground }]}>{item.workshopName ?? "ورشة"}</Text>
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="car-outline" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{item.vehicleMake} {item.vehicleModel}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                    {new Date(item.scheduledAt).toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </Text>
                </View>
                {item.serviceTypeAr && (
                  <View style={styles.infoRow}>
                    <Ionicons name="construct-outline" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{item.serviceTypeAr}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  card: { padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 10 },
  cardTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  workshopName: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cardInfo: { gap: 6 },
  infoRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, textAlign: "right" },
});
