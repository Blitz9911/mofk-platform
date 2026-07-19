import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Activity } from "lucide-react";
import { useListLiveDiagnostics } from "@workspace/api-client-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty";
import { Card, CardContent } from "@/components/ui/card";
import { fallbackLiveDiagnostics } from "@/data/adminMockData";

export default function AdminDiagnostics() {
  const { data: apiDiagnostics, isLoading, isError } = useListLiveDiagnostics();
  const diagnostics = apiDiagnostics?.length ? apiDiagnostics : fallbackLiveDiagnostics;
  const usingFallback = isError || !apiDiagnostics?.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">التشخيص الحي</h1>
          <p className="text-muted-foreground">جلسات التشخيص النشطة والمكتملة مؤخراً</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {usingFallback && !isLoading && (
            <div className="border-b bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
              يتم عرض جلسات تشخيص احتياطية إلى أن يكتمل اتصال API.
            </div>
          )}
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : diagnostics && diagnostics.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المركبة</TableHead>
                  <TableHead>المالك / المدينة</TableHead>
                  <TableHead>وقت البدء</TableHead>
                  <TableHead className="text-center">الأعطال المكتشفة</TableHead>
                  <TableHead className="text-center">الأعطال الحرجة</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diagnostics.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="font-medium">{session.vehicleMake} {session.vehicleModel} {session.vehicleYear}</div>
                      {session.plateNumber && <div className="text-xs text-muted-foreground">{session.plateNumber}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{session.ownerName}</div>
                      <div className="text-xs text-muted-foreground">{session.city || '-'}</div>
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(session.startedAt), { locale: ar, addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={(session.dtcCount ?? 0) > 0 ? "secondary" : "outline"}>
                        {session.dtcCount || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {(session.criticalDtcCount ?? 0) > 0 ? (
                        <Badge variant="destructive" className="animate-pulse">{session.criticalDtcCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {session.status === 'active' ? (
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">نشط الآن</span>
                        </div>
                      ) : (
                        <Badge variant="outline">مكتمل</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12">
              <EmptyState icon={Activity} title="لا توجد جلسات" description="لا يوجد أي عمليات تشخيص حية في الوقت الحالي" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
