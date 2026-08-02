import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "wouter";
import { 
  MapPin, 
  Star, 
  ShieldCheck, 
  Clock, 
  Phone, 
  Info,
  CalendarCheck,
  ChevronRight,
  Wrench,
} from "lucide-react";
import { useGetWorkshop } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function WorkshopDetailPublic() {
  const params = useParams();
  const workshopId = params.id as string;
  
  const { data: workshop, isLoading, error } = useGetWorkshop(workshopId, {
    query: { enabled: !!workshopId } as any
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-32 pb-24 container mx-auto px-4">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-[400px] w-full rounded-3xl mb-12" />
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-32 w-full mt-8" />
            </div>
            <div><Skeleton className="h-[300px] w-full rounded-2xl" /></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !workshop) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-32 pb-24 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">الورشة غير موجودة</h1>
          <p className="text-muted-foreground mb-8">عذراً، لم نتمكن من العثور على الورشة المطلوبة.</p>
          <Link href="/workshops"><Button>العودة لقائمة الورش</Button></Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main className="flex-1 pt-24 pb-24">
        {/* Breadcrumb */}
        <div className="bg-muted/30 border-b border-border py-4">
          <div className="container mx-auto px-4 flex items-center text-sm text-muted-foreground">
            <Link href="/"><span className="hover:text-foreground transition-colors cursor-pointer">الرئيسية</span></Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <Link href="/workshops"><span className="hover:text-foreground transition-colors cursor-pointer">دليل الورش</span></Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-foreground font-medium truncate">{workshop.nameAr}</span>
          </div>
        </div>

        <div className="container mx-auto px-4 pt-10">
          {/* Hero Image */}
          <div className="h-[300px] md:h-[450px] w-full rounded-3xl overflow-hidden mb-12 relative group">
            <img 
              src={workshop.imageUrl || `https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=1200&auto=format&fit=crop&q=80`} 
              alt={workshop.nameAr} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 text-white">
              <div>
                {workshop.isVerified && (
                  <Badge className="bg-primary hover:bg-primary border-none mb-4 font-bold px-3 py-1">
                    <ShieldCheck className="w-4 h-4 ml-1.5" /> ورشة معتمدة MFK
                  </Badge>
                )}
                <h1 className="text-4xl md:text-5xl font-bold mb-3">{workshop.nameAr}</h1>
                <div className="flex flex-wrap items-center gap-4 text-white/90">
                  <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                    <MapPin className="w-4 h-4" />
                    <span>{workshop.city}{workshop.district ? `، ${workshop.district}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-yellow-500/20 text-yellow-300 backdrop-blur-md px-3 py-1 rounded-full font-bold">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{workshop.rating} ({workshop.reviewsCount || 0} تقييم)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-10">
              {/* About */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-bold">عن الورشة</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed text-lg whitespace-pre-line">
                  {workshop.descriptionAr || "مركز صيانة متكامل يقدم خدمات فحص وإصلاح السيارات بأحدث الأجهزة والتقنيات. يضم طاقم فني متخصص ذو خبرة عالية."}
                </p>
              </section>

              {/* Services */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Wrench className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-bold">الخدمات المتوفرة</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {workshop.servicesAr?.map(service => (
                    <span key={service} className="bg-muted text-foreground px-4 py-2 rounded-lg font-medium border border-border">
                      {service}
                    </span>
                  ))}
                  {(!workshop.servicesAr || workshop.servicesAr.length === 0) && (
                    <span className="text-muted-foreground">الخدمات غير محددة</span>
                  )}
                </div>
              </section>
            </div>

            {/* Sidebar Sticky Info */}
            <div className="bg-card border border-border rounded-2xl p-6 sticky top-24 shadow-sm">
              <h3 className="text-xl font-bold mb-6">معلومات التواصل والحجز</h3>
              
              <div className="space-y-6 mb-8">
                {workshop.addressAr && (
                  <div className="flex items-start gap-3">
                    <div className="bg-muted p-2 rounded-md shrink-0 text-muted-foreground">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">العنوان</div>
                      <div className="text-muted-foreground text-sm leading-relaxed">{workshop.addressAr}</div>
                    </div>
                  </div>
                )}
                
                {workshop.openingHours && (
                  <div className="flex items-start gap-3">
                    <div className="bg-muted p-2 rounded-md shrink-0 text-muted-foreground">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">أوقات العمل</div>
                      <div className="text-muted-foreground text-sm">{workshop.openingHours}</div>
                    </div>
                  </div>
                )}

                {workshop.phone && (
                  <div className="flex items-start gap-3">
                    <div className="bg-muted p-2 rounded-md shrink-0 text-muted-foreground">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">رقم الهاتف</div>
                      <div className="text-muted-foreground text-sm font-mono" dir="ltr">{workshop.phone}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-border">
                <Link href="/login">
                  <Button size="lg" className="w-full text-lg h-14 font-bold flex items-center justify-center gap-2">
                    <CalendarCheck className="w-5 h-5" />
                    احجز موعد الآن
                  </Button>
                </Link>
                <p className="text-xs text-center text-muted-foreground mt-3">
                  يجب تسجيل الدخول للحجز في الورشة
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
