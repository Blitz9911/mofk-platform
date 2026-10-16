import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type TabIconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  focused,
  color,
  icon,
}: {
  focused: boolean;
  color: string;
  icon: TabIconName;
}) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focused, progress]);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const bgScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });

  const bgOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.iconWrap}>
      <Animated.View style={[styles.activeGlow, { opacity: bgOpacity, transform: [{ scale: bgScale }] }]} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={icon} size={28} color={color} />
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const isWeb = Platform.OS === "web";
  const isDark = colors.mode === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? "rgba(255,255,255,0.72)" : "rgba(18,18,18,0.58)",
        tabBarLabelPosition: "below-icon",
        tabBarHideOnKeyboard: true,
        lazy: true,
        sceneStyle: { backgroundColor: "transparent" },
        tabBarLabel: ({ color, children }) => (
          <Text
            numberOfLines={1}
            style={[styles.tabLabel, { color }]}
          >
            {children}
          </Text>
        ),
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: [
          styles.tabBar,
          {
            height: isWeb ? 88 : 92,
            backgroundColor: isDark ? "rgba(18,18,18,0.78)" : "rgba(255,255,255,0.88)",
            borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(18,18,18,0.10)",
          },
        ],
        tabBarBackground: () => (
          <BlurView
            intensity={78}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} icon={focused ? "home" : "home-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistant-tab"
        options={{
          title: "المساعد الذكي",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} icon={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="subscription-tab"
        options={{
          title: "الاشتراك",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} icon={focused ? "card" : "card-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="pairing-tab"
        options={{
          title: "اقتران الجهاز",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} icon={focused ? "bluetooth" : "bluetooth-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "حسابي",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} icon={focused ? "person" : "person-outline"} />
          ),
        }}
      />

      <Tabs.Screen name="maintenance-tab" options={{ href: null }} />
      <Tabs.Screen name="fuel-tab" options={{ href: null }} />
      <Tabs.Screen name="recommendations-tab" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 16,
    borderWidth: 1,
    borderTopWidth: 1,
    borderRadius: 28,
    overflow: "hidden",
    elevation: 0,
    shadowColor: "#000",
    shadowOpacity: 0,
  },
  tabItem: {
    paddingTop: 10,
    paddingBottom: 10,
    minWidth: 0,
  },
  iconWrap: {
    height: 38,
    width: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  activeGlow: {
    position: "absolute",
    width: 44,
    height: 34,
    borderRadius: 18,
    backgroundColor: "rgba(255,106,0,0.13)",
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    writingDirection: "rtl",
  },
});
