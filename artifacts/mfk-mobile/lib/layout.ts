import { I18nManager } from "react-native";

/** Native RTL already mirrors `row`. Using `row-reverse` on top of it flips back to LTR. */
export const rowDir = I18nManager.isRTL ? "row" : "row-reverse";

export const writingDir = I18nManager.isRTL ? "rtl" : "ltr";
