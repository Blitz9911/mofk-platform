import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

import { authApi, useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function StatusBarMock() {
  return (
    <View style={styles.status}>
      <Text style={styles.statusText}>٩:٤١</Text>
      <Text style={styles.statusText}>◉ WiFi ▰</Text>
    </View>
  );
}

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
      setError(err.message || "حدث خطأ. حاول مجددًا.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={["#090A0B", "#070707"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 22 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StatusBarMock />

        <View style={styles.topbar}>
          <Pressable style={styles.iconButton} onPress={() => router.replace("/welcome")}>
            <Ionicons name="chevron-forward" size={18} color="#F5F5F5" />
          </Pressable>
          <Text style={styles.topbarTitle}>إنشاء حساب</Text>
          <View style={styles.iconGhost} />
        </View>

        <Text style={styles.stepLabel}>خطوة 1 من 3 — بياناتك الأساسية</Text>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>

        <View style={styles.form}>
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>الاسم الكامل</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="فيصل العتيبي"
                placeholderTextColor="#8E949D"
                value={name}
                onChangeText={setName}
                textAlign="right"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>رقم الجوال</Text>
            <View style={styles.phoneRow}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefixText}>+٩٦٦</Text>
              </View>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder="53 442 1190"
                placeholderTextColor="#8E949D"
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/\D/g, "").slice(0, 9))}
                keyboardType="phone-pad"
                textAlign="left"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>البريد الإلكتروني</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor="#8E949D"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textAlign="left"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>كلمة المرور</Text>
            <View style={styles.inputRow}>
              <Pressable onPress={() => setShowPassword((value) => !value)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#8E949D" />
              </Pressable>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#8E949D"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textAlign="left"
              />
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.primaryButton, { opacity: pressed || isLoading ? 0.82 : 1 }]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>متابعة</Text>}
          </Pressable>

          <Text style={styles.terms}>
            بالمتابعة أنت توافق على <Text style={styles.orangeText}>الشروط والأحكام</Text> وسياسة <Text style={styles.orangeText}>الخصوصية</Text>.
          </Text>

          <Pressable onPress={() => router.replace("/login")} style={styles.loginLink}>
            <Text style={styles.loginText}>لدي حساب بالفعل</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#050505", flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 22 },
  status: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  statusText: { color: "#F5F5F5", fontFamily: "Inter_700Bold", fontSize: 12 },
  topbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
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
  iconGhost: { height: 36, width: 36 },
  topbarTitle: { color: "#F5F5F5", fontFamily: "Inter_700Bold", fontSize: 18 },
  stepLabel: { color: "#8E949D", fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 12, textAlign: "right" },
  progressTrack: { backgroundColor: "#25272B", borderRadius: 999, height: 4, marginBottom: 30, overflow: "hidden" },
  progressFill: { backgroundColor: "#FF6A00", height: 4, width: "33%" },
  form: { gap: 18 },
  fieldWrap: { gap: 8 },
  label: { color: "#F5F5F5", fontFamily: "Inter_600SemiBold", fontSize: 13, textAlign: "right" },
  inputRow: {
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderColor: "#24262B",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row-reverse",
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
  },
  input: { color: "#F5F5F5", flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, height: "100%" },
  phoneRow: { flexDirection: "row-reverse", gap: 8 },
  prefixBox: {
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderColor: "#24262B",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    justifyContent: "center",
    width: 58,
  },
  prefixText: { color: "#8E949D", fontFamily: "Inter_700Bold", fontSize: 13 },
  phoneInput: {
    backgroundColor: "#1A1A1A",
    borderColor: "#24262B",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
  errorBox: { backgroundColor: "#EF444415", borderColor: "#EF444430", borderRadius: 12, borderWidth: 1, padding: 12 },
  errorText: { color: "#EF4444", fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "right" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#FF6A00",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    marginTop: 8,
  },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  terms: { color: "#8E949D", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 20, textAlign: "center" },
  orangeText: { color: "#FF6A00", fontFamily: "Inter_700Bold" },
  loginLink: { alignItems: "center", paddingTop: 2 },
  loginText: { color: "#FF6A00", fontFamily: "Inter_700Bold", fontSize: 13 },
});
