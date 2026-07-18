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

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    if (!name.trim()) { setError("الاسم الكامل مطلوب"); return; }
    if (phone.length < 9) { setError("رقم الجوال غير مكتمل"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("البريد الإلكتروني غير صحيح"); return; }
    if (password.length < 8) { setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }

    setIsLoading(true);
    try {
      const user = await authApi.register(
  name.trim(),
  phone,
  email.trim(),
  password,
);

await login(user);
router.replace("/verify");
    } catch (err: any) {
      setError(err.message || "حدث خطأ. حاول مجدداً.");
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
          <Text style={[styles.title, { color: colors.foreground }]}>إنشاء حساب جديد</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>أدخل بياناتك لإنشاء حسابك في مفك</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.foreground }]}>الاسم الكامل</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="محمد العمري"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                textAlign="right"
                autoCorrect={false}
              />
              <Ionicons name="person-outline" size={18} color={colors.mutedForeground} />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.foreground }]}>رقم الجوال</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="5X XXX XXXX"
                placeholderTextColor={colors.mutedForeground}
                value={phone}
                onChangeText={t => setPhone(t.replace(/\D/g, "").slice(0, 9))}
                keyboardType="phone-pad"
                textAlign="left"
              />
              <View style={[styles.phonePrefixWrap, { borderColor: colors.border }]}>
                <Text style={[styles.phonePrefix, { color: colors.mutedForeground }]}>966+</Text>
              </View>
            </View>
          </View>

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
                placeholder="8 أحرف على الأقل"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textAlign="left"
              />
              <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />
            </View>
            {password.length > 0 && password.length < 8 && (
              <Text style={styles.passHint}>{password.length}/8 أحرف</Text>
            )}
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
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>إنشاء الحساب</Text>
            }
          </Pressable>

          {/* Login link */}
          <Pressable onPress={() => router.replace("/login")} style={styles.linkWrap}>
            <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
              لديك حساب بالفعل؟{" "}
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>تسجيل الدخول</Text>
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
  logoWrap: { alignItems: "center", marginBottom: 32 },
  logo: { height: 44, width: 130 },
  titleWrap: { alignItems: "flex-end", marginBottom: 28 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  form: { gap: 16 },
  fieldWrap: { gap: 7 },
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
  phonePrefixWrap: { borderRightWidth: StyleSheet.hairlineWidth, paddingRight: 10 },
  phonePrefix: { fontSize: 14, fontFamily: "Inter_500Medium" },
  passHint: { color: "#f59e0b", fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
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
