import { PaymentStatusCard } from "@/components/commerce/commerce-components";

export default function PaymentResult() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");
  const orderId = params.get("orderId");
  const safeStatus = status === "success" || status === "failed" ? status : "pending";

  return (
    <main className="min-h-screen bg-background p-4 pt-16 md:p-8 md:pt-24" dir="rtl">
      <PaymentStatusCard status={safeStatus} orderId={orderId} />
    </main>
  );
}
