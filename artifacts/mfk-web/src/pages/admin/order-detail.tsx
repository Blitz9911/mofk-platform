import { useState } from "react";
import { useRoute } from "wouter";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { commerceService, OrderStatus } from "@/services/mockCommerceService";

export default function AdminOrderDetail() {
  const [, params] = useRoute("/admin/orders/:orderId");
  const [tick, setTick] = useState(0);
  const [note, setNote] = useState("");
  const [employee, setEmployee] = useState("");
  const [device, setDevice] = useState("");
  const [tracking, setTracking] = useState("");
  const order = commerceService.getMockOrder(params?.orderId);
  const plan = getPlanById(order?.planId);

  if (!order || !plan) return <PageHeader title="الطلب غير موجود" />;

  const refresh = () => setTick((value) => value + 1);
  const updateStatus = (status: OrderStatus) => {
    commerceService.updateMockOrder(order.id, { orderStatus: status });
    refresh();
  };
  const assign = () => {
    commerceService.updateMockOrder(order.id, {
      assignedEmployee: employee || order.assignedEmployee,
      assignedDeviceSerial: device || order.assignedDeviceSerial,
      trackingNumber: tracking || order.trackingNumber,
    });
    refresh();
  };
  const addNote = () => {
    if (!note.trim()) return;
    commerceService.updateMockOrder(order.id, { internalNotes: [note.trim(), ...order.internalNotes] });
    setNote("");
    refresh();
  };

  return (
    <div className="space-y-6" key={tick}>
      <PageHeader title={`تفاصيل الطلب ${order.orderNumber}`} description="إجراءات تشغيلية محلية لحين ربط backend." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>العميل والباقة</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
            <SummaryRow label="العميل" value={order.customer.fullName} />
            <SummaryRow label="الجوال" value={order.customer.phone} />
            <SummaryRow label="البريد" value={order.customer.email} />
            <SummaryRow label="الباقة" value={plan.nameAr} />
            <SummaryRow label="الدفع" value={<PaymentBadge status={order.paymentStatus} />} />
            <SummaryRow label="التشغيل" value={<OrderStatusBadge status={order.orderStatus} />} />
          </CardContent></Card>
          <Card><CardHeader><CardTitle>العنوان والدفع</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
            <SummaryRow label="المدينة" value={order.shippingAddress.city} />
            <SummaryRow label="الحي" value={order.shippingAddress.district} />
            <SummaryRow label="المبلغ" value={`${order.amountSar} ر.س`} />
            <SummaryRow label="الضريبة" value={`${order.vatSar} ر.س`} />
            <SummaryRow label="الإجمالي" value={commerceService.describeOrderAmount(order)} />
            <SummaryRow label="رقم التتبع" value={order.trackingNumber ?? "غير محدد"} />
          </CardContent></Card>
          <Card><CardHeader><CardTitle>الخط الزمني</CardTitle></CardHeader><CardContent><OrderTimeline status={order.orderStatus} /></CardContent></Card>
        </div>
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>إجراءات التشغيل</CardTitle></CardHeader><CardContent className="space-y-3">
            <Input placeholder="تعيين موظف" value={employee} onChange={(event) => setEmployee(event.target.value)} />
            <Input placeholder="تعيين Serial للجهاز" value={device} onChange={(event) => setDevice(event.target.value)} />
            <Input placeholder="رقم التتبع" value={tracking} onChange={(event) => setTracking(event.target.value)} />
            <Button className="w-full" onClick={assign}>حفظ التعيينات</Button>
            <div className="grid grid-cols-2 gap-2">
              {(["device_assigned", "ready_to_ship", "shipped", "delivered", "waiting_activation", "completed"] as OrderStatus[]).map((status) => (
                <Button key={status} variant="outline" size="sm" onClick={() => updateStatus(status)}>
                  {status}
                </Button>
              ))}
            </div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>ملاحظات داخلية</CardTitle></CardHeader><CardContent className="space-y-3">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="أضف ملاحظة" />
            <Button variant="outline" onClick={addNote}>إضافة ملاحظة</Button>
            {order.internalNotes.map((item, index) => <div key={`${item}-${index}`} className="rounded-xl bg-muted p-3 text-sm">{item}</div>)}
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
