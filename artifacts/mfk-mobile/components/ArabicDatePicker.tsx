import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { ArabicText } from "@/components/ArabicText";
import { useColors } from "@/hooks/useColors";
import { rowDir } from "@/lib/layout";

const WEEKDAYS = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];
const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function toIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function startOffset(year: number, month: number) {
  const jsDay = new Date(year, month, 1).getDay();
  return (jsDay + 1) % 7;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function formatMaintenanceDate(iso: string) {
  const date = parseIso(iso);
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return iso;
  }
}

export function ArabicDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const [cursor, setCursor] = useState({ year: selected.getFullYear(), month: selected.getMonth() });

  const cells = useMemo(() => {
    const offset = startOffset(cursor.year, cursor.month);
    const count = daysInMonth(cursor.year, cursor.month);
    const items: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < offset; i += 1) items.push({ day: null, iso: null });
    for (let day = 1; day <= count; day += 1) {
      items.push({ day, iso: toIso(new Date(cursor.year, cursor.month, day)) });
    }
    return items;
  }, [cursor.month, cursor.year]);

  const today = toIso(new Date());

  return (
    <View style={styles.fieldWrap}>
      <ArabicText style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</ArabicText>
      <Pressable
        onPress={() => {
          setCursor({ year: selected.getFullYear(), month: selected.getMonth() });
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatMaintenanceDate(value)}`}
        style={[styles.fieldBtn, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rowDir }]}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <ArabicText style={[styles.fieldValue, { color: colors.foreground }]}>{formatMaintenanceDate(value)}</ArabicText>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.monthRow, { flexDirection: rowDir }]}>
              <Pressable
                onPress={() =>
                  setCursor((current) =>
                    current.month === 11 ? { year: current.year + 1, month: 0 } : { year: current.year, month: current.month + 1 },
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="الشهر التالي"
                style={styles.monthNav}
              >
                <Ionicons name="chevron-back" size={20} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.monthTitle, { color: colors.foreground }]}>
                {MONTHS[cursor.month]} {cursor.year}
              </Text>
              <Pressable
                onPress={() =>
                  setCursor((current) =>
                    current.month === 0 ? { year: current.year - 1, month: 11 } : { year: current.year, month: current.month - 1 },
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="الشهر السابق"
                style={styles.monthNav}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((day) => (
                <Text key={day} style={[styles.weekday, { color: colors.mutedForeground }]}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((cell, index) => {
                const active = cell.iso === value;
                const isToday = cell.iso === today;
                return (
                  <Pressable
                    key={`${cell.iso ?? "empty"}-${index}`}
                    disabled={!cell.iso}
                    onPress={() => {
                      if (!cell.iso) return;
                      onChange(cell.iso);
                      setOpen(false);
                    }}
                    style={[
                      styles.dayCell,
                      active && { backgroundColor: colors.primary },
                      !active && isToday && { borderColor: colors.primary, borderWidth: 1 },
                    ]}
                  >
                    <Text style={[styles.dayText, { color: active ? "#fff" : cell.day ? colors.foreground : "transparent" }]}>
                      {cell.day ?? ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => {
                onChange(today);
                setOpen(false);
              }}
              style={[styles.todayBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.todayText, { color: colors.primary }]}>اليوم</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { gap: 7, flex: 1 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  fieldBtn: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
  },
  fieldValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 18 },
  sheet: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  monthRow: { alignItems: "center", justifyContent: "space-between" },
  monthNav: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  monthTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  weekRow: { flexDirection: "row" },
  weekday: { width: `${100 / 7}%`, textAlign: "center", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  dayText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  todayBtn: { minHeight: 44, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  todayText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
