import { useState } from "react";
import { Link, useLocation } from "wouter";
import { QrCode } from "lucide-react";

import {
  DeviceActivationForm,
  PageHeader,
} from "@/components/commerce/commerce-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { commerceService } from "@/services/mockCommerceService";

export default function DeviceActivation() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId") ?? undefined;
  const [serial, setSerial] = useState("");
  const [code, setCode] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [success, setSuccess] = useState(false);

  const valid = serial.trim().length >= 5 && code.trim().length >= 4 && vehicle.trim().length >= 2;

  const activate = () => {
    commerceService.activateMockDevice({ serialNumber: serial.trim(), activationCode: code.trim(), vehicleName: vehicle.trim(), orderId });
    setSuccess(true);
  };

  return (
    <main className="min-h-screen p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title="تفعيل الجهاز" description="اربط جهاز مفك بالمركبة. لا يتم تنفيذ BLE حقيقي في هذه المرحلة." />
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>{success ? "تم التفعيل" : "بيانات التفعيل"}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {success ? (
              <div className="space-y-4 text-center">
                <p className="text-lg font-bold">تم ربط الجهاز وتفعيل الاشتراك محليًا.</p>
                <Button className="rounded-xl" onClick={() => setLocation("/app")}>الذهاب للوحة التحكم</Button>
              </div>
            ) : (
              <>
                <DeviceActivationForm serial={serial} code={code} vehicle={vehicle} onSerial={setSerial} onCode={setCode} onVehicle={setVehicle} />
                <div className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                  <QrCode className="mx-auto mb-2 h-8 w-8" />
                  ماسح QR سيضاف لاحقًا لقراءة Serial Number و Activation Code.
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="rounded-xl" onClick={activate} disabled={!valid}>تحقق واربط الجهاز</Button>
                  <Link href="/app"><Button variant="outline">لاحقًا</Button></Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
