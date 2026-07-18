import { Package, Timer, Truck, CreditCard } from "lucide-react";

import {
  AdminFilterBar,
  AdminKpiCard,
  AdminOrdersTable,
  EmptyState,
  PageHeader,
} from "@/components/commerce/commerce-components";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { commerceService } from "@/services/mockCommerceService";

export default function AdminOrders() {
  const orders = commerceService.getOrders();
  const delayed = orders.filter((order) => order.orderStatus === "pending_payment" || order.orderStatus === "processing").length;

  return (
    <div className="space-y-6">
      <PageHeader title="إدارة الطلبات" description="متابعة طلبات الاشتراك والأجهزة من الدفع حتى التفعيل." />
      <div className="grid gap-4 md:grid-cols-4">
        <AdminKpiCard title="إجمالي الطلبات" value={orders.length} icon={Package} />
        <AdminKpiCard title="بانتظار الدفع" value={orders.filter((order) => order.paymentStatus === "pending").length} icon={CreditCard} />
        <AdminKpiCard title="قيد التشغيل" value={orders.filter((order) => order.orderStatus === "processing").length} icon={Timer} />
        <AdminKpiCard title="متأخرة" value={delayed} icon={Truck} />
      </div>
      <AdminFilterBar>
        <Input placeholder="الخطة" />
        <Input placeholder="المدينة" />
        <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
          <Checkbox />
          الطلبات المتأخرة فقط
        </label>
      </AdminFilterBar>
      {orders.length ? <AdminOrdersTable orders={orders} /> : <EmptyState title="لا توجد طلبات بعد" description="ستظهر طلبات الاشتراك المدفوعة هنا بعد إنشاء checkout." />}
      <div className="text-xs text-muted-foreground">Pagination placeholder: سيتم ربطه بالـ API عند توفر backend.</div>
    </div>
  );
}
