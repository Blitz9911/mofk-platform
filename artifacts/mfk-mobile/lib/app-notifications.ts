import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform, TurboModuleRegistry } from "react-native";

const ENABLED_KEY = "mfk-notifications-enabled";
const PRESENTED_KEY = "mfk-notifications-presented";
const CHANNEL_ID = "mofk";

export type AppNotificationItem = {
  id: string;
  type: string;
  severity: string;
  titleAr: string;
  bodyAr?: string | null;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
};

type PermissionStatus = {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
};

type NotificationsNative = {
  setNotificationHandler: (handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowBanner?: boolean;
      shouldShowList?: boolean;
    }>;
  }) => void;
  getPermissionsAsync: () => Promise<{
    status: string;
    granted?: boolean;
    canAskAgain?: boolean;
  }>;
  requestPermissionsAsync: (options?: unknown) => Promise<{
    status: string;
    granted?: boolean;
    canAskAgain?: boolean;
  }>;
  setNotificationChannelAsync?: (id: string, channel: unknown) => Promise<unknown>;
  scheduleNotificationAsync: (request: {
    identifier?: string;
    content: {
      title: string;
      body?: string;
      data?: Record<string, string>;
      sound?: boolean | string;
    };
    trigger: null | { type?: string; seconds?: number; channelId?: string };
  }) => Promise<string>;
  addNotificationResponseReceivedListener: (
    listener: (response: {
      notification: {
        request: {
          content: { data?: Record<string, unknown> };
        };
      };
    }) => void,
  ) => { remove: () => void };
  AndroidImportance?: { HIGH?: number; DEFAULT?: number };
};

let nativeModule: NotificationsNative | null | undefined;
let handlerReady = false;

function hasNativeNotifications(): boolean {
  try {
    const core = require("expo-modules-core") as {
      requireOptionalNativeModule?: (name: string) => unknown;
    };
    if (typeof core.requireOptionalNativeModule === "function") {
      return Boolean(
        core.requireOptionalNativeModule("ExpoPushTokenManager") ||
          core.requireOptionalNativeModule("ExpoNotifications") ||
          core.requireOptionalNativeModule("Notifications"),
      );
    }
  } catch {
    /* Some binaries don't expose the optional helper. */
  }

  try {
    return Boolean(
      NativeModules.ExpoPushTokenManager ||
        NativeModules.ExpoNotifications ||
        NativeModules.Notifications ||
        TurboModuleRegistry.get("ExpoPushTokenManager") ||
        TurboModuleRegistry.get("ExpoNotifications"),
    );
  } catch {
    return false;
  }
}

function loadNative(): NotificationsNative | null {
  if (nativeModule !== undefined) return nativeModule;
  if (Platform.OS === "web" || !hasNativeNotifications()) {
    nativeModule = null;
    return null;
  }

  try {
    nativeModule = require("expo-notifications") as NotificationsNative;
    return nativeModule;
  } catch {
    nativeModule = null;
    return null;
  }
}

export function osNotificationsAvailable() {
  return loadNative() != null;
}

export async function getNotificationsEnabled() {
  const stored = await AsyncStorage.getItem(ENABLED_KEY);
  if (stored == null) return true;
  return stored === "1" || stored === "true";
}

export async function setNotificationsEnabled(enabled: boolean) {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
}

async function readPresentedIds() {
  try {
    const raw = await AsyncStorage.getItem(PRESENTED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

async function rememberPresentedIds(ids: string[]) {
  const next = [...ids].slice(-80);
  await AsyncStorage.setItem(PRESENTED_KEY, JSON.stringify(next));
}

function ensureHandler(native: NotificationsNative) {
  if (handlerReady) return;
  native.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerReady = true;
}

async function ensureAndroidChannel(native: NotificationsNative) {
  if (Platform.OS !== "android" || typeof native.setNotificationChannelAsync !== "function") {
    return;
  }

  await native.setNotificationChannelAsync(CHANNEL_ID, {
    name: "تنبيهات مفك",
    importance: native.AndroidImportance?.HIGH ?? 4,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: "#FF6A00",
  });
}

function permissionFromStatus(result: {
  status: string;
  granted?: boolean;
  canAskAgain?: boolean;
}): PermissionStatus {
  const granted = result.granted === true || result.status === "granted";
  return {
    granted,
    canAskAgain: result.canAskAgain !== false,
    status: result.status,
  };
}

export async function getNotificationPermission(): Promise<PermissionStatus> {
  const native = loadNative();
  if (!native) {
    return { granted: false, canAskAgain: false, status: "unavailable" };
  }

  ensureHandler(native);
  return permissionFromStatus(await native.getPermissionsAsync());
}

export async function requestNotificationPermission(): Promise<PermissionStatus> {
  const native = loadNative();
  if (!native) {
    return { granted: false, canAskAgain: false, status: "unavailable" };
  }

  ensureHandler(native);
  await ensureAndroidChannel(native);
  return permissionFromStatus(await native.requestPermissionsAsync());
}

export async function presentLocalNotification(item: {
  id: string;
  title: string;
  body?: string | null;
  actionUrl?: string | null;
}) {
  const native = loadNative();
  if (!native) return false;

  ensureHandler(native);
  await ensureAndroidChannel(native);

  await native.scheduleNotificationAsync({
    identifier: item.id,
    content: {
      title: item.title,
      body: item.body ?? undefined,
      sound: true,
      data: {
        actionUrl: item.actionUrl ?? "/(tabs)",
        notificationId: item.id,
      },
    },
    trigger: null,
  });

  return true;
}

export async function syncOsNotifications(items: AppNotificationItem[]) {
  const enabled = await getNotificationsEnabled();
  if (!enabled) return;

  const permission = await getNotificationPermission();
  if (!permission.granted) return;

  const presented = await readPresentedIds();
  const unread = items.filter((item) => !item.isRead && !presented.has(item.id));

  for (const item of unread) {
    const shown = await presentLocalNotification({
      id: item.id,
      title: item.titleAr,
      body: item.bodyAr,
      actionUrl: item.actionUrl,
    });
    if (shown) presented.add(item.id);
  }

  await rememberPresentedIds([...presented]);
}

export async function presentActivationNotice() {
  return presentLocalNotification({
    id: `mofk-enabled-${Date.now()}`,
    title: "تم تفعيل تنبيهات مفك",
    body: "بننبّهك على الصيانة القريبة والتنبيهات داخل الحساب.",
    actionUrl: "/(tabs)",
  });
}

export function subscribeNotificationTaps(
  onOpen: (actionUrl: string, notificationId?: string) => void,
) {
  const native = loadNative();
  if (!native) return () => undefined;

  ensureHandler(native);
  const subscription = native.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data ?? {};
    const actionUrl = typeof data.actionUrl === "string" ? data.actionUrl : "/(tabs)";
    const notificationId =
      typeof data.notificationId === "string" ? data.notificationId : undefined;
    onOpen(actionUrl, notificationId);
  });

  return () => subscription.remove();
}

export async function enableAppNotifications() {
  await setNotificationsEnabled(true);
  const permission = await requestNotificationPermission();
  if (permission.granted) {
    await presentActivationNotice();
  }
  return permission;
}

export async function disableAppNotifications() {
  await setNotificationsEnabled(false);
}
