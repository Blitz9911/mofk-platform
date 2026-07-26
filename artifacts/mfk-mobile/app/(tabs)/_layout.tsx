import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

function tabIcon(route: string, focused: boolean, color: string, isIOS: boolean) {
  const sf: Record<string, string> = {
    index: focused ? "house.fill" : "house",
    vehicles: focused ? "car.fill" : "car",
    diagnostics: "waveform.path.ecg",
    profile: focused ? "person.fill" : "person",
  };
  const ion: Record<string, string> = {
    index: focused ? "home" : "home-outline",
    vehicles: focused ? "car" : "car-outline",
    diagnostics: focused ? "pulse" : "pulse-outline",
    profile: focused ? "person" : "person-outline",
  };

  return isIOS ? (
    <SymbolView name={sf[route] as any} tintColor={color} size={24} />
  ) : (
    <Ionicons name={ion[route] as any} size={22} color={color} />
  );
}

export default function TabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 10,
          marginTop: 2,
        },
        tabBarItemStyle: { paddingTop: 8 },
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: isIOS ? 18 : 12,
          height: isIOS ? 72 : 68,
          backgroundColor: "#111111F2",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          borderRadius: 22,
          elevation: 0,
          shadowColor: "#000",
          shadowOpacity: 0.28,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          overflow: "hidden",
          ...(isWeb ? { height: 76, bottom: 12 } : {}),
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111111F2" }]} />
        ),
        tabBarIcon: ({ color, focused }) => tabIcon(route.name, focused, color, isIOS),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية" }} />
      <Tabs.Screen name="vehicles" options={{ title: "مركباتي" }} />
      <Tabs.Screen name="diagnostics" options={{ title: "التشخيص" }} />
      <Tabs.Screen name="profile" options={{ title: "حسابي" }} />
    </Tabs>
  );
}
