import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const logo = require("@/assets/images/mfk-logo.png");

export function SplashView() {
  const insets = useSafeAreaInsets();
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(dot, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 360,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay((2 - index) * 150),
        ]),
      ),
    );

    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dots]);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={["#07080B", "#0B0A0A", "#130B06", "#1A1009"]}
        locations={[0, 0.48, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Image source={logo} style={styles.logo} contentFit="contain" />
        <Text style={styles.tagline}>سيارتك أذكى من أي وقت مضى</Text>
        <View style={styles.dotsRow} accessibilityLabel="جاري التحميل">
          {dots.map((dot, index) => {
            const opacity = dot.interpolate({
              inputRange: [0, 1],
              outputRange: [0.45, 1],
            });
            const scale = dot.interpolate({
              inputRange: [0, 1],
              outputRange: [0.82, 1.16],
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === 2 ? "#FF6A00" : index === 1 ? "#B85D13" : "#7D4212",
                    opacity,
                    transform: [{ scale }],
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#07080B",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -14 }],
  },
  logo: {
    width: 118,
    height: 58,
    marginBottom: 4,
  },
  tagline: {
    color: "#E9F2FF",
    fontSize: 13,
    lineHeight: 22,
    textAlign: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 28,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
});
