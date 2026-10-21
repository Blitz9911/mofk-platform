import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Car } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getValidSupabaseSession, supabaseRequest } from "@/lib/supabase";

type SupabaseVehicle = {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  plate_number?: string | null;
  nickname?: string | null;
  odometer_km?: number | null;
  fuel_type?: string | null;
  adapter_mac?: string | null;
  health_score?: number | null;
  created_at?: string | null;
  users?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    subscription_tier?: string | null;
  } | null;
};

async function fetchSupabaseVehicles() {
  const session = await getValidSupabaseSession();
  if (!session?.access_token) throw new Error("يلزم تسجيل الدخول بحساب أدمن.");

  return supabaseRequest<SupabaseVehicle[]>(
    "/rest/v1/vehicles?select=id,user_id,make,model,year,plate_number,nickname,odometer_km,fuel_type,adapter_mac,health_score,created_at,users(name,phone,email,subscription_tier)&order=created_at.desc",
    { method: "GET" },
    session.access_token,
  );
}

function getHealthColor(score: number) {
  if (score >= 80) return "text-green-600 bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/20";
  if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20";
  if (score >= 40) return "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20";
  return "text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20";
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

export default function AdminVehicles() {
  const [filter, setFilter] = useState("all");
  const {
    data: vehicles = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-vehicles", "supabase"],
    queryFn: fetchSupabaseVehicles,
    retry: 1,
  });

  const filteredVehicles = vehicles
    .filter((vehicle) => {
      const score = vehicle.health_score ?? 100;
      if (filter === "healthy") return score >= 80;
      if (filter === "warning") return score >= 60 && score < 80;
      if (filter === "critical") return score < 60;
      return true;
    })
    .sort((a, b) => (a.health_score ?? 100) - (b.health_score ?? 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المركبات</h1>
          <p className="text-muted-foreground">مركبات المنصة الحقيقية من Supabase.</p>
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="healthy">سليم</TabsTrigger>
            <TabsTrigger value="warning">متابعة</TabsTrigger>
            <TabsTrigger value="critical">حرج</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {isError && (
          <div className="border-b bg-destructive/10 px-4 py-3 text-sm text-destructive">
            تعذر جلب المركبات من Supabase:{" "}
            {error instanceof Error ? error.message : "تحقق من صلاحيات الأدمن."}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredVehicles.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المالك</TableHead>
                <TableHead>المركبة</TableHead>
                <TableHead>الباقة</TableHead>
                <TableHead>اللوحة</TableHead>
                <TableHead>الممشى</TableHead>
                <TableHead>الجهاز</TableHead>
                <TableHead>الصحة</TableHead>
                <TableHead>تاريخ الإضافة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => {
                const healthScore = vehicle.health_score ?? 100;
                const owner = vehicle.users;

                return (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div className="font-medium">{owner?.name || "غير محدد"}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">
                        {owner?.phone || owner?.email || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {vehicle.year} - {vehicle.fuel_type || "petrol"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getTierLabel(owner?.subscription_tier)}</Badge>
                    </TableCell>
                    <TableCell>
                      {vehicle.plate_number ? (
                        <Badge variant="outline" className="font-mono">
                          {vehicle.plate_number}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {vehicle.odometer_km
                        ? `${new Intl.NumberFormat("ar-SA").format(vehicle.odometer_km)} كم`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {vehicle.adapter_mac ? (
                        <Badge className="bg-green-600 text-white">مربوط</Badge>
                      ) : (
                        <Badge variant="outline">بانتظار OBD</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getHealthColor(healthScore)}>
                        {healthScore}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {vehicle.created_at
                        ? formatDistanceToNow(new Date(vehicle.created_at), {
                            locale: ar,
                            addSuffix: true,
                          })
                        : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="py-12">
            <EmptyState
              icon={Car}
              title="لا توجد مركبات"
              description="لا توجد مركبات حقيقية في Supabase تطابق التصفية الحالية."
            />
          </div>
        )}
      </div>
    </div>
  );
}
