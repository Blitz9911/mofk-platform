import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const OTP_LENGTH = 6;

function StatusBarMock() {
  return (
    <View style={styles.status}>
      <Text style={styles.statusText}>٩:٤١</Text>
      <Text style={styles.statusText}>◉ WiFi ▰</Text>
    </View>
  );
}

export default function VerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const inputs = useRef<Array<TextInput | null>>([]);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [seconds, setSeconds] = useState(45);
  const [error, setError] = useState("");

  const code = digits.join("");
  const maskedPhone = useMemo(() => {
    const phone = user?.phone ?? "+9665XXXXXXX";
    return phone.length > 4 ? `${phone.slice(0, 5)}••••${phone.slice(-2)}` : phone;
  }, [user?.phone]);

  useEffect(() => {
    if (seconds <= 0) return;

    const timer = setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const handleDigitChange = (value: string, index: number) => {
    const nextValue = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = nextValue;
    setDigits(nextDigits);
    setError("");

    if (nextValue && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (event.nativeEvent.key !== "Backspace" || digits[index]) return;
    inputs.current[index - 1]?.focus();
  };

  const handleResend = () => {
    setDigits(Array(OTP_LENGTH).fill(""));
    setSeconds(45);
    inputs.current[0]?.focus();
  };

  const handleVerify = () => {
    if (code.length !== OTP_LENGTH) {
      setError("أدخل رمز التحقق المكون من 6 أرقام");
      return;
    }

    // TODO: Replace this Phase 1 mock with Supabase OTP verification.
    router.replace("/onboarding");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 22 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={["#090A0B", "#070707", "#120B05"]} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <StatusBarMock />

        <View style={styles.topbar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="chevron-forward" size={18} color="#F5F5F5" />
          </Pressable>
          <Text style={styles.topbarTitle}>تأكيد الجوال</Text>
          <View style={styles.iconButtonGhost} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>أدخل رمز التحقق</Text>
          <Text style={styles.description}>
            أرسلنا رمزًا مكونًا من 6 أرقام إلى{"\n"}{maskedPhone}
          </Text>
        </View>

        <View style={styles.otpRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(input) => {
                inputs.current[index] = input;
              }}
              style={[
                styles.otpInput,
                { borderColor: digit ? colors.primary : "#24262B" },
              ]}
              value={digit}
              onChangeText={(value) => handleDigitChange(value, index)}
              onKeyPress={(event) => handleKeyPress(event, index)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable onPress={handleResend} disabled={seconds > 0} style={styles.resendButton}>
          <Text style={[styles.resendText, { color: seconds > 0 ? "#8E949D" : colors.primary }]}>
            {seconds > 0 ? `إعادة الإرسال خلال ${seconds} ثانية` : "إعادة إرسال الرمز"}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            { opacity: pressed || code.length !== OTP_LENGTH ? 0.72 : 1 },
          ]}
          onPress={handleVerify}
          disabled={code.length !== OTP_LENGTH}
        >
          <Text style={styles.primaryText}>تأكيد ومتابعة</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#050505", flex: 1, paddingHorizontal: 22 },
  content: { flex: 1 },
  status: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  statusText: { color: "#F5F5F5", fontFamily: "Inter_700Bold", fontSize: 12 },
  topbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#151618",
    borderColor: "#24262B",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  iconButtonGhost: { height: 36, width: 36 },
  topbarTitle: { color: "#F5F5F5", fontFamily: "Inter_700Bold", fontSize: 18 },
  hero: { alignItems: "flex-end", marginTop: 42 },
  title: { color: "#F5F5F5", fontFamily: "Inter_700Bold", fontSize: 24, marginBottom: 14, textAlign: "right" },
  description: {
    color: "#8E949D",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 25,
    textAlign: "right",
  },
  otpRow: { direction: "ltr", flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 28 },
  otpInput: {
    backgroundColor: "#111214",
    borderRadius: 15,
    borderWidth: 1,
    color: "#F5F5F5",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    height: 54,
    width: 46,
  },
  errorText: { color: "#EF4444", fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 12, textAlign: "center" },
  resendButton: { alignItems: "center", marginTop: 18, paddingVertical: 8 },
  resendText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#FF6A00",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    marginTop: 16,
  },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});
