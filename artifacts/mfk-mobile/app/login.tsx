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

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) return;
    setIsLoading(true);
    try {
      const user = await authApi.login(
  email.trim(),
  password,
);

await login(user);
    } catch (err: any) {
      setError(err.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
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
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image source={require("@/assets/images/logo.png")} style={styles.logo} contentFit="contain" />
        </View>

        {/* Title */}
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: colors.foreground }]}>تسجيل الدخول</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>أدخل بريدك الإلكتروني وكلمة المرور</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.foreground }]}>البريد الإلكتروني</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="example@email.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textAlign="left"
              />
              <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.foreground }]}>كلمة المرور</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable onPress={() => setShowPassword(v => !v)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.mutedForeground} />
              </Pressable>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textAlign="left"
              />
              <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: "#ef444415", borderColor: "#ef444430" }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [styles.btn, { backgroundColor: colors.primary, opacity: pressed || isLoading ? 0.8 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading || !email.trim() || !password}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>تسجيل الدخول</Text>
            }
          </Pressable>

          {/* Register link */}
          <Pressable onPress={() => router.replace("/register")} style={styles.linkWrap}>
            <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
              ليس لديك حساب؟{" "}
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>إنشاء حساب جديد</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  logoWrap: { alignItems: "center", marginBottom: 40 },
  logo: { height: 44, width: 130 },
  titleWrap: { alignItems: "flex-end", marginBottom: 32 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular" },
  form: { gap: 18 },
  fieldWrap: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "right" },
  inputRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", height: "100%" },
  errorBox: { padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { color: "#ef4444", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "right" },
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  linkWrap: { alignItems: "center", paddingTop: 4 },
  linkText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
