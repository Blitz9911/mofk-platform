import { Link } from "wouter";
import { PackageCheck, Truck } from "lucide-react";

import { OrderTimeline, PageHeader } from "@/components/commerce/commerce-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { commerceService } from "@/services/mockCommerceService";

export default function DevicePending() {
  const orderId = window.sessionStorage.getItem("mfk-current-order-id");
  const order = commerceService.getMockOrder(orderId ?? undefined);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="الجهاز بانتظار التجهيز"
        description="بعد تأكيد webhook الموقّع، ينشئ الخادم الشحنة وتظهر بيانات التتبع هنا."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>حالة الطلب والشحن</CardTitle></CardHeader>
          <CardContent>
            <OrderTimeline status={order?.orderStatus ?? "pending_payment"} />
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="space-y-4 p-6">
            <Truck className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-xl font-black">بيانات التتبع</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {order?.trackingNumber ?? "لم يتم إنشاء رقم تتبع بعد. سيظهر بعد تحويل الطلب إلى paid من الخادم."}
              </p>
            </div>
            <Link href="/app/device/activate">
              <Button className="w-full rounded-xl" disabled={!["delivered", "waiting_activation"].includes(order?.orderStatus ?? "")}>
                <PackageCheck className="ms-2 h-4 w-4" />
                تفعيل الجهاز
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
