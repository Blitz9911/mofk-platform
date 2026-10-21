import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useGetMySubscription, useListSubscriptionPlans } from "@workspace/api-client-react";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const TIER_LABELS: Record<string, string> = {
  free: "مجاني",
  mofk: "مفك",
  plus: "مفك",
  basic: "أساسي",
  premium: "احترافي",
  pro: "متقدم",
  family: "العائلة",
  fleet: "الأسطول",
};

function MenuItem({ icon, label, onPress, danger }: { icon: string; label: string; onPress: () => void; danger?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={20} color={danger ? "#ef4444" : colors.primary} />
      <Text style={[styles.menuLabel, { color: danger ? "#ef4444" : colors.foreground }]}>{label}</Text>
      <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data: sub } = useGetMySubscription();
  const { data: plans } = useListSubscriptionPlans();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const activeTier = user?.subscriptionTier || sub?.tier || "free";
  const currentPlan = plans?.find((p) => p.tier === activeTier || p.id === activeTier);

  const firstLetter = user?.name?.charAt(0) ?? "م";

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "هل أنت متأكد من تسجيل الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تسجيل الخروج",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 120 }}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{firstLetter}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{user?.name ?? "—"}</Text>
            <Text style={[styles.profilePhone, { color: colors.mutedForeground }]}>{user?.phone ?? ""}</Text>
            {user?.email ? (
              <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
            ) : null}
          </View>
        </View>

        {/* Subscription Card */}
        {(sub || user) && (
          <View style={[styles.subCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
            <View style={styles.subHeader}>
              <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
              <Text style={[styles.subTitle, { color: colors.primary }]}>
                الاشتراك {TIER_LABELS[activeTier] ?? activeTier}
              </Text>
            </View>
            {currentPlan && (
              <Text style={[styles.subDesc, { color: colors.foreground }]}>{currentPlan.nameAr}</Text>
            )}
            {(user?.subscriptionEndsAt || sub?.endsAt) && (
              <Text style={[styles.subExp, { color: colors.mutedForeground }]}>
                صالح حتى {new Date(user?.subscriptionEndsAt || sub?.endsAt || "").toLocaleDateString("ar-SA")}
              </Text>
            )}
          </View>
        )}

        {/* Services */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>الخدمات</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="car-outline" label="مركباتي" onPress={() => router.push("/(tabs)/vehicles")} />
            <MenuItem icon="construct-outline" label="سجل الأعطال" onPress={() => router.push("/dtc")} />
            <MenuItem icon="build-outline" label="الصيانة الدورية" onPress={() => router.push("/maintenance")} />
            <MenuItem icon="bulb-outline" label="التوصيات الذكية" onPress={() => router.push("/recommendations")} />
            <MenuItem icon="chatbubble-ellipses-outline" label="المساعد الذكي" onPress={() => router.push("/assistant")} />
          </View>
        </View>

        {/* Subscription */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>الاشتراك</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="diamond-outline" label="الاشتراك والباقات" onPress={() => router.push("/subscription")} />
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>الإعدادات</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="notifications-outline" label="الإشعارات" onPress={() => {}} />
            <MenuItem icon="lock-closed-outline" label="الأمان والخصوصية" onPress={() => {}} />
            <MenuItem icon="information-circle-outline" label="عن التطبيق" onPress={() => {}} />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.menuGroup}>
            <MenuItem icon="log-out-outline" label="تسجيل الخروج" onPress={handleLogout} danger />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 20,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "700", fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
  profileName: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  profilePhone: { fontSize: 14, fontFamily: "Inter_400Regular" },
  profileEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  subCard: { margin: 16, padding: 16, borderRadius: 16, borderWidth: 1, gap: 6 },
  subHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  subTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  subDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "right" },
  subExp: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  subStat: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  subStatVal: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  subStatLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 8 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "right", textTransform: "uppercase", letterSpacing: 0.5 },
  menuGroup: { gap: 2 },
  menuItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 1,
  },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "right" },
});
