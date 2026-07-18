import { Link, useRoute } from "wouter";

import { getPlanById } from "@/config/plans";
import {
  OrderStatusBadge,
  OrderTimeline,
  PageHeader,
  PaymentBadge,
  SummaryRow,
} from "@/components/commerce/commerce-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { commerceService } from "@/services/mockCommerceService";

export default function OrderDetail() {
  const [, params] = useRoute("/orders/:orderId");
  const order = commerceService.getMockOrder(params?.orderId);
  const plan = getPlanById(order?.planId);

  if (!order || !plan) {
    return (
      <main className="min-h-screen p-4 md:p-8" dir="rtl">
        <PageHeader title="الطلب غير موجود" />
        <Link href="/pricing"><Button className="mt-4">اختيار باقة</Button></Link>
      </main>
    );
  }

  const canActivate = ["delivered", "waiting_activation"].includes(order.orderStatus);

  return (
    <main className="min-h-screen p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader title={`طلب ${order.orderNumber}`} description="تابع تجهيز الجهاز والشحن والتفعيل من مكان واحد." />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader><CardTitle>ملخص الطلب</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <SummaryRow label="الباقة" value={plan.nameAr} />
                <SummaryRow label="الأجهزة" value={`${order.deviceQuantity} جهاز`} />
                <SummaryRow label="الدفع" value={<PaymentBadge status={order.paymentStatus} />} />
                <SummaryRow label="التشغيل" value={<OrderStatusBadge status={order.orderStatus} />} />
                <SummaryRow label="الإجمالي" value={commerceService.describeOrderAmount(order)} />
                <SummaryRow label="التتبع" value={order.trackingNumber ?? "سيظهر بعد الشحن"} />
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader><CardTitle>عنوان الشحن</CardTitle></CardHeader>
              <CardContent className="text-sm leading-7 text-muted-foreground">
                {order.shippingAddress.city}، {order.shippingAddress.district}، {order.shippingAddress.street}، مبنى {order.shippingAddress.buildingNumber}
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader><CardTitle>الخط الزمني</CardTitle></CardHeader>
              <CardContent><OrderTimeline status={order.orderStatus} /></CardContent>
            </Card>
          </div>
          <Card className="h-fit rounded-2xl">
            <CardHeader><CardTitle>الخطوة التالية</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-7 text-muted-foreground">
                بعد وصول الجهاز، فعّل الجهاز واربطه بالمركبة حتى يصبح الاشتراك نشطًا.
              </p>
              <Link href={`/device-activation?orderId=${order.id}`}>
                <Button className="w-full rounded-xl" disabled={!canActivate}>تفعيل الجهاز</Button>
              </Link>
              <Button variant="outline" className="w-full rounded-xl">التواصل مع الدعم</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
