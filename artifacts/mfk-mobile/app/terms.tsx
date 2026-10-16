import { AccountInfoScreen } from "@/components/AccountInfoScreen";

export default function TermsScreen() {
  return (
    <AccountInfoScreen
      title="الشروط والأحكام"
      subtitle="شروط استخدام مفك وخدماته"
      sections={[
        {
          title: "الاستخدام",
          body: "مفك يساعدك في المتابعة والتنظيم، ولا يغني عن فحص فني مختص عند ظهور عطل أو تحذير.",
          icon: "document-text-outline",
        },
        {
          title: "الاشتراكات",
          body: "كل باقة تحدد عدد المركبات والميزات المتاحة. يمكن تعديل الباقة من صفحة الاشتراك.",
          icon: "card-outline",
        },
        {
          title: "قطعة مفك",
          body: "عمل قطعة OBD يعتمد على توفر الجهاز المتوافق والصلاحيات المطلوبة في الجوال.",
          icon: "hardware-chip-outline",
        },
      ]}
    />
  );
}
