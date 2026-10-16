import { AccountInfoScreen } from "@/components/AccountInfoScreen";

export default function AboutScreen() {
  return (
    <AccountInfoScreen
      title="عن تطبيق مفك"
      subtitle="سيارتك أذكى مما تتخيل"
      sections={[
        {
          title: "ما هو مفك؟",
          body: "افهم سيارتك وتابع حالتها من مكان واحد. مفك يشرح التنبيهات بلغة واضحة ويربط القطعة بسيارتك للتشخيص والصيانة والوقود.",
          icon: "car-sport-outline",
        },
        {
          title: "تعطل السيارة فجأة كابوس",
          body: "تشخيص فوري تبدأه في أقل من دقيقة بعد ربط قطعة مفك، قبل ما تصير المشكلة مفاجأة على الطريق.",
          icon: "flash-outline",
        },
        {
          title: "الإصدار",
          body: "MFK 1.0.0",
          icon: "phone-portrait-outline",
        },
      ]}
    />
  );
}
