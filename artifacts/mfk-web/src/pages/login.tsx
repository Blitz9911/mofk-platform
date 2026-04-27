import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Smartphone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function Login() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 9) return;
    setIsLoading(true);
    // Mock API call
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 1000);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setIsLoading(true);
    // Mock API call
    setTimeout(() => {
      setIsLoading(false);
      setLocation("/app");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Visual Section - Hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 bg-card border-l border-border relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
        
        <div className="relative z-10 max-w-lg">
          <Link href="/">
            <span className="text-4xl font-bold text-primary tracking-tighter mb-12 block cursor-pointer">MFK</span>
          </Link>
          
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight text-foreground">
            تتبع صحة سيارتك، <br />
            بكل سهولة وذكاء.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed mb-12">
            سجل دخولك للوصول إلى لوحة التحكم الخاصة بك، ومتابعة التقارير الحية، وحجز مواعيد الصيانة لدى أفضل الورش المعتمدة.
          </p>
          
          <div className="flex gap-4">
            <div className="flex -space-x-4 rtl:space-x-reverse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-12 h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/150?img=${i + 10}`} alt="User" />
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex text-yellow-500 text-sm">
                ★★★★★
              </div>
              <span className="text-sm font-medium text-muted-foreground">+20,000 مستخدم نشط</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        <div className="md:hidden absolute top-6 right-6">
          <Link href="/">
            <span className="text-2xl font-bold text-primary tracking-tighter cursor-pointer">MFK</span>
          </Link>
        </div>

        <div className="w-full max-w-md space-y-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                    <Smartphone size={32} />
                  </div>
                  <h2 className="text-3xl font-bold mb-3">تسجيل الدخول</h2>
                  <p className="text-muted-foreground">
                    أدخل رقم جوالك وسنرسل لك رمز تحقق.
                  </p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">رقم الجوال</label>
                    <div className="flex relative" dir="ltr">
                      <div className="flex items-center justify-center px-4 border border-r-0 border-border bg-muted rounded-l-md text-muted-foreground font-medium">
                        +966
                      </div>
                      <Input
                        type="tel"
                        placeholder="5X XXX XXXX"
                        className="rounded-l-none text-left pl-4 font-mono text-lg h-12"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-medium" 
                    disabled={phone.length < 9 || isLoading}
                  >
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
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-10">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
                  >
                    <ChevronRight size={16} className="ml-1" />
                    رجوع
                  </button>
                  <h2 className="text-3xl font-bold mb-3">أدخل الرمز</h2>
                  <p className="text-muted-foreground">
                    أرسلنا رمز تحقق مكون من 6 أرقام إلى الجوال المكتوب.
                  </p>
                  <div className="mt-2 font-mono font-medium text-foreground" dir="ltr">
                    +966 {phone.slice(0, 2)} {phone.slice(2, 5)} {phone.slice(5)}
                  </div>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-8">
                  <div className="flex justify-center" dir="ltr">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
                      containerClassName="gap-2"
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="w-12 h-14 text-xl font-bold rounded-md border-border bg-card" />
                        <InputOTPSlot index={1} className="w-12 h-14 text-xl font-bold rounded-md border-border bg-card" />
                        <InputOTPSlot index={2} className="w-12 h-14 text-xl font-bold rounded-md border-border bg-card" />
                        <InputOTPSlot index={3} className="w-12 h-14 text-xl font-bold rounded-md border-border bg-card" />
                        <InputOTPSlot index={4} className="w-12 h-14 text-xl font-bold rounded-md border-border bg-card" />
                        <InputOTPSlot index={5} className="w-12 h-14 text-xl font-bold rounded-md border-border bg-card" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  
                  <div className="space-y-4">
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-lg font-medium" 
                      disabled={otp.length < 6 || isLoading}
                    >
                      {isLoading ? "جاري التحقق..." : "تأكيد الدخول"}
                    </Button>
                    <div className="text-center text-sm text-muted-foreground">
                      لم يصلك الرمز؟ <button type="button" className="text-primary font-medium hover:underline ml-1">إعادة إرسال</button>
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
