import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { Wrench, Calendar, CheckCircle2, MapPin } from "lucide-react";
import { 
  useGetUpcomingMaintenance, 
  useLogMaintenance, 
  getGetUpcomingMaintenanceQueryKey,
  MaintenanceItemStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function Maintenance() {
  const { data: maintenance, isLoading } = useGetUpcomingMaintenance();
  const logMaintenance = useLogMaintenance();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [logOpen, setLogOpen] = useState<{open: boolean, item: any | null}>({open: false, item: null});

  const form = useForm({
    defaultValues: { doneAt: format(new Date(), "yyyy-MM-dd"), doneAtKm: 0, cost: 0, notes: "" }
  });

  const onSubmit = (values: any) => {
    if (!logOpen.item) return;
    logMaintenance.mutate({ 
      vehicleId: logOpen.item.vehicleId,
      data: { 
        serviceType: logOpen.item.serviceType, 
        doneAt: values.doneAt, 
        doneAtKm: Number(values.doneAtKm), 
        cost: Number(values.cost) || undefined, 
        notes: values.notes,
      } 
    }, {
      onSuccess: () => {
        toast({ title: "تم تسجيل الصيانة" });
        queryClient.invalidateQueries({ queryKey: getGetUpcomingMaintenanceQueryKey() });
        setLogOpen({open: false, item: null});
        form.reset();
      }
    });
  };

  const getStatusColor = (status: string) => {
    if (status === "overdue") return "text-destructive border-destructive bg-destructive/10";
    if (status === "upcoming") return "text-amber-500 border-amber-500 bg-amber-500/10";
    if (status === "scheduled") return "text-blue-500 border-blue-500 bg-blue-500/10";
    return "text-green-500 border-green-500 bg-green-500/10";
  };

  const overdue = maintenance?.filter(m => m.status === 'overdue') || [];
  const upcoming = maintenance?.filter(m => m.status === 'upcoming') || [];
  const scheduled = maintenance?.filter(m => m.status === 'scheduled') || [];

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (!maintenance || maintenance.length === 0) {
    return (
      <EmptyState 
        icon={<CheckCircle2 className="h-16 w-16 text-green-500" />} 
        title="كل مركباتك بصحة جيدة" 
        description="لا توجد أي صيانة قادمة في الوقت الحالي. استمر في القيادة بأمان!"
      />
    );
  }

  const Section = ({ title, items, icon: Icon, colorClass }: any) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-4 mb-8">
        <h2 className={cn("text-xl font-bold flex items-center gap-2", colorClass)}>
          <Icon className="w-5 h-5" /> {title} ({items.length})
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item: any) => (
            <Card key={item.id} className={cn("border-t-4", 
              item.status === 'overdue' ? 'border-t-destructive' : 
              item.status === 'upcoming' ? 'border-t-amber-500' : 'border-t-blue-500'
            )}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{item.serviceTypeAr || item.serviceType}</CardTitle>
                  <Badge variant={item.status === 'overdue' ? 'destructive' : item.status === 'upcoming' ? 'secondary' : 'outline'} className={item.status === 'upcoming' ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : ''}>
                    {item.status === 'overdue' ? 'متأخرة' : item.status === 'upcoming' ? 'قريباً' : 'مجدولة'}
                  </Badge>
                </div>
                <CardDescription className="font-medium text-foreground">{item.vehicleNickname || item.vehicleMake}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted p-2 rounded-md">
                    <span className="text-muted-foreground block text-xs">الاستحقاق</span>
                    <span className="font-bold">{item.nextDueKm ? `${item.nextDueKm} كم` : '-'}</span>
                  </div>
                  <div className="bg-muted p-2 rounded-md">
                    <span className="text-muted-foreground block text-xs">الوقت المتبقي</span>
                    <span className="font-bold">{item.daysUntilDue !== null ? (item.daysUntilDue < 0 ? `متأخر ${Math.abs(item.daysUntilDue)} يوم` : `${item.daysUntilDue} يوم`) : '-'}</span>
                  </div>
                </div>
                {item.estimatedCost && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">التكلفة التقديرية</span>
                    <span className="font-bold">{item.estimatedCost} ر.س</span>
                  </div>
                )}
                <Button 
                  className="w-full" 
                  variant={item.status === 'overdue' ? 'default' : 'outline'}
                  onClick={() => {
                    form.setValue("doneAtKm", item.nextDueKm || 0);
                    form.setValue("cost", item.estimatedCost || 0);
                    setLogOpen({open: true, item});
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 ml-2" /> تسجيل كمنجز
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الصيانة الدورية</h1>
        <p className="text-muted-foreground mt-1">تتبع مواعيد الصيانة لمركباتك وحافظ على أدائها</p>
      </div>

      <Dialog open={logOpen.open} onOpenChange={(o) => !o && setLogOpen({open: false, item: null})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل صيانة منجزة</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="doneAt" render={({field}) => <FormItem><FormLabel>التاريخ</FormLabel><FormControl><Input type="date" {...field}/></FormControl></FormItem>} />
                <FormField control={form.control} name="doneAtKm" render={({field}) => <FormItem><FormLabel>العداد الحالي (كم)</FormLabel><FormControl><Input type="number" {...field}/></FormControl></FormItem>} />
              </div>
              <FormField control={form.control} name="cost" render={({field}) => <FormItem><FormLabel>التكلفة الفعلية (ر.س)</FormLabel><FormControl><Input type="number" {...field}/></FormControl></FormItem>} />
              <FormField control={form.control} name="notes" render={({field}) => <FormItem><FormLabel>ملاحظات إضافية</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>} />
              <DialogFooter><Button type="submit" disabled={logMaintenance.isPending}>تأكيد التسجيل</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Section title="صيانة متأخرة" items={overdue} icon={Wrench} colorClass="text-destructive" />
      <Section title="صيانة قريبة" items={upcoming} icon={Calendar} colorClass="text-amber-500" />
      <Section title="صيانة مجدولة" items={scheduled} icon={CheckCircle2} colorClass="text-blue-500" />
    </div>
  );
}
