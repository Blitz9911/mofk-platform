import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { User, Smartphone, ArrowRight, ChevronRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { MfkLogo } from "@/components/MfkLogo";

type Step = "info" | "otp" | "done";

export default function Register() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || phone.length < 9) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep("otp");
    }, 1000);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep("done");
      setTimeout(() => setLocation("/app"), 2000);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">

      {/* Left visual panel */}
      <div className="hidden md:flex md:w-[45%] bg-card border-l border-border relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="relative z-10 max-w-sm">
          <Link href="/">
            <MfkLogo size="lg" className="mb-10 cursor-pointer" />
          </Link>
          <h1 className="text-4xl font-bold mb-5 leading-tight">
            انضم إلى أكثر من <span className="text-primary">20,000</span> سائق ذكي
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            أنشئ حسابك مجاناً واستكشف قدرات MFK — تشخيص سيارتك، تتبع صحتها، وتنبيهات الصيانة كلها في مكان واحد.
          </p>
          <div className="space-y-4">
            {[
              "قراءة أكواد الأعطال بالعربية",
              "تتبع صحة سيارتك لحظة بلحظة",
              "تنبيهات الصيانة الاستباقية",
              "المساعد الذكي لتفسير الأعطال",
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="font-medium">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative min-h-screen">
        <div className="md:hidden absolute top-6 right-6">
          <Link href="/"><MfkLogo size="md" className="cursor-pointer" /></Link>
        </div>

        <div className="w-full max-w-md space-y-6">

          {/* Step indicator */}
          {step !== "done" && (
            <div className="flex items-center gap-2 mb-2">
              {(["info", "otp"] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === s ? "bg-primary text-primary-foreground" :
                    (step === "otp" && s === "info") ? "bg-green-500 text-white" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {step === "otp" && s === "info" ? "✓" : i + 1}
                  </div>
                  {i < 1 && <div className={`flex-1 h-0.5 w-8 rounded ${step === "otp" ? "bg-primary" : "bg-muted"}`} />}
                </div>
              ))}
              <span className="text-xs text-muted-foreground mr-2">
                {step === "info" ? "معلوماتك" : "التحقق"}
              </span>
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* Step 1: Name + Phone */}
            {step === "info" && (
              <motion.div key="info"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
                <div className="mb-8">
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-5">
                    <User size={28} />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">إنشاء حساب جديد</h2>
                  <p className="text-muted-foreground">أدخل معلوماتك لإنشاء حسابك في MFK.</p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">الاسم الكامل</label>
                    <Input
                      type="text"
                      placeholder="محمد العمري"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="h-12 text-base"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium block">رقم الجوال</label>
                    <div className="flex" dir="ltr">
                      <div className="flex items-center justify-center px-4 border border-r-0 border-border bg-muted rounded-l-md text-muted-foreground font-medium text-sm shrink-0">
                        +966
                      </div>
                      <Input
                        type="tel"
                        placeholder="5X XXX XXXX"
                        className="rounded-l-none text-left pl-4 font-mono text-base h-12"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={!name.trim() || phone.length < 9 || isLoading}
                  >
                    {isLoading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
                    {!isLoading && <ArrowRight className="mr-2 h-4 w-4 rotate-180" />}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    لديك حساب بالفعل؟{" "}
                    <Link href="/login">
                      <span className="text-primary font-semibold cursor-pointer hover:underline">تسجيل الدخول</span>
                    </Link>
                  </p>
                </form>
              </motion.div>
            )}

            {/* Step 2: OTP */}
            {step === "otp" && (
              <motion.div key="otp"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
                <div className="mb-8">
                  <button
                    onClick={() => setStep("info")}
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
                  >
                    <ChevronRight size={16} className="ml-1" /> رجوع
                  </button>
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-5">
                    <Smartphone size={28} />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">تحقق من رقمك</h2>
                  <p className="text-muted-foreground">
                    أرسلنا رمزاً مكوناً من 6 أرقام إلى
                  </p>
                  <div className="font-mono font-bold text-foreground mt-1" dir="ltr">
                    +966 {phone.slice(0, 2)} {phone.slice(2, 5)} {phone.slice(5)}
                  </div>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-7">
                  <div className="flex justify-center" dir="ltr">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp} containerClassName="gap-2">
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map(i => (
                          <InputOTPSlot key={i} index={i}
                            className="w-12 h-14 text-xl font-bold rounded-xl border-border bg-card" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold"
                      disabled={otp.length < 6 || isLoading}
                    >
                      {isLoading ? "جاري إنشاء حسابك..." : "تأكيد وإنشاء الحساب"}
                    </Button>
                    <div className="text-center text-sm text-muted-foreground">
                      لم يصلك الرمز؟{" "}
                      <button type="button" onClick={() => setOtp("")} className="text-primary font-semibold hover:underline">
                        إعادة إرسال
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 3: Done */}
            {step === "done" && (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, type: "spring" }}
                className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </motion.div>
                <h2 className="text-3xl font-bold mb-3">مرحباً {name.split(" ")[0]}!</h2>
                <p className="text-muted-foreground mb-2">تم إنشاء حسابك بنجاح.</p>
                <p className="text-sm text-muted-foreground">جاري نقلك للوحة التحكم...</p>
                <div className="mt-6 flex justify-center">
                  <div className="w-8 h-1 bg-primary rounded-full animate-pulse" />
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Trust note */}
          {step !== "done" && (
            <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground pt-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              بياناتك محمية ومشفرة تماماً
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
