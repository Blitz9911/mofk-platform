import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { smoothBack } from "@/lib/navigation";

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad";
}) {
  const colors = useColors();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        textAlign="right"
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
      />
    </View>
  );
}

export default function ProfileEditScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const save = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("تنبيه", "الاسم ورقم الجوال مطلوبة.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ name, phone, city });
      Alert.alert("تم الحفظ", "تم تحديث بياناتك بنجاح.");
      smoothBack(router);
    } catch (error) {
      Alert.alert("تعذر الحفظ", error instanceof Error ? error.message : "حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => smoothBack(router)} style={styles.backButton}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]}>الملف الشخصي</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>تعديل بيانات الحساب الأساسية</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Field label="الاسم الكامل" value={name} onChangeText={setName} />
        <Field label="رقم الجوال" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="المدينة" value={city} onChangeText={setCity} placeholder="الرياض" />
        <Pressable
          onPress={save}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.72 : 1 }]}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>حفظ التغييرات</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, alignItems: "center", gap: 2 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  field: { gap: 7 },
  label: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  saveButton: { minHeight: 52, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
