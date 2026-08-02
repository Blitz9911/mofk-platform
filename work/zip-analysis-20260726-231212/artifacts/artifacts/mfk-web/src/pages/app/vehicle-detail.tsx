import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Car, Settings2, Trash2, Edit, AlertTriangle, 
  Activity, Wrench, Calendar, ChevronRight, 
  CheckCircle2, Clock, PlayCircle
} from "lucide-react";
import { 
  useGetVehicle, 
  useUpdateVehicle, 
  useDeleteVehicle, 
  usePairAdapter,
  useGetVehicleHealthHistory,
  useListDiagnosticSessions,
  useListDtcCodes,
  useGetMaintenanceSchedule,
  useLogMaintenance,
  getGetVehicleQueryKey,
  getListVehiclesQueryKey,
  DtcCodeStatus,
  MaintenanceItemStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function VehicleDetail() {
  const { id } = useParams<{id: string}>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: vehicle, isLoading } = useGetVehicle(id || "", { query: { enabled: !!id } as any });
  
  const { data: healthHistory } = useGetVehicleHealthHistory(id || "", { query: { enabled: !!id } as any });
  const { data: sessions } = useListDiagnosticSessions({ vehicleId: id }, { query: { enabled: !!id } as any });
  const { data: dtcCodes } = useListDtcCodes({ vehicleId: id }, { query: { enabled: !!id } as any });
  const { data: maintenance } = useGetMaintenanceSchedule(id || "", { query: { enabled: !!id } as any });
  
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const pairAdapter = usePairAdapter();
  const logMaintenance = useLogMaintenance();

  const [editOpen, setEditOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);
  const [maintOpen, setMaintenanceOpen] = useState(false);

  const editForm = useForm({
    defaultValues: {
      nickname: vehicle?.nickname || "",
      plateNumber: vehicle?.plateNumber || "",
      odometerKm: vehicle?.odometerKm || 0,
    }
  });

  const pairForm = useForm({
    defaultValues: { adapterMac: "" }
  });

  const maintForm = useForm({
    defaultValues: {
      serviceType: "",
      doneAt: format(new Date(), "yyyy-MM-dd"),
      doneAtKm: vehicle?.odometerKm || 0,
      cost: 0,
      notes: ""
    }
  });

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    if (score >= 40) return "text-orange-500";
    return "text-destructive";
  };

  const getSeverityColor = (sev: string) => {
    if (sev === "critical") return "destructive";
    if (sev === "high") return "orange-500";
    if (sev === "medium") return "amber-500";
    return "blue-500";
  };

  const onEditSubmit = (values: any) => {
    updateVehicle.mutate({ vehicleId: id!, data: values }, {
      onSuccess: () => {
        toast({ title: "تم التحديث بنجاح" });
        queryClient.invalidateQueries({ queryKey: getGetVehicleQueryKey(id!) });
        setEditOpen(false);
      }
    });
  };

  const onDelete = () => {
    deleteVehicle.mutate({ vehicleId: id! }, {
      onSuccess: () => {
        toast({ title: "تم حذف المركبة" });
        queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
        setLocation("/app/vehicles");
      }
    });
  };

  const onPairSubmit = (values: any) => {
    pairAdapter.mutate({ vehicleId: id!, data: { adapterMac: values.adapterMac } }, {
      onSuccess: () => {
        toast({ title: "تم إقران الجهاز" });
        queryClient.invalidateQueries({ queryKey: getGetVehicleQueryKey(id!) });
        setPairOpen(false);
      }
    });
  };

  const onMaintSubmit = (values: any) => {
    logMaintenance.mutate({ vehicleId: id!, data: values }, {
      onSuccess: () => {
        toast({ title: "تم تسجيل الصيانة" });
        queryClient.invalidateQueries({ queryKey: getGetVehicleQueryKey(id!) });
        setMaintenanceOpen(false);
        maintForm.reset();
      }
    });
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!vehicle) return <EmptyState title="المركبة غير موجودة" icon={<Car className="h-12 w-12"/>} />;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/app/vehicles")}>
          <ChevronRight className="h-5 w-5" />
        </Button>
        <span className="text-muted-foreground">رجوع للمركبات</span>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className={cn("w-24 h-24 rounded-full border-8 flex items-center justify-center bg-background shadow-inner font-bold text-3xl", getHealthColor(vehicle.healthScore))}>
              {vehicle.healthScore}
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">{vehicle.nickname || `${vehicle.make} ${vehicle.model}`}</h1>
            <p className="text-muted-foreground">{vehicle.year} • {vehicle.make} {vehicle.model}</p>
            <div className="flex gap-2 mt-3">
              {vehicle.plateNumber && <Badge variant="outline" className="font-mono">{vehicle.plateNumber}</Badge>}
              {vehicle.activeDtcCount ? (
                <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3"/> {vehicle.activeDtcCount} أعطال</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-green-500 bg-green-500/10 hover:bg-green-500/20 border-green-500/20"><CheckCircle2 className="w-3 h-3"/> سليمة</Badge>
              )}
              {vehicle.isPaired ? (
                <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10 gap-1"><Activity className="w-3 h-3"/> الجهاز متصل</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1"><Settings2 className="w-3 h-3"/> غير متصل</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild><Button variant="outline"><Edit className="w-4 h-4 ml-2"/> تعديل</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>تعديل بيانات المركبة</DialogTitle></DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <FormField control={editForm.control} name="nickname" render={({field}) => <FormItem><FormLabel>الاسم المستعار</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>} />
                  <FormField control={editForm.control} name="plateNumber" render={({field}) => <FormItem><FormLabel>رقم اللوحة</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>} />
                  <FormField control={editForm.control} name="odometerKm" render={({field}) => <FormItem><FormLabel>العداد (كم)</FormLabel><FormControl><Input type="number" {...field}/></FormControl></FormItem>} />
                  <DialogFooter><Button type="submit" disabled={updateVehicle.isPending}>حفظ</Button></DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {!vehicle.isPaired && (
            <Dialog open={pairOpen} onOpenChange={setPairOpen}>
              <DialogTrigger asChild><Button variant="secondary"><Settings2 className="w-4 h-4 ml-2"/> إقران</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>إقران جهاز OBD</DialogTitle></DialogHeader>
                <Form {...pairForm}>
                  <form onSubmit={pairForm.handleSubmit(onPairSubmit)} className="space-y-4">
                    <FormField control={pairForm.control} name="adapterMac" render={({field}) => <FormItem><FormLabel>عنوان MAC</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>} />
                    <DialogFooter><Button type="submit" disabled={pairAdapter.isPending}>ربط</Button></DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف المركبة بجميع بياناتها وسجلاتها بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">حذف</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0 h-auto">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">نظرة عامة</TabsTrigger>
          <TabsTrigger value="diagnostics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">التشخيصات</TabsTrigger>
          <TabsTrigger value="dtc" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">الأكواد ({dtcCodes?.filter(c=>c.status==='active').length || 0})</TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">الصيانة</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>سجل الصحة</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {!healthHistory ? <Skeleton className="w-full h-full"/> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={healthHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), "d MMM", { locale: ar })} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <Tooltip labelFormatter={(val) => format(new Date(val), "d MMMM", { locale: ar })} />
                      <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>أبرز الأعطال النشطة</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!dtcCodes ? <Skeleton className="w-full h-40"/> : 
                    dtcCodes.filter(c => c.status === 'active').slice(0,3).length === 0 ? (
                      <EmptyState icon={<CheckCircle2 className="w-8 h-8 text-green-500"/>} title="لا توجد أعطال" description="المركبة في حالة ممتازة"/>
                    ) : (
                      dtcCodes.filter(c => c.status === 'active').slice(0,3).map(dtc => (
                        <div key={dtc.id} className="p-3 border border-border rounded-lg bg-muted/30">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold font-mono">{dtc.code}</span>
                            <Badge className={cn("text-white", `bg-${getSeverityColor(dtc.severity)}`)}>{dtc.severity}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{dtc.descriptionAr || dtc.descriptionEn}</p>
                        </div>
                      ))
                    )
                  }
                  {dtcCodes && dtcCodes.filter(c => c.status === 'active').length > 3 && (
                    <Button variant="ghost" className="w-full text-primary" onClick={() => document.querySelector('[value="dtc"]')?.dispatchEvent(new MouseEvent('click', {bubbles:true}))}>عرض كل الأعطال</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="diagnostics" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>سجل التشخيص</CardTitle>
              <Button asChild><Link href={`/app/diagnostics`}><PlayCircle className="ml-2 h-4 w-4"/> بدء جلسة جديدة</Link></Button>
            </CardHeader>
            <CardContent>
              {!sessions ? <Skeleton className="w-full h-40"/> : sessions.length === 0 ? (
                <EmptyState icon={<Activity className="w-10 h-10"/>} title="لا يوجد جلسات تشخيص" description="ابدأ جلسة تشخيص جديدة لفحص المركبة"/>
              ) : (
                <div className="space-y-4">
                  {sessions.map(session => (
                    <div key={session.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setLocation(`/app/diagnostics/${session.id}`)}>
                      <div className="flex items-center gap-4">
                        <div className="bg-secondary p-3 rounded-full"><Activity className="w-5 h-5 text-primary"/></div>
                        <div>
                          <p className="font-medium">جلسة {format(new Date(session.startedAt), "d MMMM yyyy", { locale: ar })}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="w-3 h-3"/> {session.durationSec ? `${Math.floor(session.durationSec / 60)} دقيقة` : 'مستمرة'}
                            <span className="text-border">•</span>
                            <AlertTriangle className="w-3 h-3"/> {session.dtcCount || 0} عطل
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {session.status === 'active' ? (
                          <Badge className="bg-blue-500 animate-pulse">مستمرة</Badge>
                        ) : (
                          <Badge variant="outline">مكتملة</Badge>
                        )}
                        <ChevronRight className="w-5 h-5 text-muted-foreground rotate-180" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dtc" className="mt-6">
          <Card>
            <CardHeader><CardTitle>سجل الأعطال (DTC)</CardTitle></CardHeader>
            <CardContent>
              {!dtcCodes ? <Skeleton className="w-full h-40"/> : dtcCodes.length === 0 ? (
                <EmptyState icon={<CheckCircle2 className="w-10 h-10 text-green-500"/>} title="لا توجد أعطال مسجلة" description="سجل الأعطال نظيف تماماً"/>
              ) : (
                <div className="space-y-3">
                  {dtcCodes.sort((a,b) => a.status === 'active' ? -1 : 1).map(dtc => (
                    <div key={dtc.id} className={cn("flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4", dtc.status === 'active' ? "border-primary/20 bg-primary/5" : "border-border bg-card opacity-70")}>
                      <div className="flex items-start gap-4">
                        <div className={cn("p-2 rounded font-mono font-bold text-lg", dtc.status === 'active' ? "bg-background shadow-sm" : "bg-muted")}>{dtc.code}</div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn("text-white", `bg-${getSeverityColor(dtc.severity)}`)}>{dtc.severity}</Badge>
                            {dtc.status === 'cleared' && <Badge variant="outline" className="text-green-500 border-green-500/20">تم المسح</Badge>}
                          </div>
                          <p className="text-sm font-medium">{dtc.descriptionAr || dtc.descriptionEn}</p>
                          <p className="text-xs text-muted-foreground mt-1">تاريخ الاكتشاف: {dtc.detectedAt ? format(new Date(dtc.detectedAt), "d MMMM yyyy", {locale: ar}) : "-"}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/app/dtc">التفاصيل</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>جدول الصيانة</CardTitle>
              <Dialog open={maintOpen} onOpenChange={setMaintenanceOpen}>
                <DialogTrigger asChild><Button><Wrench className="ml-2 w-4 h-4"/> تسجيل صيانة</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>تسجيل صيانة جديدة</DialogTitle></DialogHeader>
                  <Form {...maintForm}>
                    <form onSubmit={maintForm.handleSubmit(onMaintSubmit)} className="space-y-4">
                      <FormField control={maintForm.control} name="serviceType" render={({field}) => (
                        <FormItem><FormLabel>نوع الصيانة</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="اختر..."/></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="oil_change">تغيير زيت المحرك</SelectItem>
                            <SelectItem value="brake_pads">تغيير الفحمات</SelectItem>
                            <SelectItem value="tires">تغيير الإطارات</SelectItem>
                            <SelectItem value="battery">تغيير البطارية</SelectItem>
                            <SelectItem value="other">أخرى</SelectItem>
                          </SelectContent>
                        </Select>
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={maintForm.control} name="doneAt" render={({field}) => <FormItem><FormLabel>التاريخ</FormLabel><FormControl><Input type="date" {...field}/></FormControl></FormItem>} />
                        <FormField control={maintForm.control} name="doneAtKm" render={({field}) => <FormItem><FormLabel>العداد (كم)</FormLabel><FormControl><Input type="number" {...field}/></FormControl></FormItem>} />
                      </div>
                      <FormField control={maintForm.control} name="cost" render={({field}) => <FormItem><FormLabel>التكلفة (ر.س)</FormLabel><FormControl><Input type="number" {...field}/></FormControl></FormItem>} />
                      <FormField control={maintForm.control} name="notes" render={({field}) => <FormItem><FormLabel>ملاحظات</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>} />
                      <DialogFooter><Button type="submit" disabled={logMaintenance.isPending}>تسجيل</Button></DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {!maintenance ? <Skeleton className="w-full h-40"/> : maintenance.length === 0 ? (
                <EmptyState icon={<Wrench className="w-10 h-10"/>} title="لا توجد بيانات صيانة" description="قم بتسجيل صيانة دورية للمركبة للحفاظ على صحتها"/>
              ) : (
                <div className="space-y-4">
                  {maintenance.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", {
                          "bg-destructive/10 text-destructive": item.status === "overdue",
                          "bg-amber-500/10 text-amber-500": item.status === "upcoming",
                          "bg-blue-500/10 text-blue-500": item.status === "scheduled",
                          "bg-green-500/10 text-green-500": item.status === "done",
                        })}>
                          <Wrench className="w-5 h-5"/>
                        </div>
                        <div>
                          <p className="font-bold text-lg">{item.serviceTypeAr || item.serviceType}</p>
                          <div className="text-sm text-muted-foreground flex gap-3 mt-1">
                            {item.nextDueKm && <span>الاستحقاق: {item.nextDueKm} كم</span>}
                            {item.lastDoneKm && <span>آخر مرة: {item.lastDoneKm} كم</span>}
                          </div>
                        </div>
                      </div>
                      <Badge variant={item.status === 'overdue' ? 'destructive' : item.status === 'done' ? 'outline' : 'secondary'}>
                        {item.status === 'overdue' ? 'متأخرة' : item.status === 'upcoming' ? 'قريباً' : item.status === 'scheduled' ? 'مجدولة' : 'منجزة'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
