import { AccountInfoScreen } from "@/components/AccountInfoScreen";

export default function SecurityPrivacyScreen() {
  return (
    <AccountInfoScreen
      title="الأمان والخصوصية"
      subtitle="حماية الحساب وطريقة استخدام البيانات"
      sections={[
        {
          title: "جلسة آمنة",
          body: "يبقى تسجيل الدخول محفوظا على جهازك فقط، ويمكنك إنهاء الجلسة من صفحة حسابي عبر تسجيل الخروج.",
          icon: "shield-checkmark-outline",
        },
        {
          title: "بيانات المركبات",
          body: "تستخدم بيانات المركبات والصيانة لعرض لوحة التحكم والتوصيات والتنبيهات داخل حسابك.",
          icon: "car-outline",
        },
        {
          title: "البلوتوث والموقع",
          body: "تطلب الصلاحيات عند الحاجة فقط لربط قطعة مفك أو تحديد عنوان التوصيل عند طلب القطعة.",
          icon: "bluetooth-outline",
        },
      ]}
    />
  );
}
