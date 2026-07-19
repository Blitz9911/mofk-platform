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

  const createPendingPayment = () => {
    if (!order) return;
    setProcessing(true);
    window.setTimeout(() => {
      commerceService.updateMockOrder(order.id, {
        paymentStatus: "pending",
        orderStatus: "pending_payment",
        internalNotes: [
          ...order.internalNotes,
          "تم إنشاء دفعة معلقة. لا يتم اعتماد paid إلا من webhook الخادم.",
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
        <PageHeader title="الدفع عبر Moyasar" description="الدفعة تُنشأ من الخادم بمبلغ الطلب النهائي. هذه الواجهة لا تعتمد الطلب كمدفوع." />
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <PaymentGatewayPlaceholder processing={processing} failed={false} onPay={createPendingPayment} />
          <Card className="rounded-2xl">
            <CardHeader><CardTitle>ملخص الدفع</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <SummaryRow label="رقم الطلب" value={order.orderNumber} />
              <SummaryRow label="الباقة" value={plan.nameAr} />
              <SummaryRow label="دورة الفوترة" value={order.billingCycle === "monthly" ? "شهري" : "سنوي"} />
              <SummaryRow label="الإجمالي" value={commerceService.describeOrderAmount(order)} strong />
              <p className="rounded-xl border border-dashed p-3 text-xs leading-6 text-muted-foreground">
                ملاحظة أمان: حتى لو رجع المستخدم من Moyasar بنجاح، يبقى الطلب بانتظار webhook موقّع من الخادم.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
