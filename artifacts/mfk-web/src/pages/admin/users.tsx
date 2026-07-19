import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Save, Search, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getValidSupabaseSession, supabaseRequest } from "@/lib/supabase";

type SupabaseAdminUser = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role?: string | null;
  subscription_tier?: string | null;
  last_active_at?: string | null;
  created_at: string;
  is_active?: boolean | null;
  city?: string | null;
};

type UserRole = "user" | "admin" | "fleet";
type SubscriptionTier = "free" | "plus" | "premium" | "pro" | "family" | "fleet";

const roleOptions: Array<{ value: UserRole; label: string; description: string }> = [
  { value: "user", label: "مستخدم", description: "صلاحيات التطبيق العادية" },
  { value: "admin", label: "أدمن", description: "وصول كامل للوحة الإدارة" },
  { value: "fleet", label: "أسطول", description: "حساب تشغيل للأساطيل" },
];

const tierOptions: Array<{ value: SubscriptionTier; label: string; description: string }> = [
  { value: "free", label: "مجاني", description: "مركبة واحدة" },
  { value: "plus", label: "مفك", description: "مركبة واحدة" },
  { value: "premium", label: "احترافي", description: "حتى 3 مركبات" },
  { value: "pro", label: "متقدم", description: "حتى 3 مركبات" },
  { value: "family", label: "العائلة", description: "حتى 5 مركبات" },
  { value: "fleet", label: "الأسطول", description: "بدون حد عملي" },
];

function getTierColor(tier?: string | null) {
  switch (tier) {
    case "plus":
    case "premium":
    case "pro":
    case "family":
      return "bg-primary text-primary-foreground";
    case "fleet":
      return "bg-indigo-500 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getTierLabel(tier?: string | null) {
  switch (tier) {
    case "plus":
      return "مفك";
    case "premium":
      return "احترافي";
    case "pro":
      return "متقدم";
    case "family":
      return "العائلة";
    case "fleet":
      return "أسطول";
    default:
      return "مجاني";
  }
}

function getRoleColor(role?: string | null) {
  switch (role) {
    case "admin":
      return "bg-primary text-primary-foreground";
    case "fleet":
      return "bg-indigo-500 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getRoleLabel(role?: string | null) {
  switch (role) {
    case "admin":
      return "أدمن";
    case "fleet":
      return "أسطول";
    default:
      return "مستخدم";
  }
}

async function fetchSupabaseUsers() {
  const session = await getValidSupabaseSession();
  if (!session?.access_token) throw new Error("يلزم تسجيل الدخول بحساب أدمن.");

  return supabaseRequest<SupabaseAdminUser[]>(
    "/rest/v1/users?select=id,name,phone,email,role,subscription_tier,last_active_at,created_at,is_active,city&order=created_at.desc",
    { method: "GET" },
    session.access_token,
  );
}

async function updateUserAccess(input: {
  userId: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  isActive: boolean;
}) {
  const session = await getValidSupabaseSession();
  if (!session?.access_token) throw new Error("يلزم تسجيل الدخول بحساب أدمن.");

  const rows = await supabaseRequest<SupabaseAdminUser[]>(
    "/rest/v1/rpc/admin_update_user_access",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target_user_id: input.userId,
        new_role: input.role,
        new_subscription_tier: input.subscriptionTier,
        new_is_active: input.isActive,
      }),
    },
    session.access_token,
  );

  return rows[0];
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: supabaseUsers = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-users", "supabase"],
    queryFn: fetchSupabaseUsers,
    retry: 1,
  });

  const updateAccess = useMutation({
    mutationFn: updateUserAccess,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users", "supabase"] });
      toast({
        title: "تم حفظ الصلاحيات",
        description: "تم تحديث صلاحية المستخدم وباقته في Supabase.",
      });
    },
    onError: (mutationError) => {
      toast({
        title: "تعذر حفظ الصلاحيات",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "تحقق من صلاحية حساب الأدمن.",
        variant: "destructive",
      });
    },
  });

  const users = supabaseUsers.filter((user) => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return true;

    return [user.name, user.phone, user.email ?? "", user.city ?? "", user.role ?? ""].some((value) =>
      value.toLowerCase().includes(term),
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المستخدمون</h1>
          <p className="text-muted-foreground">بيانات المستخدمين الحقيقية من Supabase.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الجوال أو البريد..."
            className="pl-3 pr-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {isError && (
          <div className="border-b bg-destructive/10 px-4 py-3 text-sm text-destructive">
            تعذر جلب المستخدمين من Supabase: {error instanceof Error ? error.message : "تحقق من صلاحيات الأدمن."}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>رقم الجوال</TableHead>
                <TableHead>البريد</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>الصلاحية</TableHead>
                <TableHead>الاشتراك</TableHead>
                <TableHead>آخر نشاط</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <Drawer key={user.id}>
                  <DrawerTrigger asChild>
                    <TableRow className="cursor-pointer transition-colors hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${user.is_active !== false ? "bg-green-500" : "bg-muted"}`} />
                          {user.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" dir="ltr">{user.phone}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>{user.city || "-"}</TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.role)} variant="secondary">
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTierColor(user.subscription_tier)} variant="secondary">
                          {getTierLabel(user.subscription_tier)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.last_active_at
                          ? formatDistanceToNow(new Date(user.last_active_at), { locale: ar, addSuffix: true })
                          : "-"}
                      </TableCell>
                      <TableCell>{format(new Date(user.created_at), "d MMMM yyyy", { locale: ar })}</TableCell>
                    </TableRow>
                  </DrawerTrigger>
                  <DrawerContent>
                    <div className="mx-auto w-full max-w-lg p-6">
                      <DrawerHeader>
                        <DrawerTitle className="text-2xl">{user.name}</DrawerTitle>
                        <DrawerDescription>تفاصيل المستخدم من Supabase</DrawerDescription>
                      </DrawerHeader>
                      <div className="grid grid-cols-2 gap-4 py-4">
                        <Info label="رقم الجوال" value={user.phone} dir="ltr" />
                        <Info label="البريد الإلكتروني" value={user.email || "-"} />
                        <Info label="المدينة" value={user.city || "-"} />
                        <Info label="الصلاحية" value={getRoleLabel(user.role)} />
                        <Info label="الاشتراك" value={getTierLabel(user.subscription_tier)} />
                        <Info label="الحالة" value={user.is_active === false ? "غير نشط" : "نشط"} />
                        <Info
                          label="آخر نشاط"
                          value={
                            user.last_active_at
                              ? formatDistanceToNow(new Date(user.last_active_at), { locale: ar, addSuffix: true })
                              : "-"
                          }
                        />
                        <Info label="تاريخ التسجيل" value={format(new Date(user.created_at), "d MMMM yyyy", { locale: ar })} />
                      </div>
                      <AccessEditor
                        user={user}
                        isSaving={updateAccess.isPending}
                        onSave={(values) => updateAccess.mutate(values)}
                      />
                    </div>
                  </DrawerContent>
                </Drawer>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-12">
            <EmptyState icon={UsersIcon} title="لا يوجد مستخدمون" description="لا توجد نتائج تطابق بحثك في Supabase." />
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeRole(role?: string | null): UserRole {
  return role === "admin" || role === "fleet" ? role : "user";
}

function normalizeTier(tier?: string | null): SubscriptionTier {
  if (tier === "plus" || tier === "premium" || tier === "pro" || tier === "family" || tier === "fleet") {
    return tier;
  }

  return "free";
}

function AccessEditor({
  user,
  isSaving,
  onSave,
}: {
  user: SupabaseAdminUser;
  isSaving: boolean;
  onSave: (values: {
    userId: string;
    role: UserRole;
    subscriptionTier: SubscriptionTier;
    isActive: boolean;
  }) => void;
}) {
  const [role, setRole] = useState<UserRole>(normalizeRole(user.role));
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(
    normalizeTier(user.subscription_tier),
  );
  const [isActive, setIsActive] = useState(user.is_active !== false);

  const roleDescription = roleOptions.find((option) => option.value === role)?.description;
  const tierDescription = tierOptions.find((option) => option.value === subscriptionTier)?.description;

  return (
    <div className="mt-2 rounded-lg border bg-muted/30 p-4">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-bold">إدارة الصلاحيات والباقات</h3>
          <p className="text-sm text-muted-foreground">
            هذه القيم تحفظ مباشرة في Supabase وتتحكم بحدود استخدام الحساب.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>الصلاحية</Label>
          <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{roleDescription}</p>
        </div>

        <div className="space-y-2">
          <Label>الباقة</Label>
          <Select
            value={subscriptionTier}
            onValueChange={(value) => setSubscriptionTier(value as SubscriptionTier)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tierOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{tierDescription}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-md border bg-background px-3 py-2">
        <div>
          <Label>الحساب نشط</Label>
          <p className="text-xs text-muted-foreground">تعطيله يمنع استخدام صلاحيات الحساب.</p>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <Button
        className="mt-4 w-full"
        disabled={isSaving}
        onClick={() =>
          onSave({
            userId: user.id,
            role,
            subscriptionTier,
            isActive,
          })
        }
      >
        <Save className="h-4 w-4" />
        {isSaving ? "جارٍ الحفظ..." : "حفظ الصلاحيات"}
      </Button>
    </div>
  );
}

function Info({ label, value, dir }: { label: string; value: string; dir?: "rtl" | "ltr" }) {
  return (
    <div className="space-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <p className="font-medium" dir={dir}>{value}</p>
    </div>
  );
}
