import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAiChat } from "@workspace/api-client-react";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const SUGGESTIONS = [
  "ما معنى الكود P0300؟",
  "متى أغير زيت محركي؟",
  "ما أسباب ضوء المحرك؟",
  "كيف أحسّن كفاءة الوقود؟",
];

export default function AssistantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "assistant", content: "مرحباً! أنا مساعد MFK الذكي. يمكنني مساعدتك في فهم أعطال سيارتك وخطط الصيانة والتشخيص.", ts: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const { mutateAsync: sendChat, isPending } = useAiChat();
  const flatListRef = useRef<FlatList>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isPending) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, ts: Date.now() };
    setMessages((prev) => [userMsg, ...prev]);
    setInput("");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await sendChat({
        data: { message: msg }
      });
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.reply ?? "عذراً، لم أتمكن من الرد الآن.",
        ts: Date.now(),
      };
      setMessages((prev) => [assistantMsg, ...prev]);
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "عذراً، حدث خطأ. يرجى المحاولة مجدداً.",
        ts: Date.now(),
      };
      setMessages((prev) => [errMsg, ...prev]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>المساعد الذكي</Text>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-forward" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 8 }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            messages.length === 1 ? (
              <View style={styles.suggestions}>
                <Text style={[styles.suggestTitle, { color: colors.mutedForeground }]}>اقتراحات للبداية</Text>
                {SUGGESTIONS.map((s) => (
                  <Pressable key={s} style={[styles.suggestionChip, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleSend(s)}>
                    <Text style={[styles.suggestionText, { color: colors.foreground }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={[
              styles.bubble,
              item.role === "user"
                ? [styles.userBubble, { backgroundColor: colors.primary }]
                : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }],
            ]}>
              {item.role === "assistant" && (
                <View style={[styles.aiIcon, { backgroundColor: colors.primary + "22" }]}>
                  <Ionicons name="car" size={14} color={colors.primary} />
                </View>
              )}
              <Text style={[styles.bubbleText, { color: item.role === "user" ? "#fff" : colors.foreground }]}>{item.content}</Text>
            </View>
          )}
          ListHeaderComponent={isPending ? (
            <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.typingText, { color: colors.mutedForeground }]}>يكتب...</Text>
            </View>
          ) : null}
        />

        <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 8 }]}>
          <Pressable
            style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.muted }]}
            onPress={() => handleSend()}
            disabled={!input.trim() || isPending}
          >
            <Ionicons name="arrow-up" size={20} color={input.trim() ? "#fff" : colors.mutedForeground} />
          </Pressable>
          <TextInput
            style={[styles.inputField, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="اسأل عن سيارتك..."
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            multiline
            textAlign="right"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  suggestions: { gap: 8, paddingTop: 8 },
  suggestTitle: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "right" },
  suggestionChip: { padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  suggestionText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "right" },
  bubble: { maxWidth: "85%", padding: 12, borderRadius: 16, flexDirection: "row-reverse", gap: 8, alignItems: "flex-start" },
  userBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  aiBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  aiIcon: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 2 },
  bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", flex: 1, textAlign: "right", lineHeight: 22 },
  typingBubble: { flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 12, borderRadius: 16, alignSelf: "flex-end", borderWidth: StyleSheet.hairlineWidth, marginBottom: 10 },
  typingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  inputBar: { flexDirection: "row-reverse", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
  inputField: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
