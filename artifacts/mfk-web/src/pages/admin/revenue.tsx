import { CreditCard, TrendingUp, Users } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { useGetRevenueBreakdown } from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty";
import { fallbackRevenueData } from "@/data/adminMockData";

export default function AdminRevenue() {
  const { data: apiRevenueData, isLoading, isError } = useGetRevenueBreakdown();
  const revenueData = apiRevenueData?.length ? apiRevenueData : fallbackRevenueData;
  const usingFallback = isError || !apiRevenueData?.length;

  const formatSAR = (value: number | undefined) => {
    if (value === undefined) return "0 ر.س";
    return new Intl.NumberFormat("ar-SA").format(value) + " ر.س";
  };

  const totalRevenue = revenueData?.reduce((sum, item) => sum + item.subscriptionRevenue, 0) || 0;
  const avgMonthly = revenueData?.length ? totalRevenue / revenueData.length : 0;
  const totalNewSubscribers = revenueData?.reduce((sum, item) => sum + (item.newSubscribers || 0), 0) || 0;
  
  let growthPct = 0;
  if (revenueData && revenueData.length >= 2) {
    const current = revenueData[revenueData.length - 1];
    const prior = revenueData[revenueData.length - 2];
    const currentTotal = current.subscriptionRevenue;
    const priorTotal = prior.subscriptionRevenue;
    if (priorTotal > 0) {
      growthPct = Math.round(((currentTotal - priorTotal) / priorTotal) * 100);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المالية</h1>
          <p className="text-muted-foreground">تحليل الإيرادات والنمو</p>
        </div>
      </div>

      {usingFallback && !isLoading && (
        <div className="rounded-md bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
          يتم عرض بيانات مالية احتياطية إلى أن يكتمل اتصال API.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات (12 شهر)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold">{formatSAR(totalRevenue)}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">متوسط الإيراد الشهري</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold">{formatSAR(avgMonthly)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">مشتركين جدد (12 شهر)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold">{totalNewSubscribers}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">معدل النمو (عن الشهر السابق)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className={`text-2xl font-bold ${growthPct >= 0 ? "text-green-500" : "text-red-500"}`}>
                <span dir="ltr">{growthPct > 0 ? "+" : ""}{growthPct}%</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تفصيل الإيرادات شهرياً</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="w-full h-80" />
          ) : revenueData && revenueData.length > 0 ? (
            <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`${new Intl.NumberFormat("ar-SA").format(value)} ر.س`, '']}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="subscriptionRevenue" name="الاشتراكات" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={CreditCard} title="لا توجد بيانات إيرادات" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>التقرير المالي المفصل</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : revenueData && revenueData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشهر</TableHead>
                  <TableHead>إيرادات الاشتراكات</TableHead>
                  <TableHead>المشتركين الجدد</TableHead>
                  <TableHead className="text-left font-bold">الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueData.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.month}</TableCell>
                    <TableCell>{formatSAR(item.subscriptionRevenue)}</TableCell>
                    <TableCell>{item.newSubscribers || 0}</TableCell>
                    <TableCell className="text-left font-bold text-primary">
                      {formatSAR(item.subscriptionRevenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">الإجمالي العام</TableCell>
                  <TableCell>{formatSAR(revenueData.reduce((sum, item) => sum + item.subscriptionRevenue, 0))}</TableCell>
                  <TableCell>{totalNewSubscribers}</TableCell>
                  <TableCell className="text-left font-bold text-primary">{formatSAR(totalRevenue)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <div className="py-12">
              <EmptyState icon={CreditCard} title="لا توجد بيانات مالية" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
