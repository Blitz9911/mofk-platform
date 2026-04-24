import { MapPin, Star } from "lucide-react";
import { useGetWorkshopPipeline } from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty";

export default function AdminWorkshops() {
  const { data: pipeline, isLoading } = useGetWorkshopPipeline();

  const formatSAR = (value: number | undefined) => {
    if (value === undefined) return "0 ر.س";
    return new Intl.NumberFormat("ar-SA").format(value) + " ر.س";
  };

  // Sort by commission30d descending
  const sortedPipeline = pipeline ? [...pipeline].sort((a, b) => (b.commission30d || 0) - (a.commission30d || 0)) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الورش المعتمدة</h1>
          <p className="text-muted-foreground">أداء وعوائد الورش في المنصة (آخر 30 يوم)</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : sortedPipeline && sortedPipeline.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPipeline.map((workshop) => (
            <Card key={workshop.workshopId} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg line-clamp-1" title={workshop.nameAr}>{workshop.nameAr}</CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 ml-1" />
                      {workshop.city || "غير محدد"}
                    </div>
                  </div>
                  {workshop.rating !== undefined && (
                    <div className="flex items-center bg-yellow-50 dark:bg-yellow-500/10 px-2 py-1 rounded text-yellow-600 dark:text-yellow-500 text-sm font-medium">
                      <Star className="h-3 w-3 ml-1 fill-current" />
                      {workshop.rating.toFixed(1)}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">حالة الحجوزات</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/50 rounded-lg p-2">
                        <div className="text-xs text-muted-foreground mb-1">قيد الانتظار</div>
                        <div className="font-bold">{workshop.pendingBookings || 0}</div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg p-2">
                        <div className="text-xs mb-1 opacity-80">مؤكدة</div>
                        <div className="font-bold">{workshop.confirmedBookings || 0}</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg p-2">
                        <div className="text-xs mb-1 opacity-80">مكتملة</div>
                        <div className="font-bold">{workshop.completedBookings || 0}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">إيرادات الورشة</div>
                      <div className="font-bold text-lg">{formatSAR(workshop.revenue30d)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">عمولة المنصة</div>
                      <div className="font-bold text-lg text-primary">{formatSAR(workshop.commission30d)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-12 border rounded-xl bg-card">
          <EmptyState icon={MapPin} title="لا توجد بيانات ورش" description="لم يتم العثور على نشاط للورش في آخر 30 يوم" />
        </div>
      )}
    </div>
  );
}