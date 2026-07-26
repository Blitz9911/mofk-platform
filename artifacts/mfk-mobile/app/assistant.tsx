import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAiChat } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInLeft, FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const QUICK_QUESTIONS = [
  "ليش حرارة سيارتي عالية؟",
  "متى أغيّر الزيت؟",
  "كيف أحجز فحص دوري؟",
  "وش معنى علامة المكينة؟",
];

export default function AssistantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const { mutateAsync: sendChat, isPending } = useAiChat();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 0 : insets.bottom;

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isPending) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, ts: Date.now() };
    setMessages((prev) => [userMsg, ...prev]);
    setInput("");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await sendChat({ data: { message: msg } });
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

  const isEmpty = messages.length === 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>المساعد الذكي</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>اسأل MFK عن أي شيء يخص سيارتك</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + "18" }]}>
          <Ionicons name="sparkles" size={20} color={colors.primary} />
        </View>
      </View>

      {/* Messages / Welcome */}
      {isEmpty ? (
        <Animated.View entering={FadeInDown.springify()} style={styles.welcomeWrap}>
          {/* AI icon */}
          <View style={[styles.aiIcon, { backgroundColor: colors.primary + "18" }]}>
            <Ionicons name="sparkles" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.welcomeTitle, { color: colors.foreground }]}>كيف يمكنني مساعدتك اليوم؟</Text>
          <Text style={[styles.welcomeSub, { color: colors.mutedForeground }]}>
            يمكنني تحليل أعطال مركبتك، تذكيرك بمواعيد الصيانة، أو الإجابة على أي استفسارات حول السيارات.
          </Text>
          {/* Quick questions */}
          <View style={styles.quickWrap}>
            {QUICK_QUESTIONS.map((q, i) => (
              <Animated.View key={i} entering={FadeInDown.delay(i * 80).springify()}>
                <Pressable
                  style={({ pressed }) => [styles.quickChip, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
                  onPress={() => handleSend(q)}
                >
                  <Text style={[styles.quickChipText, { color: colors.foreground }]}>{q}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
          <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
            المساعد الذكي قد يخطئ في بعض الأحيان. يرجى مراجعة التوصيات مع فني متخصص.
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => {
            const isUser = item.role === "user";
            return (
              <Animated.View
                entering={isUser ? FadeInLeft.springify() : FadeInRight.springify()}
                style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble, {
                  backgroundColor: isUser ? colors.primary : colors.card,
                  borderColor: isUser ? colors.primary : colors.border,
                }]}
              >
                {!isUser && (
                  <View style={[styles.assistantAvatar, { backgroundColor: colors.primary + "18" }]}>
                    <Ionicons name="sparkles" size={12} color={colors.primary} />
                  </View>
                )}
                <Text style={[styles.bubbleText, { color: isUser ? "#fff" : colors.foreground }]}>
                  {item.content}
                </Text>
              </Animated.View>
            );
          }}
          ListFooterComponent={
            isPending ? (
              <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { borderTopColor: colors.border, paddingBottom: bottomPad + 12, backgroundColor: colors.background }]}>
        <Pressable
          style={({ pressed }) => [styles.sendBtn, { backgroundColor: input.trim() && !isPending ? colors.primary : colors.muted, opacity: pressed ? 0.8 : 1 }]}
          onPress={() => handleSend()}
          disabled={!input.trim() || isPending}
        >
          {isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={18} color="#fff" />
          }
        </Pressable>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          placeholder="اكتب رسالتك هنا..."
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          textAlign="right"
          onSubmitEditing={() => handleSend()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: "flex-end", gap: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  headerIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  welcomeWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  aiIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  welcomeTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  welcomeSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  quickWrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 },
  quickChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickChipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  disclaimer: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  bubble: {
    maxWidth: "80%",
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  userBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 6 },
  assistantBubble: { alignSelf: "flex-end", borderBottomRightRadius: 6, flexDirection: "row-reverse", gap: 8 },
  assistantAvatar: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 2 },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, flexShrink: 1 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
