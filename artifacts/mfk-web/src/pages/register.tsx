import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, KeyRound, Phone, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MfkLogo } from "@/components/MfkLogo";
import { useAuth, authApi } from "@/contexts/AuthContext";

type AuthStep = "phone" | "otp";

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const nextPath = params.get("next") || "/app";
  const selectedPlan = params.get("plan");

  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [isFallbackOtp, setIsFallbackOtp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const destination = useMemo(
    () => (selectedPlan ? `${nextPath}?plan=${selectedPlan}` : nextPath),
    [nextPath, selectedPlan],
  );

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    setIsLoading(true);
    try {
      const nextPhone = await authApi.requestPhoneOtp(phone);
      setNormalizedPhone(nextPhone);
      setIsFallbackOtp(authApi.isUsingFallbackPhoneOtp(nextPhone));
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "تعذر إرسال رمز التحقق.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    setIsLoading(true);
    try {
      const user = await authApi.verifyPhoneOtp(normalizedPhone || phone, otp);
      login(user);
      setLocation(destination);
    } catch (err: any) {
      setError(err.message || "رمز التحقق غير صحيح.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = () => {
    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set("next", destination);
    loginUrl.searchParams.set("google", "1");
    window.location.href = loginUrl.toString();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row" dir="rtl">
      <div className="hidden md:flex md:w-[45%] bg-card border-l border-border relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="relative z-10 max-w-sm">
          <Link href="/">
            <MfkLogo size="lg" className="mb-10 cursor-pointer" />
          </Link>
          <h1 className="text-4xl font-bold mb-5 leading-tight">
            ابدأ مع مفك<br />
            برقم جوالك فقط.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            لا تحتاج بريد أو كلمة مرور. رقم الجوال أو حساب Google يكفي لإنشاء حسابك والدخول بأمان.
          </p>
          <div className="space-y-4">
            {[
              "دخول سريع برمز تحقق لمرة واحدة",
              "حساب موحد للويب والتطبيق",
              "Google كخيار دخول بديل",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative min-h-screen">
        <div className="md:hidden absolute top-6 right-6">
          <Link href="/"><MfkLogo size="md" className="cursor-pointer" /></Link>
        </div>

        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-8">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-5">
                {step === "phone" ? <UserPlus size={28} /> : <KeyRound size={28} />}
              </div>
              <h2 className="text-3xl font-bold mb-2">إنشاء حساب</h2>
              <p className="text-muted-foreground">
                {step === "phone"
                  ? "أنشئ حسابك برقم الجوال أو تابع باستخدام Google."
                  : `أدخل رمز التحقق المرسل إلى ${normalizedPhone}.`}
              </p>
            </div>

            {step === "phone" ? (
              <form onSubmit={handleRequestOtp} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium block">رقم الجوال</label>
                  <div className="flex" dir="ltr">
                    <div className="flex items-center justify-center px-4 border border-r-0 border-border bg-muted rounded-l-md text-muted-foreground font-medium text-sm shrink-0 gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      +966
                    </div>
                    <Input
                      type="tel"
                      placeholder="5X XXX XXXX"
                      className="rounded-l-none text-left pl-4 font-mono text-base h-12"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 12))}
                      required
                      dir="ltr"
                      autoComplete="tel"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                    {error}
                  </div>
                )}

                {isFallbackOtp && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600">
                    SMS غير مفعل حاليًا. استخدم رمز التجربة 123456.
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={!phone.trim() || isLoading}
                >
                  {isLoading ? "جاري إرسال الرمز..." : "إرسال رمز التحقق"}
                </Button>

                <div className="relative py-1">
                  <div className="absolute inset-x-0 top-1/2 border-t border-border" />
                  <div className="relative mx-auto w-fit bg-background px-3 text-xs text-muted-foreground">
                    أو
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base font-semibold gap-2"
                  onClick={handleGoogle}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-black text-[#4285F4]">
                    G
                  </span>
                  المتابعة باستخدام Google
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  لديك حساب بالفعل؟{" "}
                  <Link href="/login">
                    <span className="text-primary font-semibold cursor-pointer hover:underline">تسجيل الدخول</span>
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium block">رمز التحقق</label>
                  <Input
                    inputMode="numeric"
                    placeholder="000000"
                    className="h-14 text-center text-2xl tracking-[0.4em] font-mono"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    dir="ltr"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={otp.length !== 6 || isLoading}
                >
                  {isLoading ? "جاري التحقق..." : "تأكيد وإنشاء الحساب"}
                </Button>

                <button
                  type="button"
                  className="mx-auto flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setError("");
                    setIsFallbackOtp(false);
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                  تغيير رقم الجوال
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
