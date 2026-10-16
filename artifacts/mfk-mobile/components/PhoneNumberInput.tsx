import React, { memo, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ArabicText } from "@/components/ArabicText";
import { useColors } from "@/hooks/useColors";
import { rowDir } from "@/lib/layout";

export function toAsciiDigits(value: string) {
  return Array.from(value).reduce((acc, char) => {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 48 && code <= 57) return acc + char;
    if (code >= 0x0660 && code <= 0x0669) return acc + String(code - 0x0660);
    if (code >= 0x06f0 && code <= 0x06f9) return acc + String(code - 0x06f0);
    if (code >= 0xff10 && code <= 0xff19) return acc + String(code - 0xff10);
    return acc;
  }, "");
}

export function normalizeSaudiMobileDigits(value: string) {
  let digits = toAsciiDigits(value);

  if (digits.startsWith("00966")) {
    digits = digits.slice(5);
  } else if (digits.startsWith("966")) {
    digits = digits.slice(3);
  }

  if (digits.startsWith("05")) {
    digits = digits.slice(1);
  } else {
    digits = digits.replace(/^0+/, "");
  }

  return digits.slice(0, 9);
}

export function isValidSaudiMobileDigits(value: string) {
  return /^5\d{8}$/.test(normalizeSaudiMobileDigits(value));
}

type PhoneNumberInputProps = {
  value: string;
  onChangeDigits: (digits: string) => void;
  disabled?: boolean;
  error?: boolean;
  label?: string;
  placeholder?: string;
};

function PhoneNumberInputComponent({
  value,
  onChangeDigits,
  disabled = false,
  error = false,
  label = "رقم الجوال",
  placeholder = "5XXXXXXXX",
}: PhoneNumberInputProps) {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const borderColor = useMemo(() => {
    if (error) return "#ef4444";
    if (focused) return colors.primary;
    return colors.border;
  }, [colors.border, colors.primary, error, focused]);

  return (
    <View style={styles.fieldGroup}>
      <ArabicText style={[styles.label, { color: colors.foreground }]}>{label}</ArabicText>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        disabled={disabled}
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.card,
            borderColor,
            opacity: disabled ? 0.72 : 1,
          },
          focused && styles.inputFocused,
        ]}
      >
        <Text pointerEvents="none" style={[styles.prefixText, { color: colors.mutedForeground }]}>
          +966
        </Text>
        <TextInput
          ref={inputRef}
          value={value}
          style={[styles.input, { color: colors.foreground }]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          onChangeText={(nextValue) => onChangeDigits(normalizeSaudiMobileDigits(nextValue))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          autoCorrect={false}
          autoCapitalize="none"
          editable={!disabled}
          textAlign="left"
          showSoftInputOnFocus
          underlineColorAndroid="transparent"
          importantForAutofill="yes"
          {...(Platform.OS === "web" ? { inputMode: "numeric" as const } : null)}
        />
      </Pressable>
    </View>
  );
}

export const PhoneNumberInput = memo(PhoneNumberInputComponent);

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 8,
    width: "100%",
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textAlign: "right",
    writingDirection: "rtl",
    width: "100%",
  },
  inputRow: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    borderWidth: 1.5,
    flexDirection: rowDir,
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  inputFocused: {
    elevation: 3,
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  input: {
    direction: "ltr",
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    height: 54,
    minWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    writingDirection: "ltr",
  },
  prefixText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    lineHeight: 20,
  },
});
