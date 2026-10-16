import { AccountInfoScreen } from "@/components/AccountInfoScreen";

export default function AboutScreen() {
  return (
    <AccountInfoScreen
      title="عن التطبيق"
      subtitle="معلومات مفك وإصدار التطبيق"
      sections={[
        {
          title: "مفك",
          body: "تطبيق سعودي لمتابعة المركبات والصيانة والباقات وقراءات OBD عند توفر قطعة مفك.",
          icon: "information-circle-outline",
        },
        {
          title: "الإصدار",
          body: "MFK Mobile 1.0.0",
          icon: "phone-portrait-outline",
        },
        {
          title: "الباقات",
          body: "باقة مجانية، باقة مفك، باقة العائلة، وباقة الأسطول.",
          icon: "diamond-outline",
        },
      ]}
    />
  );
}
