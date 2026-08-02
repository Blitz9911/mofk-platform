import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trimStart().slice(0, 60);
}

export default function CompleteProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState("");
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cleanName = useMemo(() => name.trim(), [name]);
  const canSubmit = cleanName.length >= 2 && !saving;

  const saveName = async () => {
    setError("");

    if (!user?.phone) {
      setError("يلزم تسجيل الدخول قبل إكمال الملف الشخصي.");
      return;
    }

    if (!canSubmit) {
      setError("اكتب اسمك الأول أو اسمك الكامل للمتابعة.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: cleanName,
        phone: user.phone,
      });
      router.replace("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الاسم. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  const skip = () => router.replace("/onboarding");

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.content, { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 26 }]}>
        <View style={styles.logoSection}>
          <Image source={require("@/assets/images/mfk-logo.png")} style={styles.logo} contentFit="contain" />
          <View style={[styles.iconBubble, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="person-outline" size={28} color={colors.primary} />
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>وش نسمّيك؟</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            بنستخدم اسمك في لوحة التحكم، الطلبات، وتنبيهات مفك داخل التطبيق.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>الاسم</Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.card,
                  borderColor: focused ? colors.primary : colors.border,
                },
                focused && styles.inputFocused,
              ]}
            >
              <TextInput
                value={name}
                onChangeText={(value) => {
                  setName(normalizeName(value));
                  setError("");
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="مثال: عبدالله"
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => void saveName()}
                style={[styles.input, { color: colors.foreground }]}
              />
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => void saveName()}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: canSubmit ? colors.primary : colors.card,
                borderColor: canSubmit ? "transparent" : colors.border,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={[styles.primaryText, { color: canSubmit ? "#fff" : colors.mutedForeground }]}>
                  حفظ ومتابعة
                </Text>
                {canSubmit ? <Ionicons name="arrow-back" size={18} color="#fff" /> : null}
              </>
            )}
          </Pressable>

          <Pressable onPress={skip} disabled={saving} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>تخطي الآن</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  logoSection: {
    alignItems: "center",
    gap: 20,
    marginBottom: 34,
  },
  logo: {
    height: 58,
    width: 172,
  },
  iconBubble: {
    alignItems: "center",
    borderRadius: 24,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  titleBlock: {
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 28,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    textAlign: "right",
    writingDirection: "rtl",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 24,
    textAlign: "right",
    writingDirection: "rtl",
  },
  form: {
    gap: 14,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textAlign: "right",
  },
  inputWrap: {
    borderRadius: 16,
    borderWidth: 1.5,
    minHeight: 58,
    paddingHorizontal: 14,
  },
  inputFocused: {
    elevation: 3,
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  input: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    height: 58,
    writingDirection: "rtl",
  },
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
  errorText: {
    color: "#ef4444",
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "right",
    writingDirection: "rtl",
  },
  actions: {
    gap: 12,
    marginTop: 22,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 8,
    height: 56,
    justifyContent: "center",
  },
  primaryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    textAlign: "center",
  },
  skipButton: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  skipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textAlign: "center",
  },
});
