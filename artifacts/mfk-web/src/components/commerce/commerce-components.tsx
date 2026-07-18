import { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  Package,
  Truck,
} from "lucide-react";
import { Link } from "wouter";

import {
  BillingCycle,
  PlanConfig,
  formatPlanVehicles,
  formatSar,
  getPlanPrice,
} from "@/config/plans";
import {
  DeviceStatus,
  MockOrder,
  OrderStatus,
  PaymentStatus,
  SubscriptionStatus,
} from "@/services/mockCommerceService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-destructive">{message}</p>;
}

export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label className="mb-2 block text-sm font-semibold">{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

export function PlanBadge({ children }: { children: ReactNode }) {
  return <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">{children}</Badge>;
}

export function PlanCard({
  plan,
  cycle,
  onSelect,
  selected,
}: {
  plan: PlanConfig;
  cycle: BillingCycle;
  selected?: boolean;
  onSelect: () => void;
}) {
  const price = getPlanPrice(plan, cycle);
  return (
    <Card
      className={cn(
        "relative flex min-h-[430px] flex-col rounded-2xl border-border/80 bg-card/90 transition hover:shadow-md",
        selected && "border-primary shadow-md",
      )}
    >
      {plan.popular && <div className="absolute left-4 top-4"><PlanBadge>الأكثر اختيارًا</PlanBadge></div>}
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl">{plan.nameAr}</CardTitle>
        <p className="min-h-12 text-sm leading-7 text-muted-foreground">{plan.descriptionAr}</p>
        <div>
          {plan.isFleet ? (
            <div className="text-2xl font-black">حسب العرض</div>
          ) : (
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black">{formatSar(price)}</span>
              <span className="pb-1 text-sm text-muted-foreground">
                {plan.isFree ? "ر.س" : cycle === "yearly" ? "ر.س / سنة" : "ر.س / شهر"}
              </span>
            </div>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.includesDevice ? `يشمل ${plan.includedDeviceQuantity || "حسب العقد"} جهاز` : "بدون جهاز"}
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>{formatPlanVehicles(plan)}</span>
          </div>
          {plan.featuresAr.slice(0, 5).map((feature) => (
            <div key={feature} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
        <Button className="mt-auto h-11 rounded-xl font-bold" onClick={onSelect}>
          {plan.ctaLabelAr}
        </Button>
      </CardContent>
    </Card>
  );
}

export function CheckoutStepper({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {steps.map((step, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <div
            key={step}
            className={cn(
              "flex items-center gap-2 rounded-xl border p-3 text-sm",
              done || active ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground",
            )}
          >
            {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            <span className="truncate font-semibold">{step}</span>
          </div>
        );
      })}
    </div>
  );
}

export function BillingCycleSelector({
  plan,
  value,
  onChange,
}: {
  plan: PlanConfig;
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  const cycles: BillingCycle[] = [
    ...(plan.supportsMonthly ? (["monthly"] as BillingCycle[]) : []),
    ...(plan.supportsYearly ? (["yearly"] as BillingCycle[]) : []),
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {cycles.map((cycle) => (
        <button
          key={cycle}
          type="button"
          onClick={() => onChange(cycle)}
          className={cn(
            "rounded-xl border p-3 text-right transition",
            value === cycle ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
          )}
        >
          <div className="font-bold">{cycle === "monthly" ? "شهري" : "سنوي"}</div>
          <div className="text-xs text-muted-foreground">{formatSar(getPlanPrice(plan, cycle))} ر.س</div>
        </button>
      ))}
    </div>
  );
}

export function CheckoutSummary({ plan, cycle }: { plan: PlanConfig; cycle: BillingCycle }) {
  const amount = getPlanPrice(plan, cycle) ?? 0;
  const vat = Math.round(amount * 0.15);
  return (
    <Card className="sticky top-20 rounded-2xl">
      <CardHeader>
        <CardTitle>ملخص الطلب</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <SummaryRow label="الباقة" value={plan.nameAr} />
        <SummaryRow label="دورة الفوترة" value={cycle === "monthly" ? "شهري" : "سنوي"} />
        <SummaryRow label="قيمة الاشتراك" value={`${formatSar(amount)} ر.س`} />
        <SummaryRow label="الجهاز" value={plan.includesDevice ? "مشمول" : "غير مطلوب"} />
        <SummaryRow label="الشحن" value="0 ر.س" />
        <SummaryRow label="ضريبة القيمة المضافة" value={`${formatSar(vat)} ر.س`} />
        <div className="border-t pt-3">
          <SummaryRow label="الإجمالي" value={`${formatSar(amount + vat)} ر.س`} strong />
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", strong && "text-base font-black")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-left font-semibold">{value}</span>
    </div>
  );
}

export function PaymentGatewayPlaceholder({
  processing,
  failed,
  onPay,
}: {
  processing: boolean;
  failed: boolean;
  onPay: () => void;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          بوابة الدفع
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
          هذا موضع تكامل Moyasar القادم. لا يتم جمع بيانات بطاقة داخل مفك في هذه المحاكاة.
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {["مدى", "Visa / Mastercard", "Apple Pay"].map((method) => (
            <div key={method} className="rounded-xl border p-3 text-center text-sm font-semibold">{method}</div>
          ))}
        </div>
        {failed && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            تعذر إتمام المحاولة التجريبية. يمكنك إعادة المحاولة.
          </div>
        )}
        <Button className="h-11 w-full rounded-xl font-bold" onClick={onPay} disabled={processing}>
          {processing ? "جارٍ إرسال الطلب للتحقق..." : "محاكاة انتقال آمن للدفع"}
        </Button>
        <p className="text-xs leading-6 text-muted-foreground">
          TODO: تهيئة Moyasar، تأكيد webhook، والتحقق من الدفع في الخادم قبل تفعيل الطلب.
        </p>
      </CardContent>
    </Card>
  );
}

export function PaymentStatusCard({
  status,
  orderId,
}: {
  status: "success" | "pending" | "failed";
  orderId?: string | null;
}) {
  const meta = {
    success: {
      title: "تم استلام نتيجة الدفع",
      body: "سنفترض في الواجهة أن الخادم هو مصدر الحقيقة النهائي، ويمكنك متابعة الطلب الآن.",
      icon: CheckCircle2,
      color: "text-green-500",
    },
    pending: {
      title: "بانتظار التحقق",
      body: "ننتظر تأكيد بوابة الدفع. هذه الصفحة لا تفعّل الاشتراك وحدها.",
      icon: Clock,
      color: "text-amber-500",
    },
    failed: {
      title: "تعذر الدفع",
      body: "لم تكتمل العملية. يمكنك إعادة المحاولة من صفحة الدفع.",
      icon: AlertCircle,
      color: "text-destructive",
    },
  }[status];
  const Icon = meta.icon;
  return (
    <Card className="mx-auto max-w-2xl rounded-2xl text-center">
      <CardContent className="space-y-5 p-8">
        <Icon className={cn("mx-auto h-12 w-12", meta.color)} />
        <div>
          <h1 className="text-2xl font-black">{meta.title}</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{meta.body}</p>
        </div>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          {orderId && status !== "failed" && <Link href={`/orders/${orderId}`}><Button>تتبع الطلب</Button></Link>}
          {orderId && status === "failed" && <Link href={`/payment/${orderId}`}><Button>إعادة المحاولة</Button></Link>}
          <Link href="/app"><Button variant="outline">العودة للتطبيق</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}

export const orderStatusMap: Record<OrderStatus, { label: string; description: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_payment: { label: "بانتظار الدفع", description: "تم إنشاء الطلب ولم يتم تأكيد الدفع.", icon: CreditCard, variant: "outline" },
  paid: { label: "مدفوع", description: "تم تأكيد الدفع.", icon: CheckCircle2, variant: "secondary" },
  processing: { label: "قيد المعالجة", description: "فريق العمليات يجهز الطلب.", icon: Clock, variant: "secondary" },
  device_assigned: { label: "تم تعيين الجهاز", description: "تم ربط جهاز بالطلب.", icon: Package, variant: "secondary" },
  ready_to_ship: { label: "جاهز للشحن", description: "الطلب جاهز للتسليم لشركة الشحن.", icon: Package, variant: "secondary" },
  shipped: { label: "تم الشحن", description: "الطلب في الطريق.", icon: Truck, variant: "secondary" },
  delivered: { label: "تم التسليم", description: "وصل الجهاز للعميل.", icon: CheckCircle2, variant: "secondary" },
  waiting_activation: { label: "بانتظار التفعيل", description: "يتبقى تفعيل الجهاز على المركبة.", icon: Clock, variant: "default" },
  completed: { label: "مكتمل", description: "تم تفعيل الاشتراك والجهاز.", icon: CheckCircle2, variant: "default" },
  cancelled: { label: "ملغي", description: "تم إلغاء الطلب.", icon: AlertCircle, variant: "destructive" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = orderStatusMap[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const labels: Record<PaymentStatus, string> = {
    pending: "بانتظار الدفع",
    paid: "مدفوع",
    failed: "فشل",
    refunded: "مسترد",
  };
  const variant = status === "paid" ? "default" : status === "failed" ? "destructive" : "outline";
  return <Badge variant={variant}>{labels[status]}</Badge>;
}

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  const labels: Record<DeviceStatus, string> = {
    available: "متاح",
    reserved: "محجوز",
    assigned: "معين",
    shipped: "مشحون",
    activated: "مفعل",
    defective: "معطل",
  };
  return <Badge variant={status === "defective" ? "destructive" : status === "activated" ? "default" : "outline"}>{labels[status]}</Badge>;
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  const labels: Record<SubscriptionStatus, string> = {
    pending_activation: "بانتظار التفعيل",
    active: "نشط",
    expired: "منتهي",
    cancelled: "ملغي",
  };
  return <Badge variant={status === "active" ? "default" : status === "cancelled" ? "destructive" : "outline"}>{labels[status]}</Badge>;
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const statuses = Object.keys(orderStatusMap).filter((item) => item !== "cancelled") as OrderStatus[];
  const activeIndex = statuses.indexOf(status);
  return (
    <div className="space-y-3">
      {statuses.map((item, index) => {
        const meta = orderStatusMap[item];
        const Icon = meta.icon;
        const done = activeIndex >= index;
        return (
          <div key={item} className="flex gap-3">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border", done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold">{meta.label}</div>
              <p className="text-sm text-muted-foreground">{meta.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminKpiCard({ title, value, icon: Icon }: { title: string; value: ReactNode; icon: typeof Package }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
    </Card>
  );
}

export function AdminFilterBar({ children }: { children?: ReactNode }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="grid gap-3 p-4 md:grid-cols-4">
        <Input placeholder="بحث..." />
        {children}
      </CardContent>
    </Card>
  );
}

export function LoadingSkeleton() {
  return <div className="h-32 animate-pulse rounded-2xl bg-muted" />;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center">
      <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="font-bold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function CustomerInformationForm({
  value,
  errors,
  onChange,
}: {
  value: { fullName: string; phone: string; email: string };
  errors: Partial<Record<"fullName" | "phone" | "email", string>>;
  onChange: (value: { fullName: string; phone: string; email: string }) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <FormField label="الاسم الكامل" error={errors.fullName}>
        <Input value={value.fullName} onChange={(event) => onChange({ ...value, fullName: event.target.value })} />
      </FormField>
      <FormField label="رقم الجوال" error={errors.phone}>
        <Input value={value.phone} onChange={(event) => onChange({ ...value, phone: event.target.value })} />
      </FormField>
      <FormField label="البريد الإلكتروني" error={errors.email}>
        <Input value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} />
      </FormField>
    </div>
  );
}

type ShippingFormValue = {
  city: string;
  district: string;
  street: string;
  buildingNumber: string;
  postalCode: string;
  additionalNumber: string;
  notes?: string;
};

export function ShippingAddressForm({
  value,
  errors,
  onChange,
}: {
  value: ShippingFormValue;
  errors: Partial<Record<keyof ShippingFormValue, string>>;
  onChange: (value: ShippingFormValue) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField label="المدينة" error={errors.city}><Input value={value.city} onChange={(event) => onChange({ ...value, city: event.target.value })} /></FormField>
      <FormField label="الحي" error={errors.district}><Input value={value.district} onChange={(event) => onChange({ ...value, district: event.target.value })} /></FormField>
      <FormField label="الشارع" error={errors.street}><Input value={value.street} onChange={(event) => onChange({ ...value, street: event.target.value })} /></FormField>
      <FormField label="رقم المبنى" error={errors.buildingNumber}><Input value={value.buildingNumber} onChange={(event) => onChange({ ...value, buildingNumber: event.target.value })} /></FormField>
      <FormField label="الرمز البريدي" error={errors.postalCode}><Input value={value.postalCode} onChange={(event) => onChange({ ...value, postalCode: event.target.value })} /></FormField>
      <FormField label="الرقم الإضافي" error={errors.additionalNumber}><Input value={value.additionalNumber} onChange={(event) => onChange({ ...value, additionalNumber: event.target.value })} /></FormField>
      <div className="md:col-span-2">
        <FormField label="ملاحظات التسليم">
          <Textarea value={value.notes ?? ""} onChange={(event) => onChange({ ...value, notes: event.target.value })} />
        </FormField>
      </div>
    </div>
  );
}

export function DeviceActivationForm({
  serial,
  code,
  vehicle,
  onSerial,
  onCode,
  onVehicle,
}: {
  serial: string;
  code: string;
  vehicle: string;
  onSerial: (value: string) => void;
  onCode: (value: string) => void;
  onVehicle: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <FormField label="Serial Number"><Input value={serial} onChange={(event) => onSerial(event.target.value)} placeholder="MFK-0001" /></FormField>
      <FormField label="Activation Code"><Input value={code} onChange={(event) => onCode(event.target.value)} placeholder="123456" /></FormField>
      <FormField label="المركبة"><Input value={vehicle} onChange={(event) => onVehicle(event.target.value)} placeholder="Toyota Camry" /></FormField>
    </div>
  );
}

export function FleetSetupStepper({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return <CheckoutStepper steps={steps} activeIndex={activeIndex} />;
}

export function AdminOrdersTable({ orders }: { orders: MockOrder[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            {["رقم الطلب", "العميل", "الجوال", "الباقة", "الفوترة", "المبلغ", "الدفع", "التشغيل", "تاريخ الإنشاء", "الموظف", "الإجراء"].map((head) => (
              <th key={head} className="p-3 text-right font-semibold">{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t">
              <td className="p-3 font-bold">{order.orderNumber}</td>
              <td className="p-3">{order.customer.fullName}</td>
              <td className="p-3">{order.customer.phone}</td>
              <td className="p-3">{order.planId}</td>
              <td className="p-3">{order.billingCycle === "monthly" ? "شهري" : "سنوي"}</td>
              <td className="p-3">{formatSar(order.totalSar)} ر.س</td>
              <td className="p-3"><PaymentBadge status={order.paymentStatus} /></td>
              <td className="p-3"><OrderStatusBadge status={order.orderStatus} /></td>
              <td className="p-3">{new Date(order.createdAt).toLocaleDateString("ar-SA")}</td>
              <td className="p-3">{order.assignedEmployee ?? "غير معين"}</td>
              <td className="p-3"><Link href={`/admin/orders/${order.id}`}><Button size="sm" variant="outline">فتح</Button></Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
