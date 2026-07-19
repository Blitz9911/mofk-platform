import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

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

const steps = ["الباقة", "الحساب", "الشحن", "الدفع", "انتظار التأكيد"];
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

export default function CheckoutPlan() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const plan = getPlanById(params.get("plan") || "plus");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [customer, setCustomer] = useState<CustomerInfo>(emptyCustomer);
  const [shipping, setShipping] = useState<ShippingAddress>(emptyShipping);
  const [touched, setTouched] = useState(false);

  const errors = useMemo(() => {
    const customerErrors: Partial<Record<keyof CustomerInfo, string>> = {};
    const shippingErrors: Partial<Record<keyof ShippingAddress, string>> = {};
    if (!customer.fullName.trim()) customerErrors.fullName = "اكتب الاسم الكامل";
    if (!/^05\d{8}$/.test(customer.phone.trim())) customerErrors.phone = "اكتب رقم جوال سعودي صحيح";
    if (!/^\S+@\S+\.\S+$/.test(customer.email.trim())) customerErrors.email = "اكتب بريدًا صحيحًا";
    (["city", "district", "street", "buildingNumber", "postalCode", "additionalNumber"] as const).forEach((key) => {
      if (!shipping[key].trim()) shippingErrors[key] = "هذا الحقل مطلوب";
    });
    return { customerErrors, shippingErrors };
  }, [customer, shipping]);

  const valid = Object.keys(errors.customerErrors).length === 0 && Object.keys(errors.shippingErrors).length === 0;

  const submit = () => {
    setTouched(true);
    if (!plan || plan.isFree || plan.isFleet || !valid) return;
    const order = commerceService.createMockOrder({ plan, billingCycle: cycle, customer, shippingAddress: shipping });
    window.sessionStorage.setItem("mfk-current-order-id", order.id);
    setLocation("/checkout/payment");
  };

  if (!plan || plan.isFree || plan.isFleet) {
    return (
      <main className="min-h-screen p-4 md:p-8" dir="rtl">
        <PageHeader title="مسار checkout غير متاح لهذه الباقة" description="اختر Plus أو Pro لإكمال الدفع الذاتي، أو استخدم مسار الأسطول للمبيعات." />
        <Link href="/pricing"><Button className="mt-4">العودة للباقات</Button></Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="تأكيد الخطة والشحن" description="الجهاز رسوم مرة واحدة، والاشتراك شهري أو سنوي حسب اختيارك." />
        <CheckoutStepper steps={steps} activeIndex={2} />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader><CardTitle>{plan.nameAr}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-7 text-muted-foreground">{plan.descriptionAr}</p>
                <BillingCycleSelector plan={plan} value={cycle} onChange={setCycle} />
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader><CardTitle>بيانات العميل</CardTitle></CardHeader>
              <CardContent>
                <CustomerInformationForm value={customer} onChange={setCustomer} errors={touched ? errors.customerErrors : {}} />
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader><CardTitle>عنوان التوصيل</CardTitle></CardHeader>
              <CardContent>
                <ShippingAddressForm value={shipping} onChange={setShipping} errors={touched ? errors.shippingErrors : {}} />
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
