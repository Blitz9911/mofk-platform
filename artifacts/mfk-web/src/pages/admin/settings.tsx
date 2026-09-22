import { ShieldCheck, SlidersHorizontal } from "lucide-react";

import { PageHeader } from "@/components/commerce/commerce-components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function AdminSettings() {
  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="إعدادات الإدارة" description="إعدادات تشغيلية أولية لمسار الطلب والدفع والشحن." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />الأمان والدفع</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-xl border p-4">
              <span>اعتماد paid من webhook فقط</span>
              <Switch checked disabled />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-4">
              <span>حفظ بطاقة Moyasar للتجديد التلقائي</span>
              <Switch disabled />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary" />التشغيل</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl border p-4">حالة الشحن الافتراضية بعد الدفع: preparing</div>
            <div className="rounded-xl border p-4">طرق التفعيل: BLE أساسي، Serial و QR بدائل</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
