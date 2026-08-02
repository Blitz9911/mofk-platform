export const ENGLISH_LOCALE_ENABLED = false;

export const locales = {
  ar: {
    code: "ar",
    nativeName: "العربية",
    englishName: "Arabic",
    direction: "rtl",
  },
  en: {
    code: "en",
    nativeName: "English",
    englishName: "English",
    direction: "ltr",
  },
} as const;

export type LocaleCode = keyof typeof locales;

export const translations = {
  ar: {
    common: {
      current: "الحالية",
      comingSoon: "قريبا",
      readyNotActive: "جاهزة للتفعيل لاحقا",
    },
    language: {
      title: "تغيير اللغة",
      subtitle: "إدارة لغة واجهة التطبيق",
      currentSection: "اللغة الحالية",
      currentBody: "التطبيق مضبوط حاليا على العربية واتجاه الكتابة من اليمين إلى اليسار.",
      arabicActive: "اللغة الحالية للتطبيق",
      englishPending: "النسخة الإنجليزية مجهزة، ولن يتم تفعيلها إلا بعد اعتمادك.",
      englishLocked: "الإنجليزية غير مفعلة حاليا",
    },
    navigation: {
      home: "الرئيسية",
      assistant: "المساعد الذكي",
      subscription: "الاشتراك",
      pairing: "اقتران الجهاز",
      profile: "حسابي",
    },
  },
  en: {
    common: {
      current: "Current",
      comingSoon: "Coming soon",
      readyNotActive: "Ready for later activation",
    },
    language: {
      title: "Change Language",
      subtitle: "Manage the app interface language",
      currentSection: "Current Language",
      currentBody: "The app is currently set to Arabic with right-to-left layout.",
      arabicActive: "Current app language",
      englishPending: "The English version is prepared and will not be enabled until you approve it.",
      englishLocked: "English is not enabled yet",
    },
    navigation: {
      home: "Home",
      assistant: "Smart Assistant",
      subscription: "Subscription",
      pairing: "Pair Device",
      profile: "Account",
    },
  },
} as const;
