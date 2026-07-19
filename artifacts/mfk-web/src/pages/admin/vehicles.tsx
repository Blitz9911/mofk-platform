import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Car } from "lucide-react";
import { useListAdminVehicles } from "@workspace/api-client-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fallbackAdminVehicles } from "@/data/adminMockData";

export default function AdminVehicles() {
  const { data: apiVehicles, isLoading, isError } = useListAdminVehicles();
  const [filter, setFilter] = useState("all");
  const vehicles = apiVehicles?.length ? apiVehicles : fallbackAdminVehicles;
  const usingFallback = isError || !apiVehicles?.length;

  const filteredVehicles = vehicles.filter(v => {
    if (filter === "all") return true;
    if (filter === "healthy") return v.healthScore >= 80;
    if (filter === "warning") return v.healthScore >= 60 && v.healthScore < 80;
    if (filter === "critical") return v.healthScore < 60;
    return true;
  }).sort((a, b) => a.healthScore - b.healthScore);

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-500 bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/20";
    if (score >= 60) return "text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20";
    if (score >= 40) return "text-orange-500 bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20";
    return "text-red-500 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المركبات</h1>
          <p className="text-muted-foreground">مراقبة صحة مركبات المنصة</p>
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="healthy">متوازن (80+)</TabsTrigger>
            <TabsTrigger value="warning">انتباه (60-79)</TabsTrigger>
            <TabsTrigger value="critical">حرجة (&lt;60)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        {usingFallback && !isLoading && (
          <div className="border-b bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
            يتم عرض بيانات مركبات احتياطية إلى أن يكتمل اتصال API.
          </div>
        )}
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filteredVehicles && filteredVehicles.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المالك</TableHead>
                <TableHead>المركبة</TableHead>
                <TableHead>اللوحة</TableHead>
                <TableHead>الممشى</TableHead>
                <TableHead>الصحة</TableHead>
                <TableHead className="text-center">الأعطال النشطة</TableHead>
                <TableHead>آخر ظهور</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    <div className="font-medium">{vehicle.ownerName}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{vehicle.ownerPhone || '-'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                    <div className="text-xs text-muted-foreground">{vehicle.year}</div>
                  </TableCell>
                  <TableCell>
                    {vehicle.plateNumber ? (
                      <Badge variant="outline" className="font-mono">{vehicle.plateNumber}</Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {vehicle.odometerKm ? `${new Intl.NumberFormat("ar-SA").format(vehicle.odometerKm)} كم` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getHealthColor(vehicle.healthScore)}>
                      {vehicle.healthScore}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {(vehicle.activeDtcCount ?? 0) > 0 ? (
                      <Badge variant="destructive">{vehicle.activeDtcCount}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {vehicle.lastSeenAt ? formatDistanceToNow(new Date(vehicle.lastSeenAt), { locale: ar, addSuffix: true }) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-12">
            <EmptyState icon={Car} title="لا توجد مركبات" description="لم يتم العثور على مركبات تطابق التصفية المحددة" />
          </div>
        )}
      </div>
    </div>
  );
}
