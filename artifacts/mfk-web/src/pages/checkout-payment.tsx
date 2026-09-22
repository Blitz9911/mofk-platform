import { useState } from "react";
import { Link, useLocation } from "wouter";

import { getPlanById } from "@/config/plans";
import { PageHeader, PaymentGatewayPlaceholder, SummaryRow } from "@/components/commerce/commerce-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { commerceService } from "@/services/mockCommerceService";

export default function CheckoutPayment() {
  const [, setLocation] = useLocation();
  const [processing, setProcessing] = useState(false);
  const orderId = window.sessionStorage.getItem("mfk-current-order-id");
  const order = commerceService.getMockOrder(orderId ?? undefined);
  const plan = getPlanById(order?.planId);

  const simulateSuccessfulPayment = () => {
    if (!order) return;
    setProcessing(true);
    window.setTimeout(() => {
      commerceService.updateMockOrder(order.id, {
        paymentStatus: "paid",
        orderStatus: "processing",
        internalNotes: [
          ...order.internalNotes,
          "تم اعتماد الدفع بمحاكاة داخلية للتجربة فقط.",
        ],
      });
      setLocation("/checkout/result");
    }, 700);
  };

  if (!order || !plan) {
    return (
      <main className="min-h-screen p-4 md:p-8" dir="rtl">
        <PageHeader title="لا يوجد طلب جاهز للدفع" description="ابدأ من صفحة الباقات ثم أكمل بيانات الشحن." />
        <Link href="/pricing"><Button className="mt-4">اختيار باقة</Button></Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader title="الدفع التجريبي" description="بوابة دفع محاكاة للتجربة: عند المتابعة يتم اعتماد الطلب كمدفوع والانتقال لنتيجة النجاح." />
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <PaymentGatewayPlaceholder processing={processing} failed={false} onPay={simulateSuccessfulPayment} />
          <Card className="rounded-2xl">
            <CardHeader><CardTitle>ملخص الدفع</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <SummaryRow label="رقم الطلب" value={order.orderNumber} />
              <SummaryRow label="الباقة" value={plan.nameAr} />
              <SummaryRow label="دورة الفوترة" value={order.billingCycle === "monthly" ? "شهري" : "سنوي"} />
              <SummaryRow label="الإجمالي" value={commerceService.describeOrderAmount(order)} strong />
              <p className="rounded-xl border border-dashed p-3 text-xs leading-6 text-muted-foreground">
                هذه محاكاة مؤقتة لا تجمع بيانات بطاقة. عند الربط الحقيقي يجب اعتماد الدفع من webhook الخادم.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
