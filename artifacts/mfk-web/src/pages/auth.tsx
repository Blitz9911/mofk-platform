import { Link } from "wouter";
import { LogIn, UserPlus } from "lucide-react";

import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function authTarget(path: "login" | "register") {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "/app";
  const plan = params.get("plan");
  const target = new URLSearchParams({ next });
  if (plan) target.set("plan", plan);
  return `/${path}?${target.toString()}`;
}

export default function Auth() {
  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan");

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <main className="mx-auto flex min-h-[calc(100vh-160px)] max-w-4xl items-center px-4 py-28">
        <Card className="w-full rounded-2xl">
          <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_320px] md:p-8">
            <div>
              <p className="text-sm font-bold text-primary">قبل الدفع</p>
              <h1 className="mt-2 text-3xl font-black">سجّل دخولك لإكمال الاشتراك</h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                حسب مسار مفك، يتم إنشاء الحساب قبل الدفع حتى يرتبط الطلب والاشتراك والشحنة بالمستخدم الصحيح.
              </p>
              {plan && (
                <div className="mt-5 rounded-xl border bg-muted/40 p-4 text-sm">
                  الباقة المختارة: <span className="font-black" dir="ltr">{plan.toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Link href={authTarget("register")}>
                <Button className="h-12 w-full justify-start rounded-xl font-bold">
                  <UserPlus className="ms-2 h-4 w-4" />
                  إنشاء حساب جديد
                </Button>
              </Link>
              <Link href={authTarget("login")}>
                <Button variant="outline" className="h-12 w-full justify-start rounded-xl font-bold">
                  <LogIn className="ms-2 h-4 w-4" />
                  لدي حساب
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="ghost" className="h-11 w-full rounded-xl">رجوع للباقات</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
