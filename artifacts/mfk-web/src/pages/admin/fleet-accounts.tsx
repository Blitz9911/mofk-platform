import { Link } from "wouter";

import { PageHeader } from "@/components/commerce/commerce-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { commerceService } from "@/services/mockCommerceService";

export default function AdminFleetAccounts() {
  const accounts = commerceService.getFleetAccounts();
  return (
    <div className="space-y-6">
      <PageHeader title="حسابات الأسطول" description="طلبات الشركات وإعداد الحسابات التشغيلية." />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>{["الشركة", "مسؤول التواصل", "المركبات", "المستخدمين", "الحالة", "تقدم الإعداد", "آخر نشاط", "الإجراء"].map((head) => <th key={head} className="p-3 text-right">{head}</th>)}</tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-t">
                  <td className="p-3 font-bold">{account.companyName}</td>
                  <td className="p-3">{account.contactPerson}</td>
                  <td className="p-3">{account.vehicleCount}</td>
                  <td className="p-3">{account.userCount}</td>
                  <td className="p-3"><Badge variant="outline">{account.status}</Badge></td>
                  <td className="p-3"><Progress value={35} /></td>
                  <td className="p-3">{new Date(account.createdAt).toLocaleDateString("ar-SA")}</td>
                  <td className="p-3"><Link href="/fleet/setup"><Button size="sm" variant="outline">الإعداد</Button></Link></td>
                </tr>
              ))}
              {!accounts.length && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">لا توجد حسابات أسطول بعد.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
