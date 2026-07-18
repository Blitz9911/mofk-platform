import { useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";

import { BillingCycle, getPlanById } from "@/config/plans";
import {
  BillingCycleSelector,
  CheckoutStepper,
  CheckoutSummary,
  CustomerInformationForm,
  PageHeader,
  ShippingAddressForm,
} from "@/components/commerce/commerce-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { commerceService, CustomerInfo, ShippingAddress } from "@/services/mockCommerceService";

const steps = ["اختيار الباقة", "البيانات", "الشحن", "المراجعة", "الدفع"];

const emptyCustomer: CustomerInfo = { fullName: "", phone: "", email: "" };
const emptyShipping: ShippingAddress = {
  city: "",
  district: "",
  street: "",
  buildingNumber: "",
  postalCode: "",
  additionalNumber: "",
  notes: "",
};

export default function Checkout() {
  const [, params] = useRoute("/checkout/:planId");
  const [, setLocation] = useLocation();
  const plan = getPlanById(params?.planId);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [customer, setCustomer] = useState<CustomerInfo>(emptyCustomer);
  const [shipping, setShipping] = useState<ShippingAddress>(emptyShipping);
  const [touched, setTouched] = useState(false);

  const errors = useMemo(() => {
    const customerErrors: Partial<Record<keyof CustomerInfo, string>> = {};
    const shippingErrors: Partial<Record<keyof ShippingAddress, string>> = {};
    if (!customer.fullName.trim()) customerErrors.fullName = "اكتب الاسم الكامل";
    if (!/^05\d{8}$/.test(customer.phone.trim())) customerErrors.phone = "اكتب رقم جوال سعودي صحيح";
    if (!/^\S+@\S+\.\S+$/.test(customer.email.trim())) customerErrors.email = "اكتب بريدًا إلكترونيًا صحيحًا";
    (["city", "district", "street", "buildingNumber", "postalCode", "additionalNumber"] as const).forEach((key) => {
      if (!shipping[key].trim()) shippingErrors[key] = "هذا الحقل مطلوب";
    });
    return { customerErrors, shippingErrors };
  }, [customer, shipping]);

  const valid =
    Object.keys(errors.customerErrors).length === 0 &&
    Object.keys(errors.shippingErrors).length === 0;

  if (!plan) {
    return (
      <main className="min-h-screen p-4 md:p-8" dir="rtl">
        <div className="mx-auto max-w-3xl space-y-4">
          <PageHeader title="الباقة غير موجودة" description="تحقق من الرابط أو ارجع لاختيار باقة صحيحة." />
          <Link href="/pricing"><Button>العودة للباقات</Button></Link>
        </div>
      </main>
    );
  }

  if (plan.isFree) {
    return (
      <main className="min-h-screen p-4 md:p-8" dir="rtl">
        <div className="mx-auto max-w-3xl space-y-4">
          <PageHeader title="الباقة المجانية لا تحتاج دفع" description="فعّلها مباشرة من صفحة الإعداد." />
          <Link href="/onboarding"><Button>تفعيل المجانية</Button></Link>
        </div>
      </main>
    );
  }

  if (plan.isFleet) {
    return (
      <main className="min-h-screen p-4 md:p-8" dir="rtl">
        <div className="mx-auto max-w-3xl space-y-4">
          <PageHeader title="الأسطول يبدأ عبر المبيعات" description="هذه الباقة لا تستخدم checkout الأفراد." />
          <Link href="/fleet-contact"><Button>تواصل مع المبيعات</Button></Link>
        </div>
      </main>
    );
  }

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const order = commerceService.createMockOrder({ plan, billingCycle: cycle, customer, shippingAddress: shipping });
    setLocation(`/payment/${order.id}`);
  };

  return (
    <main className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="إتمام الاشتراك"
          description="الدفع يتم في صفحة منفصلة جاهزة لتكامل Moyasar. لا يتم جمع بيانات بطاقة هنا."
        />
        <CheckoutStepper steps={steps} activeIndex={1} />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader><CardTitle>الباقة المحددة</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h2 className="text-2xl font-black">{plan.nameAr}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.descriptionAr}</p>
                </div>
                <BillingCycleSelector plan={plan} value={cycle} onChange={setCycle} />
                <div className="grid gap-2 md:grid-cols-2">
                  {plan.featuresAr.map((feature) => <div key={feature} className="rounded-xl bg-muted/50 p-3 text-sm">{feature}</div>)}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader><CardTitle>بيانات العميل</CardTitle></CardHeader>
              <CardContent>
                <CustomerInformationForm
                  value={customer}
                  onChange={setCustomer}
                  errors={touched ? errors.customerErrors : {}}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader><CardTitle>عنوان الشحن</CardTitle></CardHeader>
              <CardContent>
                <ShippingAddressForm
                  value={shipping}
                  onChange={setShipping}
                  errors={touched ? errors.shippingErrors : {}}
                />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <CheckoutSummary plan={plan} cycle={cycle} />
            <Button className="h-12 w-full rounded-xl font-bold" onClick={submit} disabled={touched && !valid}>
              متابعة إلى الدفع
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
