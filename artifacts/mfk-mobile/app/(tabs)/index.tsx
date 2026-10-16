import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useGetMySubscription,
  useGetUpcomingMaintenance,
  useListVehicles,
} from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArabicText } from "@/components/ArabicText";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useObdConnection } from "@/src/obd/hooks/use-obd-connection";

type AppNotification = {
  id: string;
  type: string;
  severity: string;
  titleAr: string;
  bodyAr?: string | null;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
};

type HomeCard = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
  wide?: boolean;
};

const HOME_CARDS: HomeCard[] = [
  {
    title: "التشخيص",
    description: "قراءة أكواد الأعطال وبيانات OBD",
    icon: "hardware-chip-outline",
    color: "#FF6A00",
    route: "/diagnostics",
  },
  {
    title: "البنزين",
    description: "تعبئات الوقود والصرفية والتكاليف",
    icon: "speedometer-outline",
    color: "#22C55E",
    route: "/fuel",
  },
  {
    title: "مركباتي",
    description: "سياراتك وحالة كل مركبة من مكان واحد",
    icon: "car-sport-outline",
    color: "#38bdf8",
    route: "/vehicles",
  },
  {
    title: "الصيانة",
    description: "سجل الصيانة والتنبيهات والمواعيد",
    icon: "construct-outline",
    color: "#F8C313",
    route: "/maintenance",
  },
  {
    title: "التوصيات",
    description: "توصيات مخصصة مبنية على بيانات سيارتك",
    icon: "bulb-outline",
    color: "#8B5CF6",
    route: "/recommendations",
  },
  {
    title: "السجلات",
    description: "الأعطال والقراءات السابقة",
    icon: "pulse-outline",
    color: "#C044FF",
    route: "/dtc",
  },
];

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new Error(data?.error || data?.message || "تعذر الاتصال بالخادم.");
  }

  return data as T;
}

function notificationIcon(severity: string) {
  if (severity === "critical") return { name: "warning", color: "#ef4444" };
  if (severity === "warning") return { name: "alert-circle", color: "#f59e0b" };
  if (severity === "success") return { name: "checkmark-circle", color: "#22c55e" };
  return { name: "notifications", color: "#FF6A00" };
}

function formatNotificationDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value?.slice(0, 10) ?? "";
  }
}

function planName(tier?: string | null) {
  if (tier === "plus" || tier === "mofk") return "باقة مفك";
  if (tier === "premium" || tier === "pro" || tier === "family") return "باقة العائلة";
  if (tier === "fleet") return "باقة الاسطول";
  return "باقة مجانية";
}

function enDigits(value: number) {
  return String(Math.round(value));
}

function greetName(name?: string | null) {
  const value = (name ?? "").trim();
  if (!value || /^user$/i.test(value) || /^user[-_]?\d+$/i.test(value) || /mofk\.local/i.test(value)) {
    return "";
  }
  return value.split(/\s+/)[0];
}

function toMobileRoute(actionUrl?: string | null) {
  if (!actionUrl) return null;
  const clean = actionUrl.replace(/^\/app/, "");
  return clean || "/";
}

function NotificationsSheet({
  visible,
  notifications,
  isLoading,
  onClose,
  onOpen,
  onMarkAll,
}: {
  visible: boolean;
  notifications: AppNotification[];
  isLoading: boolean;
  onClose: () => void;
  onOpen: (notification: AppNotification) => void;
  onMarkAll: () => void;
}) {
  const colors = useColors();
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.notifSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.notifHeader}>
            <Pressable
              onPress={onMarkAll}
              disabled={!unreadCount}
              style={[styles.markAllBtn, { borderColor: colors.border, opacity: unreadCount ? 1 : 0.45 }]}
            >
              <Text style={[styles.markAllText, { color: colors.foreground }]}>تعليم الكل كمقروء</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifTitle, { color: colors.foreground }]}>التنبيهات</Text>
              <Text style={[styles.notifSubtitle, { color: colors.mutedForeground }]}>
                {unreadCount ? `${unreadCount} تنبيه غير مقروء` : "كل التنبيهات مقروءة"}
              </Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.notifEmpty}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.notifEmptyText, { color: colors.mutedForeground }]}>جاري تحميل التنبيهات</Text>
            </View>
          ) : notifications.length ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 18 }}>
              {notifications.map((item) => {
                const icon = notificationIcon(item.severity);

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => onOpen(item)}
                    style={[
                      styles.notificationRow,
                      {
                        backgroundColor: item.isRead ? colors.secondary : colors.primary + "12",
                        borderColor: item.isRead ? colors.border : colors.primary + "55",
                      },
                    ]}
                  >
                    <View style={[styles.notificationIcon, { backgroundColor: icon.color + "18" }]}>
                      <Ionicons name={icon.name as keyof typeof Ionicons.glyphMap} size={18} color={icon.color} />
                    </View>
                    <View style={styles.notificationText}>
                      <View style={styles.notificationTopLine}>
                        {!item.isRead ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
                        <Text style={[styles.notificationTitle, { color: colors.foreground }]} numberOfLines={1}>
                          {item.titleAr}
                        </Text>
                      </View>
                      {item.bodyAr ? (
                        <Text style={[styles.notificationBody, { color: colors.mutedForeground }]} numberOfLines={2}>
                          {item.bodyAr}
                        </Text>
                      ) : null}
                      <Text style={[styles.notificationMeta, { color: colors.mutedForeground }]}>
                        {formatNotificationDate(item.createdAt)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.notifEmpty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="notifications-off-outline" size={24} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.notifEmptyTitle, { color: colors.foreground }]}>ما فيه تنبيهات حالياً</Text>
              <Text style={[styles.notifEmptyText, { color: colors.mutedForeground }]}>
                بنبلغك هنا إذا قرب موعد صيانة أو احتاجت المركبة متابعة.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const isDark = colors.mode === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const obd = useObdConnection();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  const { data: vehicles = [], refetch: refetchVehicles, isLoading: vehiclesLoading } = useListVehicles();
  const { data: maintenance = [], refetch: refetchMaintenance } = useGetUpcomingMaintenance();
  const { data: subscription, refetch: refetchSubscription } = useGetMySubscription();

  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<AppNotification[]>("/api/notifications"),
    staleTime: 30_000,
  });

  const markNotificationRead = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "PATCH",
      }),
    onSuccess: (_, id) => {
      queryClient.setQueryData<AppNotification[]>(["notifications"], (current) =>
        (current ?? []).map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
    },
  });

  const markAllNotificationsRead = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>("/api/notifications/read-all", {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.setQueryData<AppNotification[]>(["notifications"], (current) =>
        (current ?? []).map((item) => ({ ...item, isRead: true })),
      );
    },
  });

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const overdueCount = useMemo(
    () => maintenance.filter((item: any) => item.status === "overdue").length,
    [maintenance],
  );

  const upcomingCount = useMemo(
    () => maintenance.filter((item: any) => item.status === "upcoming").length,
    [maintenance],
  );

  const primaryVehicle = vehicles[0];
  const healthScore = Number(primaryVehicle?.healthScore ?? 100);
  const today = new Date().toLocaleDateString("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const healthTone = healthScore >= 80 ? "#38BDF8" : healthScore >= 60 ? "#F59E0B" : "#EF4444";
  const firstName = greetName(user?.name);
  const planActive = subscription?.status === "active";
  const planTone = planActive ? "#FBBF24" : "#FB923C";
  const garageTitle = vehicles.length
    ? `${enDigits(vehicles.length)} مركبة في حسابك`
    : "ابدأ بإضافة مركبتك الأولى";

  const garageSubtitle = vehicles.length
    ? primaryVehicle?.nickname || [primaryVehicle?.make, primaryVehicle?.model].filter(Boolean).join(" ") || "آخر مركبة مضافة"
    : "بعد الإضافة تقدر تتابع الصيانة والبنزين والتشخيص من مكان واحد.";

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchVehicles(),
      refetchMaintenance(),
      refetchSubscription(),
      refetchNotifications(),
    ]);
    setRefreshing(false);
  };

  const openNotifications = () => {
    setNotificationsVisible(true);
    refetchNotifications();
  };

  const openGarage = () => {
    router.push((vehicles.length ? "/vehicles" : "/add-vehicle") as never);
  };

  const openNotification = (notification: AppNotification) => {
    if (!notification.isRead && !notification.id.startsWith("maintenance-")) {
      markNotificationRead.mutate(notification.id);
    }

    setNotificationsVisible(false);

    const route = toMobileRoute(notification.actionUrl);

    if (route) {
      router.push(route as never);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ["#050607", "#0B0B0B", "#11100E", "#090909"] : ["#FFFFFF", "#FFF8F1", "#FFFFFF", "#FFF6EC"]}
      locations={[0, 0.42, 0.78, 1]}
      style={styles.container}
    >
      <View pointerEvents="none" style={[styles.glowTop, { backgroundColor: isDark ? "rgba(255,106,0,0.09)" : "rgba(255,106,0,0.13)" }]} />
      <View pointerEvents="none" style={[styles.glowMiddle, { backgroundColor: isDark ? "rgba(255,255,255,0.035)" : "rgba(255,106,0,0.055)" }]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: (Platform.OS === "web" ? 42 : insets.top) + 18,
            paddingBottom: (Platform.OS === "web" ? 108 : 128) + insets.bottom,
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.topBar}>
          <BrandLogo style={styles.logo} />

          <Pressable
            onPress={openNotifications}
            style={[
              styles.notifBtn,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.055)" : "#FFFFFF",
                borderColor: isDark ? "rgba(255,106,0,0.22)" : "rgba(255,106,0,0.24)",
              },
            ]}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
            {unreadCount > 0 ? (
              <View style={styles.notifDot}>
                <Text style={styles.notifDotText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.heroBannerShell}>
          <LinearGradient
            colors={["#FF8A24", "#FF6A00", "#F14F00"]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroBadgeWrap}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles-outline" size={10} color="#FFFFFF" />
                <Text style={styles.heroBadgeText}>لوحة مفك</Text>
              </View>
            </View>

            <ArabicText style={styles.heroTitle}>
              {firstName ? `مرحباً ${firstName}` : "مرحباً بك في مفك"}
            </ArabicText>
            <ArabicText style={styles.heroDate}>{today}</ArabicText>
            <ArabicText style={styles.heroSubtitle}>
              تابع الصيانة، البنزين، التنبيهات وقراءات مفك من مكان واحد.
            </ArabicText>

            <View style={styles.heroActions}>
              <Pressable
                onPress={() => router.push("/diagnostics" as never)}
                style={({ pressed }) => [styles.heroPrimaryButton, pressed && styles.pressed]}
              >
                <Ionicons name="pulse-outline" size={16} color="#FF6A00" />
                <Text style={styles.heroPrimaryText}>بدء التشخيص</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/pair-device" as never)}
                style={({ pressed }) => [styles.heroPairButton, pressed && styles.pressed]}
              >
                <Ionicons name="bluetooth-outline" size={16} color="#FFFFFF" />
                <Text style={styles.heroPairText}>اقتران الجهاز</Text>
              </Pressable>
            </View>

            <View style={styles.heroStatsRow}>
              <Pressable
                onPress={() => router.push("/diagnostics" as never)}
                style={({ pressed }) => [
                  styles.heroStatCard,
                  {
                    backgroundColor: `${healthTone}33`,
                    borderColor: `${healthTone}99`,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.heroStatIcon, { backgroundColor: `${healthTone}55` }]}>
                  <Ionicons name="pulse-outline" size={14} color="#FFFFFF" />
                </View>
                <ArabicText style={styles.heroStatLabel}>حالة النظام</ArabicText>
                {vehiclesLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.heroStatValue}>
                    {vehicles.length ? `${enDigits(healthScore)}%` : "--"}
                  </Text>
                )}
                <ArabicText style={styles.heroStatSub}>
                  {vehicles.length ? (healthScore >= 80 ? "مستقر" : healthScore >= 60 ? "يحتاج متابعة" : "يحتاج فحص") : "بانتظار البيانات"}
                </ArabicText>
              </Pressable>

              <Pressable
                onPress={() => router.navigate("/(tabs)/subscription-tab" as never)}
                style={({ pressed }) => [
                  styles.heroStatCard,
                  {
                    backgroundColor: `${planTone}2E`,
                    borderColor: `${planTone}99`,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.heroStatIcon, { backgroundColor: `${planTone}55` }]}>
                  <Ionicons name="diamond-outline" size={14} color="#FFFFFF" />
                </View>
                <ArabicText style={styles.heroStatLabel}>الباقة الحالية</ArabicText>
                <ArabicText style={styles.heroVehicleName} numberOfLines={1}>
                  {planName(subscription?.tier)}
                </ArabicText>
                <ArabicText style={styles.heroStatSub} numberOfLines={1}>
                  {planActive ? "نشطة" : "جاهزة للتفعيل"}
                </ArabicText>
              </Pressable>
            </View>

            <View style={styles.heroMetricsRow}>
              <View style={styles.heroMetricItem}>
                <Text style={styles.heroMetricValue}>{enDigits(overdueCount)}</Text>
                <Text style={styles.heroMetricLabel}>متأخرة</Text>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetricItem}>
                <Text style={styles.heroMetricValue}>{enDigits(upcomingCount)}</Text>
                <Text style={styles.heroMetricLabel}>قريبة</Text>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetricItem}>
                <Text style={styles.heroMetricValue}>{enDigits(unreadCount)}</Text>
                <Text style={styles.heroMetricLabel}>تنبيه</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {overdueCount > 0 ? (
          <Pressable
            onPress={() => router.push("/maintenance")}
            style={({ pressed }) => [styles.warningCard, pressed && styles.pressed]}
          >
            <View style={styles.warningIcon}>
              <Ionicons name="warning-outline" size={21} color="#ef4444" />
            </View>
            <View style={styles.warningCopy}>
              <ArabicText style={styles.warningTitle}>عندك صيانة تحتاج متابعة</ArabicText>
              <ArabicText style={styles.warningText}>راجع بنود الصيانة المتأخرة قبل ما تزيد التكلفة.</ArabicText>
            </View>
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.58)" />
          </Pressable>
        ) : null}

        <View style={styles.sectionHeader}>
          <ArabicText style={styles.sectionHint}>خدماتك اليومية</ArabicText>
          <ArabicText style={[styles.sectionTitle, { color: colors.foreground }]}>تابع سيارتك</ArabicText>
        </View>

        <View style={styles.cardsGrid}>
          {HOME_CARDS.map((card) => (
            <Pressable
              key={card.title}
              onPress={() =>
                router.push((card.route === "/vehicles" && !vehicles.length ? "/add-vehicle" : card.route) as never)
              }
              style={({ pressed }) => [
                styles.homeCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
                pressed && styles.homeCardPressed,
              ]}
            >
              <LinearGradient
                colors={isDark ? ["rgba(255,255,255,0.078)", "rgba(255,255,255,0.032)", "rgba(255,255,255,0.05)"] : ["rgba(255,255,255,0.96)", "rgba(255,255,255,0.86)", "rgba(255,106,0,0.035)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.cardIconBox, { backgroundColor: card.color + "16" }]}>
                    {card.route === "/fuel" ? (
                      <MaterialCommunityIcons name="gas-station-outline" size={25} color={card.color} />
                    ) : (
                      <Ionicons name={card.icon} size={25} color={card.color} />
                    )}
                  </View>
                  <Ionicons name="chevron-back" size={19} color={isDark ? "#D6C4B2" : "#8B5A2B"} />
                </View>

                <View style={styles.cardTextBlock}>
                  <ArabicText style={[styles.cardTitle, { color: colors.foreground }]}>{card.title}</ArabicText>
                  <ArabicText style={[styles.cardDescription, { color: isDark ? "#D6C4B2" : "#8B5A2B" }]}>{card.description}</ArabicText>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => router.push("/pair-device")}
          style={({ pressed }) => [
            styles.deviceCard,
            {
              backgroundColor: isDark ? "rgba(59,114,255,0.10)" : "rgba(59,114,255,0.075)",
              borderColor: isDark ? "rgba(59,114,255,0.24)" : "rgba(59,114,255,0.20)",
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.deviceIcon}>
            <Ionicons name="bluetooth-outline" size={24} color="#3B72FF" />
          </View>
          <View style={styles.deviceText}>
            <ArabicText style={[styles.deviceTitle, { color: colors.foreground }]}>
              {obd.state === "vehicle_connected" ? "مفك متصل" : "جهز جهاز مفك للربط"}
            </ArabicText>
            <ArabicText style={[styles.deviceSub, { color: isDark ? "#D6C4B2" : "#8B5A2B" }]}>
              {obd.state === "vehicle_connected"
                ? "سيارتك جاهزة للفحص والقراءات الحية."
                : "عند وصول القطعة، اربطها من هنا وابدأ قراءة البيانات."}
            </ArabicText>
          </View>
          <Ionicons name="chevron-back" size={20} color={isDark ? "#D6C4B2" : "#8B5A2B"} />
        </Pressable>
      </ScrollView>

      <NotificationsSheet
        visible={notificationsVisible}
        notifications={notifications}
        isLoading={notificationsLoading}
        onClose={() => setNotificationsVisible(false)}
        onOpen={openNotification}
        onMarkAll={() => markAllNotificationsRead.mutate()}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0B",
    direction: "rtl",
  },
  glowTop: {
    position: "absolute",
    top: -100,
    right: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,106,0,0.09)",
  },
  glowMiddle: {
    position: "absolute",
    top: 260,
    left: -130,
    width: 320,
    height: 360,
    borderRadius: 160,
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  content: {
    paddingHorizontal: 18,
    direction: "rtl",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,106,0,0.22)",
    backgroundColor: "rgba(255,255,255,0.055)",
  },
  notifDot: {
    position: "absolute",
    top: 2,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    backgroundColor: "#FF6A00",
  },
  notifDotText: {
    color: "#fff",
    fontSize: 8,
    fontFamily: "Inter_700Bold",
  },
  logo: {
    width: 132,
    height: 42,
  },
  heroBannerShell: {
    paddingTop: 0,
  },
  heroBanner: {
    overflow: "hidden",
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "stretch",
    direction: "rtl",
  },
  heroBadgeWrap: {
    width: "100%",
    direction: "ltr",
    alignItems: "flex-end",
  },
  heroBadge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
    writingDirection: "rtl",
  },
  heroDate: {
    marginTop: 3,
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  heroTitle: {
    marginTop: 9,
    color: "#FFFFFF",
    fontSize: 25,
    lineHeight: 32,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  heroSubtitle: {
    marginTop: 6,
    color: "rgba(255,255,255,0.94)",
    fontSize: 12,
    lineHeight: 19,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  heroActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 12,
    direction: "rtl",
  },
  heroPrimaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#FFFFFF",
  },
  heroPrimaryText: {
    color: "#FF6A00",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    writingDirection: "rtl",
  },
  heroPairButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.65)",
    backgroundColor: "#2563EB",
  },
  heroPairText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    writingDirection: "rtl",
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    direction: "rtl",
  },
  heroStatCard: {
    flex: 1,
    minHeight: 92,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 3,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  heroStatIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  heroStatLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
    writingDirection: "rtl",
  },
  heroStatValue: {
    color: "#FFFFFF",
    fontSize: 23,
    lineHeight: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    writingDirection: "ltr",
    width: "100%",
    fontVariant: ["tabular-nums"],
  },
  heroVehicleName: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    writingDirection: "rtl",
    maxWidth: "100%",
  },
  heroStatSub: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 10,
    lineHeight: 15,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
    writingDirection: "rtl",
    maxWidth: "100%",
  },
  heroMetricsRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    direction: "rtl",
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingVertical: 10,
  },
  heroMetricItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 6,
  },
  heroMetricValue: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    writingDirection: "ltr",
    width: "100%",
    fontVariant: ["tabular-nums"],
  },
  heroMetricLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    writingDirection: "rtl",
    width: "100%",
  },
  heroMetricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  statusCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  statusGradient: {
    padding: 16,
    gap: 16,
  },
  statusTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statusCopy: {
    flex: 1,
    alignItems: "flex-end",
    gap: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.26)",
  },
  statusBadgeText: {
    color: "#F5F5F5",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  statusTitle: {
    color: "#F7F7F7",
    fontSize: 21,
    lineHeight: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    writingDirection: "rtl",
  },
  statusSubtitle: {
    color: "rgba(255,255,255,0.60)",
    fontSize: 12,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    writingDirection: "rtl",
  },
  healthWrap: {
    alignItems: "center",
    gap: 6,
  },
  healthRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  healthScore: {
    fontSize: 21,
    fontFamily: "Inter_700Bold",
  },
  healthLabel: {
    color: "rgba(255,255,255,0.54)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.22)",
    paddingVertical: 12,
  },
  insightItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  insightValue: {
    color: "#F7F7F7",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  insightLabel: {
    color: "rgba(255,255,255,0.54)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  insightDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
  },
  quickAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,106,0,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
  },
  quickText: {
    color: "#F4F4F4",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    writingDirection: "rtl",
  },
  warningCard: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.30)",
    backgroundColor: "rgba(239,68,68,0.10)",
  },
  warningIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.16)",
  },
  warningCopy: {
    flex: 1,
    alignItems: "stretch",
    gap: 3,
  },
  warningTitle: {
    color: "#F7F7F7",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  warningText: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  sectionHeader: {
    alignItems: "stretch",
    paddingTop: 16,
    paddingBottom: 8,
    gap: 2,
    width: "100%",
    direction: "rtl",
  },
  sectionHint: {
    color: "#FF6A00",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  sectionTitle: {
    color: "#F7F7F7",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    direction: "rtl",
  },
  homeCard: {
    width: "48.3%",
    minHeight: 146,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "rgba(255,255,255,0.045)",
    direction: "rtl",
  },
  homeCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  cardGradient: {
    flex: 1,
    padding: 13,
    justifyContent: "space-between",
    direction: "rtl",
    alignItems: "stretch",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextBlock: {
    gap: 5,
    alignItems: "stretch",
    width: "100%",
  },
  cardTitle: {
    color: "#F7F7F7",
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  cardDescription: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
    lineHeight: 17,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  deviceCard: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(59,114,255,0.24)",
    backgroundColor: "rgba(59,114,255,0.10)",
  },
  deviceIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59,114,255,0.16)",
  },
  deviceText: {
    flex: 1,
    alignItems: "stretch",
    gap: 3,
  },
  deviceTitle: {
    color: "#F7F7F7",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  deviceSub: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  notifSheet: {
    maxHeight: "78%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
    direction: "rtl",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  notifHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  notifTitle: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  notifSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
    width: "100%",
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  markAllText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    writingDirection: "rtl",
    textAlign: "right",
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationText: {
    flex: 1,
    alignItems: "stretch",
    gap: 4,
  },
  notificationTopLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    writingDirection: "rtl",
  },
  notificationBody: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  notificationMeta: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notifEmpty: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  notifEmptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    writingDirection: "rtl",
  },
  notifEmptyText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    writingDirection: "rtl",
  },
});
