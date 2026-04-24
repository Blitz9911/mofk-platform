import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Car, Plus, Settings2, MoreHorizontal, AlertCircle } from "lucide-react";
import { 
  useListVehicles, 
  useCreateVehicle, 
  usePairAdapter,
  CreateVehicleBodyFuelType,
  getListVehiclesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

const createVehicleSchema = z.object({
  make: z.string().min(1, "مطلوب"),
  model: z.string().min(1, "مطلوب"),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  plateNumber: z.string().optional(),
  nickname: z.string().optional(),
  odometerKm: z.coerce.number().optional(),
  fuelType: z.enum(["petrol", "diesel", "hybrid", "ev"]),
  engineCc: z.coerce.number().optional(),
  vin: z.string().optional(),
});

export default function Vehicles() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: vehicles, isLoading } = useListVehicles();
  const createVehicle = useCreateVehicle();
  const pairAdapter = usePairAdapter();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState<{open: boolean, vehicleId: string | null}>({open: false, vehicleId: null});

  const form = useForm<z.infer<typeof createVehicleSchema>>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: {
      make: "", model: "", year: new Date().getFullYear(),
      fuelType: "petrol",
    }
  });

  const pairForm = useForm<{adapterMac: string}>({
    defaultValues: { adapterMac: "" }
  });

  const onSubmit = (values: z.infer<typeof createVehicleSchema>) => {
    createVehicle.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "تم إضافة المركبة بنجاح" });
        queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
        setCreateOpen(false);
        form.reset();
      }
    });
  };

  const onPairSubmit = (values: {adapterMac: string}) => {
    if (!pairOpen.vehicleId) return;
    pairAdapter.mutate({ vehicleId: pairOpen.vehicleId, data: { adapterMac: values.adapterMac } }, {
      onSuccess: () => {
        toast({ title: "تم ربط الجهاز بنجاح" });
        queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
        setPairOpen({open: false, vehicleId: null});
        pairForm.reset();
      }
    });
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-500 border-green-500/20 bg-green-500/10";
    if (score >= 60) return "text-amber-500 border-amber-500/20 bg-amber-500/10";
    if (score >= 40) return "text-orange-500 border-orange-500/20 bg-orange-500/10";
    return "text-destructive border-destructive/20 bg-destructive/10";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">مركباتي</h1>
          <p className="text-muted-foreground mt-1">إدارة مركباتك وحالة أجهزة الفحص</p>
        </div>
        
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 w-4 h-4" /> إضافة مركبة</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>إضافة مركبة جديدة</DialogTitle>
              <DialogDescription>أدخل بيانات المركبة لإضافتها إلى حسابك.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="make" render={({ field }) => (
                    <FormItem><FormLabel>الشركة المصنعة</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="model" render={({ field }) => (
                    <FormItem><FormLabel>الموديل</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="year" render={({ field }) => (
                    <FormItem><FormLabel>سنة الصنع</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="fuelType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع الوقود</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="petrol">بنزين</SelectItem>
                          <SelectItem value="diesel">ديزل</SelectItem>
                          <SelectItem value="hybrid">هجين</SelectItem>
                          <SelectItem value="ev">كهربائي</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="nickname" render={({ field }) => (
                    <FormItem><FormLabel>الاسم المستعار (اختياري)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="plateNumber" render={({ field }) => (
                    <FormItem><FormLabel>رقم اللوحة (اختياري)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createVehicle.isPending}>إضافة</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={pairOpen.open} onOpenChange={(open) => !open && setPairOpen({open: false, vehicleId: null})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إقران جهاز OBD</DialogTitle>
            <DialogDescription>أدخل عنوان MAC الخاص بجهاز MFK لربطه بهذه المركبة.</DialogDescription>
          </DialogHeader>
          <Form {...pairForm}>
            <form onSubmit={pairForm.handleSubmit(onPairSubmit)} className="space-y-4">
              <FormField control={pairForm.control} name="adapterMac" render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان MAC</FormLabel>
                  <FormControl><Input placeholder="00:11:22:33:44:55" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={pairAdapter.isPending}>ربط الجهاز</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : !vehicles?.length ? (
        <EmptyState 
          icon={<Car className="h-12 w-12" />} 
          title="لا توجد مركبات" 
          description="أضف مركبتك الأولى للبدء في استخدام منصة MFK."
          action={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4"/> أضف أول مركبة</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <Card key={v.id} className="overflow-hidden hover-elevate transition-all border-border">
              <div className="h-32 bg-muted relative flex items-center justify-center">
                {v.imageUrl ? (
                  <img src={v.imageUrl} alt={v.make} className="w-full h-full object-cover" />
                ) : (
                  <Car className="h-16 w-16 text-muted-foreground/30" />
                )}
                <div className="absolute top-4 left-4">
                  <div className={cn("w-14 h-14 rounded-full border-4 flex items-center justify-center bg-card shadow-sm font-bold text-lg", getHealthColor(v.healthScore))}>
                    {v.healthScore}
                  </div>
                </div>
              </div>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{v.nickname || `${v.make} ${v.model}`}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{v.year} • {v.make} {v.model}</p>
                  </div>
                  {v.plateNumber && (
                    <Badge variant="outline" className="font-mono">{v.plateNumber}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-4 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المسافة</span>
                  <span className="font-medium">{v.odometerKm || 0} كم</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">الأعطال النشطة</span>
                  {(v as any).activeDtcCount > 0 ? (
                    <Badge variant="destructive">{(v as any).activeDtcCount} عطل</Badge>
                  ) : (
                    <span className="text-green-500 font-medium">سليمة</span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0 gap-2">
                <Button variant="default" className="flex-1" onClick={() => setLocation(`/app/vehicles/${v.id}`)}>
                  عرض التفاصيل
                </Button>
                {!(v as any).isPaired && (
                  <Button variant="outline" size="icon" title="إقران الجهاز" onClick={() => setPairOpen({open: true, vehicleId: v.id})}>
                    <Settings2 className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
