import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";

import { getPlanById } from "@/config/plans";
import {
  PageHeader,
  PaymentGatewayPlaceholder,
  SummaryRow,
} from "@/components/commerce/commerce-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { commerceService } from "@/services/mockCommerceService";

export default function Payment() {
  const [, params] = useRoute("/payment/:orderId");
  const [, setLocation] = useLocation();
  const [processing, setProcessing] = useState(false);
  const [failed, setFailed] = useState(false);
  const order = commerceService.getMockOrder(params?.orderId);
  const plan = getPlanById(order?.planId);

  if (!order || !plan) {
    return (
      <main className="min-h-screen p-4 md:p-8" dir="rtl">
        <PageHeader title="الطلب غير موجود" description="لا يمكن فتح صفحة دفع بدون طلب صحيح." />
        <Link href="/pricing"><Button className="mt-4">اختيار باقة</Button></Link>
      </main>
    );
  }

  const pay = () => {
    setProcessing(true);
    setFailed(false);
    window.setTimeout(() => {
      commerceService.markPayment(order.id, "paid");
      setLocation(`/payment-result?status=success&orderId=${order.id}`);
    }, 900);
  };

  return (
    <main className="min-h-screen p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader title="الدفع الآمن" description="هذه صفحة shell جاهزة للتكامل، وليست بوابة دفع حقيقية." />
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <PaymentGatewayPlaceholder processing={processing} failed={failed} onPay={pay} />
          <Card className="rounded-2xl">
            <CardHeader><CardTitle>تفاصيل الطلب</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <SummaryRow label="رقم الطلب" value={order.orderNumber} />
              <SummaryRow label="الباقة" value={plan.nameAr} />
              <SummaryRow label="الفوترة" value={order.billingCycle === "monthly" ? "شهري" : "سنوي"} />
              <SummaryRow label="العميل" value={order.customer.fullName} />
              <SummaryRow label="الجوال" value={order.customer.phone} />
              <SummaryRow label="الإجمالي" value={commerceService.describeOrderAmount(order)} strong />
              <div className="flex gap-2 pt-4">
                <Link href={`/checkout/${order.planId}`}><Button variant="outline">رجوع</Button></Link>
                <Button variant="ghost" onClick={() => setLocation("/pricing")}>إلغاء</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
