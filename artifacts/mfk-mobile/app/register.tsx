import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authApi } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { smoothBack } from "@/lib/navigation";

function cleanPhone(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/\D/g, "")
    .slice(0, 12);
}

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const canSubmit = phone.replace(/\D/g, "").length >= 9 && !isLoading;

  const handleSendOtp = async () => {
    setError("");

    if (!canSubmit) {
      setError("أدخل رقم جوال صحيح لإنشاء الحساب.");
      return;
    }

    setIsLoading(true);
    try {
      const normalizedPhone = await authApi.startPhoneRegistration(phone);
      router.push({
        pathname: "/verify",
        params: {
          phone: normalizedPhone,
          mode: "register",
        },
      });
    } catch (err: any) {
      setError(err.message || "تعذر إرسال رمز التحقق. حاول مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
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
          <Image source={require("@/assets/images/mfk-logo.png")} style={styles.logo} contentFit="contain" />
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            ابدأ مع مفك برقم جوالك فقط
          </Text>
        </View>

        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>إنشاء حساب</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            لا تحتاج بريد أو كلمة مرور. رقم الجوال يكفي لإنشاء حسابك وتسجيل دخولك بأمان.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>رقم الجوال</Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.card,
                  borderColor: focused ? colors.primary : colors.border,
                },
                focused && styles.inputFocused,
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="5X XXX XXXX"
                placeholderTextColor={colors.mutedForeground}
                value={phone}
                onChangeText={(value) => setPhone(cleanPhone(value))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                textAlign="left"
              />
              <View style={[styles.prefixWrap, { borderColor: colors.border }]}>
                <Text style={[styles.prefixText, { color: colors.mutedForeground }]}>+966</Text>
              </View>
            </View>
          </View>

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
            disabled={!canSubmit}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={[styles.submitText, { color: canSubmit ? "#fff" : colors.mutedForeground }]}>
                  إرسال رمز التحقق
                </Text>
                {canSubmit ? <Ionicons name="arrow-back" size={18} color="#fff" /> : null}
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.replace("/login")}
            style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>
              لدي حساب بالفعل
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  tagline: { fontFamily: "Inter_400Regular", fontSize: 13 },
  titleBlock: { alignItems: "flex-end", gap: 7, marginBottom: 30 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 24, textAlign: "right" },
  form: { gap: 16 },
  fieldGroup: { gap: 8 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 13, textAlign: "right" },
  inputRow: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 12,
    height: 56,
    paddingHorizontal: 14,
  },
  inputFocused: {
    elevation: 3,
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  input: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 17, height: "100%" },
  prefixWrap: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 12 },
  prefixText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  errorBox: {
    alignItems: "center",
    backgroundColor: "#ef444412",
    borderColor: "#ef444430",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row-reverse",
    gap: 8,
    padding: 12,
  },
  errorText: { color: "#ef4444", flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "right" },
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
  submitText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  secondaryBtn: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    height: 52,
    justifyContent: "center",
  },
  secondaryText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
