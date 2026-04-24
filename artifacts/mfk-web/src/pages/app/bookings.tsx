import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Calendar, MapPin, Wrench, CheckCircle2, 
  XCircle, Clock, Info, AlertTriangle 
} from "lucide-react";
import { 
  useListBookings, 
  useUpdateBooking,
  getListBookingsQueryKey,
  UpdateBookingBodyStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function Bookings() {
  const { data: bookings, isLoading } = useListBookings();
  const updateBooking = useUpdateBooking();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cancelId, setCancelId] = useState<string | null>(null);

  const onCancel = (id: string) => {
    updateBooking.mutate({ bookingId: id, data: { status: "cancelled" } }, {
      onSuccess: () => {
        toast({ title: "تم إلغاء الحجز" });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        setCancelId(null);
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'confirmed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'in_progress': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد المراجعة';
      case 'confirmed': return 'مؤكد';
      case 'in_progress': return 'جاري العمل';
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const upcoming = bookings?.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status)) || [];
  const past = bookings?.filter(b => ['completed', 'cancelled'].includes(b.status)) || [];

  const BookingList = ({ items }: { items: any[] }) => {
    if (items.length === 0) return (
      <EmptyState 
        icon={<Calendar className="h-12 w-12" />} 
        title="لا توجد حجوزات" 
        description="لا يوجد حجوزات في هذه القائمة"
      />
    );

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map(booking => (
          <Card key={booking.id} className="overflow-hidden border-border hover-elevate transition-all">
            <CardHeader className="pb-3 bg-muted/30">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-bold">{booking.serviceTypeAr || booking.serviceType}</CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {booking.workshopNameAr || booking.workshopName}
                  </div>
                </div>
                <Badge variant="outline" className={cn("font-medium", getStatusColor(booking.status))}>
                  {getStatusLabel(booking.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-3 bg-secondary/20 p-3 rounded-lg">
                <div className="bg-background p-2 rounded-md shadow-sm border border-border">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm">{format(new Date(booking.scheduledAt), "EEEE، d MMMM", {locale: ar})}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {format(new Date(booking.scheduledAt), "HH:mm", {locale: ar})}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">المركبة</span>
                <span className="font-medium bg-muted px-2 py-1 rounded-md">{booking.vehicleMake} {booking.vehicleModel}</span>
              </div>
              
              {(booking.estimatedCost || booking.finalCost) && (
                <div className="flex justify-between text-sm items-center pt-2 border-t border-border">
                  <span className="text-muted-foreground">التكلفة</span>
                  <span className="font-bold text-primary">{booking.finalCost || booking.estimatedCost} ر.س</span>
                </div>
              )}

              {['pending', 'confirmed'].includes(booking.status) && (
                <div className="pt-2 mt-2 border-t border-border">
                  <AlertDialog open={cancelId === booking.id} onOpenChange={(o) => !o && setCancelId(null)}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full" onClick={() => setCancelId(booking.id)}>
                        <XCircle className="w-4 h-4 ml-2" /> إلغاء الحجز
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد من إلغاء الحجز؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          هذا الإجراء سيقوم بإلغاء موعد الصيانة المجدول مع {booking.workshopNameAr || booking.workshopName}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>تراجع</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onCancel(booking.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">تأكيد الإلغاء</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">حجوزاتي</h1>
        <p className="text-muted-foreground mt-1">تتبع وإدارة مواعيد صيانتك في الورش المعتمدة</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : (
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="upcoming">القادمة ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">السابقة ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-0">
            <BookingList items={upcoming} />
          </TabsContent>
          <TabsContent value="past" className="mt-0">
            <BookingList items={past} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
