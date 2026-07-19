import { Link } from "wouter";
import { Clock, ShieldCheck } from "lucide-react";

import { PageHeader, OrderStatusBadge, PaymentBadge } from "@/components/commerce/commerce-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { commerceService } from "@/services/mockCommerceService";

export default function CheckoutResult() {
  const orderId = window.sessionStorage.getItem("mfk-current-order-id");
  const order = commerceService.getMockOrder(orderId ?? undefined);

  return (
    <main className="min-h-screen p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader title="بانتظار تأكيد الدفع" description="هذه الصفحة مؤقتة فقط، ولا تفعل الاشتراك. التفعيل يتم بعد webhook موقّع من Moyasar على الخادم." />
        <Card className="rounded-2xl">
          <CardContent className="space-y-5 p-8 text-center">
            <Clock className="mx-auto h-12 w-12 text-primary" />
            <div>
              <h2 className="text-2xl font-black">جاري انتظار تأكيد Moyasar</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                بعد وصول webhook صحيح، سيتم تحويل الطلب إلى paid، تفعيل الاشتراك، وإنشاء الشحنة.
              </p>
            </div>
            {order && (
              <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm sm:grid-cols-2">
                <div>الدفع: <PaymentBadge status={order.paymentStatus} /></div>
                <div>الطلب: <OrderStatusBadge status={order.orderStatus} /></div>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              لا توجد بيانات حساسة في الرابط، وحالة paid لا تأتي من العميل.
            </div>
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Link href="/app/device/pending"><Button>متابعة الشحنة</Button></Link>
              <Link href="/pricing"><Button variant="outline">العودة للباقات</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
