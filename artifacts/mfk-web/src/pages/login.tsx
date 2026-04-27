import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Smartphone, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { MfkLogo } from "@/components/MfkLogo";
import { useAuth, authApi } from "@/contexts/AuthContext";

const TEST_HINTS = [
  { phone: "501234567", label: "تجريبي ١", otp: "123456" },
  { phone: "502345678", label: "تجريبي ٢", otp: "123456" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpHint, setOtpHint] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 9) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await authApi.sendOtp(phone);
      if (res.isTest && res.code) setOtpHint(res.code);
      setStep(2);
    } catch {
      setError("حدث خطأ أثناء إرسال الرمز. حاول مجدداً.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setIsLoading(true);
    setError("");
    try {
      const user = await authApi.verifyOtp(phone, otp);
      login(user);
      setLocation("/app");
    } catch (err: any) {
      setError(err.message || "الرمز غير صحيح");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Visual Section */}
      <div className="hidden md:flex md:w-1/2 bg-card border-l border-border relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="relative z-10 max-w-sm">
          <Link href="/">
            <MfkLogo size="lg" className="mb-10 cursor-pointer" />
          </Link>
          <h1 className="text-4xl font-bold mb-5 leading-tight">
            تتبع حالة سيارتك،<br />
            بكل سهولة وذكاء.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed mb-10">
            سجل دخولك للوصول إلى لوحة التحكم الخاصة بك، ومتابعة التقارير الحية، وحجز مواعيد الصيانة.
          </p>
          <div className="flex gap-4 mb-10">
            <div className="flex -space-x-4 rtl:space-x-reverse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-12 h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/150?img=${i + 10}`} alt="User" />
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex text-yellow-500 text-sm">★★★★★</div>
              <span className="text-sm font-medium text-muted-foreground">+20,000 مستخدم نشط</span>
            </div>
          </div>

          {/* Test accounts */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <div className="flex items-center gap-2 text-xs text-primary font-semibold mb-3">
              <Info className="w-3.5 h-3.5" /> حسابات تجريبية جاهزة
            </div>
            {TEST_HINTS.map(t => (
              <button key={t.phone} onClick={() => setPhone(t.phone)}
                className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground py-1.5 transition-colors">
                <span dir="ltr">+966 {t.phone.slice(0,2)} {t.phone.slice(2,5)} {t.phone.slice(5)}</span>
                <span className="font-mono bg-muted px-2 py-0.5 rounded">{t.otp}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        <div className="md:hidden absolute top-6 right-6">
          <Link href="/"><MfkLogo size="md" className="cursor-pointer" /></Link>
        </div>

        <div className="w-full max-w-md space-y-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                    <Smartphone size={32} />
                  </div>
                  <h2 className="text-3xl font-bold mb-3">تسجيل الدخول</h2>
                  <p className="text-muted-foreground">أدخل رقم جوالك وسنرسل لك رمز تحقق.</p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">رقم الجوال</label>
                    <div className="flex" dir="ltr">
                      <div className="flex items-center justify-center px-4 border border-r-0 border-border bg-muted rounded-l-md text-muted-foreground font-medium">
                        +966
                      </div>
                      <Input
                        type="tel"
                        placeholder="5X XXX XXXX"
                        className="rounded-l-none text-left pl-4 font-mono text-lg h-12"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full h-12 text-lg font-medium"
                    disabled={phone.length < 9 || isLoading}>
                    {isLoading ? "جاري الإرسال..." : "أرسل رمز التحقق"}
                    {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground pt-2">
                    ليس لديك حساب؟{" "}
                    <Link href="/register">
                      <span className="text-primary font-semibold cursor-pointer hover:underline">إنشاء حساب جديد</span>
                    </Link>
                  </p>
                </form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
                <div className="mb-10">
                  <button onClick={() => { setStep(1); setOtpHint(null); }}
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                    <ChevronRight size={16} className="ml-1" /> رجوع
                  </button>
                  <h2 className="text-3xl font-bold mb-3">أدخل الرمز</h2>
                  <p className="text-muted-foreground">
                    أرسلنا رمز تحقق مكون من 6 أرقام إلى
                  </p>
                  <div className="mt-1 font-mono font-medium text-foreground" dir="ltr">
                    +966 {phone.slice(0, 2)} {phone.slice(2, 5)} {phone.slice(5)}
                  </div>
                  {otpHint && (
                    <div className="mt-3 inline-flex items-center gap-2 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full">
                      <Info className="w-3.5 h-3.5" /> رمز التجربة: <span className="font-mono font-bold tracking-widest">{otpHint}</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-8">
                  <div className="flex justify-center" dir="ltr">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp} containerClassName="gap-2">
                      <InputOTPGroup className="gap-2">
                        {[0,1,2,3,4,5].map(i => (
                          <InputOTPSlot key={i} index={i} className="w-12 h-14 text-xl font-bold rounded-md border-border bg-card" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {error && <p className="text-sm text-destructive text-center">{error}</p>}

                  <div className="space-y-4">
                    <Button type="submit" className="w-full h-12 text-lg font-medium"
                      disabled={otp.length < 6 || isLoading}>
                      {isLoading ? "جاري التحقق..." : "تأكيد الدخول"}
                    </Button>
                    <div className="text-center text-sm text-muted-foreground">
                      لم يصلك الرمز؟{" "}
                      <button type="button" onClick={() => { setOtp(""); authApi.sendOtp(phone); }}
                        className="text-primary font-medium hover:underline ml-1">إعادة إرسال</button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
