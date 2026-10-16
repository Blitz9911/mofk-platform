import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ArabicText } from "@/components/ArabicText";
import { useColors } from "@/hooks/useColors";
import { ALWAYS_PROBE_LIVE_PIDS } from "@/src/obd/polling/live-poll-plan";
import { SIGNAL_BY_ID, SIGNAL_CATEGORIES, SIGNALS_BY_COMMAND, type SignalReading } from "@/src/obd/signals/signal-registry";
import { useObdConnection } from "@/src/obd";

type ViewMode = "value" | "gauge" | "graph" | "combined";

function formatSignal(reading: SignalReading, definitionUnit?: string) {
  if (reading.status === "unsupported") return "غير مدعوم";
  if (reading.status === "loading") return "جارٍ التحميل";
  if (reading.status === "temporarilyUnavailable") return "غير متاح حالياً";
  if (reading.status === "error") return "خطأ في القراءة";
  if (reading.status === "stale") return reading.value != null ? String(reading.value) : "قديمة";
  if (reading.value == null) return "جارٍ القراءة";
  if (typeof reading.value === "number") {
    const abs = Math.abs(reading.value);
    const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
    return `${reading.value.toLocaleString("en-US", { maximumFractionDigits: digits, signDisplay: reading.value < 0 || definitionUnit === "%" ? "exceptZero" : "auto" })}`;
  }
  return String(reading.value);
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return <View style={{ height: 48 }} />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * 160;
      const y = 44 - ((value - min) / span) * 40;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <Svg width="100%" height={48} viewBox="0 0 160 48">
      <Polyline points={coords} fill="none" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export default function ObdLiveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const obd = useObdConnection();
  const ready = obd.state === "vehicle_connected";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [mode, setMode] = useState<ViewMode>("value");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      obd.startLivePolling();
      return () => obd.stopLivePolling();
    }, [obd.startLivePolling, obd.stopLivePolling]),
  );

  const supported = new Set((obd.initResult?.supportedPids ?? []).map((pid) => pid.toUpperCase()));
  const sourceSignals = obd.frozen ? Object.values(obd.liveSignals) : Object.values(obd.liveSignals);

  const rows = useMemo(() => {
    const byId = new Map(sourceSignals.map((item) => [item.definitionId ?? item.id, item]));
    const definitions = [...SIGNALS_BY_COMMAND.entries()].flatMap(([command, items]) => {
      if (supported.size && !supported.has(command) && !ALWAYS_PROBE_LIVE_PIDS.includes(command as (typeof ALWAYS_PROBE_LIVE_PIDS)[number]) && !obd.liveReadings[command]) return [];
      return items;
    });
    const visibleDefs = definitions.filter((definition) => {
      if (category !== "all" && definition.category !== category) return false;
      if (showSelectedOnly && selected.size && !selected.has(definition.id)) return false;
      const haystack = `${definition.nameAr} ${definition.nameEn} ${definition.command}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
    return visibleDefs
      .map((definition) => {
        const reading = byId.get(definition.id) ?? {
          id: definition.id,
          definitionId: definition.id,
          command: definition.command,
          value: null,
          status: supported.has(definition.command) ? "loading" : "unsupported",
          timestamp: null,
        } as SignalReading;
        const stale = reading.timestamp != null && Date.now() - reading.timestamp > Math.max(8_000, definition.intervalMs * 4);
        return { definition, reading: stale && reading.status === "available" ? { ...reading, status: "stale" as const } : reading };
      })
      .sort((left, right) => {
        const pin = Number(pinned.has(right.definition.id)) - Number(pinned.has(left.definition.id));
        if (pin) return pin;
        return left.definition.nameAr.localeCompare(right.definition.nameAr, "ar");
      });
  }, [sourceSignals, supported, category, query, showSelectedOnly, selected, pinned, obd.liveReadings, obd.frozen]);

  React.useEffect(() => {
    obd.setVisibleCommands(showSelectedOnly && selected.size ? [...selected].map((id) => SIGNAL_BY_ID.get(id)?.command ?? "") : []);
  }, [showSelectedOnly, selected, obd.setVisibleCommands]);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const graphTargets = rows.filter((row) => selected.has(row.definition.id) || row.definition.sourceId === "RPM").slice(0, 5);
  const playbackFrame =
    obd.playbackIndex != null ? obd.recordedFrames[obd.playbackIndex] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="chevron-forward" size={19} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={[styles.title, { color: colors.foreground }]}>البيانات الحية</Text>
          <ArabicText style={[styles.sub, { color: colors.mutedForeground }]}>
            {ready ? `${rows.filter((row) => row.reading.status === "available").length} إشارة متاحة` : "اتصل بالقطعة أولاً"}
          </ArabicText>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 12 }} keyboardShouldPersistTaps="handled">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="بحث عن قراءة"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[{ id: "all", label: "الكل" }, ...Object.entries(SIGNAL_CATEGORIES).map(([id, label]) => ({ id, label }))].map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setCategory(item.id)}
              style={[styles.chip, { backgroundColor: category === item.id ? colors.primary : colors.card, borderColor: colors.border }]}
            >
              <Text style={{ color: category === item.id ? "#fff" : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
          {(["value", "gauge", "graph", "combined"] as ViewMode[]).map((item) => (
            <Pressable key={item} onPress={() => setMode(item)} style={[styles.chip, { backgroundColor: mode === item ? colors.primary : colors.card, borderColor: colors.border }]}>
              <Text style={{ color: mode === item ? "#fff" : colors.foreground, fontSize: 12 }}>
                {item === "value" ? "قيم" : item === "gauge" ? "عداد" : item === "graph" ? "رسم" : "مقارنة"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
          <Pressable onPress={() => obd.setFrozen(!obd.frozen)} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.foreground }}>{obd.frozen ? "استئناف" : "تجميد"}</Text>
          </Pressable>
          <Pressable onPress={() => (obd.recording ? obd.stopRecording() : obd.startRecording())} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.foreground }}>{obd.recording ? "إيقاف التسجيل" : "بدء التسجيل"}</Text>
          </Pressable>
          <Pressable onPress={() => setShowSelectedOnly((value) => !value)} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.foreground }}>{showSelectedOnly ? "عرض الكل" : "عرض المحدد"}</Text>
          </Pressable>
          <Pressable onPress={() => setSelected(new Set(rows.map((row) => row.definition.id)))} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.foreground }}>تحديد الكل</Text>
          </Pressable>
          <Pressable onPress={() => setSelected(new Set())} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.foreground }}>مسح التحديد</Text>
          </Pressable>
        </View>

        {obd.recordedFrames.length ? (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable onPress={() => obd.setPlaybackIndex(Math.min(obd.recordedFrames.length - 1, (obd.playbackIndex ?? -1) + 1))}>
              <Text style={{ color: colors.primary }}>الإطار التالي</Text>
            </Pressable>
            <Text style={{ color: colors.mutedForeground }}>{obd.playbackIndex == null ? "مباشر" : `${(obd.playbackIndex ?? 0) + 1}/${obd.recordedFrames.length}`}</Text>
            <Pressable onPress={() => obd.setPlaybackIndex(obd.playbackIndex == null ? obd.recordedFrames.length - 1 : Math.max(0, obd.playbackIndex - 1))}>
              <Text style={{ color: colors.primary }}>الإطار السابق</Text>
            </Pressable>
          </View>
        ) : null}

        {ready && obd.occupancy === "live" ? <ActivityIndicator color={colors.primary} /> : null}

        {mode === "graph" || mode === "combined" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 10 }]}>
            {(mode === "combined" ? graphTargets : rows.slice(0, 1)).map((row) => {
              const points = obd.recordedFrames
                .map((frame) => frame.values[row.definition.id])
                .filter((value): value is number => typeof value === "number")
                .slice(-60);
              return (
                <View key={row.definition.id}>
                  <ArabicText style={{ color: colors.mutedForeground, textAlign: "right" }}>{row.definition.nameAr}</ArabicText>
                  <Sparkline points={points} color={colors.primary} />
                </View>
              );
            })}
          </View>
        ) : null}

        {rows.map((row) => {
          const playbackValue = playbackFrame?.values[row.definition.id];
          const display = playbackValue != null ? String(playbackValue) : formatSignal(row.reading, row.definition.unit);
          const selectedOn = selected.has(row.definition.id);
          return (
            <Pressable
              key={row.definition.id}
              onPress={() => toggle(row.definition.id)}
              onLongPress={() => setPinned((current) => {
                const next = new Set(current);
                if (next.has(row.definition.id)) next.delete(row.definition.id);
                else next.add(row.definition.id);
                return next;
              })}
              style={[styles.card, { backgroundColor: colors.card, borderColor: selectedOn ? colors.primary : colors.border }]}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <Text style={[styles.value, { color: row.reading.status === "available" ? colors.foreground : colors.mutedForeground }]}>
                  {display} {row.reading.status === "available" || row.reading.status === "stale" ? row.definition.unit : ""}
                </Text>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <ArabicText style={[styles.label, { color: colors.foreground }]}>{row.definition.nameAr}</ArabicText>
                  <Text style={[styles.en, { color: colors.mutedForeground }]}>{row.definition.nameEn}</Text>
                </View>
              </View>
              {mode === "gauge" ? (
                <View style={[styles.gaugeTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.gaugeFill, { width: `${Math.min(100, Math.max(8, typeof row.reading.value === "number" ? Math.abs(row.reading.value) % 100 : 8))}%`, backgroundColor: colors.primary }]} />
                </View>
              ) : null}
              <Pressable onPress={() => setDetailsId(detailsId === row.definition.id ? null : row.definition.id)}>
                <Text style={{ color: colors.primary, textAlign: "right", fontSize: 12 }}>تفاصيل فنية</Text>
              </Pressable>
              {detailsId === row.definition.id ? (
                <Text style={[styles.en, { color: colors.mutedForeground, textAlign: "right" }]}>
                  PID {row.definition.command} · {row.definition.sourceId} · {row.reading.sourceEcu ?? "ECU"}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "right" },
  sub: { fontSize: 12, marginTop: 2, textAlign: "right" },
  search: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, textAlign: "right" },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6 },
  label: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  en: { fontSize: 11, textAlign: "right" },
  value: { fontSize: 20, fontFamily: "Inter_700Bold", writingDirection: "ltr" },
  gaugeTrack: { height: 8, borderRadius: 8, overflow: "hidden" },
  gaugeFill: { height: 8, borderRadius: 8 },
});
