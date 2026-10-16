import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

export function ScanSweep({ active, color = "#FF6A00" }: { active: boolean; color?: string }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      progress.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 58],
  });

  if (!active) return null;

  return (
    <View pointerEvents="none" style={styles.clip}>
      <Animated.View style={[styles.line, { backgroundColor: color, transform: [{ translateY }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderRadius: 18,
  },
  line: {
    height: 2,
    width: "100%",
    opacity: 0.85,
    shadowColor: "#FF6A00",
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
});
