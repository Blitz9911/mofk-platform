import React from "react";
import { StyleSheet, Text, type TextProps, View } from "react-native";

/**
 * Arabic labels must sit on the physical right edge.
 * Parent `direction: "rtl"` plus `textAlign: "right"` can cancel each other
 * and look LTR. Isolate the line in LTR, then align right.
 */
export function ArabicText({
  style,
  children,
  numberOfLines,
  fill,
  ...rest
}: TextProps & { fill?: boolean }) {
  return (
    <View style={[styles.isolate, fill ? styles.fill : styles.block]} collapsable={false}>
      <Text {...rest} numberOfLines={numberOfLines} style={[styles.text, style]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  isolate: {
    direction: "ltr",
    alignItems: "stretch",
  },
  block: {
    width: "100%",
  },
  fill: {
    flex: 1,
    minWidth: 0,
  },
  text: {
    width: "100%",
    textAlign: "right",
    writingDirection: "rtl",
  },
});
