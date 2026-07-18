import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Users, 
  Car, 
  Activity, 
  CreditCard, 
  Star, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Heart
} from "lucide-react";
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
import { 
  useGetAdminOverview, 
  useGetRevenueBreakdown, 
  useGetCommonIssues, 
  useListLiveDiagnostics 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";

export default function AdminDashboard() {
  const { data: overview, isLoading: isOverviewLoading } = useGetAdminOverview();
  const { data: revenueData, isLoading: isRevenueLoading } = useGetRevenueBreakdown();
  const { data: issuesData, isLoading: isIssuesLoading } = useGetCommonIssues();
  const { data: diagnosticsData, isLoading: isDiagnosticsLoading } = useListLiveDiagnostics();

  const today = format(new Date(), "d MMMM yyyy", { locale: ar });

  const formatSAR = (value: number | undefined) => {
    if (value === undefined) return "0 ر.س";
    return new Intl.NumberFormat("ar-SA").format(value) + " ر.س";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">نظرة عامة على المنصة</h1>
          <p className="text-muted-foreground">{today}</p>
        </div>
      </div>

      {isOverviewLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalUsers}</div>
              {overview.usersTrendPct !== undefined && (
                <div className={`flex items-center text-xs mt-1 ${overview.usersTrendPct >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {overview.usersTrendPct >= 0 ? <TrendingUp className="h-3 w-3 ml-1" /> : <TrendingDown className="h-3 w-3 ml-1" />}
                  <span>{Math.abs(overview.usersTrendPct)}% عن الشهر الماضي</span>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">المركبات النشطة اليوم</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.activeVehiclesToday}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">الأعطال (آخر 24 ساعة)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.dtcsLast24h}</div>
              {overview.criticalDtcsLast24h !== undefined && (
                <p className="text-xs text-red-500 mt-1 font-medium">
                  {overview.criticalDtcsLast24h} أعطال حرجة
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إيرادات الشهر الحالي</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatSAR(overview.revenueMtd)}</div>
              {overview.revenueTrendPct !== undefined && (
                <div className={`flex items-center text-xs mt-1 ${overview.revenueTrendPct >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {overview.revenueTrendPct >= 0 ? <TrendingUp className="h-3 w-3 ml-1" /> : <TrendingDown className="h-3 w-3 ml-1" />}
                  <span>{Math.abs(overview.revenueTrendPct)}% عن الشهر الماضي</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">المشتركين المميزين</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.premiumSubscribers || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">مؤشر رضا العملاء (NPS)</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.nps || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">متوسط صحة المركبات</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="text-2xl font-bold">{overview.avgHealthScore || 0}%</div>
              {overview.avgHealthScore !== undefined && (
                <div className="relative w-10 h-10">
                  <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-muted stroke-current"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={overview.avgHealthScore >= 80 ? "text-green-500 stroke-current" : overview.avgHealthScore >= 60 ? "text-amber-500 stroke-current" : overview.avgHealthScore >= 40 ? "text-orange-500 stroke-current" : "text-red-500 stroke-current"}
                      strokeWidth="3"
                      strokeDasharray={`${overview.avgHealthScore}, 100`}
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>الإيرادات (آخر 12 شهر)</CardTitle>
        </CardHeader>
        <CardContent>
          {isRevenueLoading ? (
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
                  <Bar dataKey="subscriptionRevenue" name="إيرادات الاشتراكات" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={CreditCard} title="لا توجد بيانات إيرادات" />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>الأعطال الشائعة (أعلى 10)</CardTitle>
          </CardHeader>
          <CardContent>
            {isIssuesLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : issuesData && issuesData.length > 0 ? (
              <div className="space-y-4">
                {issuesData.slice(0, 10).map((issue, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        issue.severity === 'critical' ? 'bg-red-500' :
                        issue.severity === 'high' ? 'bg-orange-500' :
                        issue.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          {issue.code}
                          {issue.trendPct !== undefined && (
                            <Badge variant="outline" className={issue.trendPct > 0 ? "text-red-500 border-red-200 bg-red-50" : "text-green-500 border-green-200 bg-green-50"}>
                              <span dir="ltr">{issue.trendPct > 0 ? '+' : ''}{issue.trendPct}%</span>
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">{issue.descriptionAr}</div>
                      </div>
                    </div>
                    <div className="text-lg font-bold">{issue.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={AlertTriangle} title="لا توجد بيانات أعطال" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>التشخيص المباشر (أحدث 8)</CardTitle>
          </CardHeader>
          <CardContent>
            {isDiagnosticsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : diagnosticsData && diagnosticsData.length > 0 ? (
              <div className="space-y-4">
                {diagnosticsData.slice(0, 8).map((session, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        {session.vehicleMake} {session.vehicleModel}
                        <Badge variant="secondary" className="text-xs">{session.plateNumber}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {session.ownerName} {session.city ? `• ${session.city}` : ''}
                      </div>
                    </div>
                    <div className="text-left flex flex-col items-end gap-2">
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(session.startedAt), "hh:mm a", { locale: ar })}
                      </div>
                      {(session.dtcCount ?? 0) > 0 && (
                        <Badge variant={session.criticalDtcCount && session.criticalDtcCount > 0 ? "destructive" : "outline"}>
                          {session.dtcCount} عطل
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Activity} title="لا توجد جلسات تشخيص نشطة" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
