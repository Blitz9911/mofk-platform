import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform, TurboModuleRegistry } from "react-native";
import { shouldPersistPushToken } from "@/lib/push-registration.mjs";

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
  addPushTokenListener?: (
    listener: () => void,
  ) => { remove: () => void };
  getLastNotificationResponseAsync?: () => Promise<{
    notification: {
      request: {
        content: { data?: Record<string, unknown> };
      };
    };
  } | null>;
  getExpoPushTokenAsync?: (options?: { projectId?: string }) => Promise<{ data?: string }>;
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
  return permissionFromStatus(
    await native.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    }),
  );
}

function lockScreenCopy(type?: string) {
  if (type === "dtc_new") {
    return { title: "تنبيه من مفك", body: "يوجد تنبيه فني في حسابك." };
  }
  if (type === "maintenance_upcoming" || type === "maintenance_overdue" || type === "maintenance") {
    return { title: "موعد صيانة سيارتك اقترب", body: "مفك يذكّرك بموعد تغيير زيت المحرك." };
  }
  return { title: "تنبيه من مفك", body: "لديك تحديث متعلق بمركبتك." };
}

function easProjectId() {
  try {
    const Constants = require("expo-constants") as {
      easConfig?: { projectId?: string };
      expoConfig?: { extra?: { eas?: { projectId?: string } } };
    };
    return Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId || undefined;
  } catch {
    return undefined;
  }
}

export async function presentLocalNotification(item: {
  id: string;
  title: string;
  body?: string | null;
  actionUrl?: string | null;
  type?: string;
}) {
  const native = loadNative();
  if (!native) return false;

  ensureHandler(native);
  await ensureAndroidChannel(native);
  const copy = lockScreenCopy(item.type);

  await native.scheduleNotificationAsync({
    identifier: item.id,
    content: {
      title: copy.title,
      body: copy.body,
      sound: true,
      data: {
        actionUrl: item.actionUrl ?? "/(tabs)",
        notificationId: item.id,
        type: item.type ?? "",
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
  const remoteToken = await AsyncStorage.getItem("mfk-expo-push-token");
  const unread = items.filter((item) => !item.isRead && !presented.has(item.id));

  for (const item of unread) {
    const serverRow = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      item.id,
    );
    if (remoteToken && serverRow) {
      presented.add(item.id);
      continue;
    }
    const shown = await presentLocalNotification({
      id: item.id,
      title: item.titleAr,
      body: item.bodyAr,
      actionUrl: item.actionUrl,
      type: item.type,
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

export async function consumeLastNotificationResponse() {
  const native = loadNative();
  if (!native?.getLastNotificationResponseAsync) return null;
  const response = await native.getLastNotificationResponseAsync();
  const data = response?.notification.request.content.data ?? {};
  const actionUrl = typeof data.actionUrl === "string" ? data.actionUrl : null;
  const notificationId = typeof data.notificationId === "string" ? data.notificationId : undefined;
  if (!actionUrl && !notificationId) return null;
  return { actionUrl: actionUrl || "/(tabs)", notificationId };
}

const REGISTER_DIAG_KEY = "mfk-push-register-diag";

function tokenTail(token: string) {
  return token.length >= 8 ? `…${token.slice(-4)}` : "[redacted]";
}

export async function getPushRegisterDiagnostics() {
  try {
    const raw = await AsyncStorage.getItem(REGISTER_DIAG_KEY);
    return raw ? (JSON.parse(raw) as { ok: boolean; reason?: string; at?: string; tokenTail?: string; renewed?: boolean }) : null;
  } catch {
    return null;
  }
}

export async function getUatExpoPushTokenForSharing() {
  if (process.env.EXPO_PUBLIC_MFK_ENV !== "uat") return null;
  return AsyncStorage.getItem("mfk-expo-push-token");
}

export async function registerExpoPushToken() {
  const native = loadNative();
  if (!native?.getExpoPushTokenAsync) {
    await AsyncStorage.setItem(REGISTER_DIAG_KEY, JSON.stringify({ ok: false, reason: "unavailable", at: new Date().toISOString() }));
    return { ok: false as const, reason: "unavailable" };
  }
  const permission = await getNotificationPermission();
  if (!permission.granted) {
    await AsyncStorage.setItem(REGISTER_DIAG_KEY, JSON.stringify({ ok: false, reason: "denied", at: new Date().toISOString() }));
    return { ok: false as const, reason: "denied" };
  }
  try {
    const projectId = easProjectId();
    if (!projectId) {
      await AsyncStorage.setItem(REGISTER_DIAG_KEY, JSON.stringify({ ok: false, reason: "missing_project_id", at: new Date().toISOString() }));
      return { ok: false as const, reason: "missing_project_id" };
    }
    const tokenResult = await native.getExpoPushTokenAsync({ projectId });
    const token = tokenResult?.data;
    if (!token) {
      await AsyncStorage.setItem(REGISTER_DIAG_KEY, JSON.stringify({ ok: false, reason: "empty_token", at: new Date().toISOString() }));
      return { ok: false as const, reason: "empty_token" };
    }
    const previous = await AsyncStorage.getItem("mfk-expo-push-token");
    const renewed = Boolean(previous && previous !== token);
    const response = await fetch("/api/devices/push-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!shouldPersistPushToken({ status: response.status, payload })) {
      const reason = typeof payload?.error === "string" ? payload.error : "register_failed";
      await AsyncStorage.setItem(REGISTER_DIAG_KEY, JSON.stringify({ ok: false, reason, at: new Date().toISOString() }));
      return { ok: false as const, reason };
    }
    await AsyncStorage.setItem("mfk-expo-push-token", token);
    await AsyncStorage.setItem(
      REGISTER_DIAG_KEY,
      JSON.stringify({
        ok: true,
        at: new Date().toISOString(),
        tokenTail: tokenTail(token),
        renewed,
      }),
    );
    return { ok: true as const, tokenTail: tokenTail(token), renewed };
  } catch {
    await AsyncStorage.setItem(REGISTER_DIAG_KEY, JSON.stringify({ ok: false, reason: "register_error", at: new Date().toISOString() }));
    return { ok: false as const, reason: "register_error" };
  }
}

export function subscribePushTokenChanges(onRefresh?: (result: Awaited<ReturnType<typeof registerExpoPushToken>>) => void) {
  const native = loadNative();
  if (!native?.addPushTokenListener) return () => undefined;

  const subscription = native.addPushTokenListener(() => {
    void registerExpoPushToken().then((result) => onRefresh?.(result));
  });
  return () => subscription.remove();
}

export async function unregisterExpoPushToken() {
  try {
    const token = await AsyncStorage.getItem("mfk-expo-push-token");
    if (!token) return;
    await fetch("/api/devices/push-token", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    await AsyncStorage.removeItem("mfk-expo-push-token");
  } catch {
    /* Keep disable local even if the server is unreachable. */
  }
}

export async function enableAppNotifications() {
  await setNotificationsEnabled(true);
  const permission = await requestNotificationPermission();
  if (permission.granted) {
    const registration = await registerExpoPushToken();
    if (registration.ok) await presentActivationNotice();
    try {
      await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushEnabled: true }),
      });
    } catch {
      /* inbox + local pref still apply */
    }
  }
  return permission;
}

export async function disableAppNotifications() {
  await setNotificationsEnabled(false);
  await unregisterExpoPushToken();
  try {
    await fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pushEnabled: false }),
    });
  } catch {
    /* local unsubscribe still applies */
  }
}
