import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, Phone, CheckCircle2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MfkLogo } from "@/components/MfkLogo";
import { useAuth, authApi } from "@/contexts/AuthContext";

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const nextPath = params.get("next") || "/app";
  const selectedPlan = params.get("plan");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("الاسم الكامل مطلوب"); return; }
    if (phone.length < 9) { setError("رقم الجوال غير مكتمل"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("البريد الإلكتروني غير صحيح"); return; }
    if (password.length < 8) { setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }

    setIsLoading(true);
    try {
      const user = await authApi.register(name.trim(), phone, email.trim(), password);
      login(user);
      setDone(true);
      setTimeout(() => setLocation(selectedPlan ? `${nextPath}?plan=${selectedPlan}` : nextPath), 1800);
    } catch (err: any) {
      setError(err.message || "حدث خطأ. حاول مجدداً.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row" dir="rtl">

      {/* Left visual panel */}
      <div className="hidden md:flex md:w-[45%] bg-card border-l border-border relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="relative z-10 max-w-sm">
          <Link href="/">
            <MfkLogo size="lg" className="mb-10 cursor-pointer" />
          </Link>
          <h1 className="text-4xl font-bold mb-5 leading-tight">
            انضم إلى أكثر من <span className="text-primary">20,000</span><br />سائق ذكي
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            أنشئ حسابك مجاناً واستكشف قدرات مفك — تشخيص سيارتك، تتبع حالتها، وتنبيهات الصيانة كلها في مكان واحد.
          </p>
          <div className="space-y-4">
            {[
              "قراءة أكواد الأعطال بالعربية",
              "تتبع حالة سيارتك لحظة بلحظة",
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

        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">

            {!done ? (
              <motion.div key="form"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>

                <div className="mb-8">
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-5">
                    <User size={28} />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">إنشاء حساب جديد</h2>
                  <p className="text-muted-foreground">أدخل بياناتك لإنشاء حسابك في مفك.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">الاسم الكامل</label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="محمد العمري"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="h-12 text-base pr-10"
                        required
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  {/* Phone */}
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
                        onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                        required
                        dir="ltr"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-12 text-base pr-10"
                        required
                        dir="ltr"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">كلمة المرور</label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="8 أحرف على الأقل"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="h-12 text-base pr-10 pl-10"
                        required
                        dir="ltr"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password.length > 0 && password.length < 8 && (
                      <p className="text-xs text-amber-500">كلمة المرور قصيرة ({password.length}/8)</p>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    لديك حساب بالفعل؟{" "}
                    <Link href="/login">
                      <span className="text-primary font-semibold cursor-pointer hover:underline">تسجيل الدخول</span>
                    </Link>
                  </p>
                </form>

                <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground mt-6">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  بياناتك محمية ومشفرة تماماً
                </div>
              </motion.div>
            ) : (
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
        </div>
      </div>
    </div>
  );
}
