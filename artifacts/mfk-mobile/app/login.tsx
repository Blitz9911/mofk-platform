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

import { useAuth, authApi } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) return;
    setIsLoading(true);
    try {
      const user = await authApi.login(email.trim(), password);
      await login(user);
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable onPress={() => router.back()} hitSlop={10} style={[s.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="arrow-forward" size={18} color={colors.foreground} />
        </Pressable>

        {/* Logo section */}
        <View style={s.logoSection}>
          <Image
            source={require("@/assets/images/mfk-logo.png")}
            style={s.logo}
            contentFit="contain"
          />
          <View style={[s.dividerRow, { backgroundColor: colors.border }]} />
          <Text style={[s.tagline, { color: colors.mutedForeground }]}>
            المنصة الأولى لتشخيص السيارات بالعربية
          </Text>
        </View>

        {/* Title */}
        <View style={s.titleBlock}>
          <Text style={[s.title, { color: colors.foreground }]}>مرحباً بعودتك</Text>
          <Text style={[s.subtitle, { color: colors.mutedForeground }]}>سجّل دخولك للمتابعة</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          {/* Email */}
          <View style={s.fieldGroup}>
            <Text style={[s.label, { color: colors.foreground }]}>البريد الإلكتروني</Text>
            <View style={[
              s.inputRow,
              { backgroundColor: colors.card, borderColor: focusedField === "email" ? "#FF6A00" : colors.border },
              focusedField === "email" && s.inputFocused,
            ]}>
              <Ionicons name="mail-outline" size={18} color={focusedField === "email" ? "#FF6A00" : colors.mutedForeground} />
              <TextInput
                style={[s.input, { color: colors.foreground }]}
                placeholder="example@email.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textAlign="left"
              />
            </View>
          </View>

          {/* Password */}
          <View style={s.fieldGroup}>
            <View style={s.labelRow}>
              <Pressable hitSlop={8}>
                <Text style={[s.forgotLink, { color: "#FF6A00" }]}>نسيت كلمة المرور؟</Text>
              </Pressable>
              <Text style={[s.label, { color: colors.foreground }]}>كلمة المرور</Text>
            </View>
            <View style={[
              s.inputRow,
              { backgroundColor: colors.card, borderColor: focusedField === "pass" ? "#FF6A00" : colors.border },
              focusedField === "pass" && s.inputFocused,
            ]}>
              <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={focusedField === "pass" ? "#FF6A00" : colors.mutedForeground}
                />
              </Pressable>
              <TextInput
                style={[s.input, { color: colors.foreground }]}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField("pass")}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
                textAlign="left"
              />
              <Ionicons name="lock-closed-outline" size={18} color={focusedField === "pass" ? "#FF6A00" : colors.mutedForeground} />
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View style={[s.errorBox, { backgroundColor: "#ef444412", borderColor: "#ef444430" }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [
              s.submitBtn,
              {
                backgroundColor: canSubmit ? "#FF6A00" : colors.card,
                borderColor: canSubmit ? "transparent" : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleLogin}
            disabled={!canSubmit}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Text style={[s.submitTxt, { color: canSubmit ? "#fff" : colors.mutedForeground }]}>
                    تسجيل الدخول
                  </Text>
                  {canSubmit && <Ionicons name="arrow-back" size={18} color="#fff" />}
                </>
              )
            }
          </Pressable>

          {/* Divider */}
          <View style={s.orRow}>
            <View style={[s.orLine, { backgroundColor: colors.border }]} />
            <Text style={[s.orTxt, { color: colors.mutedForeground }]}>أو</Text>
            <View style={[s.orLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Register link */}
          <Pressable
            onPress={() => router.replace("/register")}
            style={[s.registerBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Text style={[s.registerTxt, { color: colors.foreground }]}>
              إنشاء حساب جديد
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 22 },

  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth, marginBottom: 24, alignSelf: "flex-end",
  },

  logoSection: { alignItems: "center", marginBottom: 32, gap: 10 },
  logo: { height: 58, width: 172 },
  dividerRow: { height: StyleSheet.hairlineWidth, width: 80 },
  tagline: { fontSize: 12, fontFamily: "Inter_400Regular" },

  titleBlock: { alignItems: "flex-end", marginBottom: 28, gap: 4 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },

  form: { gap: 16 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  forgotLink: { fontSize: 12, fontFamily: "Inter_500Medium" },

  inputRow: {
    flexDirection: "row-reverse", alignItems: "center", gap: 10,
    paddingHorizontal: 14, height: 54, borderRadius: 14,
    borderWidth: 1.5,
  },
  inputFocused: {
    shadowColor: "#FF6A00", shadowOpacity: 0.15, shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 }, elevation: 3,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },

  errorBox: {
    flexDirection: "row-reverse", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  errorTxt: { color: "#ef4444", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", flex: 1 },

  submitBtn: {
    height: 54, borderRadius: 16, borderWidth: 1.5,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: "#FF6A00", shadowOpacity: 0.25, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
    marginTop: 4,
  },
  submitTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },

  orRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orTxt: { fontSize: 13, fontFamily: "Inter_400Regular" },

  registerBtn: {
    height: 52, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center", justifyContent: "center",
  },
  registerTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
