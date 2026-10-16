import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  getNotificationsEnabled,
  osNotificationsAvailable,
  requestNotificationPermission,
  subscribeNotificationTaps,
  syncOsNotifications,
  type AppNotificationItem,
} from "@/lib/app-notifications";

async function fetchNotifications() {
  const response = await fetch("/api/notifications", {
    headers: { "Content-Type": "application/json" },
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : [];
  if (!response.ok) {
    throw new Error(data?.error || data?.message || "تعذر تحميل التنبيهات.");
  }
  return (Array.isArray(data) ? data : []) as AppNotificationItem[];
}

function toMobileRoute(actionUrl?: string | null) {
  if (!actionUrl) return "/(tabs)";
  const clean = actionUrl.replace(/^\/app/, "");
  return clean || "/(tabs)";
}

export function useAppNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const enabledQuery = useQuery({
    queryKey: ["notification-pref"],
    queryFn: getNotificationsEnabled,
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user || enabledQuery.data !== true) return;
    if (!osNotificationsAvailable()) return;
    void requestNotificationPermission();
  }, [user, enabledQuery.data]);

  useEffect(() => {
    if (!user || enabledQuery.data !== true) return;
    if (!notificationsQuery.data) return;
    void syncOsNotifications(notificationsQuery.data);
  }, [user, enabledQuery.data, notificationsQuery.data]);

  useEffect(() => {
    if (!user) return;

    return subscribeNotificationTaps((actionUrl, notificationId) => {
      if (notificationId && !notificationId.startsWith("maintenance-") && !notificationId.startsWith("mofk-enabled-")) {
        void fetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        }).then(() => {
          queryClient.setQueryData<AppNotificationItem[]>(["notifications"], (current) =>
            (current ?? []).map((item) =>
              item.id === notificationId ? { ...item, isRead: true } : item,
            ),
          );
        });
      }

      router.push(toMobileRoute(actionUrl) as never);
    });
  }, [user, router, queryClient]);
}
