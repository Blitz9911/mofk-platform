import { Package } from "lucide-react";

import { DeviceStatusBadge, PageHeader } from "@/components/commerce/commerce-components";
import { Card, CardContent } from "@/components/ui/card";
import { commerceService } from "@/services/mockCommerceService";

export default function AdminDevices() {
  const devices = commerceService.getDevices();
  return (
    <div className="space-y-6">
      <PageHeader title="إدارة الأجهزة" description="مخزون أجهزة مفك وحالة الربط والتفعيل." />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>{["Serial Number", "BLE/MAC", "الدفعة", "الحالة", "الطلب", "العميل", "المركبة", "التفعيل"].map((head) => <th key={head} className="p-3 text-right">{head}</th>)}</tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.serialNumber} className="border-t">
                  <td className="p-3 font-bold">{device.serialNumber}</td>
                  <td className="p-3">{device.macAddress}</td>
                  <td className="p-3">{device.batch}</td>
                  <td className="p-3"><DeviceStatusBadge status={device.status} /></td>
                  <td className="p-3">{device.assignedOrderId ?? "-"}</td>
                  <td className="p-3">{device.assignedCustomer ?? "-"}</td>
                  <td className="p-3">{device.assignedVehicle ?? "-"}</td>
                  <td className="p-3">{device.activationState}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Package className="h-4 w-4" /> لا يوجد استيراد مخزون حقيقي في هذه المرحلة.</div>
    </div>
  );
}
