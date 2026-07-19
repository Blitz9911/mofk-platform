import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  Loader2,
  CheckCircle2,
  Car,
  Fuel,
  Wrench,
  Lightbulb,
  Crown,
  Gauge,
  ArrowLeft,
} from "lucide-react";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileForm = {
  name: string;
  phone: string;
  email: string;
  role: string;
  subscriptionTier: string;
  subscriptionEndsAt?: string | null;
  subscriptionAutoRenew?: boolean | null;
  isActive?: boolean | null;
};

type DashboardOverview = {
  vehicleCount?: number;
  avgHealthScore?: number;
  upcomingMaintenanceCount?: number;
  overdueMaintenanceCount?: number;
  activeRecommendationsCount?: number;
  completedMaintenanceCount?: number;
};

function getTierLabel(tier?: string | null) {
  switch (tier) {
    case "plus":
    case "mofk":
      return "مفك";
    case "premium":
      return "احترافي";
    case "pro":
      return "متقدم";
    case "family":
      return "العائلة";
    case "fleet":
      return "الأسطول";
    default:
      return "مجاني";
  }
}

function getTierDescription(tier?: string | null) {
  switch (tier) {
    case "plus":
    case "mofk":
      return "مركبة واحدة مع تجهيز الربط بجهاز OBD.";
    case "premium":
    case "pro":
      return "حتى 3 مركبات حسب صلاحيات الباقة.";
    case "family":
      return "حتى 5 مركبات للعائلة.";
    case "fleet":
      return "حساب أسطول بصلاحيات موسعة ودعم خاص.";
    default:
      return "مركبة واحدة للميزات الأساسية.";
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.error || "حدث خطأ غير متوقع");
  }

  return data as T;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/70 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold">{value || "-"}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    phone: "",
    email: "",
    role: "user",
    subscriptionTier: "free",
    subscriptionEndsAt: null,
    subscriptionAutoRenew: true,
    isActive: true,
  });

  const [originalForm, setOriginalForm] = useState<ProfileForm | null>(null);
  const [stats, setStats] = useState<DashboardOverview | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initials = form.name?.trim()?.charAt(0) || "م";
  const isAdmin = form.role === "admin";
  const tierLabel = getTierLabel(form.subscriptionTier);
  const tierDescription = getTierDescription(form.subscriptionTier);

  const completion = useMemo(() => {
    const fields = [form.name, form.phone, form.email, form.role, form.subscriptionTier];
    const completed = fields.filter((field) => String(field || "").trim()).length;
    return Math.round((completed / fields.length) * 100);
  }, [form]);

  const isDirty = useMemo(() => {
    if (!originalForm) return false;

    return (
      originalForm.name !== form.name ||
      originalForm.phone !== form.phone
    );
  }, [form, originalForm]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);

        const [profile, overview] = await Promise.all([
          apiFetch<AuthUser>("/api/profile"),
          apiFetch<DashboardOverview>("/api/dashboard/overview").catch(() => null),
        ]);

        if (cancelled) return;

        const nextForm = {
          name: profile.name || "",
          phone: profile.phone || "",
          email: profile.email || "",
          role: profile.role || "user",
          subscriptionTier: profile.subscriptionTier || "free",
          subscriptionEndsAt: profile.subscriptionEndsAt ?? null,
          subscriptionAutoRenew: profile.subscriptionAutoRenew ?? true,
          isActive: profile.isActive ?? true,
        };

        setForm(nextForm);
        setOriginalForm(nextForm);
        setStats(overview);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "تعذر تحميل الملف الشخصي");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("الاسم مطلوب.");
      return;
    }

    if (!form.phone.trim()) {
      setError("رقم الجوال مطلوب.");
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      const updatedProfile = await apiFetch<AuthUser>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
        }),
      });

      login(updatedProfile);

      const nextForm = {
        name: updatedProfile.name || "",
        phone: updatedProfile.phone || "",
        email: updatedProfile.email || "",
        role: updatedProfile.role || "user",
        subscriptionTier: updatedProfile.subscriptionTier || "free",
        subscriptionEndsAt: updatedProfile.subscriptionEndsAt ?? null,
        subscriptionAutoRenew: updatedProfile.subscriptionAutoRenew ?? true,
        isActive: updatedProfile.isActive ?? true,
      };

      setForm(nextForm);
      setOriginalForm(nextForm);
      setMessage("تم حفظ بيانات الملف الشخصي بنجاح.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ البيانات.");
    } finally {
      setSaving(false);
    }
  }

  const statCards = [
    {
      label: "مركباتي",
      value: stats?.vehicleCount ?? 0,
      icon: Car,
      helper: "مركبة مسجلة",
    },
    {
      label: "الصحة العامة",
      value: `${stats?.avgHealthScore ?? 0}%`,
      icon: Gauge,
      helper: "متوسط حالة المركبات",
    },
    {
      label: "صيانة قريبة",
      value: stats?.upcomingMaintenanceCount ?? 0,
      icon: Wrench,
      helper: "مهمة تحتاج متابعة",
    },
    {
      label: "توصيات ذكية",
      value: stats?.activeRecommendationsCount ?? 0,
      icon: Lightbulb,
      helper: "اقتراح من مفك",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[55vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          جاري تحميل الملف الشخصي...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-orange-500 to-orange-600 text-white shadow-xl"
      >
        <div className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 right-24 h-64 w-64 rounded-full bg-black/10 blur-3xl" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="h-24 w-24 rounded-3xl bg-white/20 border border-white/25 backdrop-blur flex items-center justify-center text-4xl font-black shadow-lg">
                  {initials}
                </div>

                <div className="absolute -bottom-2 -left-2 h-9 w-9 rounded-full bg-white text-primary flex items-center justify-center shadow-md">
                  <User className="h-5 w-5" />
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-semibold">
                    الملف الشخصي
                  </span>

                  <span className="rounded-full bg-white text-primary px-3 py-1 text-xs font-bold">
                    {isAdmin ? "مدير النظام" : "مستخدم"}
                  </span>
                </div>

                <h1 className="text-3xl md:text-4xl font-black">
                  {form.name || "مستخدم مفك"}
                </h1>

                <p className="mt-2 text-white/80">
                  إدارة بيانات حسابك، متابعة اشتراكك، والوصول السريع لخدمات مفك.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 min-w-[260px]">
              <div className="rounded-2xl bg-white/15 border border-white/20 p-4 backdrop-blur">
                <p className="text-xs text-white/70">اكتمال الحساب</p>
                <p className="text-2xl font-black mt-1">{completion}%</p>
                <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-white/15 border border-white/20 p-4 backdrop-blur">
                  <p className="text-xs text-white/70">الباقة الحالية</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Crown className="h-5 w-5" />
                  <p className="text-2xl font-black">{tierLabel}</p>
                  </div>
                <p className="text-xs text-white/70 mt-2">
                  {form.isActive === false ? "حساب غير نشط" : "حساب مفعل"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: index * 0.04 }}
            >
              <Card className="overflow-hidden border-border/80">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="text-3xl font-black mt-1">{item.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.helper}
                      </p>
                    </div>

                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/25">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    البيانات الشخصية
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    عدّل اسمك ورقم جوالك المستخدمين داخل مفك.
                  </p>
                </div>

                {isDirty && (
                  <span className="w-fit rounded-full bg-amber-500/10 text-amber-600 px-3 py-1 text-xs font-semibold">
                    توجد تعديلات غير محفوظة
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-5 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {message && (
                  <div className="flex items-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {message}
                  </div>
                )}

                {error && (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        className="pr-10 h-12 rounded-xl"
                        placeholder="اكتب اسمك"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الجوال</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        className="pr-10 h-12 rounded-xl"
                        placeholder="05xxxxxxxx"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        value={form.email}
                        disabled
                        className="pr-10 h-12 rounded-xl bg-muted/50"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      تعديل البريد لاحقًا يحتاج ربط مباشر مع Supabase Auth.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">نوع الحساب</Label>
                    <div className="relative">
                      <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="role"
                        value={isAdmin ? "مدير النظام" : "مستخدم"}
                        disabled
                        className="pr-10 h-12 rounded-xl bg-muted/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    يتم حفظ التعديلات مباشرة في قاعدة بيانات Supabase.
                  </p>

                  <Button type="submit" disabled={saving || !isDirty} className="h-11 px-6">
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 ml-2" />
                        حفظ التعديلات
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-primary" />
                نظرة سريعة على الحساب
              </CardTitle>
            </CardHeader>

            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow icon={Mail} label="البريد الإلكتروني" value={form.email} />
              <InfoRow icon={Phone} label="رقم الجوال" value={form.phone} />
              <InfoRow icon={Shield} label="الصلاحية" value={isAdmin ? "مدير النظام" : "مستخدم"} />
              <InfoRow icon={Crown} label="الباقة" value={tierLabel} />
              <InfoRow icon={CheckCircle2} label="حالة الحساب" value={form.isActive === false ? "غير نشط" : "مفعل"} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary to-orange-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/75">الاشتراك الحالي</p>
                  <h3 className="text-2xl font-black mt-1">{tierLabel}</h3>
                </div>

                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Crown className="h-6 w-6" />
                </div>
              </div>

              <p className="text-sm text-white/75 mt-3">
                {tierDescription}
              </p>
            </div>

            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">الحالة</span>
                <span className="font-semibold text-green-600">
                  {form.isActive === false ? "غير نشط" : "نشط"}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">المركبات</span>
                <span className="font-semibold">{stats?.vehicleCount ?? 0}</span>
              </div>

              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => setLocation("/app/subscription")}
              >
                إدارة الاشتراك
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>إجراءات سريعة</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between h-12"
                onClick={() => setLocation("/app/vehicles")}
              >
                <span className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary" />
                  إدارة المركبات
                </span>
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between h-12"
                onClick={() => setLocation("/app/fuel")}
              >
                <span className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-primary" />
                  البنزين والصرفية
                </span>
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between h-12"
                onClick={() => setLocation("/app/recommendations")}
              >
                <span className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  التوصيات الذكية
                </span>
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between h-12"
                onClick={() => setLocation("/app/maintenance")}
              >
                <span className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  جدول الصيانة
                </span>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
