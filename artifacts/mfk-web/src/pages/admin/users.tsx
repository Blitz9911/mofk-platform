import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Search, Users as UsersIcon } from "lucide-react";
import { useListAdminUsers } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  
  const { data: users, isLoading } = useListAdminUsers({ search: debouncedSearch });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "premium": return "bg-primary text-primary-foreground";
      case "fleet": return "bg-indigo-500 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case "premium": return "مميز";
      case "fleet": return "أسطول";
      default: return "مجاني";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المستخدمين</h1>
          <p className="text-muted-foreground">إدارة مستخدمي المنصة واشتراكاتهم</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="بحث بالاسم أو رقم الجوال..." 
            className="pl-3 pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : users && users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>رقم الجوال</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>الاشتراك</TableHead>
                <TableHead className="text-center">المركبات</TableHead>
                <TableHead className="text-center">جلسات التشخيص</TableHead>
                <TableHead>آخر نشاط</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <Drawer key={user.id}>
                  <DrawerTrigger asChild>
                    <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${user.isActive ? "bg-green-500" : "bg-muted"}`} />
                          {user.name}
                        </div>
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">{user.phone}</TableCell>
                      <TableCell>{user.city || "-"}</TableCell>
                      <TableCell>
                        <Badge className={getTierColor(user.subscriptionTier)} variant="secondary">
                          {getTierLabel(user.subscriptionTier)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{user.vehicleCount}</TableCell>
                      <TableCell className="text-center">{user.sessionsCount || 0}</TableCell>
                      <TableCell>
                        {user.lastActiveAt ? formatDistanceToNow(new Date(user.lastActiveAt), { locale: ar, addSuffix: true }) : "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.createdAt), "d MMMM yyyy", { locale: ar })}
                      </TableCell>
                    </TableRow>
                  </DrawerTrigger>
                  <DrawerContent>
                    <div className="mx-auto w-full max-w-lg p-6">
                      <DrawerHeader>
                        <DrawerTitle className="text-2xl">{user.name}</DrawerTitle>
                        <DrawerDescription>تفاصيل المستخدم</DrawerDescription>
                      </DrawerHeader>
                      <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">رقم الجوال</span>
                          <p className="font-medium" dir="ltr">{user.phone}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">البريد الإلكتروني</span>
                          <p className="font-medium">{user.email || "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">المدينة</span>
                          <p className="font-medium">{user.city || "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">الاشتراك</span>
                          <p><Badge className={getTierColor(user.subscriptionTier)}>{getTierLabel(user.subscriptionTier)}</Badge></p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">المركبات</span>
                          <p className="font-medium">{user.vehicleCount}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">جلسات التشخيص</span>
                          <p className="font-medium">{user.sessionsCount || 0}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">آخر نشاط</span>
                          <p className="font-medium">{user.lastActiveAt ? formatDistanceToNow(new Date(user.lastActiveAt), { locale: ar, addSuffix: true }) : "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">تاريخ التسجيل</span>
                          <p className="font-medium">{format(new Date(user.createdAt), "d MMMM yyyy", { locale: ar })}</p>
                        </div>
                      </div>
                    </div>
                  </DrawerContent>
                </Drawer>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-12">
             <EmptyState icon={UsersIcon} title="لا يوجد مستخدمين" description="لم يتم العثور على مستخدمين يطابقون بحثك" />
          </div>
        )}
      </div>
    </div>
  );
}