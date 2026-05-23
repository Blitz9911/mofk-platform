import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useListWorkshops } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const CITIES = ["الكل", "الرياض", "جدة", "الدمام", "مكة", "المدينة"];

export default function WorkshopsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [city, setCity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: workshops, isLoading, refetch } = useListWorkshops(
    city ? { city } : {},
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>الورش المعتمدة</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityFilter} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {CITIES.map((c) => {
          const isActive = (c === "الكل" && !city) || c === city;
          return (
            <Pressable
              key={c}
              style={[styles.cityChip, { backgroundColor: isActive ? colors.primary : colors.card, borderColor: colors.border }]}
              onPress={() => setCity(c === "الكل" ? null : c)}
            >
              <Text style={[styles.cityChipText, { color: isActive ? "#fff" : colors.foreground }]}>{c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={workshops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 100 : 120, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="build-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد ورش في هذه المنطقة</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
              <Pressable
                style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.push(`/workshop/${item.id}`)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.workshopName, { color: colors.foreground }]}>{item.nameAr}</Text>
                    {item.isVerified && (
                      <View style={[styles.verifiedBadge, { backgroundColor: colors.primary + "22" }]}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                        <Text style={[styles.verifiedText, { color: colors.primary }]}>معتمدة</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text style={[styles.rating, { color: colors.foreground }]}>{item.rating?.toFixed(1) ?? "—"}</Text>
                    <Text style={[styles.ratingCount, { color: colors.mutedForeground }]}>({item.reviewsCount ?? 0})</Text>
                  </View>
                </View>

                <View style={styles.cardMeta}>
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.city}</Text>
                  </View>
                </View>

                {item.servicesAr && item.servicesAr.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {item.servicesAr.slice(0, 4).map((s, i) => (
                      <View key={i} style={[styles.serviceBadge, { backgroundColor: colors.accent }]}>
                        <Text style={[styles.serviceText, { color: colors.accentForeground }]}>{s}</Text>
                      </View>
                    ))}
                    {(item.servicesAr.length > 4) && (
                      <View style={[styles.serviceBadge, { backgroundColor: colors.accent }]}>
                        <Text style={[styles.serviceText, { color: colors.accentForeground }]}>+{item.servicesAr.length - 4}</Text>
                      </View>
                    )}
                  </ScrollView>
                )}

                <Pressable style={[styles.bookBtn, { backgroundColor: colors.primary }]} onPress={() => router.push(`/workshop/${item.id}`)}>
                  <Text style={styles.bookBtnText}>احجز موعداً</Text>
                  <Ionicons name="calendar-outline" size={16} color="#fff" />
                </Pressable>
              </Pressable>
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-end",
  },
  headerTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold" },
  cityFilter: { maxHeight: 52, marginVertical: 8 },
  cityChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  cityChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  cardTop: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between" },
  cardTitleRow: { flex: 1, gap: 4, alignItems: "flex-end" },
  workshopName: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  verifiedBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  verifiedText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  ratingRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  rating: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  ratingCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardMeta: { gap: 4 },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  serviceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  serviceText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bookBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 12 },
  bookBtnText: { color: "#fff", fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
