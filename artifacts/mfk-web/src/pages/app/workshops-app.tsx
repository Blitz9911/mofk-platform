import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPin, Star, Calendar as CalendarIcon, Clock, Info, CheckCircle2 } from "lucide-react";
import { 
  useListWorkshops, 
  useListVehicles,
  useCreateBooking,
  getListBookingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const createBookingSchema = z.object({
  vehicleId: z.string().min(1, "يرجى اختيار مركبة"),
  serviceType: z.string().min(1, "يرجى اختيار نوع الخدمة"),
  scheduledAt: z.date({ required_error: "يرجى اختيار التاريخ" }),
  time: z.string().min(1, "يرجى اختيار الوقت"),
  notes: z.string().optional()
});

export default function WorkshopsApp() {
  const [city, setCity] = useState<string>("all");
  const [service, setService] = useState<string>("all");
  const [bookingOpen, setBookingOpen] = useState<{open: boolean, workshopId: string | null}>({open: false, workshopId: null});

  const { data: workshops, isLoading } = useListWorkshops({
    city: city === "all" ? undefined : city,
    service: service === "all" ? undefined : service
  });
  
  const { data: vehicles } = useListVehicles();
  const createBooking = useCreateBooking();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof createBookingSchema>>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: { vehicleId: "", serviceType: "", notes: "" }
  });

  const onSubmit = (values: z.infer<typeof createBookingSchema>) => {
    if (!bookingOpen.workshopId) return;
    
    // Combine date and time
    const dateTime = new Date(values.scheduledAt);
    const [hours, minutes] = values.time.split(':').map(Number);
    dateTime.setHours(hours, minutes, 0, 0);

    createBooking.mutate({ 
      data: { 
        workshopId: bookingOpen.workshopId,
        vehicleId: values.vehicleId,
        serviceType: values.serviceType,
        scheduledAt: dateTime.toISOString(),
        notes: values.notes
      } 
    }, {
      onSuccess: () => {
        toast({ title: "تم تأكيد الحجز بنجاح" });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        setBookingOpen({open: false, workshopId: null});
        form.reset();
      }
    });
  };

  const cities = ["الرياض", "جدة", "الدمام", "مكة", "الخبر"];
  const services = [
    { id: "general", name: "صيانة عامة" },
    { id: "oil_change", name: "تغيير زيت" },
    { id: "brakes", name: "فحمات وفرامل" },
    { id: "electrical", name: "كهرباء" },
    { id: "ac", name: "تكييف" }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الورش المعتمدة</h1>
        <p className="text-muted-foreground mt-1">ابحث عن أفضل الورش واحجز موعد صيانتك</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-xl">
        <div className="w-full sm:w-64">
          <label className="text-sm font-medium mb-1.5 block">المدينة</label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger><SelectValue placeholder="جميع المدن" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المدن</SelectItem>
              {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-64">
          <label className="text-sm font-medium mb-1.5 block">نوع الخدمة</label>
          <Select value={service} onValueChange={setService}>
            <SelectTrigger><SelectValue placeholder="جميع الخدمات" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الخدمات</SelectItem>
              {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Dialog open={bookingOpen.open} onOpenChange={(o) => !o && setBookingOpen({open: false, workshopId: null})}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>حجز موعد صيانة</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="vehicleId" render={({field}) => (
                <FormItem>
                  <FormLabel>المركبة</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="اختر مركبة..."/></SelectTrigger></FormControl>
                    <SelectContent>
                      {vehicles?.map(v => <SelectItem key={v.id} value={v.id}>{v.nickname || `${v.make} ${v.model}`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="serviceType" render={({field}) => (
                <FormItem>
                  <FormLabel>نوع الخدمة</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="اختر الخدمة المطلوبة..."/></SelectTrigger></FormControl>
                    <SelectContent>
                      {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="scheduledAt" render={({field}) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>التاريخ</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP", {locale: ar}) : <span>اختر التاريخ</span>}
                            <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="time" render={({field}) => (
                  <FormItem>
                    <FormLabel>الوقت</FormLabel>
                    <FormControl><Input type="time" {...field}/></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({field}) => (
                <FormItem>
                  <FormLabel>ملاحظات للورشة (اختياري)</FormLabel>
                  <FormControl><Input placeholder="مثال: يرجى فحص صوت المحرك أيضاً..." {...field}/></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createBooking.isPending}>تأكيد الحجز</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : !workshops?.length ? (
        <EmptyState icon={<MapPin className="h-12 w-12" />} title="لا توجد ورش" description="لم نتمكن من العثور على ورش تطابق معايير البحث الخاصة بك" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workshops.map(w => (
            <Card key={w.id} className="overflow-hidden flex flex-col">
              <div className="h-40 bg-muted relative">
                {w.imageUrl ? (
                  <img src={w.imageUrl} alt={w.nameAr} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary">
                    <MapPin className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
                {w.isVerified && (
                  <div className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" /> معتمدة
                  </div>
                )}
              </div>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl mb-1">{w.nameAr}</CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {w.city} {w.district ? `• ${w.district}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center bg-amber-500/10 text-amber-600 px-2 py-1 rounded font-bold text-sm">
                    <Star className="w-3.5 h-3.5 fill-current mr-1" /> {w.rating.toFixed(1)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {(w.servicesAr || w.services || []).slice(0, 4).map((s, i) => (
                    <Badge key={i} variant="secondary" className="font-normal">{s}</Badge>
                  ))}
                  {(w.servicesAr || w.services || []).length > 4 && (
                    <Badge variant="outline" className="font-normal">+{((w.servicesAr || w.services || []).length - 4)}</Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0 border-t border-border mt-auto flex justify-between p-4 gap-3 bg-muted/20">
                <Button variant="outline" size="icon" title="تفاصيل الورشة">
                  <Info className="w-4 h-4" />
                </Button>
                <Button className="flex-1" onClick={() => setBookingOpen({open: true, workshopId: w.id})}>
                  <CalendarIcon className="w-4 h-4 ml-2" /> احجز موعد
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}