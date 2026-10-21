import { useState } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";

import { FleetSetupStepper, FormField, PageHeader } from "@/components/commerce/commerce-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const steps = ["معلومات الأسطول", "إضافة المركبات", "دعوة الفريق", "المدير الأساسي", "المراجعة"];

type FleetVehicle = { id: string; plate: string; make: string; model: string };
type FleetMember = { id: string; name: string; email: string; role: string };

export default function FleetSetup() {
  const [step, setStep] = useState(0);
  const [fleetName, setFleetName] = useState("");
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([{ id: "v1", plate: "", make: "", model: "" }]);
  const [members, setMembers] = useState<FleetMember[]>([{ id: "m1", name: "", email: "", role: "مشرف" }]);
  const [admin, setAdmin] = useState("");
  const [done, setDone] = useState(false);

  const addVehicle = () => setVehicles((items) => [...items, { id: `v${Date.now()}`, plate: "", make: "", model: "" }]);
  const addMember = () => setMembers((items) => [...items, { id: `m${Date.now()}`, name: "", email: "", role: "مشرف" }]);

  const next = () => {
    if (step < steps.length - 1) setStep((value) => value + 1);
    else setDone(true);
  };

  return (
    <main className="min-h-screen p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader title="إعداد حساب الأسطول" description="تجربة scaffold محلية لما بعد اعتماد عرض المبيعات." />
        <FleetSetupStepper steps={steps} activeIndex={step} />
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>{done ? "تم إعداد الأسطول" : steps[step]}</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {done ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                <p className="font-bold">تم حفظ إعداد الأسطول محليًا وجاهز للتكامل لاحقًا.</p>
              </div>
            ) : step === 0 ? (
              <FormField label="اسم الأسطول"><Input value={fleetName} onChange={(event) => setFleetName(event.target.value)} /></FormField>
            ) : step === 1 ? (
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <Input placeholder="اللوحة" value={vehicle.plate} onChange={(event) => setVehicles((items) => items.map((item) => item.id === vehicle.id ? { ...item, plate: event.target.value } : item))} />
                    <Input placeholder="الشركة" value={vehicle.make} onChange={(event) => setVehicles((items) => items.map((item) => item.id === vehicle.id ? { ...item, make: event.target.value } : item))} />
                    <Input placeholder="الموديل" value={vehicle.model} onChange={(event) => setVehicles((items) => items.map((item) => item.id === vehicle.id ? { ...item, model: event.target.value } : item))} />
                    <Button variant="outline" size="icon" onClick={() => setVehicles((items) => items.filter((item) => item.id !== vehicle.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addVehicle}><Plus className="ml-2 h-4 w-4" />إضافة مركبة</Button>
              </div>
            ) : step === 2 ? (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <Input placeholder="الاسم" value={member.name} onChange={(event) => setMembers((items) => items.map((item) => item.id === member.id ? { ...item, name: event.target.value } : item))} />
                    <Input placeholder="البريد" value={member.email} onChange={(event) => setMembers((items) => items.map((item) => item.id === member.id ? { ...item, email: event.target.value } : item))} />
                    <Input placeholder="الدور" value={member.role} onChange={(event) => setMembers((items) => items.map((item) => item.id === member.id ? { ...item, role: event.target.value } : item))} />
                    <Button variant="outline" size="icon" onClick={() => setMembers((items) => items.filter((item) => item.id !== member.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addMember}><Plus className="ml-2 h-4 w-4" />دعوة عضو</Button>
              </div>
            ) : step === 3 ? (
              <FormField label="المدير الأساسي"><Input value={admin} onChange={(event) => setAdmin(event.target.value)} placeholder="اسم أو بريد المدير" /></FormField>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-muted p-4"><div className="text-sm text-muted-foreground">الأسطول</div><div className="font-bold">{fleetName || "غير محدد"}</div></div>
                <div className="rounded-xl bg-muted p-4"><div className="text-sm text-muted-foreground">المركبات</div><div className="font-bold">{vehicles.length}</div></div>
                <div className="rounded-xl bg-muted p-4"><div className="text-sm text-muted-foreground">الأعضاء</div><div className="font-bold">{members.length}</div></div>
              </div>
            )}
            {!done && (
              <div className="flex gap-2">
                <Button className="rounded-xl" onClick={next}>{step === steps.length - 1 ? "اعتماد الإعداد" : "التالي"}</Button>
                <Button variant="outline" className="rounded-xl" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>السابق</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
