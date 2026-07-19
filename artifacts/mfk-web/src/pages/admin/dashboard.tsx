import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Link } from "wouter";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  Car,
  CheckCircle2,
  CreditCard,
  Package,
  Plus,
  RefreshCcw,
  Smartphone,
  Timer,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  useGetAdminOverview,
  useGetCommonIssues,
  useGetRevenueBreakdown,
  useListLiveDiagnostics,
} from "@workspace/api-client-react";
import {
  DeviceStatusBadge,
  OrderStatusBadge,
  PageHeader,
  PaymentBadge,
  SubscriptionStatusBadge,
} from "@/components/commerce/commerce-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlanById } from "@/config/plans";
import { commerceService, type MockOrder } from "@/services/mockCommerceService";

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function formatSar(value: number) {
  return `${formatNumber(value)} ر.س`;
}

function sumOrders(orders: MockOrder[]) {
  return orders.reduce((sum, order) => sum + order.totalSar, 0);
}

function kpiTone(value: number, goodAtZero = false) {
  if (goodAtZero && value === 0) return "text-emerald-600";
  if (value > 0) return "text-orange-600";
  return "text-muted-foreground";
}

function QuickLink({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: typeof Package;
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href}>
      <a className="flex min-h-[74px] items-center gap-3 rounded-lg border bg-card px-4 py-3 transition hover:border-primary/40 hover:bg-muted/40">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-bold">{title}</span>
          <span className="block text-xs leading-5 text-muted-foreground">{subtitle}</span>
        </span>
      </a>
    </Link>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  isLoading,
  tone,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Package;
  isLoading?: boolean;
  tone?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className={`text-2xl font-black ${tone ?? ""}`}>{value}</div>
        )}
        {subtitle && <p className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function WorkItem({
  icon: Icon,
  title,
  detail,
  href,
  level = "outline",
}: {
  icon: typeof Package;
  title: string;
  detail: string;
  href: string;
  level?: "default" | "destructive" | "outline" | "secondary";
}) {
  return (
    <Link href={href}>
      <a className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition hover:bg-muted/40">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <div className="font-bold">{title}</div>
            <div className="text-xs leading-5 text-muted-foreground">{detail}</div>
          </div>
        </div>
        <Badge variant={level}>فتح</Badge>
      </a>
    </Link>
  );
}

export default function AdminDashboard() {
  const [snapshotKey, setSnapshotKey] = useState(0);
  const { data: overview, isLoading: isOverviewLoading } = useGetAdminOverview();
  const { data: revenueData, isLoading: isRevenueLoading } = useGetRevenueBreakdown();
  const { data: issuesData, isLoading: isIssuesLoading } = useGetCommonIssues();
  const { data: diagnosticsData, isLoading: isDiagnosticsLoading } = useListLiveDiagnostics();

  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: ar });

  const { orders, devices, subscriptions, fleets } = useMemo(
    () => ({
      orders: commerceService.getOrders(),
      devices: commerceService.getDevices(),
      subscriptions: commerceService.getSubscriptions(),
      fleets: commerceService.getFleetAccounts(),
    }),
    [snapshotKey],
  );

  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
  const pendingPayments = orders.filter((order) => order.paymentStatus === "pending");
  const processingOrders = orders.filter((order) =>
    ["processing", "device_assigned", "ready_to_ship"].includes(order.orderStatus),
  );
  const shippingOrders = orders.filter((order) =>
    ["ready_to_ship", "shipped", "delivered"].includes(order.orderStatus),
  );
  const pendingActivation = orders.filter((order) => order.orderStatus === "waiting_activation");
  const availableDevices = devices.filter((device) => device.status === "available");
  const reservedDevices = devices.filter((device) => device.status === "reserved" || device.status === "assigned");
  const activeSubscriptions = subscriptions.filter((sub) => sub.status === "active");
  const waitingSubscriptions = subscriptions.filter((sub) => sub.status === "pending_activation");
  const paidRevenue = sumOrders(paidOrders);
  const totalUsers = overview?.totalUsers ?? Math.max(orders.length + subscriptions.length + fleets.length, 1);
  const activeVehicles = overview?.activeVehiclesToday ?? subscriptions.length + activeSubscriptions.length;
  const criticalIssues = overview?.criticalDtcsLast24h ?? 0;
  const dtcsLast24h = overview?.dtcsLast24h ?? 0;
  const activationRate = subscriptions.length
    ? Math.round((activeSubscriptions.length / subscriptions.length) * 100)
    : 0;
  const deviceReadyRate = devices.length
    ? Math.round((availableDevices.length / devices.length) * 100)
    : 0;

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
    setSnapshotKey((key) => key + 1);
  };

  const latestOrders = orders.slice(0, 5);
  const latestDiagnostics = diagnosticsData?.slice(0, 5) ?? [];
  const topIssues = issuesData?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة الإدارة الشاملة"
        description={`مركز تشغيل مفك اليومي - ${today}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setSnapshotKey((key) => key + 1)}>
              <RefreshCcw className="ms-2 h-4 w-4" />
              تحديث
            </Button>
            <Button onClick={createDemoOrder}>
              <Plus className="ms-2 h-4 w-4" />
              طلب تجريبي
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="المستخدمون" value={formatNumber(totalUsers)} icon={Users} isLoading={isOverviewLoading} subtitle="إجمالي الحسابات النشطة والمتوقعة" />
        <StatCard title="المركبات النشطة" value={formatNumber(activeVehicles)} icon={Car} isLoading={isOverviewLoading} subtitle="حركة اليوم والتفعيلات الحالية" />
        <StatCard title="إيراد مؤكد" value={formatSar(overview?.revenueMtd ?? paidRevenue)} icon={CreditCard} isLoading={isOverviewLoading} subtitle={`${paidOrders.length} طلب مدفوع`} />
        <StatCard title="أعطال آخر 24 ساعة" value={formatNumber(dtcsLast24h)} icon={Activity} isLoading={isOverviewLoading} subtitle={`${criticalIssues} حالة حرجة`} tone={kpiTone(criticalIssues, true)} />
        <StatCard title="طلبات بانتظار الدفع" value={formatNumber(pendingPayments.length)} icon={Timer} subtitle="تحتاج متابعة دفع" tone={kpiTone(pendingPayments.length, true)} />
        <StatCard title="قيد التشغيل" value={formatNumber(processingOrders.length)} icon={Wrench} subtitle="تجهيز، ربط جهاز، أو شحن" />
        <StatCard title="أجهزة جاهزة" value={formatNumber(availableDevices.length)} icon={Smartphone} subtitle={`${reservedDevices.length} محجوز أو مخصص`} />
        <StatCard title="حسابات الأسطول" value={formatNumber(fleets.length)} icon={Building2} subtitle="طلبات شركات ومتابعة مبيعات" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>مؤشرات التشغيل</CardTitle>
            <Badge variant="outline">اليوم</Badge>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">تفعيل الاشتراكات</span>
                <span dir="ltr">{activationRate}%</span>
              </div>
              <Progress value={activationRate} />
              <p className="text-xs text-muted-foreground">{waitingSubscriptions.length} اشتراك بانتظار التفعيل</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">جاهزية المخزون</span>
                <span dir="ltr">{deviceReadyRate}%</span>
              </div>
              <Progress value={deviceReadyRate} />
              <p className="text-xs text-muted-foreground">{devices.length} جهاز في السجل</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">مسار الشحن</span>
                <span>{formatNumber(shippingOrders.length)}</span>
              </div>
              <Progress value={orders.length ? Math.round((shippingOrders.length / orders.length) * 100) : 0} />
              <p className="text-xs text-muted-foreground">{pendingActivation.length} طلب ينتظر تفعيل الجهاز</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>روابط سريعة</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <QuickLink href="/admin/orders" icon={Package} title="الطلبات" subtitle="الدفع، الشحن، التفعيل" />
            <QuickLink href="/admin/devices" icon={Smartphone} title="الأجهزة" subtitle="المخزون والربط" />
            <QuickLink href="/admin/subscriptions" icon={CreditCard} title="الاشتراكات" subtitle="الحالة والتجديد" />
            <QuickLink href="/admin/fleet-accounts" icon={Building2} title="الأسطول" subtitle="طلبات الشركات" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>أحدث الطلبات</CardTitle>
            <Link href="/admin/orders">
              <Button variant="outline" size="sm">عرض الكل</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {latestOrders.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      {["الطلب", "العميل", "الباقة", "المبلغ", "الدفع", "التشغيل", "الإجراء"].map((head) => (
                        <th key={head} className="p-3 text-right font-semibold">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {latestOrders.map((order) => (
                      <tr key={order.id} className="border-t">
                        <td className="p-3 font-bold">{order.orderNumber}</td>
                        <td className="p-3">{order.customer.fullName}</td>
                        <td className="p-3">{getPlanById(order.planId)?.nameAr ?? order.planId}</td>
                        <td className="p-3">{formatSar(order.totalSar)}</td>
                        <td className="p-3"><PaymentBadge status={order.paymentStatus} /></td>
                        <td className="p-3"><OrderStatusBadge status={order.orderStatus} /></td>
                        <td className="p-3">
                          <Link href={`/admin/orders/${order.id}`}>
                            <Button variant="outline" size="sm">فتح</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">لا توجد طلبات بعد. أنشئ طلبا تجريبيا لعرض مسار الإدارة.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>مهام تحتاج متابعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <WorkItem icon={Timer} title="مدفوعات معلقة" detail={`${pendingPayments.length} طلب لم يكتمل دفعه`} href="/admin/orders" level={pendingPayments.length ? "destructive" : "secondary"} />
            <WorkItem icon={Truck} title="تجهيز وشحن" detail={`${processingOrders.length} طلب يحتاج تجهيز أو تخصيص جهاز`} href="/admin/orders" />
            <WorkItem icon={Smartphone} title="تفعيل الأجهزة" detail={`${waitingSubscriptions.length + pendingActivation.length} حالة بانتظار الربط`} href="/admin/devices" />
            <WorkItem icon={Building2} title="طلبات الأسطول" detail={`${fleets.length} طلب شركة في السجل`} href="/admin/fleet-accounts" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>المخزون</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {devices.slice(0, 6).map((device) => (
              <div key={device.serialNumber} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <div className="font-bold">{device.serialNumber}</div>
                  <div className="text-xs text-muted-foreground">{device.batch}</div>
                </div>
                <DeviceStatusBadge status={device.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الاشتراكات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscriptions.slice(0, 6).map((sub) => (
              <div key={sub.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <div className="font-bold">{sub.customer}</div>
                  <div className="text-xs text-muted-foreground">{getPlanById(sub.planId)?.nameAr ?? sub.planId}</div>
                </div>
                <SubscriptionStatusBadge status={sub.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>التشخيص والأعطال</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isIssuesLoading || isDiagnosticsLoading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)
            ) : topIssues.length ? (
              topIssues.map((issue, index) => (
                <div key={`${issue.code}-${index}`} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <div className="font-bold" dir="ltr">{issue.code}</div>
                    <div className="line-clamp-1 text-xs text-muted-foreground">{issue.descriptionAr}</div>
                  </div>
                  <Badge variant={issue.severity === "critical" ? "destructive" : "outline"}>{issue.count}</Badge>
                </div>
              ))
            ) : latestDiagnostics.length ? (
              latestDiagnostics.map((session, index) => (
                <div key={`${session.plateNumber}-${session.startedAt}-${index}`} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <div className="font-bold">{session.vehicleMake} {session.vehicleModel}</div>
                    <div className="text-xs text-muted-foreground">{session.plateNumber}</div>
                  </div>
                  <Badge variant={(session.criticalDtcCount ?? 0) > 0 ? "destructive" : "outline"}>{session.dtcCount ?? 0} عطل</Badge>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">لا توجد أعطال أو جلسات تشخيص نشطة.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>الإيرادات الشهرية</CardTitle>
          <Link href="/admin/revenue">
            <Button variant="outline" size="sm">
              <BarChart3 className="ms-2 h-4 w-4" />
              المالية
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isRevenueLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : revenueData && revenueData.length > 0 ? (
            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 12, right: 18, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(value: number) => [formatSar(value), "الإيراد"]}
                  />
                  <Bar dataKey="subscriptionRevenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-sm text-muted-foreground">طلبات مدفوعة</div>
                <div className="mt-2 text-2xl font-black">{formatNumber(paidOrders.length)}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-sm text-muted-foreground">إيراد محلي</div>
                <div className="mt-2 text-2xl font-black">{formatSar(paidRevenue)}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-sm text-muted-foreground">متوسط الطلب</div>
                <div className="mt-2 text-2xl font-black">{formatSar(paidOrders.length ? Math.round(paidRevenue / paidOrders.length) : 0)}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <QuickLink href="/admin/users" icon={Users} title="المستخدمون والصلاحيات" subtitle="حسابات العملاء والأدوار" />
        <QuickLink href="/admin/reports" icon={BarChart3} title="التقارير" subtitle="تصدير ومؤشرات تشغيلية" />
        <QuickLink href="/admin/settings" icon={CheckCircle2} title="إعدادات الإدارة" subtitle="بوابات الدفع والشحن والتشغيل" />
      </div>

      {criticalIssues > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="h-5 w-5" />
          توجد حالات حرجة في آخر 24 ساعة. راجع صفحة التشخيص والأعطال قبل إغلاق اليوم التشغيلي.
        </div>
      )}
    </div>
  );
}
