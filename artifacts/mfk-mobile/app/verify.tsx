import { Ionicons } from "@expo/vector-icons";
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
    return phone.length > 4 ? `${phone.slice(0, 5)}****${phone.slice(-2)}` : phone;
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
      style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="shield-checkmark-outline" size={34} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>تحقق من رقم الجوال</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            أرسلنا رمز تحقق إلى الرقم {maskedPhone}
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
                {
                  backgroundColor: colors.card,
                  borderColor: digit ? colors.primary : colors.border,
                  color: colors.foreground,
                },
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

        <Pressable
          onPress={handleResend}
          disabled={seconds > 0}
          style={styles.resendButton}
        >
          <Text style={[styles.resendText, { color: seconds > 0 ? colors.mutedForeground : colors.primary }]}>
            {seconds > 0 ? `إعادة الإرسال خلال ${seconds} ثانية` : "إعادة إرسال الرمز"}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.primary, opacity: pressed || code.length !== OTP_LENGTH ? 0.75 : 1 },
          ]}
          onPress={handleVerify}
          disabled={code.length !== OTP_LENGTH}
        >
          <Text style={styles.primaryText}>تحقق</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  content: { flex: 1, justifyContent: "center", gap: 28 },
  header: { alignItems: "flex-end", gap: 12 },
  iconWrap: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, textAlign: "right" },
  description: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 25, textAlign: "right" },
  otpRow: { flexDirection: "row-reverse", gap: 10, justifyContent: "center" },
  otpInput: {
    borderRadius: 14,
    borderWidth: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    height: 54,
    width: 46,
  },
  errorText: { color: "#ef4444", fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" },
  resendButton: { alignItems: "center", paddingVertical: 4 },
  resendText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  primaryButton: {
    alignItems: "center",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 },
});
