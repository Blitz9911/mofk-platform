import { useState } from "react";
import { Link } from "wouter";

import { FormField, PageHeader } from "@/components/commerce/commerce-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { commerceService, FleetInquiry } from "@/services/mockCommerceService";

type FleetForm = {
  companyName: string;
  contactPerson: string;
  workEmail: string;
  phone: string;
  vehicleCount: string;
  userCount: string;
  commercialRegistration: string;
  taxNumber: string;
  notes: string;
};

const initialForm: FleetForm = {
  companyName: "",
  contactPerson: "",
  workEmail: "",
  phone: "",
  vehicleCount: "",
  userCount: "",
  commercialRegistration: "",
  taxNumber: "",
  notes: "",
};

export default function FleetContact() {
  const [form, setForm] = useState<FleetForm>(initialForm);
  const [submitted, setSubmitted] = useState<FleetInquiry | null>(null);
  const [touched, setTouched] = useState(false);
  const valid =
    form.companyName.trim() &&
    form.contactPerson.trim() &&
    /^\S+@\S+\.\S+$/.test(form.workEmail) &&
    form.phone.trim() &&
    Number(form.vehicleCount) > 0 &&
    Number(form.userCount) > 0;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    setSubmitted(
      commerceService.submitFleetInquiry({
        companyName: form.companyName,
        contactPerson: form.contactPerson,
        workEmail: form.workEmail,
        phone: form.phone,
        vehicleCount: Number(form.vehicleCount),
        userCount: Number(form.userCount),
        commercialRegistration: form.commercialRegistration || undefined,
        taxNumber: form.taxNumber || undefined,
        notes: form.notes || undefined,
      }),
    );
  };

  if (submitted) {
    return (
      <main className="min-h-screen p-4 md:p-8" dir="rtl">
        <div className="mx-auto max-w-3xl space-y-6">
          <PageHeader title="تم إرسال طلب الأسطول" description="سيتم مراجعة الطلب من فريق المبيعات قبل إصدار عرض واعتماد الإعداد." />
          <Card className="rounded-2xl">
            <CardContent className="space-y-4 p-8">
              <div className="rounded-xl bg-muted p-4">
                <div className="text-sm text-muted-foreground">رقم المرجع</div>
                <div className="text-2xl font-black">{submitted.id}</div>
              </div>
              <ul className="space-y-2 text-sm leading-7 text-muted-foreground">
                <li>1. مراجعة بيانات الشركة وعدد المركبات.</li>
                <li>2. إرسال عرض سعر واعتماد مبدئي.</li>
                <li>3. الانتقال إلى إعداد حساب الأسطول بعد الموافقة.</li>
              </ul>
              <div className="flex gap-2">
                <Link href="/"><Button>العودة للرئيسية</Button></Link>
                <Link href="/fleet/setup"><Button variant="outline">معاينة إعداد الأسطول</Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const update = (key: keyof FleetForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <main className="min-h-screen p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title="تواصل مع مبيعات الأسطول" description="هذه الباقة لا تستخدم checkout الأفراد. يبدأ المسار بمراجعة مبيعات ثم إعداد تشغيلي." />
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>بيانات الشركة</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField label="اسم الشركة" error={touched && !form.companyName ? "مطلوب" : undefined}><Input value={form.companyName} onChange={(event) => update("companyName", event.target.value)} /></FormField>
            <FormField label="مسؤول التواصل" error={touched && !form.contactPerson ? "مطلوب" : undefined}><Input value={form.contactPerson} onChange={(event) => update("contactPerson", event.target.value)} /></FormField>
            <FormField label="البريد العملي" error={touched && !/^\S+@\S+\.\S+$/.test(form.workEmail) ? "بريد غير صحيح" : undefined}><Input value={form.workEmail} onChange={(event) => update("workEmail", event.target.value)} /></FormField>
            <FormField label="رقم الجوال" error={touched && !form.phone ? "مطلوب" : undefined}><Input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></FormField>
            <FormField label="عدد المركبات" error={touched && Number(form.vehicleCount) <= 0 ? "أدخل رقمًا صحيحًا" : undefined}><Input type="number" value={form.vehicleCount} onChange={(event) => update("vehicleCount", event.target.value)} /></FormField>
            <FormField label="عدد المستخدمين المتوقع" error={touched && Number(form.userCount) <= 0 ? "أدخل رقمًا صحيحًا" : undefined}><Input type="number" value={form.userCount} onChange={(event) => update("userCount", event.target.value)} /></FormField>
            <FormField label="السجل التجاري اختياري"><Input value={form.commercialRegistration} onChange={(event) => update("commercialRegistration", event.target.value)} /></FormField>
            <FormField label="الرقم الضريبي اختياري"><Input value={form.taxNumber} onChange={(event) => update("taxNumber", event.target.value)} /></FormField>
            <div className="md:col-span-2">
              <FormField label="ملاحظات"><Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} /></FormField>
            </div>
            <Button className="h-11 rounded-xl md:col-span-2" onClick={submit}>إرسال الطلب</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
