import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useAuth } from "@/context/AuthContext";
import {
  consumeLastNotificationResponse,
  getNotificationsEnabled,
  osNotificationsAvailable,
  registerExpoPushToken,
  requestNotificationPermission,
  subscribePushTokenChanges,
  unregisterExpoPushToken,
  subscribeNotificationTaps,
  syncOsNotifications,
  type AppNotificationItem,
} from "@/lib/app-notifications";
import { toSafeMobileRoute } from "@/lib/notification-destinations.mjs";

async function fetchNotifications() {
  const response = await fetch("/api/notifications", {
    headers: { "Content-Type": "application/json" },
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : [];
  if (!response.ok) {
    throw new Error(data?.error || data?.message || "تعذر تحميل التنبيهات.");
  }
  if (Array.isArray(data)) return data as AppNotificationItem[];
  if (data && Array.isArray(data.items)) return data.items as AppNotificationItem[];
  return [];
}

function toMobileRoute(actionUrl?: string | null) {
  return toSafeMobileRoute(actionUrl);
}

let consumedLaunchResponse = false;

export function useAppNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | undefined>(user?.userId);

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
    const previous = previousUserId.current;
    previousUserId.current = user?.userId;
    if (previous && previous !== user?.userId) {
      void unregisterExpoPushToken();
      queryClient.removeQueries({ queryKey: ["notifications"] });
      queryClient.removeQueries({ queryKey: ["notifications-inbox"] });
    }
    if (!user || enabledQuery.data !== true) return;
    if (!osNotificationsAvailable()) return;
    void requestNotificationPermission().then((permission) => {
      if (permission.granted) void registerExpoPushToken();
    });
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void registerExpoPushToken();
    });
    const removeTokenListener = subscribePushTokenChanges();
    return () => {
      sub.remove();
      removeTokenListener();
    };
  }, [user, enabledQuery.data]);

  useEffect(() => {
    if (!user || enabledQuery.data !== true) return;
    if (!notificationsQuery.data) return;
    void syncOsNotifications(notificationsQuery.data);
  }, [user, enabledQuery.data, notificationsQuery.data]);

  useEffect(() => {
    if (!user) return;

    void consumeLastNotificationResponse().then((opened) => {
      if (!opened || consumedLaunchResponse) return;
      consumedLaunchResponse = true;
      if (opened.notificationId && !opened.notificationId.startsWith("maintenance-") && !opened.notificationId.startsWith("mofk-enabled-")) {
        void fetch(`/api/notifications/${encodeURIComponent(opened.notificationId)}/read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        });
      }
      router.push(toMobileRoute(opened.actionUrl) as never);
    });

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
