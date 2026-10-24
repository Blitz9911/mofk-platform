import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import React, { useEffect } from "react";
import { I18nManager } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SplashView } from "@/components/SplashView";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import "@/lib/supabase-api-bridge";
import { useAppNotifications } from "@/hooks/useAppNotifications";
import { useObdTelemetrySync } from "@/src/obd";
import { ToastProvider } from "@/components/Toast";



I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

async function applyPublishedUpdate() {
  if (__DEV__ || !Updates.isEnabled) return;

  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch {
    /* Keep the currently opened bundle if the update check fails. */
  }
}

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : null);

setBaseUrl(apiBaseUrl);
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const AUTH_SCREENS = ["welcome", "login", "register", "verify", "complete-profile", "onboarding", "order-device", "pair-device"];
const ONBOARDING_SCREENS = ["verify", "complete-profile", "onboarding", "order-device", "pair-device"];

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  if (isLoading) {
    return <SplashView />;
  }

  const inAuthScreen = AUTH_SCREENS.includes(segments[0] as string);

  const inOnboardingScreen = ONBOARDING_SCREENS.includes(segments[0] as string);

  if (!user && !inAuthScreen) {
    return <Redirect href="/welcome" />;
  }

  if (user && inAuthScreen && !inOnboardingScreen) {
    return <Redirect href="/" />;
  }

  return (
    <>
      {user ? <ObdTelemetrySyncHost /> : null}
      {user ? <NotificationHost /> : null}
      {children}
    </>
  );
}

function ObdTelemetrySyncHost() {
  useObdTelemetrySync();
  return null;
}

function NotificationHost() {
  useAppNotifications();
  return null;
}

function RootLayoutNav() {
  const colors = useColors();

  const baseScreenOptions = {
    headerShown: false,
    animation: "slide_from_right",
    animationDuration: 280,
    gestureEnabled: true,
    gestureDirection: "horizontal",
    contentStyle: { backgroundColor: colors.background },
  } as const;

  const cardScreenOptions = {
    ...baseScreenOptions,
    presentation: "card",
  } as const;

  const softScreenOptions = {
    ...baseScreenOptions,
    animation: "fade",
    animationDuration: 260,
  } as const;

  const modalScreenOptions = {
    ...baseScreenOptions,
    presentation: "modal",
    animation: "slide_from_bottom",
    animationDuration: 260,
  } as const;

  return (
    <Stack screenOptions={baseScreenOptions}>
      <Stack.Screen name="(tabs)" options={{ ...baseScreenOptions, animation: "fade" }} />
      <Stack.Screen name="welcome" options={{ ...baseScreenOptions, animation: "fade", animationDuration: 320 }} />
      <Stack.Screen name="login" options={{ ...baseScreenOptions, animation: "slide_from_right", animationDuration: 320 }} />
      <Stack.Screen name="register" options={{ ...baseScreenOptions, animation: "slide_from_right", animationDuration: 320 }} />
      <Stack.Screen name="verify" options={{ ...baseScreenOptions, animation: "slide_from_right", animationDuration: 320 }} />
      <Stack.Screen name="complete-profile" options={{ ...baseScreenOptions, animation: "slide_from_right", animationDuration: 320 }} />
      <Stack.Screen name="onboarding" options={{ ...baseScreenOptions, animation: "slide_from_right", animationDuration: 320 }} />
      <Stack.Screen name="pair-device" options={cardScreenOptions} />
      <Stack.Screen name="obd-connect" options={cardScreenOptions} />
      <Stack.Screen name="vehicle/[id]" options={cardScreenOptions} />
      <Stack.Screen name="vehicles" options={cardScreenOptions} />
      <Stack.Screen name="add-vehicle" options={modalScreenOptions} />
      <Stack.Screen name="dtc" options={cardScreenOptions} />
      <Stack.Screen name="diagnostics" options={cardScreenOptions} />
      <Stack.Screen name="obd-diagnostics" options={cardScreenOptions} />
      <Stack.Screen name="obd-live" options={cardScreenOptions} />
      <Stack.Screen name="obd-vehicle-info" options={cardScreenOptions} />
      <Stack.Screen name="assistant" options={cardScreenOptions} />
      <Stack.Screen name="maintenance" options={cardScreenOptions} />
      <Stack.Screen name="maintenance/index" options={cardScreenOptions} />
      <Stack.Screen name="maintenance-detail" options={cardScreenOptions} />
      <Stack.Screen name="fuel" options={cardScreenOptions} />
      <Stack.Screen name="bookings" options={cardScreenOptions} />
      <Stack.Screen name="recommendations" options={cardScreenOptions} />
      <Stack.Screen name="recommendation-detail" options={cardScreenOptions} />
      <Stack.Screen name="subscription" options={cardScreenOptions} />
      <Stack.Screen name="profile-edit" options={cardScreenOptions} />
      <Stack.Screen name="my-orders" options={cardScreenOptions} />
      <Stack.Screen name="order-device" options={cardScreenOptions} />
      <Stack.Screen name="device-binding" options={cardScreenOptions} />
      <Stack.Screen name="security-privacy" options={cardScreenOptions} />
      <Stack.Screen name="support-help" options={cardScreenOptions} />
      <Stack.Screen name="terms" options={cardScreenOptions} />
      <Stack.Screen name="about" options={cardScreenOptions} />
      <Stack.Screen name="language" options={cardScreenOptions} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    void applyPublishedUpdate();
  }, []);

  if (!fontsLoaded && !fontError) return <SplashView />;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LocaleProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <ToastProvider>
                <AuthProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <KeyboardProvider>
                      <AuthGate>
                        <RootLayoutNav />
                      </AuthGate>
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </AuthProvider>
              </ToastProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
