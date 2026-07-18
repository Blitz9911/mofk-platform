import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MfkLogo } from "@/components/MfkLogo";
import { useAuth, authApi } from "@/contexts/AuthContext";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return;

    setIsLoading(true);
    try {
      const user = await authApi.login(email.trim(), password);
      login(user);
      setLocation("/app");
    } catch (err: any) {
      setError(err.message || "حدث خطأ. حاول مجدداً.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row" dir="rtl">

      {/* Left visual panel */}
      <div className="hidden md:flex md:w-1/2 bg-card border-l border-border relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="relative z-10 max-w-sm text-right">
          <Link href="/">
            <MfkLogo size="lg" className="mb-10 cursor-pointer" />
          </Link>
          <h1 className="text-4xl font-bold mb-5 leading-tight">
            تتبع حالة سيارتك،<br />
            بكل سهولة وذكاء.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed mb-10">
            سجل دخولك للوصول إلى لوحة التحكم الخاصة بك، ومتابعة التقارير الحية، وتسجيل مواعيد الصيانة.
          </p>
          <div className="flex gap-4">
            <div className="flex -space-x-4 rtl:space-x-reverse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-12 h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/150?img=${i + 10}`} alt="" />
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex text-yellow-500 text-sm">★★★★★</div>
              <span className="text-sm font-medium text-muted-foreground">+20,000 مستخدم نشط</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        <div className="md:hidden absolute top-6 right-6">
          <Link href="/"><MfkLogo size="md" className="cursor-pointer" /></Link>
        </div>

        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}>

            <div className="mb-8">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-5">
                <LogIn size={28} />
              </div>
              <h2 className="text-3xl font-bold mb-2">تسجيل الدخول</h2>
              <p className="text-muted-foreground">أدخل بريدك الإلكتروني وكلمة المرور.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                    autoFocus
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
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-12 text-base pr-10 pl-10"
                    required
                    dir="ltr"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={!email.trim() || !password || isLoading}
              >
                {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>

              <p className="text-center text-sm text-muted-foreground pt-2">
                ليس لديك حساب؟{" "}
                <Link href="/register">
                  <span className="text-primary font-semibold cursor-pointer hover:underline">إنشاء حساب جديد</span>
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
