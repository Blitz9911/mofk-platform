import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArabicText } from "@/components/ArabicText";
import { toAsciiDigits } from "@/components/PhoneNumberInput";
import { authApi, useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { rowDir } from "@/lib/layout";
import { smoothBack } from "@/lib/navigation";
import { DEV_PHONE_OTP_CODE, isMockPhoneOtpEnabled } from "@/lib/supabase";

const OTP_LENGTH = 6;

function normalizeOtp(value: string) {
  return toAsciiDigits(value).slice(0, OTP_LENGTH);
}

export default function VerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; mode?: string }>();
  const { login } = useAuth();
  const hiddenInput = useRef<TextInput>(null);
  const verifyingRef = useRef(false);

  const phone = typeof params.phone === "string" ? params.phone : "";
  const mode = params.mode === "register" ? "register" : "login";
  const isMockOtp = isMockPhoneOtpEnabled();

  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(45);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [focused, setFocused] = useState(true);

  const digits = useMemo(
    () => Array.from({ length: OTP_LENGTH }, (_, index) => code[index] ?? ""),
    [code],
  );

  const maskedPhone = useMemo(() => {
    if (!phone) return "+966 5X XXX XXXX";
    return phone.length > 6 ? `${phone.slice(0, 5)} •••• ${phone.slice(-3)}` : phone;
  }, [phone]);

  useEffect(() => {
    if (!phone) {
      router.replace(mode === "register" ? "/register" : "/login");
    }
  }, [mode, phone, router]);

  useEffect(() => {
    const timer = setTimeout(() => hiddenInput.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;

    const timer = setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const handleVerify = async (nextCode = code) => {
    if (verifyingRef.current) return;

    setError("");

    if (nextCode.length !== OTP_LENGTH || !phone) {
      setError("أدخل رمز التحقق المكون من 6 أرقام.");
      return;
    }

    verifyingRef.current = true;
    setIsVerifying(true);
    try {
      const user = await authApi.verifyPhoneOtp(phone, nextCode, mode);
      await login(user);
      router.replace(mode === "register" ? "/complete-profile" : "/");
    } catch (err: any) {
      setError(err.message || "رمز التحقق غير صحيح أو انتهت صلاحيته.");
      verifyingRef.current = false;
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (value: string) => {
    const nextCode = normalizeOtp(value);
    setCode(nextCode);
    setError("");

    if (nextCode.length === OTP_LENGTH) {
      void handleVerify(nextCode);
    }
  };

  const handleResend = async () => {
    if (seconds > 0 || !phone || isResending) return;

    setError("");
    setIsResending(true);
    try {
      if (mode === "register") {
        await authApi.startPhoneRegistration(phone);
      } else {
        await authApi.startPhoneLogin(phone);
      }

      setCode("");
      setSeconds(45);
      verifyingRef.current = false;
      setTimeout(() => hiddenInput.current?.focus(), 50);
    } catch (err: any) {
      setError(err.message || "تعذر إعادة إرسال الرمز. حاول مرة أخرى.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View
      style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 22 }]}
    >
      <LinearGradient colors={["#090A0B", "#070707", "#120B05"]} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <View style={[styles.topbar, { flexDirection: rowDir }]}>
          <Pressable
            style={styles.iconButton}
            onPress={() => smoothBack(router, mode === "register" ? "/register" : "/login")}
          >
            <Ionicons name="chevron-forward" size={18} color="#F5F5F5" />
          </Pressable>
          <View style={styles.topbarTitleWrap}>
            <Text style={styles.topbarTitle}>تأكيد الجوال</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <ArabicText style={styles.title}>أدخل رمز التحقق</ArabicText>
          <ArabicText style={styles.description}>
            {isMockOtp
              ? `وضع الاختبار مفعل. استخدم الرمز ${DEV_PHONE_OTP_CODE} للمتابعة.`
              : "أرسلنا رمزًا مكونًا من 6 أرقام إلى"}
          </ArabicText>
          <Text style={styles.phoneLine}>{maskedPhone}</Text>
        </View>

        <Pressable style={styles.otpWrap} onPress={() => hiddenInput.current?.focus()}>
          <View pointerEvents="none" style={styles.otpRow}>
            {digits.map((digit, index) => (
              <View
                key={index}
                style={[
                  styles.otpBox,
                  {
                    borderColor:
                      digit || (focused && index === code.length)
                        ? colors.primary
                        : "#24262B",
                  },
                ]}
              >
                <Text style={styles.otpDigit}>{digit}</Text>
              </View>
            ))}
          </View>
          <TextInput
            ref={hiddenInput}
            value={code}
            onChangeText={handleCodeChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoCorrect={false}
            autoFocus
            showSoftInputOnFocus
            importantForAutofill="yes"
            style={styles.otpInput}
            {...(Platform.OS === "web" ? { inputMode: "numeric" as const } : null)}
          />
        </Pressable>

        {error ? <ArabicText style={styles.errorText}>{error}</ArabicText> : null}

        <Pressable
          onPress={handleResend}
          disabled={seconds > 0 || isResending}
          style={styles.resendButton}
        >
          {isResending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.resendText, { color: seconds > 0 ? "#8E949D" : colors.primary }]}>
              {seconds > 0 ? `إعادة الإرسال خلال ${seconds} ثانية` : "إعادة إرسال الرمز"}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            { opacity: pressed || code.length !== OTP_LENGTH || isVerifying ? 0.72 : 1 },
          ]}
          onPress={() => void handleVerify()}
          disabled={code.length !== OTP_LENGTH || isVerifying}
        >
          {isVerifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>تأكيد ومتابعة</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#050505", flex: 1, paddingHorizontal: 22 },
  content: { flex: 1 },
  topbar: {
    alignItems: "center",
    gap: 10,
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
  topbarTitleWrap: {
    direction: "ltr",
    flex: 1,
  },
  topbarTitle: {
    color: "#F5F5F5",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    textAlign: "right",
    writingDirection: "rtl",
  },
  hero: { alignItems: "stretch", gap: 8, marginTop: 54 },
  title: { color: "#F5F5F5", fontFamily: "Inter_700Bold", fontSize: 24, textAlign: "right", writingDirection: "rtl" },
  description: {
    color: "#8E949D",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 25,
    textAlign: "right",
    writingDirection: "rtl",
  },
  phoneLine: {
    color: "#8E949D",
    direction: "ltr",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "right",
    writingDirection: "ltr",
  },
  otpWrap: {
    marginTop: 30,
    gap: 14,
  },
  otpInput: {
    height: 1,
    opacity: 0,
    position: "absolute",
    width: 1,
    color: "#F5F5F5",
    direction: "ltr",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: 10,
    textAlign: "center",
  },
  otpRow: {
    direction: "ltr",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  otpBox: {
    alignItems: "center",
    backgroundColor: "#111214",
    borderRadius: 15,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    width: 46,
  },
  otpDigit: {
    color: "#F5F5F5",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    textAlign: "center",
  },
  errorText: { color: "#EF4444", fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 12, textAlign: "right", writingDirection: "rtl" },
  resendButton: { alignItems: "center", minHeight: 36, justifyContent: "center", marginTop: 18, paddingVertical: 8 },
  resendText: { fontFamily: "Inter_700Bold", fontSize: 14, textAlign: "center", writingDirection: "rtl" },
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
