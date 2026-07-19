import { useState } from "react";
import { Link } from "wouter";
import { CreditCard, Package, Plus, RefreshCcw, Timer, Truck } from "lucide-react";

import {
  AdminFilterBar,
  AdminKpiCard,
  AdminOrdersTable,
  EmptyState,
  PageHeader,
} from "@/components/commerce/commerce-components";
import { getPlanById } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { commerceService } from "@/services/mockCommerceService";

export default function AdminOrders() {
  const [orders, setOrders] = useState(() => commerceService.getOrders());
  const delayed = orders.filter((order) => order.orderStatus === "pending_payment" || order.orderStatus === "processing").length;
  const lastOrder = orders[0];

  const refresh = () => setOrders(commerceService.getOrders());

  const createDemoOrder = () => {
    const plan = getPlanById("plus");
    if (!plan) return;

    const order = commerceService.createMockOrder({
      plan,
      billingCycle: "monthly",
      customer: {
        fullName: "عميل تجريبي",
        phone: "0500000000",
        email: "demo@mofk.app",
      },
      shippingAddress: {
        city: "الرياض",
        district: "الملقا",
        street: "طريق الملك فهد",
        buildingNumber: "12",
        postalCode: "13321",
        additionalNumber: "4421",
        notes: "طلب تجريبي من لوحة الإدارة",
      },
    });

    commerceService.markPayment(order.id, "paid");
    refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة الطلبات"
        description="متابعة طلبات الاشتراك والأجهزة من الدفع حتى الشحن والتفعيل. البيانات الحالية تجريبية ومحفوظة في متصفحك فقط."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={refresh}>
              <RefreshCcw className="ms-2 h-4 w-4" />
              تحديث
            </Button>
            <Button onClick={createDemoOrder}>
              <Plus className="ms-2 h-4 w-4" />
              إنشاء طلب تجريبي
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <AdminKpiCard title="إجمالي الطلبات" value={orders.length} icon={Package} />
        <AdminKpiCard title="بانتظار الدفع" value={orders.filter((order) => order.paymentStatus === "pending").length} icon={CreditCard} />
        <AdminKpiCard title="قيد التشغيل" value={orders.filter((order) => order.orderStatus === "processing").length} icon={Timer} />
        <AdminKpiCard title="تحتاج متابعة" value={delayed} icon={Truck} />
      </div>

      <AdminFilterBar>
        <Input placeholder="الخطة" />
        <Input placeholder="المدينة" />
        <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
          <Checkbox />
          الطلبات التي تحتاج متابعة فقط
        </label>
      </AdminFilterBar>

      {orders.length ? (
        <div className="space-y-3">
          <AdminOrdersTable orders={orders} />
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-4 text-sm">
            <span className="text-muted-foreground">افتح آخر طلب لمتابعة حالته أو تحديث بيانات الشحن والجهاز.</span>
            {lastOrder && (
              <Link href={`/admin/orders/${lastOrder.id}`}>
                <Button variant="outline">فتح آخر طلب</Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          title="لا توجد طلبات بعد"
          description="ابدأ من checkout أو اضغط إنشاء طلب تجريبي لعرض تجربة الإدارة كاملة."
        />
      )}

      <div className="rounded-2xl border border-dashed p-4 text-xs leading-6 text-muted-foreground">
        هذه الصفحة جاهزة كواجهة إدارية أولية. الربط الحقيقي القادم يكون عبر API للطلبات، بوابة الدفع، شركة الشحن، ومخزون الأجهزة.
      </div>
    </div>
  );
}
