import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/commerce/commerce-components";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [activated, setActivated] = useState(false);

  const activateFreePlan = () => {
    window.localStorage.setItem("mfk-active-plan", "free");
    setActivated(true);
  };

  return (
    <main className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="إعداد حساب مفك"
          description="هذه الخطوة تفعّل الباقة المجانية مباشرة بدون دفع أو شحن أو جهاز."
        />
        <Card className="rounded-2xl">
          <CardContent className="space-y-6 p-8 text-center">
            {activated ? (
              <>
                <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
                <div>
                  <h2 className="text-2xl font-black">تم تفعيل الباقة المجانية</h2>
                  <p className="mt-2 text-sm text-muted-foreground">يمكنك الدخول للتطبيق وإضافة مركبتك الأولى الآن.</p>
                </div>
                <Button className="rounded-xl" onClick={() => setLocation("/app")}>الدخول للتطبيق</Button>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-2xl font-black">ابدأ مجانًا</h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    لن نطلب بيانات دفع، ولن ننشئ طلب شحن، ولن يتم ربط جهاز في هذه الباقة.
                  </p>
                </div>
                <Button className="rounded-xl" onClick={activateFreePlan}>تفعيل الباقة المجانية</Button>
                <Link href="/pricing"><Button variant="outline">مراجعة الباقات</Button></Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
