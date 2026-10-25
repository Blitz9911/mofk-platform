import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastContextValue = { showToast: (message: string) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((nextMessage: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(nextMessage);
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    void AccessibilityInfo.announceForAccessibility(nextMessage);
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMessage(null);
      });
    }, 2600);
  }, [opacity]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message ? (
        <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.host, { top: insets.top + 12, opacity }]}>
          <View style={styles.toast}><Text style={styles.text}>{message}</Text></View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 16, right: 16, zIndex: 10000, elevation: 10000, alignItems: "center" },
  toast: { maxWidth: 420, minHeight: 44, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14, backgroundColor: "#202020", borderWidth: StyleSheet.hairlineWidth, borderColor: "#555", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  text: { color: "#fff", fontSize: 14, textAlign: "center", writingDirection: "rtl", fontFamily: "Inter_600SemiBold" },
});
