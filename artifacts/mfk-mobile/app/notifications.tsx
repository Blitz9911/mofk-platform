import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArabicText } from "@/components/ArabicText";
import { useColors } from "@/hooks/useColors";
import { toSafeMobileRoute } from "@/lib/notification-destinations.mjs";

type InboxItem = {
  id: string;
  type: string;
  category?: string;
  severity: string;
  titleAr: string;
  bodyAr?: string | null;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
};

type InboxPayload = {
  items: InboxItem[];
  total: number;
  unreadCount: number;
};

const CATEGORIES = [
  { id: "all", label: "الكل" },
  { id: "unread", label: "غير مقروء" },
  { id: "maintenance", label: "صيانة" },
  { id: "diagnostics", label: "أعطال" },
  { id: "documents", label: "وثائق" },
  { id: "device", label: "قطعة مفك" },
  { id: "subscriptions", label: "اشتراك" },
];

function parseInbox(data: unknown): InboxPayload {
  if (Array.isArray(data)) {
    const items = data as InboxItem[];
    return { items, total: items.length, unreadCount: items.filter((item) => !item.isRead).length };
  }
  const payload = (data ?? {}) as InboxPayload;
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    total: payload.total ?? 0,
    unreadCount: payload.unreadCount ?? 0,
  };
}

function relativeAr(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.round(hours / 24);
  return `قبل ${days} يوم`;
}

function iconFor(severity: string) {
  if (severity === "critical") return { name: "warning" as const, color: "#ef4444" };
  if (severity === "warning") return { name: "alert-circle" as const, color: "#f59e0b" };
  if (severity === "success") return { name: "checkmark-circle" as const, color: "#22c55e" };
  return { name: "notifications" as const, color: "#FF6A00" };
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(data?.error || "تعذر تحميل التنبيهات.");
  return data as T;
}

export default function NotificationCenterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("all");
  const [offset, setOffset] = useState(0);

  const query = useQuery({
    queryKey: ["notifications-inbox", category, offset],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "30", offset: String(offset) });
      if (category === "unread") params.set("unread", "true");
      else if (category !== "all") params.set("category", category);
      return parseInbox(await apiJson(`/api/notifications?${params.toString()}`));
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiJson(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications-inbox"] }),
  });

  const markAll = useMutation({
    mutationFn: () => apiJson("/api/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const items = query.data?.items ?? [];
  const unreadCount = query.data?.unreadCount ?? 0;
  const canLoadMore = (query.data?.total ?? 0) > offset + items.length;

  const emptyCopy = useMemo(
    () =>
      category === "unread"
        ? "ما فيه تنبيهات غير مقروءة."
        : "بنبلغك هنا على الصيانة والأعطال والوثائق والاشتراك.",
    [category],
  );

  const openItem = async (item: InboxItem) => {
    if (!item.isRead) markRead.mutate(item.id);
    try {
      const dest = await apiJson<{ actionUrl?: string }>(
        `/api/notifications/${encodeURIComponent(item.id)}/destination`,
      );
      router.push(toSafeMobileRoute(dest.actionUrl || item.actionUrl) as never);
    } catch {
      router.push(toSafeMobileRoute(item.actionUrl) as never);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { borderColor: colors.border }]}>
          <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ArabicText style={[styles.title, { color: colors.foreground }]}>مركز التنبيهات</ArabicText>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {unreadCount ? `${unreadCount} غير مقروء` : "كل التنبيهات مقروءة"}
          </Text>
        </View>
        <Pressable onPress={() => markAll.mutate()} disabled={!unreadCount} style={[styles.markAll, { opacity: unreadCount ? 1 : 0.4 }]}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>تعليم الكل</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {CATEGORIES.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              setCategory(item.id);
              setOffset(0);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: category === item.id ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={{ color: category === item.id ? "#fff" : colors.foreground }}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
      >
        {query.isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.mutedForeground }}>جاري تحميل التنبيهات</Text>
          </View>
        ) : query.isError ? (
          <View style={styles.empty}>
            <Text style={{ color: colors.foreground }}>تعذر تحميل التنبيهات</Text>
            <Pressable onPress={() => query.refetch()} style={[styles.retry, { backgroundColor: colors.primary }]}>
              <Text style={{ color: "#fff" }}>إعادة المحاولة</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={28} color={colors.mutedForeground} />
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>ما فيه تنبيهات حالياً</Text>
            <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>{emptyCopy}</Text>
          </View>
        ) : (
          items.map((item) => {
            const icon = iconFor(item.severity);
            return (
              <Pressable
                key={item.id}
                onPress={() => openItem(item)}
                style={[
                  styles.row,
                  {
                    backgroundColor: item.isRead ? colors.card : `${colors.primary}14`,
                    borderColor: item.isRead ? colors.border : `${colors.primary}55`,
                  },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${icon.color}18` }]}>
                  <Ionicons name={icon.name} size={18} color={icon.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.titleAr}</Text>
                  {item.bodyAr ? (
                    <Text style={[styles.itemBody, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {item.bodyAr}
                    </Text>
                  ) : null}
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{relativeAr(item.createdAt)}</Text>
                </View>
                {!item.isRead ? <View style={[styles.unread, { backgroundColor: colors.primary }]} /> : null}
              </Pressable>
            );
          })
        )}
        {canLoadMore ? (
          <Pressable
            onPress={() => setOffset((value) => value + 30)}
            style={[styles.retry, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={{ color: colors.foreground }}>المزيد</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", textAlign: "right" },
  sub: { textAlign: "right", marginTop: 2 },
  markAll: { minHeight: 44, justifyContent: "center" },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, minHeight: 40 },
  empty: { alignItems: "center", gap: 8, paddingTop: 48 },
  retry: { marginTop: 8, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 44, alignItems: "center" },
  row: { flexDirection: "row", gap: 10, borderWidth: 1, borderRadius: 16, padding: 12, alignItems: "flex-start" },
  iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontWeight: "700", textAlign: "right" },
  itemBody: { textAlign: "right", marginTop: 4 },
  unread: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
