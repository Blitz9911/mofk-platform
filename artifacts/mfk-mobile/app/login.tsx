import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLogo } from "@/components/BrandLogo";
import { PhoneNumberInput, isValidSaudiMobileDigits } from "@/components/PhoneNumberInput";
import { ArabicText } from "@/components/ArabicText";
import { authApi } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { smoothBack } from "@/lib/navigation";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [phoneDigits, setPhoneDigits] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = isValidSaudiMobileDigits(phoneDigits) && !isLoading;

  const handleSendOtp = async () => {
    setError("");

    if (!canSubmit) {
      setError("أدخل رقم جوال صحيح لإرسال رمز التحقق.");
      return;
    }

    setIsLoading(true);
    try {
      const normalizedPhone = await authApi.startPhoneLogin(phoneDigits);
      router.push({
        pathname: "/verify",
        params: {
          phone: normalizedPhone,
          mode: "login",
        },
      });
    } catch (err: any) {
      setError(err.message || "تعذر إرسال رمز التحقق. تأكد من الرقم وحاول مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => smoothBack(router, "/welcome")}
          hitSlop={10}
          style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Ionicons name="arrow-forward" size={18} color={colors.foreground} />
        </Pressable>

        <View style={styles.logoSection}>
          <BrandLogo style={styles.logo} />
          <ArabicText style={[styles.tagline, { color: colors.mutedForeground }]}>
            سيارتك أذكى من أي وقت مضى
          </ArabicText>
        </View>

        <View style={styles.titleBlock}>
          <ArabicText style={[styles.title, { color: colors.foreground }]}>تسجيل الدخول</ArabicText>
          <ArabicText style={[styles.subtitle, { color: colors.mutedForeground }]}>
            أدخل رقم جوالك ونرسل لك رمز تحقق لمرة واحدة.
          </ArabicText>
        </View>

        <View style={styles.form}>
          <PhoneNumberInput
            value={phoneDigits}
            onChangeDigits={(digits) => {
              setPhoneDigits(digits);
              if (error) setError("");
            }}
            disabled={isLoading}
            error={Boolean(error && !canSubmit)}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: canSubmit ? colors.primary : colors.card,
                borderColor: canSubmit ? "transparent" : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleSendOtp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={[styles.submitText, { color: canSubmit ? "#fff" : colors.mutedForeground }]}>
                  {"\u200F"}إرسال رمز التحقق
                </Text>
                {canSubmit ? <Ionicons name="arrow-back" size={18} color="#fff" /> : null}
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.push("/register")}
            style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>
              {"\u200F"}إنشاء حساب جديد
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 22 },
  backBtn: {
    alignItems: "center",
    alignSelf: "flex-end",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    marginBottom: 30,
    width: 36,
  },
  logoSection: { alignItems: "center", gap: 8, marginBottom: 34 },
  logo: { height: 58, width: 172 },
  tagline: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", writingDirection: "rtl" },
  titleBlock: { alignItems: "stretch", gap: 7, marginBottom: 30 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, textAlign: "right", writingDirection: "rtl", width: "100%" },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 24, textAlign: "right", writingDirection: "rtl", width: "100%" },
  form: { gap: 16 },
  errorBox: {
    alignItems: "center",
    backgroundColor: "#ef444412",
    borderColor: "#ef444430",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  errorText: { color: "#ef4444", flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "right", writingDirection: "rtl" },
  submitBtn: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 8,
    height: 54,
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center", writingDirection: "rtl" },
  secondaryBtn: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    height: 52,
    justifyContent: "center",
  },
  secondaryText: { fontFamily: "Inter_600SemiBold", fontSize: 15, textAlign: "center", writingDirection: "rtl" },
});
