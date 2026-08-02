import { useState } from "react";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Search, MapPin, Star, Filter, ShieldCheck } from "lucide-react";
import { useListWorkshops } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WorkshopsPublic() {
  const [city, setCity] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string | null>(null);
  
  const { data: workshops, isLoading } = useListWorkshops({
    city: city === "all" ? undefined : city,
    service: serviceFilter || undefined,
  });

  const cities = ["الرياض", "جدة", "الدمام", "مكة", "المدينة", "الخبر"];
  const allServices = ["ميكانيكا", "كهرباء", "سمكرة", "فحص دوري", "تغيير زيت", "تكييف"];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main className="flex-1 pt-32 pb-24">
        {/* Page Header */}
        <section className="container mx-auto px-4 mb-12">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold mb-4">الورش المعتمدة</h1>
            <p className="text-xl text-muted-foreground">
              اكتشف أفضل الورش ومراكز الصيانة المعتمدة من MFK في مدينتك، مع تقييمات حقيقية من العملاء.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="container mx-auto px-4 mb-10">
          <div className="bg-card border border-border rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-4 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input 
                placeholder="ابحث عن ورشة بالاسم..." 
                className="pl-4 pr-10 h-12 bg-background border-border"
              />
            </div>
            
            <div className="w-full md:w-48">
              <Select value={city} onValueChange={setCity} dir="rtl">
                <SelectTrigger className="h-12 bg-background">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="اختر المدينة" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المدن</SelectItem>
                  {cities.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Services Tags */}
          <div className="flex flex-wrap gap-2 mt-6">
            <Badge 
              variant={serviceFilter === null ? "default" : "outline"} 
              className="text-sm py-1.5 px-4 cursor-pointer hover:bg-primary/90"
              onClick={() => setServiceFilter(null)}
            >
              الكل
            </Badge>
            {allServices.map(service => (
              <Badge 
                key={service}
                variant={serviceFilter === service ? "default" : "outline"} 
                className="text-sm py-1.5 px-4 cursor-pointer hover:bg-primary/10"
                onClick={() => setServiceFilter(service)}
              >
                {service}
              </Badge>
            ))}
          </div>
        </section>

        {/* Results Grid */}
        <section className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-[300px] w-full rounded-2xl" />
              ))}
            </div>
          ) : workshops?.length === 0 ? (
            <div className="text-center py-24 bg-card border border-border rounded-2xl">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold mb-2">لا توجد ورش مطابقة للبحث</h3>
              <p className="text-muted-foreground">جرب تغيير المدينة أو نوع الخدمة</p>
              <Button variant="outline" className="mt-6" onClick={() => { setCity("all"); setServiceFilter(null); }}>
                إعادة ضبط البحث
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workshops?.sort((a, b) => b.rating - a.rating).map((workshop) => (
                <div key={workshop.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-colors group flex flex-col">
                  {/* Workshop Image Placeholder */}
                  <div className="h-48 bg-muted relative overflow-hidden">
                    <img 
                      src={workshop.imageUrl || `https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=600&auto=format&fit=crop&q=60`} 
                      alt={workshop.nameAr} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {workshop.isVerified && (
                      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur text-foreground px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        معتمد
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-foreground line-clamp-1" title={workshop.nameAr}>{workshop.nameAr}</h3>
                      <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full text-sm font-bold shrink-0">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {workshop.rating}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-muted-foreground text-sm mb-4">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="line-clamp-1">{workshop.city} {workshop.district && `• ${workshop.district}`}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 mb-6 mt-auto">
                      {workshop.servicesAr?.slice(0, 3).map((s, i) => (
                        <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md">
                          {s}
                        </span>
                      ))}
                      {workshop.servicesAr && workshop.servicesAr.length > 3 && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md">
                          +{workshop.servicesAr.length - 3}
                        </span>
                      )}
                    </div>
                    
                    <Link href={`/workshops/${workshop.id}`}>
                      <Button className="w-full">التفاصيل والحجز</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
