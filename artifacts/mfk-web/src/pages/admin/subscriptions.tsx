import { getPlanById } from "@/config/plans";
import { PageHeader, SubscriptionStatusBadge } from "@/components/commerce/commerce-components";
import { Card, CardContent } from "@/components/ui/card";
import { commerceService } from "@/services/mockCommerceService";

export default function AdminSubscriptions() {
  const subscriptions = commerceService.getSubscriptions();
  return (
    <div className="space-y-6">
      <PageHeader title="إدارة الاشتراكات" description="حالة الاشتراك والتفعيل والأجهزة المرتبطة." />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>{["العميل", "الباقة", "الدورة", "الحالة", "التفعيل", "البداية", "النهاية", "تجديد تلقائي", "الجهاز"].map((head) => <th key={head} className="p-3 text-right">{head}</th>)}</tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="border-t">
                  <td className="p-3 font-bold">{sub.customer}</td>
                  <td className="p-3">{getPlanById(sub.planId)?.nameAr ?? sub.planId}</td>
                  <td className="p-3">{sub.cycle === "monthly" ? "شهري" : "سنوي"}</td>
                  <td className="p-3"><SubscriptionStatusBadge status={sub.status} /></td>
                  <td className="p-3">{sub.activationState}</td>
                  <td className="p-3">{sub.startDate}</td>
                  <td className="p-3">{sub.endDate}</td>
                  <td className="p-3">{sub.autoRenew ? "نعم" : "لا"}</td>
                  <td className="p-3">{sub.linkedDevice ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
