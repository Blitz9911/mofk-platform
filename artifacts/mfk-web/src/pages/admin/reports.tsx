import { BarChart3, FileDown, ReceiptText } from "lucide-react";

import { AdminKpiCard, PageHeader } from "@/components/commerce/commerce-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { commerceService } from "@/services/mockCommerceService";

export default function AdminReports() {
  const orders = commerceService.getOrders();
  const paidRevenue = orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.totalSar, 0);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="تقارير التجارة والاشتراكات" description="ملخص أولي للطلبات والإيراد. الربط النهائي سيكون من API وتقارير PostgreSQL." />
      <div className="grid gap-4 md:grid-cols-3">
        <AdminKpiCard title="الطلبات" value={orders.length} icon={ReceiptText} />
        <AdminKpiCard title="الإيراد المؤكد" value={`${paidRevenue.toLocaleString("ar-SA")} ر.س`} icon={BarChart3} />
        <AdminKpiCard title="طلبات قيد الانتظار" value={orders.filter((order) => order.paymentStatus === "pending").length} icon={ReceiptText} />
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle>تصدير التقارير</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline"><FileDown className="ms-2 h-4 w-4" />تصدير CSV</Button>
          <Button variant="outline"><FileDown className="ms-2 h-4 w-4" />تصدير Excel</Button>
        </CardContent>
      </Card>
    </div>
  );
}
