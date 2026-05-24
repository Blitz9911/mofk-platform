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

  const { data: workshops, isLoading, refetch } = useListWorkshops(city ? { city } : {});

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerRight}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>الورش المعتمدة</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>ابحث عن أفضل الورش واحجز موعد صيانتك</Text>
        </View>
      </View>

      {/* City filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.cityFilter}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
      >
        {CITIES.map((c) => {
          const isActive = (c === "الكل" && !city) || c === city;
          return (
            <Pressable
              key={c}
              style={[styles.cityChip, {
                backgroundColor: isActive ? colors.primary : colors.card,
                borderColor: isActive ? colors.primary : colors.border,
              }]}
              onPress={() => setCity(c === "الكل" ? null : c)}
            >
              {c !== "الكل" && <Ionicons name="location-outline" size={12} color={isActive ? "#fff" : colors.mutedForeground} />}
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
          contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 100 : 120, gap: 14 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="construct-outline" size={36} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد ورش في هذه المدينة</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>جرّب مدينة أخرى</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Workshop image placeholder */}
                <View style={[styles.workshopImage, { backgroundColor: colors.muted }]}>
                  {item.isVerified && (
                    <View style={[styles.verifiedOverlay, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark-circle" size={13} color="#fff" />
                      <Text style={styles.verifiedText}>معتمدة</Text>
                    </View>
                  )}
                  <Ionicons name="location" size={36} color={colors.mutedForeground} />
                </View>

                {/* Info */}
                <View style={styles.cardBody}>
                  <View style={styles.nameRow}>
                    <View style={styles.ratingPill}>
                      <Ionicons name="star" size={13} color="#f59e0b" />
                      <Text style={[styles.ratingText, { color: colors.foreground }]}>{item.rating?.toFixed(1) ?? "—"}</Text>
                      <Text style={[styles.ratingCount, { color: colors.mutedForeground }]}>({item.reviewsCount ?? 0})</Text>
                    </View>
                    <Text style={[styles.workshopName, { color: colors.foreground }]} numberOfLines={2}>
                      {item.nameAr}
                    </Text>
                  </View>

                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.locationText, { color: colors.mutedForeground }]}>{item.city}</Text>
                  </View>

                  {item.servicesAr && item.servicesAr.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {item.servicesAr.slice(0, 5).map((s, i) => (
                        <View key={i} style={[styles.serviceBadge, { backgroundColor: colors.accent }]}>
                          <Text style={[styles.serviceText, { color: colors.accentForeground }]}>{s}</Text>
                        </View>
                      ))}
                      {item.servicesAr.length > 5 && (
                        <View style={[styles.serviceBadge, { backgroundColor: colors.accent }]}>
                          <Text style={[styles.serviceText, { color: colors.mutedForeground }]}>+{item.servicesAr.length - 5}</Text>
                        </View>
                      )}
                    </ScrollView>
                  )}

                  <View style={styles.cardActions}>
                    <Pressable
                      style={({ pressed }) => [styles.detailsBtn, { borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
                      onPress={() => router.push(`/workshop/${item.id}`)}
                    >
                      <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.bookBtn, { backgroundColor: colors.primary, flex: 1, opacity: pressed ? 0.85 : 1 }]}
                      onPress={() => router.push(`/workshop/${item.id}`)}
                    >
                      <Ionicons name="calendar-outline" size={16} color="#fff" />
                      <Text style={styles.bookBtnText}>احجز موعداً</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
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
  },
  headerRight: { alignItems: "flex-end", gap: 2 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cityFilter: { maxHeight: 52 },
  cityChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  cityChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  workshopImage: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  verifiedOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardBody: { padding: 14, gap: 10 },
  nameRow: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  workshopName: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
  ratingPill: { flexDirection: "row-reverse", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  ratingCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  locationRow: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  locationText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  serviceBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  serviceText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardActions: { flexDirection: "row-reverse", gap: 8, marginTop: 2 },
  bookBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  detailsBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
