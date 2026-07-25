import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";

const CONSENT_KEY = "mofk-cookie-consent";
const CONSENT_COOKIE = "mofk_cookie_consent";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type CookieConsentValue = "accepted" | "rejected";

function setConsentCookie(value: CookieConsentValue) {
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax`;
}

function getStoredConsent(): CookieConsentValue | null {
  const storedValue = window.localStorage.getItem(CONSENT_KEY);

  if (storedValue === "accepted" || storedValue === "rejected") {
    return storedValue;
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")[1];

  if (cookieValue === "accepted" || cookieValue === "rejected") {
    return cookieValue;
  }

  return null;
}

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(getStoredConsent() === null);
  }, []);

  const saveConsent = (value: CookieConsentValue) => {
    window.localStorage.setItem(CONSENT_KEY, value);
    setConsentCookie(value);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-4xl rounded-lg border bg-background/95 p-4 text-foreground shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:bottom-5 sm:p-5"
      dir="rtl"
      role="dialog"
      aria-live="polite"
      aria-label="الموافقة على الكوكيز"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Cookie className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold">موافقة الكوكيز</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              نستخدم الكوكيز الضرورية لتشغيل الحساب والجلسة، وقد نستخدم كوكيز
              تحسين التجربة بعد موافقتك. يمكنك متابعة التفاصيل في{" "}
              <Link href="/privacy" className="font-semibold text-primary underline-offset-4 hover:underline">
                سياسة الخصوصية
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => saveConsent("rejected")}>
            الضروري فقط
          </Button>
          <Button onClick={() => saveConsent("accepted")}>أوافق</Button>
        </div>
      </div>
    </div>
  );
}
