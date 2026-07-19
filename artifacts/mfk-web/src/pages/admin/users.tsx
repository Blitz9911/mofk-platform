import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Search, Users as UsersIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function getTierColor(tier?: string | null) {
  switch (tier) {
    case "premium":
      return "bg-primary text-primary-foreground";
    case "fleet":
      return "bg-indigo-500 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getTierLabel(tier?: string | null) {
  switch (tier) {
    case "premium":
      return "مميز";
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

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

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

function Info({ label, value, dir }: { label: string; value: string; dir?: "rtl" | "ltr" }) {
  return (
    <div className="space-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <p className="font-medium" dir={dir}>{value}</p>
    </div>
  );
}
