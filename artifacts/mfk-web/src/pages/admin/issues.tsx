import { ShieldAlert, TrendingUp, TrendingDown } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { useGetCommonIssues } from "@workspace/api-client-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer";

export default function AdminIssues() {
  const { data: issues, isLoading } = useGetCommonIssues();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500 text-white hover:bg-red-600";
      case "high": return "bg-orange-500 text-white hover:bg-orange-600";
      case "medium": return "bg-amber-500 text-white hover:bg-amber-600";
      case "low": return "bg-blue-500 text-white hover:bg-blue-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "critical": return "حرج جداً";
      case "high": return "عالي";
      case "medium": return "متوسط";
      case "low": return "منخفض";
      default: return "غير محدد";
    }
  };

  const formatSAR = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("ar-SA").format(value) + " ر.س";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الأعطال الشائعة</h1>
          <p className="text-muted-foreground">تحليل للأعطال الأكثر تكراراً في المنصة</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>أكثر 15 عطل تكراراً</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="w-full h-64" />
          ) : issues && issues.length > 0 ? (
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issues.slice(0, 15)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="code" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" name="عدد التكرارات" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={ShieldAlert} title="لا توجد بيانات" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : issues && issues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>كود العطل</TableHead>
                  <TableHead>الخطورة</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead className="text-center">التكرارات</TableHead>
                  <TableHead className="text-center">المركبات المتأثرة</TableHead>
                  <TableHead>المركبة الأكثر تأثراً</TableHead>
                  <TableHead>متوسط التكلفة</TableHead>
                  <TableHead>التوجه</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue, idx) => (
                  <Drawer key={idx}>
                    <DrawerTrigger asChild>
                      <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <TableCell className="font-bold">{issue.code}</TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(issue.severity)} variant="outline">
                            {getSeverityLabel(issue.severity)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate" title={issue.descriptionAr || ""}>
                          {issue.descriptionAr || "-"}
                        </TableCell>
                        <TableCell className="text-center font-medium">{issue.count}</TableCell>
                        <TableCell className="text-center">{issue.affectedVehicles || "-"}</TableCell>
                        <TableCell>{issue.topMakeModel || "-"}</TableCell>
                        <TableCell>{formatSAR(issue.avgEstimatedCost)}</TableCell>
                        <TableCell>
                          {issue.trendPct !== undefined && (
                            <Badge variant="outline" className={`flex items-center gap-1 w-fit ${issue.trendPct > 0 ? "text-red-500 border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20" : "text-green-500 border-green-200 bg-green-50 dark:bg-green-500/10 dark:border-green-500/20"}`}>
                              <span dir="ltr">{issue.trendPct > 0 ? '+' : ''}{issue.trendPct}%</span>
                              {issue.trendPct > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    </DrawerTrigger>
                    <DrawerContent>
                      <div className="mx-auto w-full max-w-lg p-6">
                        <DrawerHeader>
                          <div className="flex items-center justify-between mb-2">
                            <DrawerTitle className="text-2xl" dir="ltr">{issue.code}</DrawerTitle>
                            <Badge className={getSeverityColor(issue.severity)}>{getSeverityLabel(issue.severity)}</Badge>
                          </div>
                          <DrawerDescription className="text-lg text-foreground mt-4">{issue.descriptionAr}</DrawerDescription>
                        </DrawerHeader>
                        <div className="grid grid-cols-2 gap-6 py-6 border-t mt-4">
                          <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">عدد التكرارات</span>
                            <p className="font-bold text-2xl">{issue.count}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">المركبات المتأثرة</span>
                            <p className="font-bold text-2xl">{issue.affectedVehicles || "-"}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">المركبة الأكثر تأثراً</span>
                            <p className="font-medium text-lg">{issue.topMakeModel || "-"}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">متوسط تكلفة الإصلاح</span>
                            <p className="font-medium text-lg">{formatSAR(issue.avgEstimatedCost)}</p>
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
              <EmptyState icon={ShieldAlert} title="لا توجد أعطال" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}