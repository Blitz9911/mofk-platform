import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  Loader2,
  CheckCircle2,
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
};

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

export default function ProfilePage() {
  const { user, login } = useAuth();

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    phone: "",
    email: "",
    role: "user",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initials = form.name?.trim()?.charAt(0) || "م";

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);

        const profile = await apiFetch<AuthUser>("/api/profile");

        if (cancelled) return;

        setForm({
          name: profile.name || "",
          phone: profile.phone || "",
          email: profile.email || "",
          role: profile.role || "user",
        });
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

      setForm({
        name: updatedProfile.name || "",
        phone: updatedProfile.phone || "",
        email: updatedProfile.email || "",
        role: updatedProfile.role || "user",
      });

      setMessage("تم حفظ بيانات الملف الشخصي بنجاح.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ البيانات.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          جاري تحميل الملف الشخصي...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">حسابي</p>
            <h1 className="text-2xl md:text-3xl font-bold">الملف الشخصي</h1>
            <p className="text-muted-foreground mt-1">
              إدارة بيانات حسابك الأساسية داخل مفك.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl bg-primary/10 text-primary flex items-center justify-center text-4xl font-bold mb-4">
                {initials}
              </div>

              <h2 className="text-xl font-bold">{form.name || "مستخدم مفك"}</h2>
              <p className="text-sm text-muted-foreground mt-1">{form.email}</p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5" />
                {form.role === "admin" ? "مدير النظام" : "مستخدم"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              بيانات الحساب
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {message && (
                <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  {message}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم</Label>
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
                      className="pr-10"
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
                      className="pr-10"
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
                      className="pr-10"
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
                      value={form.role === "admin" ? "مدير النظام" : "مستخدم"}
                      disabled
                      className="pr-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
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
      </div>
    </div>
  );
}
