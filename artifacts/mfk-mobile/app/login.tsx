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

function StatusBarMock() {
  return (
    <View style={styles.status}>
      <Text style={styles.statusText}>٩:٤١</Text>
      <Text style={styles.statusText}>◉ WiFi ▰</Text>
    </View>
  );
}

export default function LoginScreen() {
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
          <Text style={styles.topbarTitle}>تسجيل الدخول</Text>
          <View style={styles.iconGhost} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.logoText}>مفك</Text>
          <Text style={styles.subtitle}>رجوعك يعني أن سيارتك جاهزة للكلام.</Text>
        </View>

        <View style={styles.form}>
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
            onPress={handleLogin}
            disabled={isLoading || !email.trim() || !password}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>تسجيل الدخول</Text>}
          </Pressable>

          <Pressable onPress={() => router.replace("/register")} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>إنشاء حساب جديد</Text>
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
  topbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 48 },
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
  hero: { alignItems: "center", marginBottom: 54 },
  logoText: { color: "#FF6A00", fontFamily: "Inter_700Bold", fontSize: 42, marginBottom: 10 },
  subtitle: { color: "#8E949D", fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
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
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#111214",
    borderColor: "#24262B",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    height: 52,
    justifyContent: "center",
  },
  secondaryText: { color: "#F5F5F5", fontFamily: "Inter_700Bold", fontSize: 15 },
});
