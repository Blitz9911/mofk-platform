import { useState } from "react";
import { Bluetooth, QrCode, ScanLine } from "lucide-react";

import { DeviceActivationForm, PageHeader } from "@/components/commerce/commerce-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { commerceService } from "@/services/mockCommerceService";

export default function AppDeviceActivate() {
  const [serial, setSerial] = useState("");
  const [code, setCode] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [done, setDone] = useState(false);

  const activate = () => {
    const device = commerceService.updateDevice(serial || "MFK-0001", {
      status: "activated",
      assignedVehicle: vehicle || "مركبتي",
      activationState: "linked",
    });
    if (device || serial) setDone(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="تفعيل جهاز مفك" description="ابدأ بالبحث التلقائي عبر BLE، واستخدم Serial أو QR كخطة بديلة عند الحاجة." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>ربط الجهاز</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-muted/30 p-4">
                <Bluetooth className="h-5 w-5 text-primary" />
                <div className="mt-3 font-bold">BLE تلقائي</div>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">المسار الأساسي عند توفر Bluetooth في التطبيق.</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <ScanLine className="h-5 w-5 text-primary" />
                <div className="mt-3 font-bold">Serial</div>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">اكتب الرقم الموجود على الجهاز.</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <QrCode className="h-5 w-5 text-primary" />
                <div className="mt-3 font-bold">QR</div>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">بديل سريع عند توفر كاميرا.</p>
              </div>
            </div>
            <DeviceActivationForm
              serial={serial}
              code={code}
              vehicle={vehicle}
              onSerial={setSerial}
              onCode={setCode}
              onVehicle={setVehicle}
            />
            <Button className="h-12 rounded-xl font-bold" onClick={activate}>تأكيد التفعيل</Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-xl font-black">حالة الربط</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {done ? "تمت محاكاة ربط الجهاز. في الربط الحقيقي سيتم تأكيد Serial/BLE من الخادم قبل بدء القراءات." : "بانتظار إدخال بيانات الجهاز أو اكتشافه عبر BLE."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
