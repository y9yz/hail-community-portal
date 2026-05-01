import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ServiceCard from "@/components/ServiceCard";
import { categories } from "@/data/categories";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Service } from "@/types/service";
import heroImage from "@/assets/hero-hail.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { role, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");

  /* 
     توجيه المستخدمين (Role-based Redirect): 
     المتجر مخصص للعملاء فقط؛ المشرف والمزود يتم تحويلهم للوحات التحكم الخاصة بهم.
  */
  useEffect(() => {
    if (authLoading) return;
    if (role === "admin") { navigate("/admin", { replace: true }); return; }
    if (role === "provider") { navigate("/provider", { replace: true }); return; }
  }, [role, authLoading, navigate]);

  /* 
     جلب الخدمات المعتمدة فقط مع بيانات المزود. 
     تم فصل جلب التقييمات وحسابها يدوياً لتجنب تعقيدات الـ Aggregation في استعلام واحد.
  */
  useEffect(() => {
    const fetchServices = async () => {
      const { data: svcData } = await supabase
        .from("services")
        .select("*, provider:profiles!services_provider_id_fkey(full_name)")
        .eq("admin_status", "approved" as any)
        .order("created_at", { ascending: false });

      const svcs = (svcData as any[]) || [];

      if (svcs.length > 0) {
        const serviceIds = svcs.map((s) => s.id);
        const { data: reviewData } = await supabase
          .from("reviews")
          .select("service_id, rating")
          .in("service_id", serviceIds);

        // بناء خارطة (Map) لإحصائيات التقييم لرفع كفاءة المعالجة
        const reviewStats: Record<string, { sum: number; count: number }> = {};
        (reviewData || []).forEach((r: any) => {
          if (!reviewStats[r.service_id]) reviewStats[r.service_id] = { sum: 0, count: 0 };
          reviewStats[r.service_id].sum += r.rating;
          reviewStats[r.service_id].count += 1;
        });

        // دمج النتائج مع مصفوفة الخدمات الأساسية
        svcs.forEach((s) => {
          const stats = reviewStats[s.id];
          s.avg_rating = stats ? stats.sum / stats.count : 0;
          s.review_count = stats ? stats.count : 0;
        });
      }

      setServices(svcs);
      setLoading(false);
    };
    fetchServices();
  }, []);

  /* 
     استخدام useMemo للتصفية والفرز: 
     حركة احترافية لمنع إعادة الحسابات المعقدة مع كل "رندرة" (Render) إلا في حال تغير المدخلات.
  */
  const filtered = useMemo(() => {
    let result = services.filter((s) => {
      const matchesSearch = s.title.includes(searchQuery) || s.description.includes(searchQuery);
      const matchesCategory = activeCategory === "all" || s.category === activeCategory;
      return matchesSearch && matchesCategory;
    });

    if (sortBy === "rating") {
      result = [...result].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    }

    return result;
  }, [services, searchQuery, activeCategory, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* قسم الـ Hero: واجهة ترحيبية بتأثير Gradient لتحسين قراءة النصوص */}
      <section className="relative h-72 md:h-96 overflow-hidden">
        <img src={heroImage} alt="مدينة حائل" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-3 drop-shadow-sm">
            خدمات موثوقة في حائل
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
            اعثر على أفضل مقدمي الخدمات المحلية واحجز بسهولة
          </p>
        </div>
      </section>

      <div className="container py-6">
        {/* أدوات التحكم: تصفية حسب التصنيف وترتيب النتائج */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                className="cursor-pointer text-sm px-4 py-2 rounded-xl transition-colors"
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </Badge>
            ))}
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder="ترتيب حسب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث</SelectItem>
              <SelectItem value="rating">الأعلى تقييماً</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <main className="container pb-16">
        {loading ? (
          <p className="text-center text-muted-foreground py-16">جاري التحميل...</p>
        ) : (
          <>
            {/* عرض شبكة الخدمات المستجيبة (Responsive Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
            
            {/* حالة عدم وجود نتائج */}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-16 text-lg">
                لا توجد خدمات متاحة حالياً
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Index;