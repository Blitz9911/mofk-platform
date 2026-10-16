import React from "react";
import { StyleSheet, View } from "react-native";

/** Matches native splash color only — no second logo screen before welcome. */
export function SplashView() {
  return <View style={styles.root} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#060e1c",
  },
});
